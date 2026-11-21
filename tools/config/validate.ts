// Kiểm tra chéo toàn bộ cấu hình: mã tham chiếu có tồn tại không, số có hợp lý không...
// Trả về danh sách lỗi (tiếng Việt, ghi rõ sheet). Rỗng = hợp lệ.

import type { GameConfig } from '../../core/src/index.js';
import { BALANCE_NOTES } from './schema.js';

const REQUIRED_RESOURCES = ['luong', 'go', 'sat', 'bac', 'nguyenbao'];
const REQUIRED_ITEMS = ['tieuHoanDan', 'huyenThiet', 'biKip'];
const REQUIRED_BUILDINGS = ['chinhDien', 'quanMac', 'khoHang', 'luyenVo', 'tuuLau', 'loRen', 'tangKinh'];
const COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const ARRAY_KEYS = new Set(['balance.enemy.counts', 'balance.starThresholds']);

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

export function validateConfig(cfg: GameConfig): string[] {
  const errs: string[] = [];
  const e = (sheet: string, msg: string) => errs.push(`[${sheet}] ${msg}`);
  const costKeys = new Set([...Object.keys(cfg.resources ?? {}), ...Object.keys(cfg.items ?? {})]);
  const checkCost = (sheet: string, where: string, cost: Record<string, number>) => {
    for (const [k, v] of Object.entries(cost ?? {})) {
      if (!costKeys.has(k)) e(sheet, `${where}: "${k}" không phải tài nguyên hay vật phẩm`);
      if (!(v >= 0)) e(sheet, `${where}: số lượng ${k} phải ≥ 0`);
    }
  };

  // Cân bằng
  for (const key of Object.keys(BALANCE_NOTES)) {
    const v = getPath(cfg, key);
    if (key === 'version') { if (typeof v !== 'string' && typeof v !== 'number') e('Cân bằng', `thiếu khóa "${key}"`); continue; }
    if (key === 'balance.enemy.eliteSkill') { if (typeof v !== 'string' || !cfg.skills?.[v]) e('Cân bằng', `"${key}" = "${v}" không có trong sheet Chiến pháp`); continue; }
    if (ARRAY_KEYS.has(key)) {
      if (!Array.isArray(v) || !v.length || v.some((x) => typeof x !== 'number' || !Number.isFinite(x))) e('Cân bằng', `"${key}" phải là danh sách số, cách nhau dấu phẩy`);
      continue;
    }
    if (typeof v !== 'number' || !Number.isFinite(v)) e('Cân bằng', `"${key}" phải là một con số (đang là ${v === undefined ? 'trống' : JSON.stringify(v)})`);
  }
  const b = cfg.balance;
  if (b) {
    if (b.starThresholds?.length !== 2) e('Cân bằng', '"balance.starThresholds" cần đúng 2 số: ngưỡng 3 sao, ngưỡng 2 sao');
    else if (b.starThresholds[0] > b.starThresholds[1]) e('Cân bằng', 'ngưỡng 3 sao phải nhỏ hơn ngưỡng 2 sao');
    if (b.enemy?.counts?.some((n) => n < 1 || n > 6 || !Number.isInteger(n))) e('Cân bằng', 'số đội địch mỗi ải phải là số nguyên từ 1 đến 6');
    for (const k of ['stamina.max', 'stamina.regenSeconds', 'combat.maxRounds', 'tavern.candidates', 'enemy.tierEveryStages', 'equip.tierEveryLoRen', 'rewards.firstPillsEvery', 'rewards.bossBiKipEvery', 'skillHeroLevelStep']) {
      const v = getPath(b, k) as number;
      if (typeof v === 'number' && v <= 0) e('Cân bằng', `"balance.${k}" phải lớn hơn 0`);
    }
  }
  if (!(cfg.stagesPerChapter >= 1)) e('Cân bằng', '"stagesPerChapter" phải ≥ 1');

  // Tài nguyên, vật phẩm
  for (const r of REQUIRED_RESOURCES) if (!cfg.resources?.[r]) e('Tài nguyên', `thiếu tài nguyên bắt buộc "${r}" (game cần mã này)`);
  for (const i of REQUIRED_ITEMS) if (!cfg.items?.[i]) e('Vật phẩm', `thiếu vật phẩm bắt buộc "${i}" (game cần mã này)`);

  // Xuất trận, thưởng phe

  // Công trình
  for (const id of REQUIRED_BUILDINGS) if (!cfg.buildings?.[id]) e('Công trình', `thiếu công trình bắt buộc "${id}" (game cần mã này)`);
  for (const [id, bd] of Object.entries(cfg.buildings ?? {})) {
    if (bd.produces && !cfg.resources[bd.produces]) e('Công trình', `${id}: sản xuất "${bd.produces}" không có trong sheet Tài nguyên`);
    if (bd.produces && !(bd.prodBase && bd.prodBase > 0)) e('Công trình', `${id}: có sản xuất thì cần sản lượng gốc > 0`);
    if (!COLOR.test(bd.roof)) e('Công trình', `${id}: màu mái "${bd.roof}" phải dạng #RRGGBB`);
    checkCost('Công trình', id, bd.cost);
  }
  if (cfg.buildings?.chinhDien && !(cfg.buildings.chinhDien.startLevel >= 1)) e('Công trình', 'chinhDien: cấp khi bắt đầu phải ≥ 1');
  if (cfg.buildings?.khoHang && !(cfg.buildings.khoHang.storageBase && cfg.buildings.khoHang.storageBase > 0)) e('Công trình', 'khoHang: cần sức chứa gốc > 0');

  // Phe, phẩm chất
  for (const [id, f] of Object.entries(cfg.factions ?? {})) if (!COLOR.test(f.color)) e('Phe', `${id}: màu "${f.color}" phải dạng #RRGGBB`);
  for (const [id, q] of Object.entries(cfg.qualities ?? {})) if (!COLOR.test(q.color)) e('Phẩm chất', `phẩm ${id}: màu "${q.color}" phải dạng #RRGGBB`);
  if (!Object.values(cfg.qualities ?? {}).some((q) => Math.max(q.weightMin, q.weightBase) > 0)) e('Phẩm chất', 'cần ít nhất một phẩm có trọng số > 0 khi tửu quán cấp 0');

  // Bậc, binh lính
  if (!cfg.tiers?.length) e('Bậc binh chủng', 'cần ít nhất 1 bậc');
  cfg.tiers?.forEach((t, i) => checkCost('Bậc binh chủng', `bậc ${i + 1}`, t.cost));
  for (const [id, t] of Object.entries(cfg.troopTypes ?? {})) {
    for (const x of t.beats) if (!cfg.troopTypes[x]) e('Binh chủng', `${id}: khắc "${x}" không có trong sheet Binh chủng`);
    if (t.tiers.length !== cfg.tiers.length) e('Binh chủng', `${id}: có ${t.tiers.length} tên bậc nhưng sheet Bậc binh chủng có ${cfg.tiers.length} bậc`);
  }

  // Chiến pháp
  for (const [id, s] of Object.entries(cfg.skills ?? {})) {
    for (const fx of s.effects) {
      if ((fx.chance ?? 0) > 1 || (fx.chance ?? 0) < 0) e('Chiến pháp', `${id}: ti_le phải từ 0 đến 1 (0.3 = 30%)`);
      if (['stun', 'poison', 'buffAtk', 'atkDown', 'defDown', 'teamBuffAtk'].includes(fx.type) && !fx.turns) e('Chiến pháp', `${id}: hiệu ứng cần so_luot`);
      if (['poison', 'buffAtk', 'atkDown', 'defDown', 'heal', 'teamBuffAtk', 'teamHeal'].includes(fx.type) && fx.pct === undefined) e('Chiến pháp', `${id}: hiệu ứng cần phan_tram`);
      if (fx.type === 'stun' && fx.chance === undefined) e('Chiến pháp', `${id}: hiệu ứng choang cần ti_le`);
      if (fx.type === 'khiDrain' && fx.amount === undefined) e('Chiến pháp', `${id}: hiệu ứng hut_khi cần luong`);
    }
  }

  // Võ tướng
  if (!cfg.starterHeroes?.length) e('Võ tướng', 'cần ít nhất một võ tướng có cột Khởi đầu = có');
  for (const [id, h] of Object.entries(cfg.heroes ?? {})) {
    if (!cfg.qualities[String(h.q)]) e('Võ tướng', `${id}: phẩm ${h.q} không có trong sheet Phẩm chất`);
    if (!cfg.factions[h.faction]) e('Võ tướng', `${id}: phe "${h.faction}" không có trong sheet Phe`);
    if (!cfg.troopTypes[h.school]) e('Võ tướng', `${id}: binh chủng 1 "${h.school}" không có trong sheet Binh chủng`);
    if (!cfg.troopTypes[h.school2]) e('Võ tướng', `${id}: binh chủng 2 "${h.school2}" không có trong sheet Binh chủng`);
    if (h.school === h.school2) e('Võ tướng', `${id}: hai binh chủng phải khác nhau`);
    if (!cfg.skills[h.skill]) e('Võ tướng', `${id}: chiến pháp "${h.skill}" không có trong sheet Chiến pháp`);
    h.palette.forEach((c) => { if (!COLOR.test(c)) e('Võ tướng', `${id}: màu "${c}" phải dạng #RRGGBB`); });
  }

  // Chương
  const chIds = new Set<number>();
  let prevReq = 0;
  for (const c of cfg.chapters ?? []) {
    if (chIds.has(c.id)) e('Chương', `chương số ${c.id} bị trùng`);
    chIds.add(c.id);
    if (!cfg.troopTypes[c.boss.type]) e('Chương', `chương ${c.id}: hệ trùm "${c.boss.type}" không có trong sheet Binh chủng`);
    if (!cfg.skills[c.boss.skill]) e('Chương', `chương ${c.id}: chiến pháp trùm "${c.boss.skill}" không có trong sheet Chiến pháp`);
    if (!c.enemyNames.length) e('Chương', `chương ${c.id}: cần ít nhất một tên lính`);
    if (c.reqLevel < prevReq) e('Chương', `chương ${c.id}: cấp yêu cầu thấp hơn chương trước`);
    prevReq = c.reqLevel;
    c.palette.forEach((col) => { if (!COLOR.test(col)) e('Chương', `chương ${c.id}: màu "${col}" phải dạng #RRGGBB`); });
  }
  if (!cfg.chapters?.length) e('Chương', 'cần ít nhất một chương');

  // Trang bị
  for (const [id, s] of Object.entries(cfg.equipSlots ?? {})) if (!s.tierNames.length) e('Ô trang bị', `${id}: cần ít nhất 1 tên bậc`);
  if (!cfg.equipQualities?.length || !cfg.equipQualities.some((q) => q.weight > 0)) e('Phẩm trang bị', 'cần ít nhất một phẩm có tỉ lệ > 0');

  // Nhiệm vụ
  const stageIds = new Set<string>();
  for (const c of cfg.chapters ?? []) for (let s = 1; s <= cfg.stagesPerChapter; s++) stageIds.add(`${c.id}-${s}`);
  for (const q of cfg.quests ?? []) {
    if (q.cond.type === 'building' && !cfg.buildings[q.cond.target ?? '']) e('Nhiệm vụ', `${q.id}: công trình "${q.cond.target ?? ''}" không có trong sheet Công trình`);
    if (q.cond.type === 'stage' && !stageIds.has(q.cond.target ?? '')) e('Nhiệm vụ', `${q.id}: ải "${q.cond.target ?? ''}" không tồn tại (dạng chương-ải, ví dụ 1-3)`);
    if (q.cond.type !== 'stage' && !(q.cond.value > 0)) e('Nhiệm vụ', `${q.id}: cần giá trị > 0`);
    checkCost('Nhiệm vụ', q.id, q.reward);
  }
  // Loại binh chủng
  const vIds = new Set<string>();
  for (const v of cfg.troopVariants ?? []) {
    if (vIds.has(v.id)) e('Loại binh chủng', `mã "${v.id}" bị trùng`);
    vIds.add(v.id);
    if (!cfg.troopTypes?.[v.troop]) e('Loại binh chủng', `${v.id}: binh chủng "${v.troop}" không có trong sheet Binh chủng`);
  }
  for (const t of Object.keys(cfg.troopTypes ?? {})) {
    const list = (cfg.troopVariants ?? []).filter((v) => v.troop === t);
    if (!list.length) e('Loại binh chủng', `binh chủng "${t}" chưa có loại nào`);
    else if (!list.some((v) => v.weight > 0)) e('Loại binh chủng', `binh chủng "${t}": cần ít nhất một loại có tỉ lệ ra > 0`);
  }

  // Trận hình
  const fIds = new Set<string>();
  if (!cfg.formations?.length) e('Trận hình', 'cần ít nhất một trận hình');
  for (const f of cfg.formations ?? []) {
    if (fIds.has(f.id)) e('Trận hình', `mã "${f.id}" bị trùng`);
    fIds.add(f.id);
    const cells: number[] = [];
    f.rows.forEach((row, r) => {
      if (!/^[xo]{3}$/.test(row)) e('Trận hình', `${f.id}: hàng ${r + 1} = "${row}" phải gồm đúng 3 ký tự x hoặc o (ví dụ xox)`);
      for (let c = 0; c < 3; c++) if (row[c] === 'x') cells.push(r * 3 + c + 1);
    });
    if (f.mode === 'fixed') {
      if (!f.unlockOrder.length) e('Trận hình', `${f.id}: kiểu cố định cần Thứ tự mở ô`);
      if (f.unlockOrder.length > 5) e('Trận hình', `${f.id}: tối đa 5 ô (đang có ${f.unlockOrder.length})`);
      const seen = new Set<number>();
      for (const s of f.unlockOrder) {
        if (!cells.includes(s)) e('Trận hình', `${f.id}: ô ${s} trong Thứ tự mở ô không phải ô "x" của bố cục (ô x: ${cells.join(', ')})`);
        if (seen.has(s)) e('Trận hình', `${f.id}: ô ${s} lặp lại trong Thứ tự mở ô`);
        seen.add(s);
      }
      if (f.unlockOrder.length - 1 > f.maxLevel) e('Trận hình', `${f.id}: cấp tối đa ${f.maxLevel} không đủ để mở hết ${f.unlockOrder.length} ô`);
    } else {
      if (!f.freeCountLevels.length || f.freeCountLevels[0] !== 0) e('Trận hình', `${f.id}: kiểu tự do cần Mốc thêm ô bắt đầu bằng 0`);
      if (f.freeCountLevels.length > 5) e('Trận hình', `${f.id}: tối đa 5 ô`);
      if (f.freeCountLevels.some((x, i, a) => i > 0 && x <= a[i - 1])) e('Trận hình', `${f.id}: Mốc thêm ô phải tăng dần`);
      if (cells.length < f.freeCountLevels.length) e('Trận hình', `${f.id}: bố cục chỉ có ${cells.length} ô x, không đủ ${f.freeCountLevels.length} ô`);
    }
    if (f.startLevel > f.maxLevel) e('Trận hình', `${f.id}: cấp khi bắt đầu lớn hơn cấp tối đa`);
  }
  const qmStart = cfg.buildings?.quanMac?.startLevel ?? 0;
  if (cfg.formations?.length && !cfg.formations.some((f) => f.reqQuanMac <= qmStart)) e('Trận hình', `cần ít nhất một trận hình mở sẵn (Mở ở cấp Quân Mạc ≤ ${qmStart}, cấp Quân Mạc khi bắt đầu)`);

  // Cửa hàng
  const shopIds = new Set<string>();
  for (const x of [...(cfg.shop ?? []), ...(cfg.packs ?? []), ...(cfg.topups ?? [])]) {
    if (shopIds.has(x.id)) e('Cửa hàng', `mã "${x.id}" bị trùng giữa các sheet Cửa hàng / Gói ưu đãi / Gói nạp`);
    shopIds.add(x.id);
  }
  for (const x of cfg.shop ?? []) {
    if (x.item !== 'stamina' && !costKeys.has(x.item)) e('Cửa hàng', `${x.id}: mặt hàng "${x.item}" không phải tài nguyên, vật phẩm hay stamina`);
    if (x.limit !== 'none' && !(x.limitCount > 0)) e('Cửa hàng', `${x.id}: có giới hạn thì cần số lần mỗi kỳ > 0`);
  }
  for (const x of cfg.packs ?? []) {
    checkCost('Gói ưu đãi', x.id, x.contents);
    if (!Object.keys(x.contents).length) e('Gói ưu đãi', `${x.id}: gói trống, cần ít nhất một món`);
    if (x.limit !== 'none' && !(x.limitCount > 0)) e('Gói ưu đãi', `${x.id}: có giới hạn thì cần số lần mỗi kỳ > 0`);
  }
  checkCost('Cân bằng', 'tài nguyên khởi đầu', b?.startRes ?? {});
  checkCost('Cân bằng', 'vật phẩm khởi đầu', b?.startItems ?? {});
  return errs;
}
