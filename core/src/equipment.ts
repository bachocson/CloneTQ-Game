// Rèn, cường hóa, mặc, bán trang bị.

import { cfg } from './config.js';
import { rand, weightedPick } from './rng.js';
import { canAfford, pay, gain, missingFor } from './economy.js';
import type { ActionResult, Cost, Equipment, GameState, Hero, StatKey } from './types.js';

export function equipStatValue(eq: Equipment): { stat: StatKey; value: number } {
  const E = cfg().balance.equip;
  const slot = cfg().equipSlots[eq.slot];
  const q = cfg().equipQualities[eq.q];
  const value = Math.round(E.statPerTier * eq.tier * q.mult * (1 + E.enhancePct * eq.enh) * 10) / 10;
  return { stat: slot.stat, value };
}

export function equipName(eq: Equipment): string {
  return cfg().equipSlots[eq.slot].tierNames[eq.tier - 1] + (eq.enh ? ` +${eq.enh}` : '');
}

export function maxForgeTier(state: GameState): number {
  const lv = state.buildings.loRen || 0;
  const maxTier = Math.max(...Object.values(cfg().equipSlots).map((s) => s.tierNames.length));
  return lv <= 0 ? 0 : Math.min(maxTier, 1 + Math.floor(lv / cfg().balance.equip.tierEveryLoRen));
}

export function forgeCost(tier: number): Cost {
  const E = cfg().balance.equip;
  const g = Math.pow(E.forgeGrowth, tier - 1);
  return { sat: Math.floor(E.forgeSatBase * g), bac: Math.floor(E.forgeBacBase * g), huyenThiet: tier * E.forgeHuyenThietPerTier };
}

export function forge(state: GameState, slot: string, tier: number): ActionResult & { eq?: Equipment } {
  if (!cfg().equipSlots[slot]) return { ok: false, reason: 'Ô trang bị không hợp lệ' };
  if (tier < 1 || tier > maxForgeTier(state)) return { ok: false, reason: `Cần ${cfg().buildings.loRen.name} cấp cao hơn` };
  const cost = forgeCost(tier);
  if (!canAfford(state, cost)) return { ok: false, reason: 'Thiếu nguyên liệu', missing: missingFor(state, cost) };
  pay(state, cost);
  const q = weightedPick(rand(state), cfg().equipQualities.map((x) => x.weight));
  const eq: Equipment = { uid: state.nextUid++, slot, tier, q, enh: 0 };
  state.equipment.push(eq);
  state.stats.forged++;
  return { ok: true, msg: `Rèn được ${equipName(eq)} (${cfg().equipQualities[q].name})`, eq };
}

export function maxEnhance(state: GameState): number {
  return (state.buildings.loRen || 0) * cfg().balance.equip.maxEnhancePerLoRen;
}

export function enhanceCost(eq: Equipment): Cost {
  const E = cfg().balance.equip;
  const g = Math.pow(E.enhanceGrowth, eq.enh);
  const next = eq.enh + 1;
  return {
    sat: Math.floor(E.enhanceSatBase * eq.tier * g),
    bac: Math.floor(E.enhanceBacBase * eq.tier * g),
    huyenThiet: next >= E.enhanceHuyenThietFrom ? Math.ceil(next / 3) : 0,
  };
}

export function enhance(state: GameState, eqUid: number): ActionResult {
  const eq = state.equipment.find((e) => e.uid === eqUid);
  if (!eq) return { ok: false, reason: 'Không tìm thấy trang bị' };
  if (eq.enh >= maxEnhance(state)) return { ok: false, reason: `Cần ${cfg().buildings.loRen.name} cấp cao hơn để cường hóa tiếp` };
  const cost = enhanceCost(eq);
  if (!canAfford(state, cost)) return { ok: false, reason: 'Thiếu nguyên liệu', missing: missingFor(state, cost) };
  pay(state, cost);
  eq.enh++;
  state.stats.maxEnhance = Math.max(state.stats.maxEnhance, eq.enh);
  return { ok: true, msg: equipName(eq) };
}

export function equippedBy(state: GameState, eqUid: number): Hero | null {
  return state.heroes.find((h) => Object.values(h.equip).includes(eqUid)) || null;
}

export function equip(state: GameState, heroUid: number, eqUid: number): ActionResult {
  const h = state.heroes.find((x) => x.uid === heroUid);
  const eq = state.equipment.find((e) => e.uid === eqUid);
  if (!h || !eq) return { ok: false, reason: 'Không hợp lệ' };
  const owner = equippedBy(state, eqUid);
  if (owner) owner.equip[eq.slot] = null;
  h.equip[eq.slot] = eqUid;
  return { ok: true, msg: '' };
}

export function unequip(state: GameState, heroUid: number, slot: string): ActionResult {
  const h = state.heroes.find((x) => x.uid === heroUid);
  if (!h) return { ok: false, reason: 'Không hợp lệ' };
  h.equip[slot] = null;
  return { ok: true, msg: '' };
}

export function sell(state: GameState, eqUid: number): ActionResult {
  const eq = state.equipment.find((e) => e.uid === eqUid);
  if (!eq) return { ok: false, reason: 'Không tìm thấy trang bị' };
  if (equippedBy(state, eqUid)) return { ok: false, reason: 'Tháo trang bị trước khi bán' };
  const base = forgeCost(eq.tier);
  const ratio = cfg().balance.equip.sellRatio;
  const back = { sat: Math.floor(base.sat * ratio), bac: Math.floor(base.bac * ratio) };
  gain(state, back);
  state.equipment = state.equipment.filter((e) => e.uid !== eqUid);
  return { ok: true, msg: `Bán được ${back.sat} sắt, ${back.bac} bạc` };
}
