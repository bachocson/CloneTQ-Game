// Cửa hàng: vật phẩm mua bằng tiền trong game, gói ưu đãi, gói nạp nguyên bảo.
// Gói trả bằng tiền thật (VND) chỉ được cấp qua grantPurchase() SAU KHI thanh toán đã được xác nhận
// (sau này là server xác nhận biên lai Google Play / App Store). Bản thử nghiệm gọi với test = true.

import { cfg, isResource } from './config.js';
import type { ActionResult, Cost, GameState, PackDef, ShopItemDef, ShopLimit, TopupDef } from './types.js';

const DAY = 86400 * 1000;
const TZ = 7 * 3600 * 1000; // ngày mới tính theo giờ Việt Nam

/** Mã chu kỳ để reset giới hạn mua: theo ngày, theo tuần (bắt đầu thứ Hai) hoặc vĩnh viễn */
export function periodKey(limit: ShopLimit, now: number): string {
  const day = Math.floor((now + TZ) / DAY);
  if (limit === 'daily') return `d${day}`;
  if (limit === 'weekly') return `w${Math.floor((day + 3) / 7)}`; // ngày 0 (1/1/1970) là thứ Năm
  return 'all';
}

/** Thời điểm reset tiếp theo (ms), null nếu không reset */
export function nextReset(limit: ShopLimit, now: number): number | null {
  const day = Math.floor((now + TZ) / DAY);
  if (limit === 'daily') return (day + 1) * DAY - TZ;
  if (limit === 'weekly') return (Math.floor((day + 3) / 7) * 7 + 4 + 7) * DAY - TZ;
  return null;
}

function bought(state: GameState, id: string, limit: ShopLimit, now: number): number {
  if (limit === 'none') return 0;
  const r = state.shop.bought[id];
  return r && r.key === periodKey(limit, now) ? r.n : 0;
}

function record(state: GameState, id: string, limit: ShopLimit, now: number, n: number): void {
  if (limit === 'none') return;
  const key = periodKey(limit, now);
  const r = state.shop.bought[id];
  state.shop.bought[id] = { key, n: (r && r.key === key ? r.n : 0) + n };
}

/** Còn mua được bao nhiêu lần trong chu kỳ này */
export function remaining(state: GameState, def: { id: string; limit: ShopLimit; limitCount: number }, now: number): number {
  if (def.limit === 'none') return Infinity;
  return Math.max(0, def.limitCount - bought(state, def.id, def.limit, now));
}

/** Cộng phần thưởng; hỗ trợ thêm khóa đặc biệt "stamina" (thể lực, được vượt mức tối đa) */
export function grantReward(state: GameState, reward: Cost): void {
  for (const [k, v] of Object.entries(reward)) {
    if (k === 'stamina') state.stamina.cur += v;
    else if (isResource(k)) state.res[k] = (state.res[k] || 0) + v;
    else if (k in cfg().items) state.items[k] = (state.items[k] || 0) + v;
  }
}

function payCurrency(state: GameState, currency: 'nguyenbao' | 'bac', amount: number): ActionResult | null {
  if ((state.res[currency] || 0) < amount) {
    return { ok: false, reason: `Thiếu ${cfg().resources[currency].name}`, missing: { [currency]: Math.ceil(amount - (state.res[currency] || 0)) } };
  }
  state.res[currency] -= amount;
  return null;
}

// ---------- Vật phẩm ----------

export function buyShopItem(state: GameState, id: string, qty: number, now: number): ActionResult {
  const def = cfg().shop.find((x) => x.id === id) as ShopItemDef | undefined;
  if (!def) return { ok: false, reason: 'Không có mặt hàng này' };
  if (state.player.level < def.reqLevel) return { ok: false, reason: `Cần cấp Chúa Công ${def.reqLevel}` };
  const n = Math.max(1, Math.floor(qty));
  if (remaining(state, def, now) < n) return { ok: false, reason: 'Đã hết lượt mua trong kỳ này' };
  const fail = payCurrency(state, def.currency, def.price * n);
  if (fail) return fail;
  grantReward(state, { [def.item]: def.qty * n });
  record(state, def.id, def.limit, now, n);
  return { ok: true, msg: `Mua ${def.name} ×${n}` };
}

// ---------- Gói ưu đãi ----------

export function packCheck(state: GameState, def: PackDef, now: number): ActionResult {
  if (state.player.level < def.reqLevel) return { ok: false, reason: `Cần cấp Chúa Công ${def.reqLevel}` };
  if (remaining(state, def, now) <= 0) return { ok: false, reason: def.limit === 'once' ? 'Đã mua' : 'Đã hết lượt mua trong kỳ này' };
  return { ok: true };
}

/** Gói trả bằng nguyên bảo hoặc bạc */
export function buyPack(state: GameState, id: string, now: number): ActionResult {
  const def = cfg().packs.find((x) => x.id === id);
  if (!def) return { ok: false, reason: 'Không có gói này' };
  if (def.currency === 'vnd') return { ok: false, reason: 'Gói này cần thanh toán' };
  const chk = packCheck(state, def, now);
  if (!chk.ok) return chk;
  const fail = payCurrency(state, def.currency, def.price);
  if (fail) return fail;
  grantReward(state, def.contents);
  record(state, def.id, def.limit, now, 1);
  return { ok: true, msg: `Đã mua ${def.name}` };
}

// ---------- Thanh toán tiền thật ----------

/** Cấp gói nạp hoặc gói ưu đãi trả bằng VND. Chỉ gọi khi thanh toán đã được xác nhận.
 *  test = true: bản thử nghiệm, không có tiền thật (đếm vào shop.testPurchases). */
export function grantPurchase(state: GameState, productId: string, now: number, { test = false } = {}): ActionResult {
  const topup = cfg().topups.find((x) => x.id === productId) as TopupDef | undefined;
  const pack = cfg().packs.find((x) => x.id === productId && x.currency === 'vnd');
  if (!topup && !pack) return { ok: false, reason: 'Không có sản phẩm này' };
  let msg: string;
  if (topup) {
    const first = !state.shop.firstTopup[topup.id] && topup.firstBonus > 0;
    const amount = topup.nguyenbao + (first ? topup.firstBonus : 0);
    state.res.nguyenbao = (state.res.nguyenbao || 0) + amount;
    state.shop.firstTopup[topup.id] = true;
    state.shop.totalVnd += topup.price;
    msg = `Nhận ${amount} ${cfg().resources.nguyenbao.name}${first ? ' (thưởng nạp lần đầu)' : ''}`;
  } else {
    const def = pack as PackDef;
    const chk = packCheck(state, def, now);
    if (!chk.ok) return chk;
    grantReward(state, def.contents);
    record(state, def.id, def.limit, now, 1);
    state.shop.totalVnd += def.price;
    msg = `Đã mua ${def.name}`;
  }
  if (test) state.shop.testPurchases += 1;
  return { ok: true, msg: test ? `${msg} · mua thử, không mất tiền` : msg };
}

export function formatVnd(n: number): string {
  return `${n.toLocaleString('vi-VN')}đ`;
}
