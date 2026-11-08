// Phó bản: sinh đội địch, đánh, càn quét, kinh nghiệm chưởng môn.

import { BALANCE } from '../data/balance.js';
import { CHAPTERS, STAGES_PER_CHAPTER, STAMINA_PER_FIGHT } from '../data/campaign.js';
import { TROOP_ORDER, TROOP_TYPES } from '../data/troops.js';
import { simulateBattle } from './battle.js';
import { rand } from './rng.js';
import { gain } from './economy.js';
import { teamUnits, refillTeam, findHero, addHeroExp } from './heroes.js';

const ENEMY_COUNT = [1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5];

export function stageId(ch, st) {
  return `${ch}-${st}`;
}

export function parseStage(id) {
  const [ch, st] = id.split('-').map(Number);
  return { ch, st, index: (ch - 1) * STAGES_PER_CHAPTER + (st - 1) };
}

export function allStages() {
  const out = [];
  for (const c of CHAPTERS) for (let s = 1; s <= STAGES_PER_CHAPTER; s++) out.push(stageId(c.id, s));
  return out;
}

// Số giả ngẫu nhiên cố định theo ải, để đội địch luôn giống nhau
function hash(a, b) {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function stageInfo(id) {
  const { ch, st, index } = parseStage(id);
  const chapter = CHAPTERS[ch - 1];
  const count = ENEMY_COUNT[Math.min(index, ENEMY_COUNT.length - 1)];
  const level = 1 + Math.round(index * 1.3);
  const isBoss = st === STAGES_PER_CHAPTER;
  return { id, ch, st, index, chapter, count, level, isBoss };
}

export function stageEnemies(id) {
  const info = stageInfo(id);
  const { index, chapter, count, level, isBoss } = info;
  const stat = 24 + level * 2.3 + Math.pow(index, 1.6) * 0.6;
  const troops = Math.round(110 + index * 60 + Math.pow(index, 1.8) * 4);
  const tier = Math.min(5, 1 + Math.floor(index / 5));
  const units = [];
  const frontSlots = [1, 0, 2];
  const backSlots = [4, 3, 5];
  let fi = 0;
  let bi = 0;
  for (let i = 0; i < count; i++) {
    const boss = isBoss && i === 0;
    const type = boss ? chapter.boss.type : TROOP_ORDER[Math.floor(hash(index + 1, i + 1) * TROOP_ORDER.length)];
    const ranged = TROOP_TYPES[type].range === 'ranged';
    let slot;
    if ((ranged && bi < 3) || fi >= 3) slot = backSlots[bi++];
    else slot = frontSlots[fi++];
    const jitter = 0.92 + hash(index + 7, i + 3) * 0.16;
    const m = boss ? 1.25 : 1;
    const s = stat * jitter * m;
    const nameIdx = Math.min(chapter.enemyNames.length - 1, Math.floor(hash(index + 3, i + 5) * chapter.enemyNames.length));
    units.push({
      id: `e${i}`,
      slot,
      name: boss ? chapter.boss.name : chapter.enemyNames[nameIdx],
      stats: { canCot: Math.round(s), voLuc: Math.round(s * 1.02), ngoTinh: Math.round(s * 0.9) },
      type,
      tier,
      troops: Math.round(troops * (boss ? 1.4 : 1) * jitter),
      maxTroops: Math.round(troops * (boss ? 1.4 : 1) * jitter),
      skill: boss ? { id: chapter.boss.skill, lv: 1 + Math.floor(index / 5) } : index >= 6 && i === 1 ? { id: 'sonTacDao', lv: 1 } : null,
      bonus: 0,
      look: { kind: 'enemy', chapter: chapter.id, type, boss },
    });
  }
  return units;
}

export function stageRewards(id, first) {
  const { index, isBoss } = stageInfo(id);
  const r = {
    exp: Math.round(45 + index * 32),
    luong: Math.round(250 + index * 180),
    go: Math.round(150 + index * 120),
    bac: Math.round(180 + index * 130),
  };
  if (first) {
    r.tieuHoanDan = 2 + Math.floor(index / 3);
    r.nguyenbao = isBoss ? 40 + index * 4 : 10;
    if (isBoss) {
      r.huyenThiet = 6 + index;
      r.biKip = 1 + Math.floor(index / 5);
    }
    return r;
  }
  // đánh lại / càn quét
  return {
    exp: Math.round(r.exp * 0.4),
    luong: Math.round(r.luong * 0.35),
    go: Math.round(r.go * 0.35),
    bac: Math.round(r.bac * 0.35),
  };
}

export function isStageUnlocked(state, id) {
  const { ch, st } = parseStage(id);
  const chapter = CHAPTERS[ch - 1];
  if (!chapter) return false;
  if (state.player.level < chapter.reqLevel) return false;
  if (ch === 1 && st === 1) return true;
  const prev = st > 1 ? stageId(ch, st - 1) : stageId(ch - 1, STAGES_PER_CHAPTER);
  return (state.campaign.stars[prev] || 0) > 0;
}

export function nextStage(state) {
  for (const id of allStages()) if (!state.campaign.stars[id]) return id;
  return null;
}

export function addPlayerExp(state, amount) {
  state.player.exp += amount;
  let leveled = 0;
  while (state.player.level < BALANCE.playerMaxLevel) {
    const need = BALANCE.playerExpToNext(state.player.level);
    if (state.player.exp < need) break;
    state.player.exp -= need;
    state.player.level++;
    leveled++;
  }
  return leveled;
}

function grantRewards(state, rewards, heroUids) {
  const { exp, ...rest } = rewards;
  gain(state, rest);
  const levels = addPlayerExp(state, exp);
  for (const uid of heroUids) {
    const h = findHero(state, uid);
    if (h) addHeroExp(state, h, exp);
  }
  return levels;
}

export function fightCheck(state, id) {
  if (!isStageUnlocked(state, id)) {
    const { chapter } = stageInfo(id);
    if (state.player.level < chapter.reqLevel) return { ok: false, reason: `Cần cấp chưởng môn ${chapter.reqLevel}` };
    return { ok: false, reason: 'Vượt ải trước đó đã' };
  }
  if (state.stamina.cur < STAMINA_PER_FIGHT) return { ok: false, reason: 'Không đủ thể lực' };
  return { ok: true };
}

export function fightStage(state, id) {
  const chk = fightCheck(state, id);
  if (!chk.ok) return chk;
  if (state.settings.autoRefill) refillTeam(state);
  const team = teamUnits(state);
  if (!team.length) return { ok: false, reason: 'Đội hình chưa có ai còn quân. Bổ sung quân trước.' };
  const enemies = stageEnemies(id);
  const seed = (rand(state) * 4294967296) >>> 0;
  const result = simulateBattle(team, enemies, seed);
  state.stats.battles++;

  // Áp tổn thất
  for (const u of result.A) {
    const h = findHero(state, u.id);
    if (h) h.troops = u.troops;
  }

  let rewards = null;
  let stars = 0;
  let levels = 0;
  if (result.win) {
    state.stats.wins++;
    state.stamina.cur -= STAMINA_PER_FIGHT;
    const first = !state.campaign.stars[id];
    stars = result.lossRatio <= BALANCE.starThresholds[0] ? 3 : result.lossRatio <= BALANCE.starThresholds[1] ? 2 : 1;
    state.campaign.stars[id] = Math.max(state.campaign.stars[id] || 0, stars);
    rewards = stageRewards(id, first);
    levels = grantRewards(state, rewards, team.map((u) => u.id));
  } else {
    state.stamina.cur -= 1;
  }
  return { ok: true, result, team, enemies, rewards, stars, levels, stageId: id };
}

// Càn quét ải đã đạt 3 sao: tốn thể lực và một ít lương thực, không cần đánh.
export function sweepCost(id) {
  const { index } = stageInfo(id);
  return { luong: Math.round(80 + index * 40) };
}

export function sweepStage(state, id, times = 1) {
  if ((state.campaign.stars[id] || 0) < 3) return { ok: false, reason: 'Cần đạt 3 sao để càn quét' };
  const cost = sweepCost(id);
  let done = 0;
  const total = { exp: 0, luong: 0, go: 0, bac: 0 };
  let levels = 0;
  const team = state.team.filter(Boolean);
  while (done < times && state.stamina.cur >= STAMINA_PER_FIGHT && state.res.luong >= cost.luong) {
    state.stamina.cur -= STAMINA_PER_FIGHT;
    state.res.luong -= cost.luong;
    const r = stageRewards(id, false);
    if (rand(state) < 0.5) r.tieuHoanDan = 1;
    levels += grantRewards(state, r, team);
    for (const [k, v] of Object.entries(r)) total[k] = (total[k] || 0) + v;
    done++;
  }
  if (!done) return { ok: false, reason: state.stamina.cur < STAMINA_PER_FIGHT ? 'Không đủ thể lực' : 'Thiếu lương thực' };
  return { ok: true, done, total, levels, msg: `Càn quét ${done} lần` };
}
