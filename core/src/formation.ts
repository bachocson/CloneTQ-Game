// Trận hình: chọn trận hình, ô nào được đặt tướng, nâng cấp, hiệu quả cho toàn đội.
// Lưới 3×3, ô 0–8 trong code (1–9 trong Excel): hàng 0 tiền quân, hàng 1 trung quân, hàng 2 hậu quân.

import { cfg } from './config.js';
import { canAfford, pay, missingFor } from './economy.js';
import type { ActionResult, Cost, DmgType, FormationDef, FormationStat, GameState } from './types.js';

export const GRID = 9;
export const ROW_NAMES = ['Tiền quân', 'Trung quân', 'Hậu quân'];

export function formationDef(id: string): FormationDef | undefined {
  return cfg().formations.find((f) => f.id === id);
}

/** Các ô (0–8) trận hình cho phép đặt tướng, theo bố cục x/o */
export function layoutCells(f: FormationDef): number[] {
  const out: number[] = [];
  f.rows.forEach((row, r) => {
    for (let c = 0; c < 3; c++) if ((row[c] ?? 'o').toLowerCase() === 'x') out.push(r * 3 + c);
  });
  return out;
}

export function isFormationUnlocked(state: GameState, id: string): boolean {
  const f = formationDef(id);
  return !!f && (state.buildings.quanMac || 0) >= f.reqQuanMac;
}

/** Cấp trận hình; -1 nếu chưa mở */
export function formationLevel(state: GameState, id: string): number {
  if (!isFormationUnlocked(state, id)) return -1;
  return state.formations[id] ?? 0;
}

/** Ô đang mở (đặt được tướng) và số tướng tối đa ở cấp hiện tại */
export function formationCapacity(f: FormationDef, level: number): { open: number[]; max: number } {
  if (level < 0) return { open: [], max: 0 };
  if (f.mode === 'free') {
    const max = f.freeCountLevels.filter((l) => level >= l).length;
    return { open: layoutCells(f), max };
  }
  const open = f.unlockOrder.slice(0, level + 1).map((s) => s - 1);
  return { open, max: open.length };
}

export function activeCapacity(state: GameState): { open: number[]; max: number } {
  const f = formationDef(state.formation);
  if (!f) return { open: [], max: 0 };
  return formationCapacity(f, formationLevel(state, f.id));
}

/** Hiệu quả của trận hình ở một cấp (0.15 = 15%) */
export function formationBonus(f: FormationDef, level: number): number {
  if (f.stat === 'none' || level < 0) return 0;
  return f.basePct + Math.max(0, level - f.perLevelFrom + 1) * f.perLevelPct;
}

export const STAT_LABEL: Record<FormationStat, string> = {
  vatCong: 'Vật công', vatPhong: 'Vật phòng', muuCong: 'Mưu công', muuPhong: 'Mưu phòng', phapCong: 'Pháp công', phapPhong: 'Pháp phòng', none: 'Không',
};

/** Đổi hiệu quả trận hình thành hệ số cho từng loại sát thương (dùng trong trận đánh) */
export function formationMods(state: GameState): { atk: Partial<Record<DmgType, number>>; def: Partial<Record<DmgType, number>> } {
  const f = formationDef(state.formation);
  const mods = { atk: {} as Partial<Record<DmgType, number>>, def: {} as Partial<Record<DmgType, number>> };
  if (!f) return mods;
  const b = formationBonus(f, formationLevel(state, f.id));
  const map: Record<string, ['atk' | 'def', DmgType]> = {
    vatCong: ['atk', 'ngoai'], vatPhong: ['def', 'ngoai'], muuCong: ['atk', 'doc'], muuPhong: ['def', 'doc'], phapCong: ['atk', 'phap'], phapPhong: ['def', 'phap'],
  };
  const m = map[f.stat];
  if (m && b) mods[m[0]][m[1]] = b;
  return mods;
}

export function formationUpgradeCost(level: number): Cost {
  const F = cfg().balance.formation;
  return { bac: Math.floor(F.costBacBase * Math.pow(F.costBacGrowth, level)), biKip: F.costBiKipBase + level * F.costBiKipPerLevel };
}

export function formationUpgradeCheck(state: GameState, id: string): ActionResult & { cost?: Cost } {
  const f = formationDef(id);
  if (!f) return { ok: false, reason: 'Không có trận hình này' };
  const lv = formationLevel(state, id);
  const qm = cfg().buildings.quanMac?.name ?? 'Quân Mạc';
  if (lv < 0) return { ok: false, reason: `Cần ${qm} cấp ${f.reqQuanMac}` };
  if (lv >= f.maxLevel) return { ok: false, reason: 'Đã đạt cấp tối đa' };
  if (lv + 1 > (state.buildings.quanMac || 0)) return { ok: false, reason: `Cần ${qm} cấp ${lv + 1}` };
  const cost = formationUpgradeCost(lv);
  if (!canAfford(state, cost)) return { ok: false, reason: 'Thiếu nguyên liệu', missing: missingFor(state, cost), cost };
  return { ok: true, cost };
}

export function upgradeFormation(state: GameState, id: string): ActionResult {
  const chk = formationUpgradeCheck(state, id);
  if (!chk.ok || !chk.cost) return chk;
  pay(state, chk.cost);
  state.formations[id] = formationLevel(state, id) + 1;
  return { ok: true, msg: `${formationDef(id)?.name} đạt cấp ${state.formations[id]}` };
}

/** Bỏ tướng khỏi ô không hợp lệ và cắt bớt nếu quá số tướng tối đa */
export function cleanTeam(state: GameState, team: (number | null)[], id: string): (number | null)[] {
  const f = formationDef(id);
  const out: (number | null)[] = Array(GRID).fill(null);
  if (!f) return out;
  const { open, max } = formationCapacity(f, formationLevel(state, id));
  const owned = new Set(state.heroes.map((h) => h.uid));
  let n = 0;
  for (let i = 0; i < GRID; i++) {
    const uid = team[i] ?? null;
    if (uid !== null && owned.has(uid) && open.includes(i) && n < max) {
      out[i] = uid;
      n++;
    }
  }
  return out;
}

/** Đổi trận hình đang dùng. Đội hình của trận cũ được giữ lại để đổi về không mất. */
export function setFormation(state: GameState, id: string): ActionResult {
  const f = formationDef(id);
  if (!f) return { ok: false, reason: 'Không có trận hình này' };
  if (!isFormationUnlocked(state, id)) return { ok: false, reason: `Cần ${cfg().buildings.quanMac?.name ?? 'Quân Mạc'} cấp ${f.reqQuanMac}` };
  if (state.formation === id) return { ok: true, msg: '' };
  state.formationTeams[state.formation] = [...state.team];
  const saved = state.formationTeams[id];
  let team = cleanTeam(state, saved ?? state.team, id);
  // Trận hình mới chưa xếp ai: tự đặt các tướng đang dùng vào ô mở theo thứ tự
  if (!team.some(Boolean)) {
    const { open, max } = formationCapacity(f, formationLevel(state, id));
    const prev = state.team.filter((x): x is number => x !== null);
    team = Array(GRID).fill(null);
    open.slice(0, max).forEach((cell, i) => { if (prev[i] !== undefined) team[cell] = prev[i]; });
  }
  state.team = team;
  state.formation = id;
  const cap = formationCapacity(f, formationLevel(state, id));
  return { ok: true, msg: `Dùng ${f.name}: ${cap.max} ô, đang xếp ${team.filter(Boolean).length} tướng` };
}

/** Ô (0–8) đầu tiên còn trống và đang mở */
export function firstFreeCell(state: GameState): number {
  const { open, max } = activeCapacity(state);
  if (state.team.filter(Boolean).length >= max) return -1;
  return open.find((c) => state.team[c] === null) ?? -1;
}
