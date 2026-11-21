// Tạo game mới, lưu và tải.

import { cfg, maxTroopsFor } from './config.js';
import { GRID, cleanTeam, formationCapacity, isFormationUnlocked } from './formation.js';
import type { GameState, Hero } from './types.js';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'tamquoc_tranhba_save_v1';

export function makeHero(state: GameState, tid: string): Hero {
  const t = cfg().heroes[tid];
  return {
    uid: state.nextUid++,
    tid,
    level: 1,
    exp: 0,
    troopType: t.school,
    troops: 0,
    skillLv: 1,
    equip: Object.fromEntries(Object.keys(cfg().equipSlots).map((k) => [k, null])),
  };
}

export function newGame(now: number, seed: number = (Math.random() * 2 ** 32) >>> 0): GameState {
  const C = cfg();
  const state: GameState = {
    v: SAVE_VERSION,
    seed,
    rng: seed >>> 0,
    createdAt: now,
    lastTick: now,
    nextUid: 1,
    player: { level: 1, exp: 0 },
    res: { ...C.balance.startRes },
    items: { ...C.balance.startItems },
    stamina: { cur: C.balance.stamina.max, last: now },
    buildings: Object.fromEntries(C.buildingOrder.map((id) => [id, C.buildings[id].startLevel || 0])),
    queue: null,
    heroes: [],
    team: Array(GRID).fill(null),
    formation: '',
    formations: {},
    formationTeams: {},
    troopTiers: Object.fromEntries(C.troopOrder.map((t) => [t, 1])),
    equipment: [],
    campaign: { stars: {} },
    tavern: { candidates: [], nextFree: now },
    quests: { claimed: {} },
    stats: { battles: 0, wins: 0, forged: 0, maxEnhance: 0, recruited: 0 },
    settings: { autoRefill: true },
    shop: { bought: {}, firstTopup: {}, totalVnd: 0, testPurchases: 0 },
  };
  for (const r of Object.keys(C.resources)) state.res[r] ??= 0;
  for (const i of Object.keys(C.items)) state.items[i] ??= 0;
  for (const tid of C.starterHeroes) {
    const h = makeHero(state, tid);
    h.troops = maxTroopsFor(C.heroes[tid].base[0], 0); // binh lính khởi đầu đủ quân
    state.heroes.push(h);
  }
  // Trận hình khởi đầu: các trận đã mở theo cấp Quân Mạc, lấy cấp khởi đầu trong Excel
  for (const f of C.formations ?? []) {
    if (isFormationUnlocked(state, f.id) && f.startLevel > 0) state.formations[f.id] = f.startLevel;
  }
  const first = [...(C.formations ?? [])].filter((f) => isFormationUnlocked(state, f.id)).sort((a, b) => b.startLevel - a.startLevel)[0];
  if (first) {
    state.formation = first.id;
    const { open, max } = formationCapacity(first, state.formations[first.id] ?? 0);
    open.slice(0, max).forEach((cell, i) => { if (state.heroes[i]) state.team[cell] = state.heroes[i].uid; });
  }
  return state;
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

/** Điền các trường thiếu khi tải save cũ. */
export function deserialize(json: string, now: number): GameState {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object' || !data.v) throw new Error('Dữ liệu lưu không hợp lệ');
  const fresh = newGame(now, data.seed || 1);
  const merged = { ...fresh, ...data } as GameState;
  const keys = ['player', 'res', 'items', 'stamina', 'buildings', 'troopTiers', 'campaign', 'tavern', 'quests', 'stats', 'settings', 'shop', 'formations', 'formationTeams'] as const;
  for (const key of keys) {
    (merged as unknown as Record<string, unknown>)[key] = { ...(fresh[key] as object), ...((data[key] as object) || {}) };
  }
  // Save cũ: đội hình 2×3 (6 ô) → lưới 3×3; hàng sau cũ thành hậu quân
  if (Array.isArray(data.team) && data.team.length === 6) {
    const t = data.team as (number | null)[];
    merged.team = [t[0], t[1], t[2], null, null, null, t[3], t[4], t[5]];
  }
  if (!merged.formation || !isFormationUnlocked(merged, merged.formation)) merged.formation = fresh.formation;
  if (!data.formation || (Array.isArray(data.team) && data.team.length === 6)) {
    // chưa có trận hình: giữ thứ tự các tướng đang dùng, xếp lại vào ô mở
    const prev = (merged.team || []).filter((x): x is number => x !== null);
    const f = cfg().formations.find((x) => x.id === merged.formation);
    merged.team = Array(GRID).fill(null);
    if (f) {
      const { open, max } = formationCapacity(f, merged.formations[f.id] ?? 0);
      open.slice(0, max).forEach((cell, i) => { if (prev[i] !== undefined) merged.team[cell] = prev[i]; });
    }
  }
  merged.team = cleanTeam(merged, merged.team, merged.formation);
  return merged;
}
