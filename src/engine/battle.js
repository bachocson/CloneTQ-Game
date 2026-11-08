// Mô phỏng trận đánh tự động theo lượt. Hàm thuần: không đụng tới state game.
// Đội hình 2 hàng x 3 cột: ô 0-2 là hàng trước, 3-5 hàng sau. Cột = ô % 3.
//
// unit = { id, slot, name, stats: { canCot, voLuc, ngoTinh }, type, tier, troops, maxTroops,
//          skill: { id, lv } | null, bonus (cộng % công từ sở trường/phe), look (dùng cho UI) }

import { TROOP_TYPES, TIER_MULT } from '../data/troops.js';
import { SKILLS } from '../data/heroes.js';
import { BALANCE } from '../data/balance.js';
import { mulberry32 } from './rng.js';

const isFront = (u) => u.slot < 3;
const lane = (u) => u.slot % 3;
const alive = (list) => list.filter((u) => u.troops > 0);

function pickByLane(candidates, fromLane) {
  if (!candidates.length) return null;
  let best = null;
  let bestDist = 99;
  for (const c of candidates) {
    const d = Math.abs(lane(c) - fromLane);
    if (d < bestDist || (d === bestDist && c.slot < best.slot)) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}

function rowTargets(enemies, preferBack) {
  const live = alive(enemies);
  const front = live.filter(isFront);
  const back = live.filter((u) => !isFront(u));
  if (preferBack) return back.length ? back : front;
  return front.length ? front : back;
}

function normalTarget(att, enemies) {
  const tt = TROOP_TYPES[att.type];
  return pickByLane(rowTargets(enemies, tt.range === 'ranged'), lane(att));
}

function pickRandom(rng, list, n) {
  const pool = [...list];
  const out = [];
  while (pool.length && out.length < n) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

function skillTargets(att, skill, enemies, rng) {
  const live = alive(enemies);
  switch (skill.target) {
    case 'single': return [normalTarget(att, enemies)].filter(Boolean);
    case 'row': return rowTargets(enemies, false);
    case 'back': return rowTargets(enemies, true);
    case 'all': return live;
    case 'random2': return pickRandom(rng, live, 2);
    case 'random3': return pickRandom(rng, live, 3);
    case 'weakest': return live.length ? [live.reduce((a, b) => (b.troops < a.troops ? b : a))] : [];
    default: return [normalTarget(att, enemies)].filter(Boolean);
  }
}

function buffSum(u, type) {
  return u.buffs.filter((b) => b.type === type).reduce((s, b) => s + b.pct, 0);
}

export function unitSpeed(u) {
  return TROOP_TYPES[u.type].speed * 10 + u.stats.ngoTinh * 0.05;
}

// Sát thương (tính bằng số đệ tử bị hạ)
export function computeHit(att, def, { mult = 1, stat = null, isSkill = false }, rng) {
  const ta = TROOP_TYPES[att.type];
  const td = TROOP_TYPES[def.type];
  const dmgType = ta.dmgType;
  const sa = att.stats;
  const sd = def.stats;
  const atkStat = stat ? sa[stat] : dmgType === 'doc' ? sa.ngoTinh * 0.7 + sa.voLuc * 0.3 : sa.voLuc;
  const atkMul = 1 + (att.bonus || 0) + buffSum(att, 'buffAtk') - buffSum(att, 'atkDown');
  const atk = atkStat * ta.atk * TIER_MULT[att.tier - 1] * Math.max(0.2, atkMul);
  const defStat = dmgType === 'doc' ? sd.ngoTinh * 0.6 + sd.canCot * 0.4 : sd.canCot * 0.8 + sd.voLuc * 0.2;
  const defMul = Math.max(0.2, 1 - buffSum(def, 'defDown'));
  const defense = defStat * (dmgType === 'doc' ? td.defDoc : td.defNgoai) * TIER_MULT[def.tier - 1] * defMul;
  const base = (atk * 100) / (100 + defense);

  let counter = 1;
  if (ta.beats.includes(def.type)) counter = BALANCE.counterBonus;
  else if (td.beats.includes(att.type)) counter = BALANCE.counterPenalty;

  const critChance = BALANCE.critBase + sa.ngoTinh / 2500;
  const crit = rng() < critChance;
  const variance = 0.92 + rng() * 0.16;
  const troopFactor = isSkill ? Math.max(att.troops, att.maxTroops * 0.35) : att.troops;
  const dmg = base * troopFactor * BALANCE.damageK * counter * variance * mult * (crit ? 1.5 : 1);
  const hpPer = td.hp * TIER_MULT[def.tier - 1];
  const kills = Math.min(def.troops, Math.max(1, Math.round(dmg / hpPer)));
  return { kills, crit, counter };
}

function cloneUnit(u, side) {
  return {
    ...u,
    stats: { ...u.stats },
    side,
    uid: `${side}${u.slot}`,
    khi: BALANCE.khiStart,
    buffs: [],
    stun: 0,
    poison: [],
    startTroops: u.troops,
  };
}

export function simulateBattle(teamA, teamB, seed) {
  const rng = mulberry32(seed);
  const A = teamA.map((u) => cloneUnit(u, 'A'));
  const B = teamB.map((u) => cloneUnit(u, 'B'));
  const all = [...A, ...B];
  const log = [];
  const enemiesOf = (u) => (u.side === 'A' ? B : A);
  const alliesOf = (u) => (u.side === 'A' ? A : B);
  let round = 0;
  let winner = null;

  const checkEnd = () => {
    if (!alive(B).length) winner = 'A';
    else if (!alive(A).length) winner = 'B';
    return winner;
  };

  while (!winner && round < BALANCE.maxRounds) {
    round++;
    log.push({ t: 'round', n: round });
    const order = alive(all)
      .map((u) => ({ u, s: unitSpeed(u) + rng() * 2 }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.u);

    for (const u of order) {
      if (winner) break;
      if (u.troops <= 0) continue;

      // Độc phát tác đầu lượt
      if (u.poison.length) {
        let kills = 0;
        for (const p of u.poison) kills += p.kills;
        kills = Math.min(u.troops, kills);
        u.troops -= kills;
        u.poison = u.poison.map((p) => ({ ...p, turns: p.turns - 1 })).filter((p) => p.turns > 0);
        log.push({ t: 'poison', u: u.uid, kills, left: u.troops });
        if (u.troops <= 0) {
          if (checkEnd()) break;
          continue;
        }
      }

      if (u.stun > 0) {
        u.stun--;
        log.push({ t: 'stun', u: u.uid });
        continue;
      }

      const skill = u.skill ? SKILLS[u.skill.id] : null;
      const useSkill = skill && u.khi >= 100;
      const enemies = enemiesOf(u);
      const ev = { t: 'act', a: u.uid, kind: useSkill ? 'skill' : 'atk', skill: useSkill ? skill.name : null, hits: [], fx: [] };

      if (useSkill) {
        u.khi -= 100;
        const mult = skill.mult * (1 + 0.08 * ((u.skill.lv || 1) - 1));
        const targets = skillTargets(u, skill, enemies, rng);
        for (const d of targets) {
          const hit = computeHit(u, d, { mult, stat: skill.stat, isSkill: true }, rng);
          d.troops -= hit.kills;
          d.khi += BALANCE.khiPerHit;
          ev.hits.push({ d: d.uid, kills: hit.kills, crit: hit.crit, left: d.troops });
          for (const e of skill.effects) {
            if (e.self || e.type.startsWith('team')) continue;
            if (d.troops <= 0) continue;
            if (e.type === 'stun' && rng() < e.chance) {
              d.stun = Math.max(d.stun, e.turns);
              ev.fx.push({ u: d.uid, type: 'stun' });
            } else if (e.type === 'poison') {
              d.poison.push({ kills: Math.max(1, Math.round(hit.kills * e.pct)), turns: e.turns });
              ev.fx.push({ u: d.uid, type: 'poison' });
            } else if (e.type === 'defDown' || e.type === 'atkDown') {
              d.buffs.push({ type: e.type, pct: e.pct, turns: e.turns });
              ev.fx.push({ u: d.uid, type: e.type });
            } else if (e.type === 'khiDrain') {
              d.khi = Math.max(0, d.khi - e.amount);
              ev.fx.push({ u: d.uid, type: 'khiDrain' });
            }
          }
        }
        for (const e of skill.effects) {
          if (e.type === 'buffAtk' && e.self) {
            u.buffs.push({ type: 'buffAtk', pct: e.pct, turns: e.turns + 1 });
            ev.fx.push({ u: u.uid, type: 'buffAtk' });
          } else if (e.type === 'heal' && e.self) {
            const amt = Math.round((u.maxTroops - u.troops) * e.pct);
            u.troops += amt;
            ev.fx.push({ u: u.uid, type: 'heal', amount: amt, left: u.troops });
          } else if (e.type === 'teamBuffAtk') {
            for (const al of alive(alliesOf(u))) {
              al.buffs.push({ type: 'buffAtk', pct: e.pct, turns: e.turns + (al === u ? 1 : 0) });
              ev.fx.push({ u: al.uid, type: 'buffAtk' });
            }
          } else if (e.type === 'teamHeal') {
            for (const al of alive(alliesOf(u))) {
              const amt = Math.round((al.maxTroops - al.troops) * e.pct);
              al.troops += amt;
              ev.fx.push({ u: al.uid, type: 'heal', amount: amt, left: al.troops });
            }
          }
        }
      } else {
        const d = normalTarget(u, enemies);
        if (d) {
          const hit = computeHit(u, d, {}, rng);
          d.troops -= hit.kills;
          d.khi += BALANCE.khiPerHit;
          u.khi += BALANCE.khiPerAttack;
          ev.hits.push({ d: d.uid, kills: hit.kills, crit: hit.crit, left: d.troops });
        }
      }
      log.push(ev);

      // Hết lượt: giảm thời gian hiệu ứng
      u.buffs = u.buffs.map((b) => ({ ...b, turns: b.turns - 1 })).filter((b) => b.turns > 0);
      if (checkEnd()) break;
    }
  }

  if (!winner) winner = 'B'; // hết lượt: bên tấn công thua
  const win = winner === 'A';
  log.push({ t: 'end', win });

  const startA = A.reduce((s, u) => s + u.startTroops, 0);
  const endA = A.reduce((s, u) => s + Math.max(0, u.troops), 0);
  return {
    win,
    rounds: round,
    log,
    A: A.map((u) => ({ id: u.id, slot: u.slot, troops: Math.max(0, u.troops) })),
    B: B.map((u) => ({ id: u.id, slot: u.slot, troops: Math.max(0, u.troops) })),
    lossRatio: startA ? 1 - endA / startA : 1,
  };
}
