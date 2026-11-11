// Mô phỏng trận đánh tự động theo lượt. Hàm thuần: không đụng tới state game.
// Đội hình 2 hàng x 3 cột: ô 0-2 là hàng trước, 3-5 hàng sau. Cột = ô % 3.

import { cfg, tierMult } from './config.js';
import { mulberry32 } from './rng.js';
import type { SkillDef, StatKey, Stats } from './types.js';

export interface UnitLook {
  kind: 'hero' | 'enemy';
  tid?: string;
  chapter?: number;
  type: string;
  boss?: boolean;
}

export interface BattleUnit {
  id: number | string;
  slot: number;
  name: string;
  stats: Stats;
  type: string;
  tier: number;
  troops: number;
  maxTroops: number;
  skill: { id: string; lv: number } | null;
  bonus: number;
  look?: UnitLook;
}

interface Buff { type: 'buffAtk' | 'atkDown' | 'defDown'; pct: number; turns: number }
interface LiveUnit extends BattleUnit {
  side: 'A' | 'B';
  uid: string;
  khi: number;
  buffs: Buff[];
  stun: number;
  poison: { kills: number; turns: number }[];
  startTroops: number;
}

export interface Hit { d: string; kills: number; crit: boolean; left: number }
export interface Fx { u: string; type: string; amount?: number; left?: number }
export type BattleEvent =
  | { t: 'round'; n: number }
  | { t: 'act'; a: string; kind: 'atk' | 'skill'; skill: string | null; hits: Hit[]; fx: Fx[] }
  | { t: 'poison'; u: string; kills: number; left: number }
  | { t: 'stun'; u: string }
  | { t: 'end'; win: boolean };

export interface BattleResult {
  win: boolean;
  rounds: number;
  log: BattleEvent[];
  A: { id: number | string; slot: number; troops: number }[];
  B: { id: number | string; slot: number; troops: number }[];
  lossRatio: number;
}

const isFront = (u: BattleUnit) => u.slot < 3;
const lane = (u: BattleUnit) => u.slot % 3;
const alive = <T extends BattleUnit>(list: T[]) => list.filter((u) => u.troops > 0);

function pickByLane<T extends BattleUnit>(candidates: T[], fromLane: number): T | null {
  let best: T | null = null;
  let bestDist = 99;
  for (const c of candidates) {
    const d = Math.abs(lane(c) - fromLane);
    if (d < bestDist || (d === bestDist && best && c.slot < best.slot)) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}

function rowTargets<T extends BattleUnit>(enemies: T[], preferBack: boolean): T[] {
  const live = alive(enemies);
  const front = live.filter(isFront);
  const back = live.filter((u) => !isFront(u));
  if (preferBack) return back.length ? back : front;
  return front.length ? front : back;
}

function normalTarget<T extends BattleUnit>(att: BattleUnit, enemies: T[]): T | null {
  const tt = cfg().troopTypes[att.type];
  return pickByLane(rowTargets(enemies, tt.range === 'ranged'), lane(att));
}

function pickRandom<T>(rng: () => number, list: T[], n: number): T[] {
  const pool = [...list];
  const out: T[] = [];
  while (pool.length && out.length < n) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

function skillTargets(att: LiveUnit, skill: SkillDef, enemies: LiveUnit[], rng: () => number): LiveUnit[] {
  const live = alive(enemies);
  const single = () => [normalTarget(att, enemies)].filter((x): x is LiveUnit => !!x);
  switch (skill.target) {
    case 'single': return single();
    case 'row': return rowTargets(enemies, false);
    case 'back': return rowTargets(enemies, true);
    case 'all': return live;
    case 'random2': return pickRandom(rng, live, 2);
    case 'random3': return pickRandom(rng, live, 3);
    case 'weakest': return live.length ? [live.reduce((a, b) => (b.troops < a.troops ? b : a))] : [];
    default: return single();
  }
}

function buffSum(u: { buffs?: Buff[] }, type: Buff['type']): number {
  return (u.buffs || []).filter((b) => b.type === type).reduce((s, b) => s + b.pct, 0);
}

export function unitSpeed(u: BattleUnit): number {
  return cfg().troopTypes[u.type].speed * 10 + u.stats.ngoTinh * 0.05;
}

/** Sát thương, tính bằng số đệ tử bị hạ */
export function computeHit(
  att: BattleUnit & { buffs?: Buff[] },
  def: BattleUnit & { buffs?: Buff[] },
  opts: { mult?: number; stat?: StatKey | null; isSkill?: boolean },
  rng: () => number,
): { kills: number; crit: boolean; counter: number } {
  const { mult = 1, stat = null, isSkill = false } = opts;
  const C = cfg().balance.combat;
  const ta = cfg().troopTypes[att.type];
  const td = cfg().troopTypes[def.type];
  const dmgType = ta.dmgType;
  const sa = att.stats;
  const sd = def.stats;
  const atkStat = stat ? sa[stat] : dmgType === 'doc' ? sa.ngoTinh * 0.7 + sa.voLuc * 0.3 : sa.voLuc;
  const atkMul = 1 + (att.bonus || 0) + buffSum(att, 'buffAtk') - buffSum(att, 'atkDown');
  const atk = atkStat * ta.atk * tierMult(att.tier) * Math.max(0.2, atkMul);
  const defStat = dmgType === 'doc' ? sd.ngoTinh * 0.6 + sd.canCot * 0.4 : sd.canCot * 0.8 + sd.voLuc * 0.2;
  const defMul = Math.max(0.2, 1 - buffSum(def, 'defDown'));
  const defense = defStat * (dmgType === 'doc' ? td.defDoc : td.defNgoai) * tierMult(def.tier) * defMul;
  const base = (atk * 100) / (100 + defense);

  let counter = 1;
  if (ta.beats.includes(def.type)) counter = C.counterBonus;
  else if (td.beats.includes(att.type)) counter = C.counterPenalty;

  const crit = rng() < C.critBase + sa.ngoTinh * C.critPerNgoTinh;
  const variance = 0.92 + rng() * 0.16;
  const troopFactor = isSkill ? Math.max(att.troops, att.maxTroops * C.skillMinTroopPct) : att.troops;
  const dmg = base * troopFactor * C.damageK * counter * variance * mult * (crit ? C.critMult : 1);
  const hpPer = td.hp * tierMult(def.tier);
  const kills = Math.min(def.troops, Math.max(1, Math.round(dmg / hpPer)));
  return { kills, crit, counter };
}

function cloneUnit(u: BattleUnit, side: 'A' | 'B'): LiveUnit {
  return {
    ...u,
    stats: { ...u.stats },
    side,
    uid: `${side}${u.slot}`,
    khi: cfg().balance.combat.khiStart,
    buffs: [],
    stun: 0,
    poison: [],
    startTroops: u.troops,
  };
}

export function simulateBattle(teamA: BattleUnit[], teamB: BattleUnit[], seed: number): BattleResult {
  const C = cfg().balance.combat;
  const rng = mulberry32(seed);
  const A = teamA.map((u) => cloneUnit(u, 'A'));
  const B = teamB.map((u) => cloneUnit(u, 'B'));
  const all = [...A, ...B];
  const log: BattleEvent[] = [];
  const enemiesOf = (u: LiveUnit) => (u.side === 'A' ? B : A);
  const alliesOf = (u: LiveUnit) => (u.side === 'A' ? A : B);
  let round = 0;
  let winner: 'A' | 'B' | null = null;

  const checkEnd = () => {
    if (!alive(B).length) winner = 'A';
    else if (!alive(A).length) winner = 'B';
    return winner;
  };

  while (!winner && round < C.maxRounds) {
    round++;
    log.push({ t: 'round', n: round });
    const order = alive(all)
      .map((u) => ({ u, s: unitSpeed(u) + rng() * 2 }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.u);

    for (const u of order) {
      if (winner) break;
      if (u.troops <= 0) continue;

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

      const skill = u.skill ? cfg().skills[u.skill.id] : null;
      const useSkill = !!skill && u.khi >= 100;
      const enemies = enemiesOf(u);
      const ev: Extract<BattleEvent, { t: 'act' }> = { t: 'act', a: u.uid, kind: useSkill ? 'skill' : 'atk', skill: useSkill && skill ? skill.name : null, hits: [], fx: [] };

      if (useSkill && skill && u.skill) {
        u.khi -= 100;
        const mult = skill.mult * (1 + C.skillLevelBonus * ((u.skill.lv || 1) - 1));
        for (const d of skillTargets(u, skill, enemies, rng)) {
          const hit = computeHit(u, d, { mult, stat: skill.stat, isSkill: true }, rng);
          d.troops -= hit.kills;
          d.khi += C.khiPerHit;
          ev.hits.push({ d: d.uid, kills: hit.kills, crit: hit.crit, left: d.troops });
          for (const e of skill.effects) {
            if (e.self || e.type.startsWith('team') || d.troops <= 0) continue;
            if (e.type === 'stun' && rng() < (e.chance ?? 1)) {
              d.stun = Math.max(d.stun, e.turns ?? 1);
              ev.fx.push({ u: d.uid, type: 'stun' });
            } else if (e.type === 'poison') {
              d.poison.push({ kills: Math.max(1, Math.round(hit.kills * (e.pct ?? 0))), turns: e.turns ?? 1 });
              ev.fx.push({ u: d.uid, type: 'poison' });
            } else if (e.type === 'defDown' || e.type === 'atkDown') {
              d.buffs.push({ type: e.type, pct: e.pct ?? 0, turns: e.turns ?? 1 });
              ev.fx.push({ u: d.uid, type: e.type });
            } else if (e.type === 'khiDrain') {
              d.khi = Math.max(0, d.khi - (e.amount ?? 0));
              ev.fx.push({ u: d.uid, type: 'khiDrain' });
            }
          }
        }
        for (const e of skill.effects) {
          if (e.type === 'buffAtk' && e.self) {
            u.buffs.push({ type: 'buffAtk', pct: e.pct ?? 0, turns: (e.turns ?? 1) + 1 });
            ev.fx.push({ u: u.uid, type: 'buffAtk' });
          } else if (e.type === 'heal' && e.self) {
            const amt = Math.round((u.maxTroops - u.troops) * (e.pct ?? 0));
            u.troops += amt;
            ev.fx.push({ u: u.uid, type: 'heal', amount: amt, left: u.troops });
          } else if (e.type === 'teamBuffAtk') {
            for (const al of alive(alliesOf(u))) {
              al.buffs.push({ type: 'buffAtk', pct: e.pct ?? 0, turns: (e.turns ?? 1) + (al === u ? 1 : 0) });
              ev.fx.push({ u: al.uid, type: 'buffAtk' });
            }
          } else if (e.type === 'teamHeal') {
            for (const al of alive(alliesOf(u))) {
              const amt = Math.round((al.maxTroops - al.troops) * (e.pct ?? 0));
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
          d.khi += C.khiPerHit;
          u.khi += C.khiPerAttack;
          ev.hits.push({ d: d.uid, kills: hit.kills, crit: hit.crit, left: d.troops });
        }
      }
      log.push(ev);

      u.buffs = u.buffs.map((b) => ({ ...b, turns: b.turns - 1 })).filter((b) => b.turns > 0);
      if (checkEnd()) break;
    }
  }

  const final = winner as 'A' | 'B' | null; // gán trong checkEnd nên TS không theo dõi được
  const win = final === 'A'; // hết lượt: bên tấn công thua
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
