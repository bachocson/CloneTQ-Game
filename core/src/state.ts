// Tạo game mới, lưu và tải.

import { cfg, maxTroopsFor } from './config.js';
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
    team: [null, null, null, null, null, null],
    troopTiers: Object.fromEntries(C.troopOrder.map((t) => [t, 1])),
    equipment: [],
    campaign: { stars: {} },
    tavern: { candidates: [], nextFree: now },
    quests: { claimed: {} },
    stats: { battles: 0, wins: 0, forged: 0, maxEnhance: 0, recruited: 0 },
    settings: { autoRefill: true },
  };
  for (const r of Object.keys(C.resources)) state.res[r] ??= 0;
  for (const i of Object.keys(C.items)) state.items[i] ??= 0;
  for (const tid of C.starterHeroes) {
    const h = makeHero(state, tid);
    h.troops = maxTroopsFor(C.heroes[tid].base[0], 0); // binh lính khởi đầu đủ quân
    state.heroes.push(h);
  }
  // Xếp đội ban đầu: hàng trước cột giữa rồi cột trái
  if (state.heroes[0]) state.team[1] = state.heroes[0].uid;
  if (state.heroes[1]) state.team[0] = state.heroes[1].uid;
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
  const keys = ['player', 'res', 'items', 'stamina', 'buildings', 'troopTiers', 'campaign', 'tavern', 'quests', 'stats', 'settings'] as const;
  for (const key of keys) {
    (merged as unknown as Record<string, unknown>)[key] = { ...(fresh[key] as object), ...((data[key] as object) || {}) };
  }
  return merged;
}
