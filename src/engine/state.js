// Tạo game mới, lưu và tải.

import { BALANCE } from '../data/balance.js';
import { HEROES, STARTER_HEROES } from '../data/heroes.js';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'giangho_chuongmon_save_v1';

export function makeHero(state, tid) {
  const t = HEROES[tid];
  return {
    uid: state.nextUid++,
    tid,
    level: 1,
    exp: 0,
    troopType: t.school,
    troops: 0,
    skillLv: 1,
    equip: { weapon: null, armor: null, acc: null },
  };
}

export function newGame(now, seed = (Math.random() * 2 ** 32) >>> 0) {
  const state = {
    v: SAVE_VERSION,
    seed,
    rng: seed >>> 0,
    createdAt: now,
    lastTick: now,
    nextUid: 1,
    player: { level: 1, exp: 0 },
    res: { ...BALANCE.startRes },
    items: { ...BALANCE.startItems },
    stamina: { cur: BALANCE.stamina.max, last: now },
    buildings: {
      chinhDien: 2, ruong: 1, xuongGo: 1, moSat: 0, tienTrang: 1,
      khoHang: 1, luyenVo: 0, tuuLau: 0, loRen: 0, tangKinh: 0,
    },
    queue: null, // { id, toLevel, startedAt, endsAt }
    heroes: [],
    team: [null, null, null, null, null, null],
    troopTiers: { quyen: 1, thuong: 1, kiem: 1, amkhi: 1 },
    equipment: [],
    campaign: { stars: {} }, // '1-1': 3
    tavern: { candidates: [], nextFree: now },
    quests: { claimed: {} },
    stats: { battles: 0, wins: 0, forged: 0, maxEnhance: 0, recruited: 0 },
    settings: { autoRefill: true },
  };
  for (const tid of STARTER_HEROES) {
    const h = makeHero(state, tid);
    h.troops = BALANCE.maxTroops(HEROES[tid].base[0], 0); // đệ tử khởi đầu đủ quân
    state.heroes.push(h);
  }
  // Xếp đội ban đầu: hàng trước cột giữa và cột trái
  state.team[1] = state.heroes[0].uid;
  state.team[0] = state.heroes[1].uid;
  return state;
}

export function serialize(state) {
  return JSON.stringify(state);
}

// Điền các trường thiếu khi tải save cũ.
export function deserialize(json, now) {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object' || !data.v) throw new Error('Dữ liệu lưu không hợp lệ');
  const fresh = newGame(now, data.seed || 1);
  const merged = { ...fresh, ...data };
  for (const key of ['player', 'res', 'items', 'stamina', 'buildings', 'troopTiers', 'campaign', 'tavern', 'quests', 'stats', 'settings']) {
    merged[key] = { ...fresh[key], ...(data[key] || {}) };
  }
  return merged;
}

export function saveToStorage(state) {
  try {
    localStorage.setItem(SAVE_KEY, serialize(state));
    return true;
  } catch {
    return false;
  }
}

export function loadFromStorage(now) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? deserialize(raw, now) : null;
  } catch {
    return null;
  }
}

export function clearStorage() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* bỏ qua */
  }
}
