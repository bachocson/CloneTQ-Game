// Hiệp khách: chỉ số, cấp, quân số, tuyệt kỹ, đội hình, bậc binh chủng.

import { BALANCE, deploySlotsFor } from '../data/balance.js';
import { HEROES, SKILLS } from '../data/heroes.js';
import { TROOP_TYPES, TIER_RESEARCH } from '../data/troops.js';
import { ITEMS } from '../data/resources.js';
import { equipStatValue } from './equipment.js';
import { canAfford, pay, missingFor } from './economy.js';

const STAT_KEYS = ['canCot', 'voLuc', 'ngoTinh'];

export function findHero(state, uid) {
  return state.heroes.find((h) => h.uid === uid) || null;
}

export function heroStats(state, h) {
  const t = HEROES[h.tid];
  const out = {};
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

export function heroMaxTroops(state, h) {
  return BALANCE.maxTroops(heroStats(state, h).canCot, state.buildings.luyenVo || 0);
}

export function heroPower(state, h) {
  const s = heroStats(state, h);
  const tier = state.troopTiers[h.troopType];
  return Math.round((s.canCot + s.voLuc + s.ngoTinh) * (1 + 0.2 * (tier - 1)) * (1 + 0.05 * (h.skillLv - 1)) + heroMaxTroops(state, h) * 0.3);
}

export function addHeroExp(state, h, amount) {
  h.exp += amount;
  let leveled = 0;
  while (h.level < state.player.level) {
    const need = BALANCE.heroExpToNext(h.level);
    if (h.exp < need) break;
    h.exp -= need;
    h.level++;
    leveled++;
  }
  if (h.level >= state.player.level) h.exp = Math.min(h.exp, BALANCE.heroExpToNext(h.level) - 1);
  return leveled;
}

export function useExpItem(state, uid, item, count = 1) {
  const h = findHero(state, uid);
  if (!h) return { ok: false, reason: 'Không tìm thấy hiệp khách' };
  if (!ITEMS[item] || !ITEMS[item].exp) return { ok: false, reason: 'Vật phẩm không dùng được' };
  if (h.level >= state.player.level) return { ok: false, reason: 'Đã đạt giới hạn cấp (bằng cấp chưởng môn)' };
  const have = state.items[item] || 0;
  if (have <= 0) return { ok: false, reason: `Hết ${ITEMS[item].name}` };
  let used = 0;
  while (used < count && state.items[item] > 0 && h.level < state.player.level) {
    state.items[item]--;
    addHeroExp(state, h, ITEMS[item].exp);
    used++;
  }
  return { ok: true, msg: `Dùng ${used} ${ITEMS[item].name}, ${HEROES[h.tid].name} đạt cấp ${h.level}` };
}

export function refillCost(state, h, count) {
  const tier = state.troopTiers[h.troopType];
  return {
    luong: Math.ceil(count * BALANCE.refillCostPerTroop.luong * tier),
    bac: Math.ceil(count * BALANCE.refillCostPerTroop.bac * tier),
  };
}

// Bổ sung quân. Thiếu tài nguyên thì bổ sung được bao nhiêu hay bấy nhiêu.
export function refillHero(state, h) {
  const max = heroMaxTroops(state, h);
  const missing = max - h.troops;
  if (missing <= 0) return 0;
  const tier = state.troopTiers[h.troopType];
  const perL = BALANCE.refillCostPerTroop.luong * tier;
  const perB = BALANCE.refillCostPerTroop.bac * tier;
  const afford = Math.floor(Math.min(state.res.luong / perL, state.res.bac / perB));
  const n = Math.max(0, Math.min(missing, afford));
  if (n <= 0) return 0;
  const cost = refillCost(state, h, n);
  state.res.luong = Math.max(0, state.res.luong - cost.luong);
  state.res.bac = Math.max(0, state.res.bac - cost.bac);
  h.troops += n;
  return n;
}

export function refillTeam(state, onlyTeam = true) {
  const uids = onlyTeam ? state.team.filter(Boolean) : state.heroes.map((h) => h.uid);
  let total = 0;
  for (const uid of uids) {
    const h = findHero(state, uid);
    if (h) total += refillHero(state, h);
  }
  return total;
}

export function setTroopType(state, uid, type) {
  const h = findHero(state, uid);
  if (!h || !TROOP_TYPES[type]) return { ok: false, reason: 'Không hợp lệ' };
  if (h.troopType === type) return { ok: true, msg: '' };
  h.troopType = type;
  h.troops = 0; // đổi hệ thì giải tán đệ tử cũ
  return { ok: true, msg: `${HEROES[h.tid].name} chuyển sang dẫn đệ tử hệ ${TROOP_TYPES[type].name}` };
}

export function skillMaxLevel(state, h) {
  return Math.min(1 + (state.buildings.tangKinh || 0), 1 + Math.floor(h.level / 5));
}

export function skillUpgradeCost(h) {
  return { biKip: h.skillLv, bac: Math.floor(500 * Math.pow(h.skillLv, 1.5)) };
}

export function upgradeSkill(state, uid) {
  const h = findHero(state, uid);
  if (!h) return { ok: false, reason: 'Không tìm thấy hiệp khách' };
  if (h.skillLv >= skillMaxLevel(state, h)) return { ok: false, reason: 'Đã đạt giới hạn (cần Tàng Kinh Các cao hơn hoặc hiệp khách cấp cao hơn)' };
  const cost = skillUpgradeCost(h);
  if (!canAfford(state, cost)) return { ok: false, reason: 'Thiếu nguyên liệu', missing: missingFor(state, cost) };
  pay(state, cost);
  h.skillLv++;
  return { ok: true, msg: `${SKILLS[HEROES[h.tid].skill].name} đạt cấp ${h.skillLv}` };
}

export function researchCheck(state, type) {
  const next = state.troopTiers[type] + 1;
  if (next > 5) return { ok: false, reason: 'Đã đạt bậc cao nhất' };
  const r = TIER_RESEARCH[next - 1];
  if ((state.buildings.luyenVo || 0) < r.reqLuyenVo) return { ok: false, reason: `Cần Luyện Võ Trường cấp ${r.reqLuyenVo}` };
  if (!canAfford(state, r.cost)) return { ok: false, reason: 'Thiếu tài nguyên', missing: missingFor(state, r.cost), cost: r.cost };
  return { ok: true, cost: r.cost, next };
}

export function researchTier(state, type) {
  const chk = researchCheck(state, type);
  if (!chk.ok) return chk;
  pay(state, chk.cost);
  state.troopTiers[type] = chk.next;
  return { ok: true, msg: `Đệ tử hệ ${TROOP_TYPES[type].name} lên bậc ${chk.next}: ${TROOP_TYPES[type].tiers[chk.next - 1]}` };
}

export function deployLimit(state) {
  return deploySlotsFor(state.player.level);
}

export function setTeamSlot(state, slot, uid) {
  if (slot < 0 || slot > 5) return { ok: false, reason: 'Ô không hợp lệ' };
  if (uid !== null && !findHero(state, uid)) return { ok: false, reason: 'Không tìm thấy hiệp khách' };
  const team = [...state.team];
  const prev = uid === null ? -1 : team.indexOf(uid);
  if (prev >= 0) {
    team[prev] = team[slot]; // đổi chỗ
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

export function factionCounts(state) {
  const counts = {};
  for (const uid of state.team) {
    const h = uid && findHero(state, uid);
    if (h) counts[HEROES[h.tid].faction] = (counts[HEROES[h.tid].faction] || 0) + 1;
  }
  return counts;
}

function factionBonusFor(n) {
  let b = 0;
  for (const [k, v] of Object.entries(BALANCE.factionBonus)) if (n >= Number(k)) b = v;
  return b;
}

// Đổi đội hình thành đơn vị chiến đấu
export function teamUnits(state) {
  const counts = factionCounts(state);
  const units = [];
  state.team.forEach((uid, slot) => {
    const h = uid && findHero(state, uid);
    if (!h || h.troops <= 0) return;
    const t = HEROES[h.tid];
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
      bonus: (h.troopType === t.school ? BALANCE.schoolBonus : 0) + factionBonusFor(counts[t.faction] || 0),
      look: { kind: 'hero', tid: h.tid, type: h.troopType },
    });
  });
  return units;
}

export function rosterLimit(state) {
  const tv = BALANCE.tavern;
  return Math.floor(tv.rosterBase + (state.buildings.tuuLau || 0) * tv.rosterPerLevel);
}

export function releaseHero(state, uid) {
  const h = findHero(state, uid);
  if (!h) return { ok: false, reason: 'Không tìm thấy hiệp khách' };
  if (state.heroes.length <= 1) return { ok: false, reason: 'Phải giữ ít nhất 1 hiệp khách' };
  state.team = state.team.map((x) => (x === uid ? null : x));
  state.heroes = state.heroes.filter((x) => x.uid !== uid);
  // Hoàn lại một phần kinh nghiệm dưới dạng Tiểu Hoàn Đan
  let totalExp = h.exp;
  for (let l = 1; l < h.level; l++) totalExp += BALANCE.heroExpToNext(l);
  const pills = Math.floor((totalExp * 0.5) / ITEMS.tieuHoanDan.exp);
  state.items.tieuHoanDan += pills;
  return { ok: true, msg: `${HEROES[h.tid].name} rời môn phái. Nhận lại ${pills} Tiểu Hoàn Đan.` };
}
