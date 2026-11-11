// Mô tả các sheet trong file Excel cấu hình và cách đổi qua lại với GameConfig.
// Tiêu đề cột có dạng "Nhãn tiếng Việt (khóa)". Công cụ chỉ đọc phần khóa trong ngoặc,
// nên bạn đổi được phần nhãn tùy ý, chỉ cần giữ nguyên phần trong ngoặc.

import type { GameConfig } from '../../core/src/index.js';

export type ColType = 'id' | 'text' | 'int' | 'num' | 'bool' | 'color' | 'list' | 'enum';

export interface Col {
  key: string;
  label: string;
  type: ColType;
  required?: boolean;
  min?: number;
  max?: number;
  /** giá trị hiển thị trong Excel → giá trị trong game */
  enumMap?: Record<string, string>;
  note?: string;
  width?: number;
}

export type Row = Record<string, unknown>;

export interface SheetSpec {
  name: string;
  note: string;
  /** 'table': mỗi dòng một đối tượng; 'kv': dòng là cặp khóa - giá trị */
  kind: 'table' | 'kv';
  columns: (cfg: GameConfig) => Col[];
  toRows: (cfg: GameConfig) => Row[];
  /** ghi dữ liệu đã đọc vào cfg đang dựng */
  apply: (rows: Row[], cfg: GameConfig) => void;
}

const invert = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]));

export const TARGET_VI: Record<string, string> = {
  mot_muc_tieu: 'single', hang_truoc: 'row', hang_sau: 'back', toan_bo: 'all',
  ngau_nhien_2: 'random2', ngau_nhien_3: 'random3', it_quan_nhat: 'weakest',
};
export const STAT_VI: Record<string, string> = { thong_soai: 'canCot', vu_luc: 'voLuc', tri_luc: 'ngoTinh' };
export const DMG_VI: Record<string, string> = { vat_cong: 'ngoai', muu_cong: 'doc' };
export const RANGE_VI: Record<string, string> = { can_chien: 'melee', tam_xa: 'ranged' };
export const QUEST_VI: Record<string, string> = {
  cong_trinh: 'building', vuot_ai: 'stage', cap_chuong_mon: 'playerLevel', so_hiep_khach: 'heroCount',
  cap_hiep_khach: 'heroLevel', bac_de_tu: 'tier', so_lan_ren: 'forged', cuong_hoa: 'enhanced', cap_tuyet_ky: 'skillLevel',
};
export const EFFECT_VI: Record<string, string> = {
  choang: 'stun', thieu_dot: 'poison', tang_cong: 'buffAtk', giam_cong: 'atkDown', giam_phong: 'defDown',
  hoi_quan: 'heal', hut_khi: 'khiDrain', ca_doi_tang_cong: 'teamBuffAtk', ca_doi_hoi_quan: 'teamHeal',
};
export const EFFECT_PARAM_VI: Record<string, string> = { ti_le: 'chance', phan_tram: 'pct', so_luot: 'turns', luong: 'amount', ban_than: 'self' };

const enumNote = (m: Record<string, string>) => `Chọn một trong: ${Object.keys(m).join(', ')}`;

/** Cột chi phí/phần thưởng: một cột cho mỗi tài nguyên và vật phẩm */
function costCols(cfg: GameConfig, prefix: string, label: string, keys?: string[]): Col[] {
  const all = keys ?? [...Object.keys(cfg.resources), ...Object.keys(cfg.items)];
  return all.map((k) => ({
    key: `${prefix}_${k}`,
    label: `${label} ${cfg.resources[k]?.short ?? cfg.items[k]?.name ?? k}`,
    type: 'num' as ColType,
    min: 0,
    width: 10,
  }));
}
function costToRow(prefix: string, cost: Record<string, number>): Row {
  return Object.fromEntries(Object.entries(cost).map(([k, v]) => [`${prefix}_${k}`, v]));
}
function rowToCost(prefix: string, row: Row): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith(`${prefix}_`) && typeof v === 'number' && v !== 0) out[k.slice(prefix.length + 1)] = v;
  }
  return out;
}
const palCols = (): Col[] => [
  { key: 'mau_ao', label: 'Màu áo', type: 'color', required: true, width: 10 },
  { key: 'mau_ao_dam', label: 'Màu áo đậm', type: 'color', required: true, width: 10 },
  { key: 'mau_toc', label: 'Màu tóc', type: 'color', required: true, width: 10 },
  { key: 'mau_nhan', label: 'Màu nhấn', type: 'color', required: true, width: 10 },
];
const palToRow = (p: string[]) => ({ mau_ao: p[0], mau_ao_dam: p[1], mau_toc: p[2], mau_nhan: p[3] });
const rowToPal = (r: Row) => [r.mau_ao, r.mau_ao_dam, r.mau_toc, r.mau_nhan] as [string, string, string, string];

// ---------- Cân bằng: các con số lẻ, dạng khóa - giá trị ----------

export const BALANCE_NOTES: Record<string, string> = {
  version: 'Phiên bản dữ liệu, tự đặt (vd 0.2.1)',
  stagesPerChapter: 'Số ải mỗi chương; ải cuối là trùm',
  'balance.startRes.luong': 'Lương thực khi bắt đầu game',
  'balance.startRes.go': 'Gỗ khi bắt đầu',
  'balance.startRes.sat': 'Sắt khi bắt đầu',
  'balance.startRes.bac': 'Bạc khi bắt đầu',
  'balance.startRes.nguyenbao': 'Nguyên bảo khi bắt đầu',
  'balance.offlineCapHours': 'Offline tối đa bao nhiêu giờ thì ngừng sinh tài nguyên',
  'balance.stamina.max': 'Thể lực tối đa',
  'balance.stamina.regenSeconds': 'Bao nhiêu giây hồi 1 thể lực',
  'balance.stamina.perWin': 'Thể lực tốn khi thắng (và khi càn quét)',
  'balance.stamina.perLoss': 'Thể lực tốn khi thua',
  'balance.playerExp.base': 'KN Chúa Công cần để lên cấp = hệ số × cấp ^ lũy thừa',
  'balance.playerExp.exp': 'Lũy thừa của công thức KN Chúa Công',
  'balance.playerMaxLevel': 'Cấp Chúa Công tối đa',
  'balance.heroExp.base': 'KN võ tướng cần để lên cấp = hệ số × cấp ^ lũy thừa',
  'balance.heroExp.exp': 'Lũy thừa của công thức KN võ tướng',
  'balance.troops.base': 'Quân tối đa = gốc + Thống Soái × hệ số + cấp Giáo Trường × hệ số',
  'balance.troops.perCanCot': 'Quân tối đa thêm cho mỗi điểm Thống Soái',
  'balance.troops.perLuyenVo': 'Quân tối đa thêm cho mỗi cấp Giáo Trường',
  'balance.refill.luong': 'Lương để bổ sung 1 binh lính (nhân với bậc)',
  'balance.refill.bac': 'Bạc để bổ sung 1 binh lính (nhân với bậc)',
  'balance.combat.damageK': 'Hệ số sát thương chung. Tăng thì trận ngắn lại',
  'balance.combat.counterBonus': 'Nhân sát thương khi khắc hệ địch',
  'balance.combat.counterPenalty': 'Nhân sát thương khi bị địch khắc',
  'balance.combat.schoolBonus': 'Cộng công khi dẫn đúng hệ sở trường (0.15 = 15%)',
  'balance.combat.maxRounds': 'Số hiệp tối đa; hết hiệp thì bên tấn công thua',
  'balance.combat.khiStart': 'Khí lúc vào trận (đủ 100 thì tung chiến pháp)',
  'balance.combat.khiPerAttack': 'Khí nhận khi đánh thường',
  'balance.combat.khiPerHit': 'Khí nhận khi bị đánh',
  'balance.combat.critBase': 'Tỉ lệ bạo kích gốc (0.05 = 5%)',
  'balance.combat.critPerNgoTinh': 'Tỉ lệ bạo kích thêm cho mỗi điểm Trí Lực',
  'balance.combat.critMult': 'Nhân sát thương khi bạo kích',
  'balance.combat.skillLevelBonus': 'Mỗi cấp chiến pháp tăng bao nhiêu sức mạnh (0.08 = 8%)',
  'balance.combat.skillMinTroopPct': 'Chiến pháp tính quân tối thiểu bằng % quân tối đa, để tướng ít quân vẫn đánh đau',
  'balance.starThresholds': 'Tổn thất tối đa để được 3 sao, 2 sao (cách nhau dấu phẩy)',
  'balance.speedUp.freeSeconds': 'Xây xong ngay miễn phí khi còn ≤ bao nhiêu giây',
  'balance.speedUp.perMinute': 'Nguyên bảo mỗi phút khi xây xong ngay',
  'balance.baseTrickle': 'Tài nguyên tự sinh mỗi giờ kể cả khi chưa có công trình',
  'balance.tavern.freeRefreshSeconds': 'Số giây giữa hai lần làm mới tửu quán miễn phí',
  'balance.tavern.refreshCostBac': 'Giá làm mới tửu quán bằng bạc',
  'balance.tavern.refreshCostNguyenBao': 'Giá làm mới tửu quán bằng nguyên bảo',
  'balance.tavern.candidates': 'Số khách mỗi lần làm mới',
  'balance.tavern.rosterBase': 'Số võ tướng tối đa khi chưa có tửu quán',
  'balance.tavern.rosterPerLevel': 'Số võ tướng tối đa thêm mỗi cấp tửu quán',
  'balance.enemy.counts': 'Số đội địch ở từng ải, theo thứ tự ải (cách nhau dấu phẩy)',
  'balance.enemy.levelPerStage': 'Cấp địch tăng mỗi ải',
  'balance.enemy.statBase': 'Chỉ số địch = gốc + cấp × hệ số + (số thứ tự ải ^ lũy thừa) × hệ số cong',
  'balance.enemy.statPerLevel': 'Chỉ số địch thêm mỗi cấp',
  'balance.enemy.statCurveMul': 'Hệ số cong của chỉ số địch (càng lớn càng khó về sau)',
  'balance.enemy.statCurveExp': 'Lũy thừa cong của chỉ số địch',
  'balance.enemy.troopsBase': 'Quân địch = gốc + ải × hệ số + (ải ^ lũy thừa) × hệ số cong',
  'balance.enemy.troopsPerStage': 'Quân địch thêm mỗi ải',
  'balance.enemy.troopsCurveMul': 'Hệ số cong của quân địch',
  'balance.enemy.troopsCurveExp': 'Lũy thừa cong của quân địch',
  'balance.enemy.bossStatMul': 'Trùm mạnh hơn lính thường bao nhiêu lần (chỉ số)',
  'balance.enemy.bossTroopMul': 'Trùm nhiều quân hơn bao nhiêu lần',
  'balance.enemy.tierEveryStages': 'Cứ bao nhiêu ải thì bậc binh chủng của địch tăng 1',
  'balance.enemy.eliteFromStage': 'Từ ải thứ mấy (đếm từ đầu) thì có lính tinh nhuệ biết chiến pháp',
  'balance.enemy.eliteSkill': 'Chiến pháp của lính tinh nhuệ (mã trong sheet Chiến pháp)',
  'balance.rewards.expBase': 'KN thưởng = gốc + thứ tự ải × hệ số',
  'balance.rewards.expPerStage': 'KN thưởng thêm mỗi ải',
  'balance.rewards.luongBase': 'Lương thưởng gốc',
  'balance.rewards.luongPerStage': 'Lương thưởng thêm mỗi ải',
  'balance.rewards.goBase': 'Gỗ thưởng gốc',
  'balance.rewards.goPerStage': 'Gỗ thưởng thêm mỗi ải',
  'balance.rewards.bacBase': 'Bạc thưởng gốc',
  'balance.rewards.bacPerStage': 'Bạc thưởng thêm mỗi ải',
  'balance.rewards.repeatExpPct': 'Đánh lại/càn quét nhận bao nhiêu % KN (0.4 = 40%)',
  'balance.rewards.repeatResPct': 'Đánh lại/càn quét nhận bao nhiêu % tài nguyên',
  'balance.rewards.firstPillsBase': 'Binh Thư Nhỏ khi vượt ải lần đầu',
  'balance.rewards.firstPillsEvery': 'Cứ bao nhiêu ải thì thêm 1 Binh Thư Nhỏ',
  'balance.rewards.firstNguyenBao': 'Nguyên bảo khi vượt ải thường lần đầu',
  'balance.rewards.bossNguyenBaoBase': 'Nguyên bảo khi hạ trùm lần đầu',
  'balance.rewards.bossNguyenBaoPerStage': 'Nguyên bảo hạ trùm thêm mỗi ải',
  'balance.rewards.bossHuyenThietBase': 'Tinh Thiết khi hạ trùm (cộng thêm số thứ tự ải)',
  'balance.rewards.bossBiKipEvery': 'Cứ bao nhiêu ải thì trùm rơi thêm 1 tàn quyển binh pháp',
  'balance.rewards.sweepLuongBase': 'Lương tốn mỗi lần càn quét',
  'balance.rewards.sweepLuongPerStage': 'Lương càn quét thêm mỗi ải',
  'balance.rewards.sweepPillChance': 'Tỉ lệ rơi Binh Thư Nhỏ khi càn quét',
  'balance.equip.statPerTier': 'Chỉ số trang bị = hệ số × bậc × phẩm chất × (1 + cường hóa × %)',
  'balance.equip.enhancePct': 'Mỗi cấp cường hóa tăng bao nhiêu % chỉ số',
  'balance.equip.maxEnhancePerLoRen': 'Cường hóa tối đa = cấp Lò Rèn × hệ số này',
  'balance.equip.tierEveryLoRen': 'Cứ bao nhiêu cấp Lò Rèn thì rèn được bậc cao hơn',
  'balance.equip.forgeSatBase': 'Sắt để rèn bậc 1 (bậc sau nhân hệ số tăng)',
  'balance.equip.forgeBacBase': 'Bạc để rèn bậc 1',
  'balance.equip.forgeGrowth': 'Hệ số tăng giá rèn mỗi bậc',
  'balance.equip.forgeHuyenThietPerTier': 'Tinh Thiết để rèn, nhân với bậc',
  'balance.equip.enhanceSatBase': 'Sắt cường hóa, nhân bậc và hệ số tăng',
  'balance.equip.enhanceBacBase': 'Bạc cường hóa, nhân bậc và hệ số tăng',
  'balance.equip.enhanceGrowth': 'Hệ số tăng giá cường hóa mỗi cấp',
  'balance.equip.enhanceHuyenThietFrom': 'Từ cấp cường hóa này trở đi tốn Tinh Thiết',
  'balance.equip.sellRatio': 'Bán trang bị được lại bao nhiêu phần giá rèn',
  'balance.releaseExpRefund': 'Mời võ tướng rời đi được hoàn bao nhiêu phần KN',
  'balance.skillCostBac.base': 'Bạc nâng chiến pháp = hệ số × cấp ^ lũy thừa',
  'balance.skillCostBac.exp': 'Lũy thừa giá nâng chiến pháp',
  'balance.skillHeroLevelStep': 'Cứ bao nhiêu cấp võ tướng thì được thêm 1 cấp chiến pháp tối đa',
};

function flatten(obj: unknown, prefix: string, out: Row[]): void {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    let note = BALANCE_NOTES[prefix] ?? '';
    if (!note && prefix.startsWith('balance.startRes.')) note = 'Tài nguyên này khi bắt đầu game';
    if (!note && prefix.startsWith('balance.startItems.')) note = 'Số vật phẩm này khi bắt đầu game';
    out.push({ key: prefix, value: Array.isArray(obj) ? obj.join(', ') : obj, note });
  }
}

export function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur = target;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] ??= {};
    cur = cur[parts[i]] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

// ---------- Danh sách sheet ----------

export const SHEETS: SheetSpec[] = [
  {
    name: 'Cân bằng',
    kind: 'kv',
    note: 'Các con số chung. Chỉ sửa cột Giá trị. Danh sách nhiều số thì cách nhau dấu phẩy.',
    columns: () => [
      { key: 'key', label: 'Khóa', type: 'text', required: true, width: 38 },
      { key: 'value', label: 'Giá trị', type: 'text', required: true, width: 26 },
      { key: 'note', label: 'Ý nghĩa', type: 'text', width: 80 },
    ],
    toRows: (cfg) => {
      const rows: Row[] = [];
      flatten({ version: cfg.version, stagesPerChapter: cfg.stagesPerChapter }, '', rows);
      flatten(cfg.balance, 'balance', rows);
      return rows;
    },
    apply: () => { /* xử lý riêng trong import vì cần đoán kiểu giá trị */ },
  },
  {
    name: 'Xuất trận',
    kind: 'table',
    note: 'Số võ tướng được đưa vào đội hình theo cấp Chúa Công.',
    columns: () => [
      { key: 'level', label: 'Từ cấp Chúa Công', type: 'int', required: true, min: 1 },
      { key: 'slots', label: 'Số người xuất trận', type: 'int', required: true, min: 1, max: 6 },
    ],
    toRows: (cfg) => cfg.deploySlots.map((r) => ({ ...r })),
    apply: (rows, cfg) => { cfg.deploySlots = rows.map((r) => ({ level: r.level as number, slots: r.slots as number })).sort((a, b) => a.level - b.level); },
  },
  {
    name: 'Thưởng phe',
    kind: 'table',
    note: 'Đội hình có nhiều người cùng phe thì được cộng % công.',
    columns: () => [
      { key: 'count', label: 'Số người cùng phe', type: 'int', required: true, min: 2 },
      { key: 'bonus', label: 'Cộng công (0.08 = 8%)', type: 'num', required: true, min: 0 },
    ],
    toRows: (cfg) => cfg.factionBonus.map((r) => ({ ...r })),
    apply: (rows, cfg) => { cfg.factionBonus = rows.map((r) => ({ count: r.count as number, bonus: r.bonus as number })).sort((a, b) => a.count - b.count); },
  },
  {
    name: 'Tài nguyên',
    kind: 'table',
    note: 'Tài nguyên chính. Mã (id) dùng ở các sheet khác, không nên đổi mã khi game đã phát hành.',
    columns: () => [
      { key: 'id', label: 'Mã', type: 'id', required: true },
      { key: 'name', label: 'Tên', type: 'text', required: true, width: 16 },
      { key: 'short', label: 'Tên ngắn', type: 'text', required: true },
      { key: 'desc', label: 'Mô tả', type: 'text', width: 50 },
    ],
    toRows: (cfg) => Object.entries(cfg.resources).map(([id, r]) => ({ id, ...r })),
    apply: (rows, cfg) => { cfg.resources = Object.fromEntries(rows.map((r) => [r.id as string, { name: r.name as string, short: r.short as string, desc: (r.desc as string) ?? '' }])); },
  },
  {
    name: 'Vật phẩm',
    kind: 'table',
    note: 'Vật phẩm trong túi đồ. Kinh nghiệm > 0 nghĩa là dùng được để tăng cấp võ tướng.',
    columns: () => [
      { key: 'id', label: 'Mã', type: 'id', required: true },
      { key: 'name', label: 'Tên', type: 'text', required: true, width: 18 },
      { key: 'desc', label: 'Mô tả', type: 'text', width: 50 },
      { key: 'exp', label: 'Kinh nghiệm', type: 'int', min: 0 },
    ],
    toRows: (cfg) => Object.entries(cfg.items).map(([id, r]) => ({ id, ...r })),
    apply: (rows, cfg) => {
      cfg.items = Object.fromEntries(rows.map((r) => {
        const it: { name: string; desc: string; exp?: number } = { name: r.name as string, desc: (r.desc as string) ?? '' };
        if (r.exp) it.exp = r.exp as number;
        return [r.id as string, it];
      }));
    },
  },
  {
    name: 'Công trình',
    kind: 'table',
    note: 'Thứ tự dòng là thứ tự hiển thị. Giá cấp N = giá gốc × hệ số giá^(N-1). Thời gian (giây) tương tự. Sản lượng/giờ = gốc × cấp × hệ số^(cấp-1).',
    columns: (cfg) => [
      { key: 'id', label: 'Mã', type: 'id', required: true, width: 12 },
      { key: 'name', label: 'Tên', type: 'text', required: true, width: 16 },
      { key: 'desc', label: 'Mô tả', type: 'text', width: 40 },
      { key: 'roof', label: 'Màu mái', type: 'color', required: true },
      { key: 'unlockLevel', label: 'Mở ở cấp Chúa Công', type: 'int', required: true, min: 1 },
      { key: 'startLevel', label: 'Cấp khi bắt đầu', type: 'int', min: 0 },
      ...costCols(cfg, 'gia', 'Giá', Object.keys(cfg.resources).filter((k) => k !== 'nguyenbao')),
      { key: 'costGrowth', label: 'Hệ số giá', type: 'num', required: true, min: 1 },
      { key: 'timeBase', label: 'Thời gian gốc (giây)', type: 'num', required: true, min: 0 },
      { key: 'timeGrowth', label: 'Hệ số thời gian', type: 'num', required: true, min: 1 },
      { key: 'produces', label: 'Sản xuất (mã tài nguyên)', type: 'text' },
      { key: 'prodBase', label: 'Sản lượng gốc/giờ', type: 'num', min: 0 },
      { key: 'prodGrowth', label: 'Hệ số sản lượng', type: 'num', min: 1 },
      { key: 'storageBase', label: 'Sức chứa gốc', type: 'num', min: 0 },
      { key: 'storageGrowth', label: 'Hệ số sức chứa', type: 'num', min: 1 },
    ],
    toRows: (cfg) => cfg.buildingOrder.map((id) => {
      const { cost, ...b } = cfg.buildings[id];
      return { id, ...b, ...costToRow('gia', cost) };
    }),
    apply: (rows, cfg) => {
      cfg.buildingOrder = rows.map((r) => r.id as string);
      cfg.buildings = Object.fromEntries(rows.map((r) => {
        const b: Record<string, unknown> = {
          name: r.name, desc: r.desc ?? '', roof: r.roof, cost: rowToCost('gia', r), costGrowth: r.costGrowth,
          timeBase: r.timeBase, timeGrowth: r.timeGrowth, unlockLevel: r.unlockLevel, startLevel: r.startLevel ?? 0,
        };
        for (const k of ['produces', 'prodBase', 'prodGrowth', 'storageBase', 'storageGrowth']) if (r[k] !== undefined && r[k] !== '') b[k] = r[k];
        return [r.id as string, b];
      })) as unknown as GameConfig['buildings'];
    },
  },
  {
    name: 'Phe',
    kind: 'table',
    note: 'Phe phái của võ tướng.',
    columns: () => [
      { key: 'id', label: 'Mã', type: 'id', required: true },
      { key: 'name', label: 'Tên', type: 'text', required: true, width: 16 },
      { key: 'color', label: 'Màu', type: 'color', required: true },
    ],
    toRows: (cfg) => Object.entries(cfg.factions).map(([id, f]) => ({ id, ...f })),
    apply: (rows, cfg) => { cfg.factions = Object.fromEntries(rows.map((r) => [r.id as string, { name: r.name as string, color: r.color as string }])); },
  },
  {
    name: 'Phẩm chất',
    kind: 'table',
    note: 'Phẩm chất võ tướng. Trọng số xuất hiện ở tửu quán = max(tối thiểu, gốc + mỗi cấp × cấp tửu quán).',
    columns: () => [
      { key: 'id', label: 'Phẩm (số)', type: 'int', required: true, min: 1 },
      { key: 'name', label: 'Tên', type: 'text', required: true, width: 14 },
      { key: 'color', label: 'Màu', type: 'color', required: true },
      { key: 'recruitCost', label: 'Giá chiêu mộ (bạc)', type: 'int', required: true, min: 0 },
      { key: 'weightBase', label: 'Trọng số gốc', type: 'num', required: true },
      { key: 'weightPerLevel', label: 'Trọng số mỗi cấp tửu quán', type: 'num', required: true },
      { key: 'weightMin', label: 'Trọng số tối thiểu', type: 'num', required: true, min: 0 },
    ],
    toRows: (cfg) => Object.entries(cfg.qualities).map(([id, q]) => ({ id: Number(id), ...q })),
    apply: (rows, cfg) => {
      cfg.qualities = Object.fromEntries(rows.map((r) => [String(r.id), {
        name: r.name as string, color: r.color as string, recruitCost: r.recruitCost as number,
        weightBase: r.weightBase as number, weightPerLevel: r.weightPerLevel as number, weightMin: r.weightMin as number,
      }]));
    },
  },
  {
    name: 'Võ tướng',
    kind: 'table',
    note: 'Chỉ số ở cấp N = gốc + trưởng thành × (N-1). Cột Khởi đầu = có: người chơi có sẵn khi bắt đầu.',
    columns: (cfg) => [
      { key: 'id', label: 'Mã', type: 'id', required: true, width: 16 },
      { key: 'name', label: 'Tên', type: 'text', required: true, width: 18 },
      { key: 'q', label: 'Phẩm', type: 'int', required: true, min: 1, note: 'Số trong sheet Phẩm chất' },
      { key: 'faction', label: 'Phe', type: 'enum', required: true, enumMap: Object.fromEntries(Object.keys(cfg.factions).map((k) => [k, k])) },
      { key: 'school', label: 'Sở trường', type: 'enum', required: true, enumMap: Object.fromEntries(Object.keys(cfg.troopTypes).map((k) => [k, k])) },
      { key: 'b0', label: 'Thống Soái gốc', type: 'num', required: true, min: 0 },
      { key: 'b1', label: 'Vũ Lực gốc', type: 'num', required: true, min: 0 },
      { key: 'b2', label: 'Trí Lực gốc', type: 'num', required: true, min: 0 },
      { key: 'g0', label: 'Trưởng thành Thống Soái', type: 'num', required: true, min: 0 },
      { key: 'g1', label: 'Trưởng thành Vũ Lực', type: 'num', required: true, min: 0 },
      { key: 'g2', label: 'Trưởng thành Trí Lực', type: 'num', required: true, min: 0 },
      { key: 'skill', label: 'Chiến pháp (mã)', type: 'text', required: true, width: 18 },
      ...palCols(),
      { key: 'starter', label: 'Khởi đầu', type: 'bool' },
      { key: 'bio', label: 'Tiểu sử', type: 'text', width: 50 },
    ],
    toRows: (cfg) => Object.entries(cfg.heroes).map(([id, h]) => ({
      id, name: h.name, q: h.q, faction: h.faction, school: h.school,
      b0: h.base[0], b1: h.base[1], b2: h.base[2], g0: h.growth[0], g1: h.growth[1], g2: h.growth[2],
      skill: h.skill, ...palToRow(h.palette), starter: cfg.starterHeroes.includes(id), bio: h.bio,
    })),
    apply: (rows, cfg) => {
      cfg.heroes = Object.fromEntries(rows.map((r) => [r.id as string, {
        name: r.name as string, q: r.q as number, faction: r.faction as string, school: r.school as string,
        base: [r.b0, r.b1, r.b2] as [number, number, number], growth: [r.g0, r.g1, r.g2] as [number, number, number],
        skill: r.skill as string, palette: rowToPal(r), bio: (r.bio as string) ?? '',
      }]));
      cfg.starterHeroes = rows.filter((r) => r.starter).map((r) => r.id as string);
    },
  },
  {
    name: 'Chiến pháp',
    kind: 'table',
    note: 'Hiệu ứng viết dạng: loại tham_số=giá_trị ... Ví dụ: "choang ti_le=0.3 so_luot=1", "thieu_dot phan_tram=0.25 so_luot=2", "tang_cong phan_tram=0.15 so_luot=2 ban_than". Loại: ' + Object.keys(EFFECT_VI).join(', ') + '. Tham số: ' + Object.keys(EFFECT_PARAM_VI).join(', ') + '.',
    columns: () => [
      { key: 'id', label: 'Mã', type: 'id', required: true, width: 18 },
      { key: 'name', label: 'Tên', type: 'text', required: true, width: 20 },
      { key: 'desc', label: 'Mô tả', type: 'text', width: 44 },
      { key: 'target', label: 'Mục tiêu', type: 'enum', required: true, enumMap: TARGET_VI, note: enumNote(TARGET_VI), width: 14 },
      { key: 'mult', label: 'Hệ số sát thương', type: 'num', required: true, min: 0 },
      { key: 'stat', label: 'Chỉ số dùng', type: 'enum', required: true, enumMap: STAT_VI, note: enumNote(STAT_VI) },
      { key: 'fx1', label: 'Hiệu ứng 1', type: 'text', width: 30 },
      { key: 'fx2', label: 'Hiệu ứng 2', type: 'text', width: 30 },
      { key: 'fx3', label: 'Hiệu ứng 3', type: 'text', width: 30 },
    ],
    toRows: (cfg) => Object.entries(cfg.skills).map(([id, s]) => {
      const row: Row = { id, name: s.name, desc: s.desc, target: s.target, mult: s.mult, stat: s.stat };
      s.effects.forEach((e, i) => { row[`fx${i + 1}`] = effectToText(e as unknown as Record<string, unknown>); });
      return row;
    }),
    apply: () => { /* xử lý riêng trong import để báo lỗi hiệu ứng theo dòng */ },
  },
  {
    name: 'Binh chủng',
    kind: 'table',
    note: 'Binh chủng. Khắc: danh sách mã hệ bị hệ này khắc (cách nhau dấu phẩy). Tên bậc: số bậc phải bằng số dòng ở sheet Bậc binh chủng.',
    columns: (cfg) => [
      { key: 'id', label: 'Mã', type: 'id', required: true },
      { key: 'name', label: 'Tên', type: 'text', required: true },
      { key: 'desc', label: 'Mô tả', type: 'text', width: 40 },
      { key: 'dmgType', label: 'Kiểu sát thương', type: 'enum', required: true, enumMap: DMG_VI, note: enumNote(DMG_VI) },
      { key: 'range', label: 'Tầm đánh', type: 'enum', required: true, enumMap: RANGE_VI, note: enumNote(RANGE_VI) },
      { key: 'hp', label: 'Máu mỗi lính', type: 'num', required: true, min: 0.1 },
      { key: 'atk', label: 'Hệ số công', type: 'num', required: true, min: 0 },
      { key: 'defNgoai', label: 'Phòng ngoại công', type: 'num', required: true, min: 0 },
      { key: 'defDoc', label: 'Phòng độc', type: 'num', required: true, min: 0 },
      { key: 'speed', label: 'Tốc độ', type: 'num', required: true, min: 0 },
      { key: 'beats', label: 'Khắc (mã hệ)', type: 'list', width: 16 },
      ...cfg.tiers.map((_, i) => ({ key: `tier${i + 1}`, label: `Tên bậc ${i + 1}`, type: 'text' as ColType, required: true, width: 18 })),
    ],
    toRows: (cfg) => cfg.troopOrder.map((id) => {
      const t = cfg.troopTypes[id];
      const row: Row = { id, name: t.name, desc: t.desc, dmgType: t.dmgType, range: t.range, hp: t.hp, atk: t.atk, defNgoai: t.defNgoai, defDoc: t.defDoc, speed: t.speed, beats: t.beats };
      t.tiers.forEach((n, i) => { row[`tier${i + 1}`] = n; });
      return row;
    }),
    apply: (rows, cfg) => {
      cfg.troopOrder = rows.map((r) => r.id as string);
      cfg.troopTypes = Object.fromEntries(rows.map((r) => [r.id as string, {
        name: r.name as string, desc: (r.desc as string) ?? '', dmgType: r.dmgType as 'ngoai' | 'doc', range: r.range as 'melee' | 'ranged',
        hp: r.hp as number, atk: r.atk as number, defNgoai: r.defNgoai as number, defDoc: r.defDoc as number, speed: r.speed as number,
        beats: (r.beats as string[]) ?? [],
        tiers: Object.keys(r).filter((k) => /^tier\d+$/.test(k)).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4))).map((k) => r[k] as string).filter(Boolean),
      }]));
    },
  },
  {
    name: 'Bậc binh chủng',
    kind: 'table',
    note: 'Dòng 1 là bậc 1 (không cần nghiên cứu). Hệ số nhân máu, công, phòng của binh lính.',
    columns: (cfg) => [
      { key: 'tier', label: 'Bậc', type: 'int', required: true, min: 1 },
      { key: 'mult', label: 'Hệ số sức mạnh', type: 'num', required: true, min: 0.1 },
      { key: 'reqLuyenVo', label: 'Cần Giáo Trường cấp', type: 'int', min: 0 },
      ...costCols(cfg, 'gia', 'Giá', Object.keys(cfg.resources).filter((k) => k !== 'nguyenbao')),
    ],
    toRows: (cfg) => cfg.tiers.map((t, i) => ({ tier: i + 1, mult: t.mult, reqLuyenVo: t.reqLuyenVo, ...costToRow('gia', t.cost) })),
    apply: (rows, cfg) => {
      cfg.tiers = [...rows].sort((a, b) => (a.tier as number) - (b.tier as number)).map((r) => ({ mult: r.mult as number, reqLuyenVo: (r.reqLuyenVo as number) ?? 0, cost: rowToCost('gia', r) }));
    },
  },
  {
    name: 'Chương',
    kind: 'table',
    note: 'Mỗi chương có số ải bằng "stagesPerChapter" ở sheet Cân bằng; ải cuối là trùm. Đội địch tự sinh theo các hệ số "balance.enemy" ở sheet Cân bằng.',
    columns: (cfg) => [
      { key: 'id', label: 'Chương số', type: 'int', required: true, min: 1 },
      { key: 'name', label: 'Tên', type: 'text', required: true, width: 18 },
      { key: 'reqLevel', label: 'Cần cấp Chúa Công', type: 'int', required: true, min: 1 },
      { key: 'desc', label: 'Mô tả', type: 'text', width: 40 },
      { key: 'enemyNames', label: 'Tên lính (cách nhau dấu phẩy)', type: 'list', required: true, width: 40 },
      { key: 'bossName', label: 'Tên trùm', type: 'text', required: true, width: 18 },
      { key: 'bossType', label: 'Hệ của trùm', type: 'enum', required: true, enumMap: Object.fromEntries(Object.keys(cfg.troopTypes).map((k) => [k, k])) },
      { key: 'bossSkill', label: 'Chiến pháp trùm (mã)', type: 'text', required: true, width: 16 },
      ...palCols(),
    ],
    toRows: (cfg) => cfg.chapters.map((c) => ({
      id: c.id, name: c.name, reqLevel: c.reqLevel, desc: c.desc, enemyNames: c.enemyNames,
      bossName: c.boss.name, bossType: c.boss.type, bossSkill: c.boss.skill, ...palToRow(c.palette),
    })),
    apply: (rows, cfg) => {
      cfg.chapters = rows.map((r) => ({
        id: r.id as number, name: r.name as string, reqLevel: r.reqLevel as number, desc: (r.desc as string) ?? '',
        enemyNames: r.enemyNames as string[], boss: { name: r.bossName as string, type: r.bossType as string, skill: r.bossSkill as string },
        palette: rowToPal(r),
      })).sort((a, b) => a.id - b.id);
    },
  },
  {
    name: 'Ô trang bị',
    kind: 'table',
    note: 'Các ô trang bị và tên trang bị theo từng bậc.',
    columns: () => [
      { key: 'id', label: 'Mã', type: 'id', required: true },
      { key: 'name', label: 'Tên ô', type: 'text', required: true },
      { key: 'stat', label: 'Tăng chỉ số', type: 'enum', required: true, enumMap: STAT_VI, note: enumNote(STAT_VI) },
      ...[1, 2, 3, 4, 5].map((i) => ({ key: `t${i}`, label: `Tên bậc ${i}`, type: 'text' as ColType, width: 20 })),
    ],
    toRows: (cfg) => Object.entries(cfg.equipSlots).map(([id, s]) => {
      const row: Row = { id, name: s.name, stat: s.stat };
      s.tierNames.forEach((n, i) => { row[`t${i + 1}`] = n; });
      return row;
    }),
    apply: (rows, cfg) => {
      cfg.equipSlots = Object.fromEntries(rows.map((r) => [r.id as string, {
        name: r.name as string, stat: r.stat as 'canCot' | 'voLuc' | 'ngoTinh',
        tierNames: [1, 2, 3, 4, 5].map((i) => r[`t${i}`] as string).filter(Boolean),
      }]));
    },
  },
  {
    name: 'Phẩm trang bị',
    kind: 'table',
    note: 'Thứ tự dòng là thứ tự phẩm, từ thấp lên cao. Tỉ lệ là trọng số khi rèn.',
    columns: () => [
      { key: 'name', label: 'Tên', type: 'text', required: true },
      { key: 'color', label: 'Màu', type: 'color', required: true },
      { key: 'mult', label: 'Hệ số chỉ số', type: 'num', required: true, min: 0 },
      { key: 'weight', label: 'Tỉ lệ khi rèn', type: 'num', required: true, min: 0 },
    ],
    toRows: (cfg) => cfg.equipQualities.map((q) => ({ ...q })),
    apply: (rows, cfg) => { cfg.equipQualities = rows.map((r) => ({ name: r.name as string, color: r.color as string, mult: r.mult as number, weight: r.weight as number })); },
  },
  {
    name: 'Nhiệm vụ',
    kind: 'table',
    note: 'Thứ tự dòng là thứ tự nhiệm vụ. Đối tượng: mã công trình (loại cong_trinh) hoặc mã ải dạng chương-ải như 1-3 (loại vuot_ai).',
    columns: (cfg) => [
      { key: 'id', label: 'Mã', type: 'id', required: true },
      { key: 'name', label: 'Tên', type: 'text', required: true, width: 20 },
      { key: 'desc', label: 'Mô tả', type: 'text', width: 36 },
      { key: 'type', label: 'Loại', type: 'enum', required: true, enumMap: QUEST_VI, note: enumNote(QUEST_VI), width: 16 },
      { key: 'target', label: 'Đối tượng', type: 'text' },
      { key: 'value', label: 'Giá trị', type: 'int', min: 0 },
      ...costCols(cfg, 'thuong', 'Thưởng'),
    ],
    toRows: (cfg) => cfg.quests.map((q) => ({ id: q.id, name: q.name, desc: q.desc, type: q.cond.type, target: q.cond.target ?? '', value: q.cond.value, ...costToRow('thuong', q.reward) })),
    apply: (rows, cfg) => {
      cfg.quests = rows.map((r) => {
        const cond: GameConfig['quests'][number]['cond'] = { type: r.type as GameConfig['quests'][number]['cond']['type'], value: (r.value as number) ?? 0 };
        if (r.target) cond.target = String(r.target);
        return { id: r.id as string, name: r.name as string, desc: (r.desc as string) ?? '', cond, reward: rowToCost('thuong', r) };
      });
    },
  },
];

export function effectToText(e: Record<string, unknown>): string {
  const typeVi = invert(EFFECT_VI)[e.type as string] ?? String(e.type);
  const paramVi = invert(EFFECT_PARAM_VI);
  const parts = [typeVi];
  for (const [k, v] of Object.entries(e)) {
    if (k === 'type') continue;
    if (k === 'self') { if (v) parts.push('ban_than'); continue; }
    parts.push(`${paramVi[k] ?? k}=${v}`);
  }
  return parts.join(' ');
}

/** Đọc chuỗi hiệu ứng. Trả về chuỗi lỗi nếu sai. */
export function parseEffect(text: string): Record<string, unknown> | string {
  const parts = text.trim().split(/\s+/);
  const typeRaw = parts.shift() ?? '';
  const type = EFFECT_VI[typeRaw] ?? (typeRaw === 'trung_doc' ? 'poison' : null) ?? (Object.values(EFFECT_VI).includes(typeRaw) ? typeRaw : null);
  if (!type) return `loại hiệu ứng "${typeRaw}" không hợp lệ. Dùng một trong: ${Object.keys(EFFECT_VI).join(', ')}`;
  const out: Record<string, unknown> = { type };
  for (const p of parts) {
    if (p === 'ban_than' || p === 'self') { out.self = true; continue; }
    const [k, v] = p.split('=');
    const key = EFFECT_PARAM_VI[k] ?? (Object.values(EFFECT_PARAM_VI).includes(k) ? k : null);
    if (!key) return `tham số "${k}" không hợp lệ. Dùng: ${Object.keys(EFFECT_PARAM_VI).join(', ')}`;
    const n = Number(String(v).replace(',', '.'));
    if (v === undefined || Number.isNaN(n)) return `tham số "${k}" cần một con số, ví dụ ${k}=0.3`;
    out[key] = n;
  }
  return out;
}
