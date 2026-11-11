// Tài nguyên, công trình, hàng đợi xây dựng, thể lực.

import { cfg, isResource } from './config.js';
import type { ActionResult, BuildQueue, Cost, GameState } from './types.js';

const HOUR = 3600 * 1000;

export function buildingCost(id: string, toLevel: number): Cost {
  const b = cfg().buildings[id];
  const out: Cost = {};
  for (const [k, v] of Object.entries(b.cost)) out[k] = Math.floor(v * Math.pow(b.costGrowth, toLevel - 1));
  return out;
}

export function buildingTime(id: string, toLevel: number): number {
  const b = cfg().buildings[id];
  return Math.round(b.timeBase * Math.pow(b.timeGrowth, toLevel - 1));
}

export function buildingProduction(id: string, level: number): number {
  const b = cfg().buildings[id];
  if (!b.produces || level <= 0) return 0;
  return (b.prodBase ?? 0) * level * Math.pow(b.prodGrowth ?? 1, level - 1);
}

export function productionPerHour(state: GameState, res: string): number {
  let total = res === 'nguyenbao' ? 0 : cfg().balance.baseTrickle;
  for (const [id, b] of Object.entries(cfg().buildings)) {
    if (b.produces === res) total += buildingProduction(id, state.buildings[id] || 0);
  }
  return total;
}

export function storageCap(state: GameState): number {
  const b = cfg().buildings.khoHang;
  const lv = state.buildings.khoHang || 0;
  return Math.floor((b.storageBase ?? 5000) * Math.pow(b.storageGrowth ?? 1, Math.max(0, lv - 1)));
}

const have = (state: GameState, k: string) => (isResource(k) ? state.res[k] || 0 : state.items[k] || 0);

export function canAfford(state: GameState, cost: Cost): boolean {
  return Object.entries(cost).every(([k, v]) => have(state, k) >= v);
}

export function missingFor(state: GameState, cost: Cost): Cost {
  const out: Cost = {};
  for (const [k, v] of Object.entries(cost)) {
    const h = have(state, k);
    if (h < v) out[k] = Math.ceil(v - h);
  }
  return out;
}

export function pay(state: GameState, cost: Cost): void {
  for (const [k, v] of Object.entries(cost)) {
    if (isResource(k)) state.res[k] -= v;
    else state.items[k] = (state.items[k] || 0) - v;
  }
}

/** Phần thưởng không bị giới hạn bởi kho. */
export function gain(state: GameState, reward: Cost): void {
  for (const [k, v] of Object.entries(reward)) {
    if (isResource(k)) state.res[k] = (state.res[k] || 0) + v;
    else if (k in cfg().items) state.items[k] = (state.items[k] || 0) + v;
  }
}

function produce(state: GameState, ms: number): void {
  if (ms <= 0) return;
  const cap = storageCap(state);
  for (const r of Object.keys(cfg().resources)) {
    if (r === 'nguyenbao' || state.res[r] >= cap) continue;
    state.res[r] = Math.min(cap, state.res[r] + (productionPerHour(state, r) * ms) / HOUR);
  }
}

function regenStamina(state: GameState, now: number): void {
  const S = cfg().balance.stamina;
  const s = state.stamina;
  const step = S.regenSeconds * 1000;
  if (s.cur >= S.max) {
    s.last = now;
    return;
  }
  const n = Math.floor((now - s.last) / step);
  if (n > 0) {
    s.cur = Math.min(S.max, s.cur + n);
    s.last = s.cur >= S.max ? now : s.last + n * step;
  }
}

export function completeQueue(state: GameState): BuildQueue | null {
  const q = state.queue;
  if (!q) return null;
  state.buildings[q.id] = q.toLevel;
  state.queue = null;
  return q;
}

/** Cập nhật state đến thời điểm now. Trả về danh sách công trình vừa xây xong. */
export function tick(state: GameState, now: number): BuildQueue[] {
  const done: BuildQueue[] = [];
  if (now <= state.lastTick) return done;
  let budget = Math.min(now - state.lastTick, cfg().balance.offlineCapHours * HOUR);
  let t = state.lastTick;
  while (state.queue && state.queue.endsAt <= now) {
    const seg = Math.max(0, state.queue.endsAt - t);
    produce(state, Math.min(seg, budget));
    budget = Math.max(0, budget - seg);
    t = Math.max(t, state.queue.endsAt);
    const q = completeQueue(state);
    if (q) done.push(q);
  }
  produce(state, Math.min(now - t, budget));
  state.lastTick = now;
  regenStamina(state, now);
  return done;
}

export function upgradeCheck(state: GameState, id: string): ActionResult & { cost?: Cost; time?: number } {
  const b = cfg().buildings[id];
  const to = (state.buildings[id] || 0) + 1;
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

export function startUpgrade(state: GameState, id: string, now: number): ActionResult {
  const chk = upgradeCheck(state, id);
  if (!chk.ok || !chk.cost || chk.time === undefined) return chk;
  pay(state, chk.cost);
  state.queue = { id, toLevel: (state.buildings[id] || 0) + 1, startedAt: now, endsAt: now + chk.time * 1000 };
  return { ok: true, msg: `Bắt đầu nâng ${cfg().buildings[id].name}` };
}

export function speedUpCost(state: GameState, now: number): number {
  if (!state.queue) return 0;
  const S = cfg().balance.speedUp;
  const left = Math.max(0, (state.queue.endsAt - now) / 1000);
  if (left <= S.freeSeconds) return 0;
  return Math.ceil(left / 60) * S.perMinute;
}

export function speedUp(state: GameState, now: number): ActionResult {
  if (!state.queue) return { ok: false, reason: 'Không có công trình đang xây' };
  const cost = speedUpCost(state, now);
  if (state.res.nguyenbao < cost) return { ok: false, reason: `Cần ${cost} nguyên bảo` };
  state.res.nguyenbao -= cost;
  tick(state, now);
  const q = completeQueue(state);
  return { ok: true, msg: q ? `${cfg().buildings[q.id].name} đạt cấp ${q.toLevel}` : '' };
}
