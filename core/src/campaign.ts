// Phó bản: sinh đội địch, đánh, càn quét, kinh nghiệm chưởng môn.

import { cfg, playerExpToNext } from './config.js';
import { simulateBattle } from './battle.js';
import type { BattleResult, BattleUnit } from './battle.js';
import { rand } from './rng.js';
import { gain } from './economy.js';
import { teamUnits, refillTeam, findHero, addHeroExp } from './heroes.js';
import type { ActionResult, ChapterDef, Cost, GameState } from './types.js';

export const stageId = (ch: number, st: number) => `${ch}-${st}`;

export function parseStage(id: string): { ch: number; st: number; index: number } {
  const [ch, st] = id.split('-').map(Number);
  return { ch, st, index: (ch - 1) * cfg().stagesPerChapter + (st - 1) };
}

export function allStages(): string[] {
  const out: string[] = [];
  for (const c of cfg().chapters) for (let s = 1; s <= cfg().stagesPerChapter; s++) out.push(stageId(c.id, s));
  return out;
}

// Số giả ngẫu nhiên cố định theo ải, để đội địch luôn giống nhau
function hash(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export interface StageInfo {
  id: string; ch: number; st: number; index: number;
  chapter: ChapterDef; count: number; level: number; isBoss: boolean;
}

export function stageInfo(id: string): StageInfo {
  const { ch, st, index } = parseStage(id);
  const E = cfg().balance.enemy;
  const chapter = cfg().chapters.find((c) => c.id === ch) as ChapterDef;
  const count = E.counts[Math.min(index, E.counts.length - 1)];
  const level = 1 + Math.round(index * E.levelPerStage);
  return { id, ch, st, index, chapter, count, level, isBoss: st === cfg().stagesPerChapter };
}

export function stageEnemies(id: string): BattleUnit[] {
  const E = cfg().balance.enemy;
  const { index, chapter, count, level, isBoss } = stageInfo(id);
  const order = cfg().troopOrder;
  const stat = E.statBase + level * E.statPerLevel + Math.pow(index, E.statCurveExp) * E.statCurveMul;
  const troops = Math.round(E.troopsBase + index * E.troopsPerStage + Math.pow(index, E.troopsCurveExp) * E.troopsCurveMul);
  const tier = Math.min(cfg().tiers.length, 1 + Math.floor(index / E.tierEveryStages));
  const units: BattleUnit[] = [];
  const frontSlots = [1, 0, 2];
  const backSlots = [4, 3, 5];
  let fi = 0;
  let bi = 0;
  for (let i = 0; i < count; i++) {
    const boss = isBoss && i === 0;
    const type = boss ? chapter.boss.type : order[Math.floor(hash(index + 1, i + 1) * order.length)];
    const ranged = cfg().troopTypes[type].range === 'ranged';
    const slot = (ranged && bi < 3) || fi >= 3 ? backSlots[bi++] : frontSlots[fi++];
    const jitter = 0.92 + hash(index + 7, i + 3) * 0.16;
    const s = stat * jitter * (boss ? E.bossStatMul : 1);
    const nameIdx = Math.min(chapter.enemyNames.length - 1, Math.floor(hash(index + 3, i + 5) * chapter.enemyNames.length));
    const n = Math.round(troops * (boss ? E.bossTroopMul : 1) * jitter);
    let skill: BattleUnit['skill'] = null;
    if (boss) skill = { id: chapter.boss.skill, lv: 1 + Math.floor(index / E.tierEveryStages) };
    else if (index + 1 >= E.eliteFromStage && i === 1) skill = { id: E.eliteSkill, lv: 1 };
    units.push({
      id: `e${i}`,
      slot,
      name: boss ? chapter.boss.name : chapter.enemyNames[nameIdx],
      stats: { canCot: Math.round(s), voLuc: Math.round(s * 1.02), ngoTinh: Math.round(s * 0.9) },
      type,
      tier,
      troops: n,
      maxTroops: n,
      skill,
      bonus: 0,
      look: { kind: 'enemy', chapter: chapter.id, type, boss },
    });
  }
  return units;
}

export function stageRewards(id: string, first: boolean): Cost {
  const R = cfg().balance.rewards;
  const { index, isBoss } = stageInfo(id);
  const r: Cost = {
    exp: Math.round(R.expBase + index * R.expPerStage),
    luong: Math.round(R.luongBase + index * R.luongPerStage),
    go: Math.round(R.goBase + index * R.goPerStage),
    bac: Math.round(R.bacBase + index * R.bacPerStage),
  };
  if (first) {
    r.tieuHoanDan = R.firstPillsBase + Math.floor(index / R.firstPillsEvery);
    r.nguyenbao = isBoss ? R.bossNguyenBaoBase + index * R.bossNguyenBaoPerStage : R.firstNguyenBao;
    if (isBoss) {
      r.huyenThiet = R.bossHuyenThietBase + index;
      r.biKip = 1 + Math.floor(index / R.bossBiKipEvery);
    }
    return r;
  }
  return {
    exp: Math.round(r.exp * R.repeatExpPct),
    luong: Math.round(r.luong * R.repeatResPct),
    go: Math.round(r.go * R.repeatResPct),
    bac: Math.round(r.bac * R.repeatResPct),
  };
}

export function isStageUnlocked(state: GameState, id: string): boolean {
  const { ch, st } = parseStage(id);
  const chapter = cfg().chapters.find((c) => c.id === ch);
  if (!chapter || state.player.level < chapter.reqLevel) return false;
  const first = cfg().chapters[0];
  if (ch === first.id && st === 1) return true;
  const prevCh = cfg().chapters[cfg().chapters.indexOf(chapter) - 1];
  const prev = st > 1 ? stageId(ch, st - 1) : prevCh ? stageId(prevCh.id, cfg().stagesPerChapter) : '';
  return (state.campaign.stars[prev] || 0) > 0;
}

export function nextStage(state: GameState): string | null {
  for (const id of allStages()) if (!state.campaign.stars[id]) return id;
  return null;
}

export function addPlayerExp(state: GameState, amount: number): number {
  state.player.exp += amount;
  let leveled = 0;
  while (state.player.level < cfg().balance.playerMaxLevel) {
    const need = playerExpToNext(state.player.level);
    if (state.player.exp < need) break;
    state.player.exp -= need;
    state.player.level++;
    leveled++;
  }
  return leveled;
}

function grantRewards(state: GameState, rewards: Cost, heroUids: number[]): number {
  const { exp = 0, ...rest } = rewards;
  gain(state, rest);
  const levels = addPlayerExp(state, exp);
  for (const uid of heroUids) {
    const h = findHero(state, uid);
    if (h) addHeroExp(state, h, exp);
  }
  return levels;
}

export function fightCheck(state: GameState, id: string): ActionResult {
  if (!isStageUnlocked(state, id)) {
    const { chapter } = stageInfo(id);
    if (state.player.level < chapter.reqLevel) return { ok: false, reason: `Cần cấp chưởng môn ${chapter.reqLevel}` };
    return { ok: false, reason: 'Vượt ải trước đó đã' };
  }
  if (state.stamina.cur < cfg().balance.stamina.perWin) return { ok: false, reason: 'Không đủ thể lực' };
  return { ok: true };
}

export interface FightOutcome extends ActionResult {
  result: BattleResult;
  team: BattleUnit[];
  enemies: BattleUnit[];
  rewards: Cost | null;
  stars: number;
  levels: number;
  stageId: string;
}

export function fightStage(state: GameState, id: string): FightOutcome | ActionResult {
  const chk = fightCheck(state, id);
  if (!chk.ok) return chk;
  if (state.settings.autoRefill) refillTeam(state);
  const team = teamUnits(state);
  if (!team.length) return { ok: false, reason: 'Đội hình chưa có ai còn quân. Bổ sung quân trước.' };
  const enemies = stageEnemies(id);
  const seed = (rand(state) * 4294967296) >>> 0;
  const result = simulateBattle(team, enemies, seed);
  state.stats.battles++;

  for (const u of result.A) {
    const h = findHero(state, u.id as number);
    if (h) h.troops = u.troops;
  }

  const ST = cfg().balance.stamina;
  let rewards: Cost | null = null;
  let stars = 0;
  let levels = 0;
  if (result.win) {
    state.stats.wins++;
    state.stamina.cur -= ST.perWin;
    const first = !state.campaign.stars[id];
    const [t3, t2] = cfg().balance.starThresholds;
    stars = result.lossRatio <= t3 ? 3 : result.lossRatio <= t2 ? 2 : 1;
    state.campaign.stars[id] = Math.max(state.campaign.stars[id] || 0, stars);
    rewards = stageRewards(id, first);
    levels = grantRewards(state, rewards, team.map((u) => u.id as number));
  } else {
    state.stamina.cur -= ST.perLoss;
  }
  return { ok: true, result, team, enemies, rewards, stars, levels, stageId: id };
}

export function sweepCost(id: string): Cost {
  const R = cfg().balance.rewards;
  return { luong: Math.round(R.sweepLuongBase + stageInfo(id).index * R.sweepLuongPerStage) };
}

/** Càn quét ải đã đạt 3 sao: tốn thể lực và một ít lương thực, không cần đánh. */
export function sweepStage(state: GameState, id: string, times = 1): ActionResult & { done?: number; total?: Cost; levels?: number } {
  if ((state.campaign.stars[id] || 0) < 3) return { ok: false, reason: 'Cần đạt 3 sao để càn quét' };
  const cost = sweepCost(id);
  const per = cfg().balance.stamina.perWin;
  let done = 0;
  const total: Cost = { exp: 0, luong: 0, go: 0, bac: 0 };
  let levels = 0;
  const team = state.team.filter((x): x is number => x !== null);
  while (done < times && state.stamina.cur >= per && state.res.luong >= cost.luong) {
    state.stamina.cur -= per;
    state.res.luong -= cost.luong;
    const r = stageRewards(id, false);
    if (rand(state) < cfg().balance.rewards.sweepPillChance) r.tieuHoanDan = 1;
    levels += grantRewards(state, r, team);
    for (const [k, v] of Object.entries(r)) total[k] = (total[k] || 0) + v;
    done++;
  }
  if (!done) return { ok: false, reason: state.stamina.cur < per ? 'Không đủ thể lực' : 'Thiếu lương thực' };
  return { ok: true, done, total, levels, msg: `Càn quét ${done} lần` };
}
