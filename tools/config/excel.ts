// Đổi qua lại giữa file Excel cấu hình và config/game-config.json.
//   npm run config            đọc config/GiangHo.xlsx, kiểm tra, ghi game-config.json
//   npm run config:export     tạo lại GiangHo.xlsx từ game-config.json (ghi đè!)

import ExcelJS from 'exceljs';
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { GameConfig } from '../../core/src/index.js';
import { SHEETS, BALANCE_NOTES, setPath, parseEffect, type Col, type Row, type SheetSpec } from './schema.js';
import { validateConfig } from './validate.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const XLSX_PATH = join(ROOT, 'config', 'GiangHo.xlsx');
export const JSON_PATH = join(ROOT, 'config', 'game-config.json');
const ARRAY_KEYS = new Set(['balance.enemy.counts', 'balance.starThresholds']);
const STRING_KEYS = new Set(['version', 'balance.enemy.eliteSkill']);

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();
const invert = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]));

function headerText(c: Col): string {
  return `${c.label} (${c.key})`;
}

function textColor(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  const n = parseInt(full, 16);
  const lum = ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114;
  return lum > 140 ? 'FF000000' : 'FFFFFFFF';
}

// ======================= XUẤT EXCEL =======================

export async function exportXlsx(cfg: GameConfig, out = XLSX_PATH): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Giang Hồ Chưởng Môn';

  const guide = wb.addWorksheet('Hướng dẫn', { properties: { tabColor: { argb: 'FFE8B84A' } } });
  guide.getColumn(1).width = 110;
  const lines = [
    'CẤU HÌNH GAME GIANG HỒ CHƯỞNG MÔN',
    '',
    'Cách dùng:',
    '1. Sửa số liệu ở các sheet bên cạnh rồi lưu file (giữ định dạng .xlsx).',
    '2. Bấm đúp file "cap-nhat-du-lieu.bat" ở thư mục gốc dự án (hoặc chạy: npm run config).',
    '3. Công cụ kiểm tra lỗi. Có lỗi thì nó báo đúng sheet, dòng, cột. Không lỗi thì game dùng số liệu mới ngay.',
    '',
    'Quy tắc:',
    '• Dòng 1 của mỗi sheet là tiêu đề. Phần trong ngoặc (vd "(name)") là khóa máy đọc: KHÔNG sửa phần trong ngoặc. Phần chữ trước ngoặc đổi thoải mái.',
    '• Mỗi dòng dữ liệu là một mục. Thêm dòng để thêm mục mới, xóa dòng để bỏ mục. Dòng trống bị bỏ qua.',
    '• Cột "Mã" là mã dùng để tham chiếu giữa các sheet (vd hiệp khách ghi mã tuyệt kỹ). Chỉ dùng chữ không dấu, số, gạch dưới. Đừng đổi mã sau khi game đã phát hành vì sẽ hỏng dữ liệu lưu của người chơi.',
    '• Ô có danh sách thả xuống: chọn trong danh sách. Ô màu: ghi dạng #RRGGBB, màu nền ô sẽ cập nhật khi xuất lại.',
    '• Tỉ lệ ghi dạng số thập phân: 0.3 nghĩa là 30%.',
    '• Rê chuột vào ô tiêu đề để xem giải thích (nếu có).',
    '',
    'Sheet:',
    ...SHEETS.map((s) => `• ${s.name}: ${s.note}`),
  ];
  lines.forEach((l, i) => {
    const cell = guide.getCell(i + 1, 1);
    cell.value = l;
    cell.alignment = { wrapText: true, vertical: 'top' };
    if (i === 0) cell.font = { bold: true, size: 14 };
    if (l.endsWith(':')) cell.font = { bold: true };
  });

  for (const spec of SHEETS) {
    const cols = spec.columns(cfg);
    const ws = wb.addWorksheet(spec.name, { views: [{ state: 'frozen', xSplit: spec.kind === 'table' ? 1 : 0, ySplit: 1 }] });
    ws.columns = cols.map((c) => ({ header: headerText(c), key: c.key, width: c.width ?? Math.max(12, Math.min(30, c.label.length + 6)) }));
    const head = ws.getRow(1);
    head.height = 32;
    head.eachCell((cell, i) => {
      const c = cols[i - 1];
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.required ? 'FF5A3D1E' : 'FF3D3450' } };
      cell.alignment = { wrapText: true, vertical: 'middle' };
      const notes = [c.note, c.required ? 'Bắt buộc' : '', c.min !== undefined ? `Tối thiểu ${c.min}` : '', c.max !== undefined ? `Tối đa ${c.max}` : ''].filter(Boolean);
      if (i === 1) notes.unshift(spec.note);
      if (notes.length) cell.note = notes.join('\n');
    });

    const rows = spec.toRows(cfg);
    rows.forEach((r) => {
      const values: Record<string, unknown> = {};
      for (const c of cols) {
        let v = r[c.key];
        if (v === undefined || v === null) continue;
        if (c.type === 'list' && Array.isArray(v)) v = v.join(', ');
        if (c.type === 'bool') v = v ? 'có' : 'không';
        if (c.type === 'enum' && c.enumMap) v = invert(c.enumMap)[v as string] ?? v;
        values[c.key] = v;
      }
      const row = ws.addRow(values);
      cols.forEach((c, i) => {
        const cell = row.getCell(i + 1);
        if (c.type === 'color' && typeof cell.value === 'string' && /^#[0-9a-fA-F]{6}$/.test(cell.value)) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${cell.value.slice(1).toUpperCase()}` } };
          cell.font = { color: { argb: textColor(cell.value) } };
        }
        if (spec.kind === 'kv' && c.key === 'key') cell.font = { color: { argb: 'FF707070' } };
      });
    });

    // Danh sách thả xuống cho cột enum và bool, áp cho 300 dòng
    cols.forEach((c, i) => {
      let list: string[] | null = null;
      if (c.type === 'enum' && c.enumMap) list = Object.keys(c.enumMap);
      if (c.type === 'bool') list = ['có', 'không'];
      if (!list) return;
      const formula = `"${list.join(',')}"`;
      if (formula.length > 255) return;
      const letter = ws.getColumn(i + 1).letter;
      for (let r = 2; r <= Math.max(300, rows.length + 50); r++) {
        ws.getCell(`${letter}${r}`).dataValidation = {
          type: 'list', allowBlank: !c.required, formulae: [formula],
          showErrorMessage: true, errorTitle: 'Giá trị không hợp lệ', error: `Chọn một trong: ${list.join(', ')}`,
        };
      }
    });
  }
  mkdirSync(dirname(out), { recursive: true });
  await wb.xlsx.writeFile(out);
}

// ======================= ĐỌC EXCEL =======================

function cellValue(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'object') {
    if ('result' in v) return cellValue((v as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
    if ('richText' in v) return (v as ExcelJS.CellRichTextValue).richText.map((t) => t.text).join('');
    if ('text' in v) return (v as ExcelJS.CellHyperlinkValue).text;
    if ('error' in v) return undefined;
    if (v instanceof Date) return v.toISOString();
  }
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? undefined : t;
  }
  return v;
}

interface ImportResult { cfg: GameConfig | null; errors: string[]; warnings: string[] }

function parseCell(raw: unknown, c: Col, where: string, errors: string[]): unknown {
  if (raw === undefined) {
    if (c.required) errors.push(`${where}: ô trống nhưng bắt buộc phải có`);
    return undefined;
  }
  const num = (x: unknown) => (typeof x === 'number' ? x : Number(String(x).replace(/\s/g, '').replace(',', '.')));
  switch (c.type) {
    case 'id': {
      const s = String(raw);
      if (!/^[A-Za-z0-9_-]+$/.test(s)) errors.push(`${where}: mã "${s}" chỉ được dùng chữ không dấu, số, gạch dưới, gạch ngang`);
      return s;
    }
    case 'text': return String(raw);
    case 'int':
    case 'num': {
      const n = num(raw);
      if (!Number.isFinite(n)) { errors.push(`${where}: "${raw}" không phải con số`); return undefined; }
      if (c.type === 'int' && !Number.isInteger(n)) errors.push(`${where}: cần số nguyên, đang là ${n}`);
      if (c.min !== undefined && n < c.min) errors.push(`${where}: ${n} nhỏ hơn mức tối thiểu ${c.min}`);
      if (c.max !== undefined && n > c.max) errors.push(`${where}: ${n} lớn hơn mức tối đa ${c.max}`);
      return n;
    }
    case 'bool': {
      const s = norm(String(raw));
      if (['co', 'x', 'true', '1', 'yes', 'y'].includes(s)) return true;
      if (['khong', '', 'false', '0', 'no', 'n'].includes(s)) return false;
      errors.push(`${where}: ghi "có" hoặc "không"`);
      return false;
    }
    case 'color': {
      let s = String(raw).trim();
      if (!s.startsWith('#')) s = `#${s}`;
      if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) errors.push(`${where}: màu "${raw}" phải dạng #RRGGBB, ví dụ #e8b84a`);
      return s.toLowerCase();
    }
    case 'list': return String(raw).split(/[,;]/).map((x) => x.trim()).filter(Boolean);
    case 'enum': {
      const s = String(raw).trim();
      const m = c.enumMap ?? {};
      if (s in m) return m[s];
      if (Object.values(m).includes(s)) return s;
      const byNorm = Object.keys(m).find((k) => norm(k) === norm(s));
      if (byNorm) return m[byNorm];
      errors.push(`${where}: "${s}" không hợp lệ. Chọn một trong: ${Object.keys(m).join(', ')}`);
      return undefined;
    }
  }
}

function readTable(ws: ExcelJS.Worksheet, spec: SheetSpec, cols: Col[], errors: string[], warnings: string[]): Row[] {
  const byKey = new Map(cols.map((c) => [c.key, c]));
  const colIndex = new Map<number, Col>();
  const seen = new Set<string>();
  ws.getRow(1).eachCell((cell, i) => {
    const text = String(cellValue(cell.value) ?? '');
    const m = text.match(/\(([^()]+)\)\s*$/);
    const key = m ? m[1].trim() : '';
    const col = byKey.get(key);
    if (!col) {
      if (text) warnings.push(`[${spec.name}] cột "${text}" không nhận ra (cần dạng "Nhãn (khóa)"), bỏ qua`);
      return;
    }
    colIndex.set(i, col);
    seen.add(key);
  });
  for (const c of cols) if (c.required && !seen.has(c.key)) errors.push(`[${spec.name}] thiếu cột bắt buộc "${headerText(c)}"`);

  const rows: Row[] = [];
  const ids = new Map<string, number>();
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rawVals = new Map<number, unknown>();
    colIndex.forEach((_, i) => rawVals.set(i, cellValue(row.getCell(i).value)));
    if ([...rawVals.values()].every((v) => v === undefined)) continue;
    const obj: Row = { __row: r };
    colIndex.forEach((c, i) => {
      const where = `[${spec.name}] dòng ${r}, cột "${c.label}"`;
      const v = parseCell(rawVals.get(i), c, where, errors);
      if (v !== undefined) obj[c.key] = v;
    });
    const idCol = cols.find((c) => c.type === 'id') ?? (cols[0].key === 'id' ? cols[0] : null);
    if (idCol && obj[idCol.key] !== undefined) {
      const id = String(obj[idCol.key]);
      if (ids.has(id)) errors.push(`[${spec.name}] dòng ${r}: mã "${id}" trùng với dòng ${ids.get(id)}`);
      ids.set(id, r);
    }
    rows.push(obj);
  }
  return rows;
}

function readKv(ws: ExcelJS.Worksheet, cfg: GameConfig, errors: string[], warnings: string[]): void {
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const key = cellValue(row.getCell(1).value);
    const raw = cellValue(row.getCell(2).value);
    if (key === undefined && raw === undefined) continue;
    const k = String(key ?? '');
    const where = `[Cân bằng] dòng ${r} (${k})`;
    if (!k) { errors.push(`${where}: thiếu khóa`); continue; }
    const known = k in BALANCE_NOTES || k.startsWith('balance.startRes.') || k.startsWith('balance.startItems.');
    if (!known) { warnings.push(`${where}: khóa không dùng tới, bỏ qua`); continue; }
    if (raw === undefined) { errors.push(`${where}: chưa có giá trị`); continue; }
    let v: unknown;
    if (STRING_KEYS.has(k)) v = String(raw);
    else if (ARRAY_KEYS.has(k)) {
      const parts = typeof raw === 'number' ? [raw] : String(raw).split(/[,;]/).map((x) => Number(x.trim()));
      if (parts.some((n) => !Number.isFinite(n))) { errors.push(`${where}: "${raw}" phải là các số cách nhau dấu phẩy`); continue; }
      v = parts;
    } else {
      const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
      if (!Number.isFinite(n)) { errors.push(`${where}: "${raw}" không phải con số`); continue; }
      v = n;
    }
    setPath(cfg as unknown as Record<string, unknown>, k, v);
  }
}

// Thứ tự đọc: sheet sau có thể dựa vào dữ liệu sheet trước (danh sách tài nguyên, phe, hệ...)
const ORDER = ['Cân bằng', 'Xuất trận', 'Thưởng phe', 'Tài nguyên', 'Vật phẩm', 'Phe', 'Phẩm chất', 'Bậc đệ tử', 'Đệ tử', 'Tuyệt kỹ', 'Công trình', 'Hiệp khách', 'Chương', 'Ô trang bị', 'Phẩm trang bị', 'Nhiệm vụ'];

export async function importXlsx(path = XLSX_PATH): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const sheetByNorm = new Map(wb.worksheets.map((ws) => [norm(ws.name), ws]));
  const cfg = { balance: {} } as unknown as GameConfig;

  for (const name of ORDER) {
    const spec = SHEETS.find((s) => s.name === name) as SheetSpec;
    const ws = sheetByNorm.get(norm(name));
    if (!ws) { errors.push(`Thiếu sheet "${name}"`); continue; }
    if (spec.kind === 'kv') { readKv(ws, cfg, errors, warnings); continue; }
    const cols = spec.columns(cfg);
    const rows = readTable(ws, spec, cols, errors, warnings);
    if (name === 'Tuyệt kỹ') {
      cfg.skills = {};
      for (const r of rows) {
        const effects = [];
        for (const k of ['fx1', 'fx2', 'fx3']) {
          if (!r[k]) continue;
          const fx = parseEffect(String(r[k]));
          if (typeof fx === 'string') errors.push(`[Tuyệt kỹ] dòng ${r.__row}, cột "Hiệu ứng ${k.slice(2)}": ${fx}`);
          else effects.push(fx);
        }
        cfg.skills[r.id as string] = {
          name: r.name as string, desc: (r.desc as string) ?? '', target: r.target as GameConfig['skills'][string]['target'],
          mult: r.mult as number, stat: r.stat as GameConfig['skills'][string]['stat'], effects: effects as unknown as GameConfig['skills'][string]['effects'],
        };
      }
      continue;
    }
    try {
      spec.apply(rows, cfg);
    } catch (err) {
      errors.push(`[${name}] không đọc được: ${(err as Error).message}`);
    }
  }
  if (errors.length) return { cfg: null, errors, warnings };
  const vErrors = validateConfig(cfg);
  return { cfg: vErrors.length ? null : orderKeys(cfg), errors: vErrors, warnings };
}

/** Sắp khóa cấp cao nhất theo thứ tự cố định cho file JSON dễ đọc */
function orderKeys(cfg: GameConfig): GameConfig {
  const keys: (keyof GameConfig)[] = ['version', 'balance', 'deploySlots', 'factionBonus', 'resources', 'items', 'buildings', 'buildingOrder', 'factions', 'qualities', 'heroes', 'starterHeroes', 'skills', 'troopTypes', 'troopOrder', 'tiers', 'chapters', 'stagesPerChapter', 'equipSlots', 'equipQualities', 'quests'];
  const out = {} as Record<string, unknown>;
  for (const k of keys) out[k] = cfg[k];
  return out as unknown as GameConfig;
}

// ======================= DÒNG LỆNH =======================

async function main() {
  const cmd = process.argv[2];
  const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (cmd === 'export') {
    const out = arg('out') ?? XLSX_PATH;
    if (existsSync(out) && !process.argv.includes('--force')) {
      const backup = out.replace(/\.xlsx$/, `.backup-${Date.now()}.xlsx`);
      copyFileSync(out, backup);
      console.log(`Đã sao lưu file cũ: ${backup}`);
    }
    const cfg = JSON.parse(readFileSync(arg('json') ?? JSON_PATH, 'utf8')) as GameConfig;
    await exportXlsx(cfg, out);
    console.log(`Đã tạo ${out}`);
    return;
  }
  if (cmd === 'import' || !cmd) {
    const input = arg('in') ?? XLSX_PATH;
    const out = arg('out') ?? JSON_PATH;
    console.log(`Đọc ${input} ...`);
    const { cfg, errors, warnings } = await importXlsx(input);
    for (const w of warnings) console.log(`  Lưu ý: ${w}`);
    if (!cfg) {
      console.log(`\nCó ${errors.length} lỗi, CHƯA cập nhật dữ liệu game:\n`);
      for (const e of errors) console.log(`  ✗ ${e}`);
      console.log('\nSửa các lỗi trên trong Excel, lưu lại rồi chạy lại.');
      process.exitCode = 1;
      return;
    }
    writeFileSync(out, JSON.stringify(cfg, null, 2) + '\n');
    console.log(`\n✓ Hợp lệ. Đã ghi ${out}`);
    console.log(`  ${Object.keys(cfg.heroes).length} hiệp khách, ${Object.keys(cfg.skills).length} tuyệt kỹ, ${Object.keys(cfg.buildings).length} công trình, ${cfg.chapters.length} chương × ${cfg.stagesPerChapter} ải, ${cfg.quests.length} nhiệm vụ`);
    return;
  }
  console.log('Lệnh: import | export');
  process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
