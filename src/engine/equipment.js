// Rèn, cường hóa, mặc, bán trang bị.

import { EQUIP, EQUIP_SLOTS, EQUIP_QUALITIES } from '../data/equipment.js';
import { rand, weightedPick } from './rng.js';
import { canAfford, pay, gain, missingFor } from './economy.js';

export function equipStatValue(eq) {
  const slot = EQUIP_SLOTS[eq.slot];
  const q = EQUIP_QUALITIES[eq.q];
  const value = Math.round(EQUIP.statPerTier * eq.tier * q.mult * (1 + EQUIP.enhancePct * eq.enh) * 10) / 10;
  return { stat: slot.stat, value };
}

export function equipName(eq) {
  return EQUIP_SLOTS[eq.slot].tierNames[eq.tier - 1] + (eq.enh ? ` +${eq.enh}` : '');
}

export function maxForgeTier(state) {
  const lv = state.buildings.loRen || 0;
  return lv <= 0 ? 0 : Math.min(5, 1 + Math.floor(lv / 4));
}

export function forgeCost(tier) {
  return { ...EQUIP.forgeCost(tier), huyenThiet: EQUIP.forgeHuyenThiet(tier) };
}

export function forge(state, slot, tier) {
  if (!EQUIP_SLOTS[slot]) return { ok: false, reason: 'Ô trang bị không hợp lệ' };
  if (tier < 1 || tier > maxForgeTier(state)) return { ok: false, reason: 'Cần Lò Rèn cấp cao hơn' };
  const cost = forgeCost(tier);
  if (!canAfford(state, cost)) return { ok: false, reason: 'Thiếu nguyên liệu', missing: missingFor(state, cost) };
  pay(state, cost);
  const q = weightedPick(rand(state), EQUIP_QUALITIES.map((x) => x.weight));
  const eq = { uid: state.nextUid++, slot, tier, q, enh: 0 };
  state.equipment.push(eq);
  state.stats.forged++;
  return { ok: true, msg: `Rèn được ${equipName(eq)} (${EQUIP_QUALITIES[q].name})`, eq };
}

export function maxEnhance(state) {
  return (state.buildings.loRen || 0) * EQUIP.maxEnhancePerLoRen;
}

export function enhanceCost(eq) {
  return { ...EQUIP.enhanceCost(eq.tier, eq.enh), huyenThiet: EQUIP.enhanceHuyenThiet(eq.enh + 1) };
}

export function enhance(state, eqUid) {
  const eq = state.equipment.find((e) => e.uid === eqUid);
  if (!eq) return { ok: false, reason: 'Không tìm thấy trang bị' };
  if (eq.enh >= maxEnhance(state)) return { ok: false, reason: 'Cần Lò Rèn cấp cao hơn để cường hóa tiếp' };
  const cost = enhanceCost(eq);
  if (!canAfford(state, cost)) return { ok: false, reason: 'Thiếu nguyên liệu', missing: missingFor(state, cost) };
  pay(state, cost);
  eq.enh++;
  state.stats.maxEnhance = Math.max(state.stats.maxEnhance, eq.enh);
  return { ok: true, msg: `${equipName(eq)}` };
}

export function equippedBy(state, eqUid) {
  return state.heroes.find((h) => Object.values(h.equip).includes(eqUid)) || null;
}

export function equip(state, heroUid, eqUid) {
  const h = state.heroes.find((x) => x.uid === heroUid);
  const eq = state.equipment.find((e) => e.uid === eqUid);
  if (!h || !eq) return { ok: false, reason: 'Không hợp lệ' };
  const owner = equippedBy(state, eqUid);
  if (owner) owner.equip[eq.slot] = null;
  h.equip[eq.slot] = eqUid;
  return { ok: true, msg: '' };
}

export function unequip(state, heroUid, slot) {
  const h = state.heroes.find((x) => x.uid === heroUid);
  if (!h) return { ok: false, reason: 'Không hợp lệ' };
  h.equip[slot] = null;
  return { ok: true, msg: '' };
}

export function sell(state, eqUid) {
  const eq = state.equipment.find((e) => e.uid === eqUid);
  if (!eq) return { ok: false, reason: 'Không tìm thấy trang bị' };
  if (equippedBy(state, eqUid)) return { ok: false, reason: 'Tháo trang bị trước khi bán' };
  const base = EQUIP.forgeCost(eq.tier);
  const back = { sat: Math.floor(base.sat * EQUIP.sellRatio), bac: Math.floor(base.bac * EQUIP.sellRatio) };
  gain(state, back);
  state.equipment = state.equipment.filter((e) => e.uid !== eqUid);
  return { ok: true, msg: `Bán được ${back.sat} sắt, ${back.bac} bạc` };
}
