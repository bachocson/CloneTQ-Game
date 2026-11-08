// Tài nguyên, công trình, hàng đợi xây dựng, thể lực.

import { BALANCE } from '../data/balance.js';
import { BUILDINGS } from '../data/buildings.js';
import { RESOURCES, ITEMS } from '../data/resources.js';

const HOUR = 3600 * 1000;
export const BASE_TRICKLE = 30; // mỗi giờ, để không bao giờ kẹt hẳn

export function buildingCost(id, toLevel) {
  const b = BUILDINGS[id];
  const out = {};
  for (const [k, v] of Object.entries(b.costBase)) out[k] = Math.floor(v * Math.pow(b.costGrowth, toLevel - 1));
  return out;
}

export function buildingTime(id, toLevel) {
  const b = BUILDINGS[id];
  return Math.round(b.timeBase * Math.pow(b.timeGrowth, toLevel - 1));
}

export function productionPerHour(state, res) {
  let total = res === 'nguyenbao' ? 0 : BASE_TRICKLE;
  for (const [id, b] of Object.entries(BUILDINGS)) {
    if (b.produces !== res) continue;
    const lv = state.buildings[id] || 0;
    if (lv > 0) total += b.prodBase * lv * Math.pow(b.prodGrowth, lv - 1);
  }
  return total;
}

export function storageCap(state) {
  const b = BUILDINGS.khoHang;
  const lv = state.buildings.khoHang || 0;
  return Math.floor(b.storageBase * Math.pow(b.storageGrowth, Math.max(0, lv - 1)));
}

export function canAfford(state, cost) {
  return Object.entries(cost).every(([k, v]) => (k in RESOURCES ? state.res[k] : state.items[k] || 0) >= v);
}

export function missingFor(state, cost) {
  const out = {};
  for (const [k, v] of Object.entries(cost)) {
    const have = k in RESOURCES ? state.res[k] : state.items[k] || 0;
    if (have < v) out[k] = Math.ceil(v - have);
  }
  return out;
}

export function pay(state, cost) {
  for (const [k, v] of Object.entries(cost)) {
    if (k in RESOURCES) state.res[k] -= v;
    else state.items[k] = (state.items[k] || 0) - v;
  }
}

// Phần thưởng không bị giới hạn bởi kho.
export function gain(state, reward) {
  for (const [k, v] of Object.entries(reward)) {
    if (k in RESOURCES) state.res[k] += v;
    else if (k in ITEMS) state.items[k] = (state.items[k] || 0) + v;
  }
}

function produce(state, ms) {
  if (ms <= 0) return;
  const cap = storageCap(state);
  for (const r of ['luong', 'go', 'sat', 'bac']) {
    if (state.res[r] >= cap) continue;
    state.res[r] = Math.min(cap, state.res[r] + (productionPerHour(state, r) * ms) / HOUR);
  }
}

function regenStamina(state, now) {
  const s = state.stamina;
  const step = BALANCE.stamina.regenSeconds * 1000;
  if (s.cur >= BALANCE.stamina.max) {
    s.last = now;
    return;
  }
  const n = Math.floor((now - s.last) / step);
  if (n > 0) {
    s.cur = Math.min(BALANCE.stamina.max, s.cur + n);
    s.last = s.cur >= BALANCE.stamina.max ? now : s.last + n * step;
  }
}

export function completeQueue(state) {
  const q = state.queue;
  if (!q) return null;
  state.buildings[q.id] = q.toLevel;
  state.queue = null;
  return q;
}

// Cập nhật state đến thời điểm now. Trả về danh sách công trình vừa xây xong.
export function tick(state, now) {
  const done = [];
  if (now <= state.lastTick) return done;
  let budget = Math.min(now - state.lastTick, BALANCE.offlineCapHours * HOUR);
  let t = state.lastTick;
  while (state.queue && state.queue.endsAt <= now) {
    const seg = Math.max(0, state.queue.endsAt - t);
    produce(state, Math.min(seg, budget));
    budget = Math.max(0, budget - seg);
    t = Math.max(t, state.queue.endsAt);
    done.push(completeQueue(state));
  }
  produce(state, Math.min(now - t, budget));
  state.lastTick = now;
  regenStamina(state, now);
  return done;
}

export function upgradeCheck(state, id) {
  const b = BUILDINGS[id];
  const lv = state.buildings[id] || 0;
  const to = lv + 1;
  if (state.player.level < b.unlockLevel) return { ok: false, reason: `Cần cấp chưởng môn ${b.unlockLevel}` };
  if (id === 'chinhDien') {
    if (to > state.player.level) return { ok: false, reason: `Cần cấp chưởng môn ${to}` };
  } else if (to > state.buildings.chinhDien) {
    return { ok: false, reason: `Cần Chính Điện cấp ${to}` };
  }
  if (state.queue) return { ok: false, reason: 'Đang xây công trình khác' };
  const cost = buildingCost(id, to);
  if (!canAfford(state, cost)) return { ok: false, reason: 'Thiếu tài nguyên', missing: missingFor(state, cost) };
  return { ok: true, cost, time: buildingTime(id, to) };
}

export function startUpgrade(state, id, now) {
  const chk = upgradeCheck(state, id);
  if (!chk.ok) return chk;
  pay(state, chk.cost);
  state.queue = { id, toLevel: (state.buildings[id] || 0) + 1, startedAt: now, endsAt: now + chk.time * 1000 };
  return { ok: true, msg: `Bắt đầu nâng ${BUILDINGS[id].name}` };
}

export function speedUpCost(state, now) {
  if (!state.queue) return 0;
  const left = Math.max(0, (state.queue.endsAt - now) / 1000);
  if (left <= BALANCE.speedUpFreeSeconds) return 0;
  return Math.ceil(left / 60) * BALANCE.speedUpPerMinute;
}

export function speedUp(state, now) {
  if (!state.queue) return { ok: false, reason: 'Không có công trình đang xây' };
  const cost = speedUpCost(state, now);
  if (state.res.nguyenbao < cost) return { ok: false, reason: `Cần ${cost} nguyên bảo` };
  state.res.nguyenbao -= cost;
  tick(state, now);
  const q = completeQueue(state);
  return { ok: true, msg: q ? `${BUILDINGS[q.id].name} đạt cấp ${q.toLevel}` : '' };
}
