// Công cụ test (cheat) dành cho người làm game. Không dùng trong bản phát hành:
// client chỉ hiện bảng cheat khi build có bật công cụ test, server sau này phải từ chối các lệnh này.
// Mỗi lần dùng đều tăng state.stats.cheats để biết save đó đã bị chỉnh tay.

import { cfg, maxTroopsFor } from './config.js';
import { gain, storageCap, tick, completeQueue } from './economy.js';
import { heroMaxTroops, findHero } from './heroes.js';
import { allStages, parseStage } from './campaign.js';
import { makeHero } from './state.js';
import type { ActionResult, Cost, GameState } from './types.js';

function mark(state: GameState): void {
  state.stats.cheats = (state.stats.cheats || 0) + 1;
}

/** Cộng tài nguyên/vật phẩm (không bị giới hạn bởi kho) */
export function cheatAdd(state: GameState, reward: Cost): ActionResult {
  gain(state, reward);
  mark(state);
  return { ok: true, msg: 'Đã cộng tài nguyên' };
}

/** Lấp đầy kho cho mọi tài nguyên thường, cộng thêm nguyên bảo nếu muốn */
export function cheatFillStorage(state: GameState, nguyenbao = 0): ActionResult {
  const cap = storageCap(state);
  for (const r of Object.keys(cfg().resources)) {
    if (r === 'nguyenbao') continue;
    state.res[r] = Math.max(state.res[r] || 0, cap);
  }
  if (nguyenbao) state.res.nguyenbao = (state.res.nguyenbao || 0) + nguyenbao;
  mark(state);
  return { ok: true, msg: `Đầy kho (${cap})` };
}

export function cheatAddItems(state: GameState, each: number): ActionResult {
  for (const k of Object.keys(cfg().items)) state.items[k] = (state.items[k] || 0) + each;
  mark(state);
  return { ok: true, msg: `Mỗi vật phẩm +${each}` };
}

export function cheatFullStamina(state: GameState, now: number): ActionResult {
  state.stamina.cur = cfg().balance.stamina.max;
  state.stamina.last = now;
  mark(state);
  return { ok: true, msg: 'Hồi đầy thể lực' };
}

/** Tua nhanh thời gian: dời mọi mốc giờ về quá khứ rồi cập nhật, như thể đã offline `hours` giờ.
 *  Vẫn chịu giới hạn offline tối đa trong sheet Cân bằng. */
export function cheatFastForward(state: GameState, now: number, hours: number): ActionResult {
  const ms = hours * 3600 * 1000;
  state.lastTick -= ms;
  state.stamina.last -= ms;
  state.tavern.nextFree -= ms;
  if (state.queue) {
    state.queue.startedAt -= ms;
    state.queue.endsAt -= ms;
  }
  const done = tick(state, now);
  mark(state);
  const cap = cfg().balance.offlineCapHours;
  return { ok: true, msg: `Tua ${hours} giờ${hours > cap ? ` (tài nguyên chỉ tính tối đa ${cap} giờ)` : ''}${done.length ? `, xây xong ${done.length} công trình` : ''}` };
}

export function cheatFinishBuild(state: GameState): ActionResult {
  const q = completeQueue(state);
  if (!q) return { ok: false, reason: 'Không có công trình đang xây' };
  mark(state);
  return { ok: true, msg: `${cfg().buildings[q.id].name} đạt cấp ${q.toLevel}` };
}

export function cheatSetPlayerLevel(state: GameState, level: number): ActionResult {
  const lv = Math.max(1, Math.min(cfg().balance.playerMaxLevel, Math.floor(level)));
  state.player.level = lv;
  state.player.exp = 0;
  for (const h of state.heroes) if (h.level > lv) h.level = lv;
  mark(state);
  return { ok: true, msg: `Chúa Công cấp ${lv}` };
}

/** Mọi võ tướng lên bằng cấp Chúa Công và đầy quân */
export function cheatMaxHeroes(state: GameState): ActionResult {
  for (const h of state.heroes) {
    h.level = state.player.level;
    h.exp = 0;
    h.troops = heroMaxTroops(state, h);
  }
  mark(state);
  return { ok: true, msg: `Mọi võ tướng lên cấp ${state.player.level}, đầy quân` };
}

export function cheatFullTroops(state: GameState): ActionResult {
  for (const h of state.heroes) h.troops = heroMaxTroops(state, h);
  mark(state);
  return { ok: true, msg: 'Đầy quân cho mọi võ tướng' };
}

/** Đặt mọi công trình (đã mở theo cấp Chúa Công) lên cấp `level`. Phủ Thái Thú không vượt cấp Chúa Công. */
export function cheatSetBuildings(state: GameState, level: number): ActionResult {
  const lv = Math.max(0, Math.floor(level));
  const cap = Math.min(lv, state.player.level);
  state.queue = null;
  for (const [id, b] of Object.entries(cfg().buildings)) {
    if (state.player.level < b.unlockLevel) continue;
    state.buildings[id] = id === 'chinhDien' ? Math.max(1, cap) : cap;
  }
  mark(state);
  return { ok: true, msg: `Công trình lên cấp ${cap}${cap < lv ? ' (giới hạn bởi cấp Chúa Công)' : ''}` };
}

/** Đánh dấu đã vượt (3 sao) mọi ải trước chương `chapterId` */
export function cheatUnlockChapter(state: GameState, chapterId: number): ActionResult {
  let n = 0;
  for (const id of allStages()) {
    if (parseStage(id).ch >= chapterId) break;
    state.campaign.stars[id] = 3;
    n++;
  }
  const ch = cfg().chapters.find((c) => c.id === chapterId);
  if (ch && state.player.level < ch.reqLevel) state.player.level = ch.reqLevel;
  mark(state);
  return { ok: true, msg: `Mở tới chương ${chapterId} (${n} ải đạt 3 sao)` };
}

export function cheatMaxTiers(state: GameState): ActionResult {
  const max = cfg().tiers.length;
  for (const t of Object.keys(state.troopTiers)) state.troopTiers[t] = max;
  mark(state);
  return { ok: true, msg: `Mọi binh chủng lên bậc ${max}` };
}

/** Thêm võ tướng bất kỳ (bỏ qua giới hạn tửu quán), có sẵn đầy quân */
export function cheatAddHero(state: GameState, tid: string): ActionResult {
  if (!cfg().heroes[tid]) return { ok: false, reason: 'Không có võ tướng này' };
  if (state.heroes.some((h) => h.tid === tid)) return { ok: false, reason: 'Đã có võ tướng này' };
  const h = makeHero(state, tid);
  h.troops = maxTroopsFor(cfg().heroes[tid].base[0], state.buildings.luyenVo || 0);
  state.heroes.push(h);
  mark(state);
  return { ok: true, msg: `${cfg().heroes[tid].name} gia nhập` };
}

export function cheatMaxSkill(state: GameState, uid: number): ActionResult {
  const h = findHero(state, uid);
  if (!h) return { ok: false, reason: 'Không tìm thấy võ tướng' };
  h.skillLv = Math.max(h.skillLv, 1 + Math.floor(h.level / cfg().balance.skillHeroLevelStep));
  mark(state);
  return { ok: true, msg: `Chiến pháp cấp ${h.skillLv}` };
}

export function cheatResetTavern(state: GameState, now: number): ActionResult {
  state.tavern.nextFree = now;
  mark(state);
  return { ok: true, msg: 'Làm mới tửu quán miễn phí ngay' };
}
