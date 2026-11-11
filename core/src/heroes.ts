// Hiệp khách: chỉ số, cấp, quân số, tuyệt kỹ, đội hình, bậc binh chủng.

import { cfg, deploySlotsFor, factionBonusFor, heroExpToNext, maxTroopsFor, power } from './config.js';
import { equipStatValue } from './equipment.js';
import { canAfford, pay, missingFor } from './economy.js';
import type { BattleUnit } from './battle.js';
import type { ActionResult, Cost, GameState, Hero, Stats } from './types.js';

const STAT_KEYS = ['canCot', 'voLuc', 'ngoTinh'] as const;

export function findHero(state: GameState, uid: number | null | undefined): Hero | null {
  return state.heroes.find((h) => h.uid === uid) || null;
}

export function heroStats(state: GameState, h: Hero): Stats {
  const t = cfg().heroes[h.tid];
  const out = { canCot: 0, voLuc: 0, ngoTinh: 0 } as Stats;
  STAT_KEYS.forEach((k, i) => {
    out[k] = t.base[i] + t.growth[i] * (h.level - 1);
  });
  for (const eqUid of Object.values(h.equip)) {
    if (!eqUid) continue;
    const eq = state.equipment.find((e) => e.uid === eqUid);
    if (eq) {
      const { stat, value } = equipStatValue(eq);
      out[stat] += value;
    }
  }
  for (const k of STAT_KEYS) out[k] = Math.round(out[k] * 10) / 10;
  return out;
}

export function heroMaxTroops(state: GameState, h: Hero): number {
  return maxTroopsFor(heroStats(state, h).canCot, state.buildings.luyenVo || 0);
}

/** Lực chiến ước tính, chỉ dùng để hiển thị và gợi ý */
export function heroPower(state: GameState, h: Hero): number {
  const s = heroStats(state, h);
  const tier = state.troopTiers[h.troopType];
  return Math.round((s.canCot + s.voLuc + s.ngoTinh) * (1 + 0.2 * (tier - 1)) * (1 + 0.05 * (h.skillLv - 1)) + heroMaxTroops(state, h) * 0.3);
}

export function addHeroExp(state: GameState, h: Hero, amount: number): number {
  h.exp += amount;
  let leveled = 0;
  while (h.level < state.player.level) {
    const need = heroExpToNext(h.level);
    if (h.exp < need) break;
    h.exp -= need;
    h.level++;
    leveled++;
  }
  if (h.level >= state.player.level) h.exp = Math.min(h.exp, heroExpToNext(h.level) - 1);
  return leveled;
}

export function useExpItem(state: GameState, uid: number, item: string, count = 1): ActionResult {
  const h = findHero(state, uid);
  const def = cfg().items[item];
  if (!h) return { ok: false, reason: 'Không tìm thấy hiệp khách' };
  if (!def || !def.exp) return { ok: false, reason: 'Vật phẩm không dùng được' };
  if (h.level >= state.player.level) return { ok: false, reason: 'Đã đạt giới hạn cấp (bằng cấp chưởng môn)' };
  if ((state.items[item] || 0) <= 0) return { ok: false, reason: `Hết ${def.name}` };
  let used = 0;
  while (used < count && state.items[item] > 0 && h.level < state.player.level) {
    state.items[item]--;
    addHeroExp(state, h, def.exp);
    used++;
  }
  return { ok: true, msg: `Dùng ${used} ${def.name}, ${cfg().heroes[h.tid].name} đạt cấp ${h.level}` };
}

export function refillCost(state: GameState, h: Hero, count: number): Cost {
  const tier = state.troopTiers[h.troopType];
  const R = cfg().balance.refill;
  return { luong: Math.ceil(count * R.luong * tier), bac: Math.ceil(count * R.bac * tier) };
}

/** Bổ sung quân. Thiếu tài nguyên thì bổ sung được bao nhiêu hay bấy nhiêu. */
export function refillHero(state: GameState, h: Hero): number {
  const missing = heroMaxTroops(state, h) - h.troops;
  if (missing <= 0) return 0;
  const tier = state.troopTiers[h.troopType];
  const R = cfg().balance.refill;
  const perL = R.luong * tier;
  const perB = R.bac * tier;
  const afford = Math.floor(Math.min(perL ? state.res.luong / perL : Infinity, perB ? state.res.bac / perB : Infinity));
  const n = Math.max(0, Math.min(missing, afford));
  if (n <= 0) return 0;
  const cost = refillCost(state, h, n);
  state.res.luong = Math.max(0, state.res.luong - cost.luong);
  state.res.bac = Math.max(0, state.res.bac - cost.bac);
  h.troops += n;
  return n;
}

export function refillTeam(state: GameState, onlyTeam = true): number {
  const uids = onlyTeam ? state.team.filter((x): x is number => x !== null) : state.heroes.map((h) => h.uid);
  let total = 0;
  for (const uid of uids) {
    const h = findHero(state, uid);
    if (h) total += refillHero(state, h);
  }
  return total;
}

export function setTroopType(state: GameState, uid: number, type: string): ActionResult {
  const h = findHero(state, uid);
  if (!h || !cfg().troopTypes[type]) return { ok: false, reason: 'Không hợp lệ' };
  if (h.troopType === type) return { ok: true, msg: '' };
  h.troopType = type;
  h.troops = 0; // đổi hệ thì giải tán đệ tử cũ
  return { ok: true, msg: `${cfg().heroes[h.tid].name} chuyển sang dẫn đệ tử hệ ${cfg().troopTypes[type].name}` };
}

export function skillMaxLevel(state: GameState, h: Hero): number {
  return Math.min(1 + (state.buildings.tangKinh || 0), 1 + Math.floor(h.level / cfg().balance.skillHeroLevelStep));
}

export function skillUpgradeCost(h: Hero): Cost {
  return { biKip: h.skillLv, bac: power(cfg().balance.skillCostBac, h.skillLv) };
}

export function upgradeSkill(state: GameState, uid: number): ActionResult {
  const h = findHero(state, uid);
  if (!h) return { ok: false, reason: 'Không tìm thấy hiệp khách' };
  if (h.skillLv >= skillMaxLevel(state, h)) return { ok: false, reason: 'Đã đạt giới hạn (cần Tàng Kinh Các cao hơn hoặc hiệp khách cấp cao hơn)' };
  const cost = skillUpgradeCost(h);
  if (!canAfford(state, cost)) return { ok: false, reason: 'Thiếu nguyên liệu', missing: missingFor(state, cost) };
  pay(state, cost);
  h.skillLv++;
  return { ok: true, msg: `${cfg().skills[cfg().heroes[h.tid].skill].name} đạt cấp ${h.skillLv}` };
}

export function researchCheck(state: GameState, type: string): ActionResult & { cost?: Cost; next?: number } {
  const next = state.troopTiers[type] + 1;
  const tiers = cfg().tiers;
  if (next > tiers.length) return { ok: false, reason: 'Đã đạt bậc cao nhất' };
  const r = tiers[next - 1];
  if ((state.buildings.luyenVo || 0) < r.reqLuyenVo) return { ok: false, reason: `Cần Luyện Võ Trường cấp ${r.reqLuyenVo}` };
  if (!canAfford(state, r.cost)) return { ok: false, reason: 'Thiếu tài nguyên', missing: missingFor(state, r.cost), cost: r.cost };
  return { ok: true, cost: r.cost, next };
}

export function researchTier(state: GameState, type: string): ActionResult {
  const chk = researchCheck(state, type);
  if (!chk.ok || !chk.cost || !chk.next) return chk;
  pay(state, chk.cost);
  state.troopTiers[type] = chk.next;
  const tt = cfg().troopTypes[type];
  return { ok: true, msg: `Đệ tử hệ ${tt.name} lên bậc ${chk.next}: ${tt.tiers[chk.next - 1]}` };
}

export function deployLimit(state: GameState): number {
  return deploySlotsFor(state.player.level);
}

export function setTeamSlot(state: GameState, slot: number, uid: number | null): ActionResult {
  if (slot < 0 || slot > 5) return { ok: false, reason: 'Ô không hợp lệ' };
  if (uid !== null && !findHero(state, uid)) return { ok: false, reason: 'Không tìm thấy hiệp khách' };
  const team = [...state.team];
  const prev = uid === null ? -1 : team.indexOf(uid);
  if (prev >= 0) {
    team[prev] = team[slot];
    team[slot] = uid;
  } else {
    team[slot] = uid;
  }
  if (team.filter(Boolean).length > deployLimit(state)) {
    return { ok: false, reason: `Chỉ được xuất trận ${deployLimit(state)} người ở cấp chưởng môn hiện tại` };
  }
  state.team = team;
  return { ok: true, msg: '' };
}

export function factionCounts(state: GameState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const uid of state.team) {
    const h = findHero(state, uid);
    if (h) {
      const f = cfg().heroes[h.tid].faction;
      counts[f] = (counts[f] || 0) + 1;
    }
  }
  return counts;
}

/** Đổi đội hình thành đơn vị chiến đấu */
export function teamUnits(state: GameState): BattleUnit[] {
  const counts = factionCounts(state);
  const units: BattleUnit[] = [];
  state.team.forEach((uid, slot) => {
    const h = findHero(state, uid);
    if (!h || h.troops <= 0) return;
    const t = cfg().heroes[h.tid];
    units.push({
      id: h.uid,
      slot,
      name: t.name,
      stats: heroStats(state, h),
      type: h.troopType,
      tier: state.troopTiers[h.troopType],
      troops: h.troops,
      maxTroops: heroMaxTroops(state, h),
      skill: { id: t.skill, lv: h.skillLv },
      bonus: (h.troopType === t.school ? cfg().balance.combat.schoolBonus : 0) + factionBonusFor(counts[t.faction] || 0),
      look: { kind: 'hero', tid: h.tid, type: h.troopType },
    });
  });
  return units;
}

export function rosterLimit(state: GameState): number {
  const tv = cfg().balance.tavern;
  return Math.floor(tv.rosterBase + (state.buildings.tuuLau || 0) * tv.rosterPerLevel);
}

export function releaseHero(state: GameState, uid: number): ActionResult {
  const h = findHero(state, uid);
  if (!h) return { ok: false, reason: 'Không tìm thấy hiệp khách' };
  if (state.heroes.length <= 1) return { ok: false, reason: 'Phải giữ ít nhất 1 hiệp khách' };
  state.team = state.team.map((x) => (x === uid ? null : x));
  state.heroes = state.heroes.filter((x) => x.uid !== uid);
  let totalExp = h.exp;
  for (let l = 1; l < h.level; l++) totalExp += heroExpToNext(l);
  const pillExp = cfg().items.tieuHoanDan?.exp || 150;
  const pills = Math.floor((totalExp * cfg().balance.releaseExpRefund) / pillExp);
  state.items.tieuHoanDan = (state.items.tieuHoanDan || 0) + pills;
  return { ok: true, msg: `${cfg().heroes[h.tid].name} rời môn phái. Nhận lại ${pills} Tiểu Hoàn Đan.` };
}
