import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { exportXlsx, importXlsx, JSON_PATH } from '../tools/config/excel.js';
import { validateConfig } from '../tools/config/validate.js';
import { BALANCE_NOTES } from '../tools/config/schema.js';
import type { GameConfig } from '../core/src/index.js';

const cfg = JSON.parse(readFileSync(JSON_PATH, 'utf8')) as GameConfig;
const dir = mkdtempSync(join(tmpdir(), 'tamquoc-cfg-'));

test('cấu hình hiện tại hợp lệ', () => {
  assert.deepEqual(validateConfig(cfg), []);
});

test('mọi khóa trong balance đều có giải thích ở sheet Cân bằng', () => {
  const walk = (o: Record<string, unknown>, p: string, out: string[]) => {
    for (const [k, v] of Object.entries(o)) {
      const path = `${p}.${k}`;
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v as Record<string, unknown>, path, out);
      else out.push(path);
    }
    return out;
  };
  const missing = walk(cfg.balance as unknown as Record<string, unknown>, 'balance', [])
    .filter((k) => !k.startsWith('balance.startRes.') && !k.startsWith('balance.startItems.'))
    .filter((k) => !(k in BALANCE_NOTES));
  assert.deepEqual(missing, []);
});

test('xuất Excel rồi đọc lại cho đúng cấu hình ban đầu', async () => {
  const file = join(dir, 'roundtrip.xlsx');
  await exportXlsx(cfg, file);
  const { cfg: back, errors } = await importXlsx(file);
  assert.deepEqual(errors, []);
  assert.deepEqual(back, cfg);
});

test('nhập sai trong Excel thì báo lỗi rõ sheet, dòng, cột và không ghi đè', async () => {
  const file = join(dir, 'broken.xlsx');
  await exportXlsx(cfg, file);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const hk = wb.getWorksheet('Võ tướng')!;
  const col = (ws: ExcelJS.Worksheet, key: string) => {
    let idx = 0;
    ws.getRow(1).eachCell((c, i) => { if (String(c.value).endsWith(`(${key})`)) idx = i; });
    return idx;
  };
  hk.getRow(3).getCell(col(hk, 'skill')).value = 'tuyetKyKhongCo';
  hk.getRow(4).getCell(col(hk, 'b0')).value = 'năm mươi';
  hk.getRow(5).getCell(col(hk, 'mau_ao')).value = 'xanh';
  const tk = wb.getWorksheet('Chiến pháp')!;
  tk.getRow(2).getCell(col(tk, 'fx1')).value = 'choang tile=0.3';
  const cb = wb.getWorksheet('Cân bằng')!;
  cb.eachRow((row) => { if (row.getCell(1).value === 'balance.stamina.max') row.getCell(2).value = 'abc'; });
  await wb.xlsx.writeFile(file);

  const { cfg: back, errors } = await importXlsx(file);
  assert.equal(back, null);
  const all = errors.join('\n');
  assert.match(all, /\[Võ tướng\] dòng 4, cột "Thống Soái gốc": "năm mươi" không phải con số/);
  assert.match(all, /\[Võ tướng\] dòng 5, cột "Màu áo": màu "xanh" phải dạng #RRGGBB/);
  assert.match(all, /\[Chiến pháp\] dòng 2, cột "Hiệu ứng 1": tham số "tile" không hợp lệ/);
  assert.match(all, /\[Cân bằng\] dòng \d+ \(balance\.stamina\.max\): "abc" không phải con số/);
});

test('mã tham chiếu sai được phát hiện', () => {
  const bad = structuredClone(cfg);
  bad.heroes.lieuHoa.skill = 'khongCo';
  bad.quests[0].cond = { type: 'stage', target: '9-9', value: 1 };
  const errs = validateConfig(bad).join('\n');
  assert.match(errs, /lieuHoa: chiến pháp "khongCo" không có trong sheet Chiến pháp/);
  assert.match(errs, /ải "9-9" không tồn tại/);
});
