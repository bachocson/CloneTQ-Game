// Chạy thử trên máy tính: npm run dev (hoặc bấm đúp choi-thu.bat)
// - Mở http://localhost:8080 trên PC; điện thoại cùng wifi mở địa chỉ IP in ra bên dưới.
// - Sửa code là trang tự tải lại.
// - Lưu file config/GiangHo.xlsx là dữ liệu tự cập nhật (nếu Excel không có lỗi).
import { context } from 'esbuild';
import { copyFileSync, mkdirSync, watch, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { ESBUILD_OPTS } from './build-web.mjs';

const PORT = Number(process.env.PORT || 8080);
mkdirSync('web/build', { recursive: true });
const copyCss = () => copyFileSync('web/src/styles.css', 'web/build/app.css');
copyCss();

const ctx = await context({
  ...ESBUILD_OPTS,
  outfile: 'web/build/app.js',
  sourcemap: true,
  banner: { js: "new EventSource('/esbuild').addEventListener('change', () => location.reload());" },
});
await ctx.watch();
const { port } = await ctx.serve({ servedir: 'web', host: '0.0.0.0', port: PORT });

watch('web/src', (_e, file) => { if (file && file.endsWith('.css')) { copyCss(); ctx.rebuild(); } });

const XLSX = 'config/GiangHo.xlsx';
if (existsSync(XLSX)) {
  let timer = null;
  let running = false;
  watch('config', (_e, file) => {
    if (file !== 'GiangHo.xlsx') return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (running) return;
      running = true;
      console.log('\nPhát hiện GiangHo.xlsx thay đổi, đang cập nhật dữ liệu...');
      const p = spawn(process.execPath, ['--import', 'tsx', 'tools/config/excel.ts', 'import'], { stdio: 'inherit' });
      p.on('exit', () => { running = false; });
    }, 800);
  });
}

const ips = Object.values(networkInterfaces()).flat().filter((n) => n && n.family === 'IPv4' && !n.internal).map((n) => n.address);
console.log(`\nGiang Hồ Chưởng Môn đang chạy:`);
console.log(`  Máy tính:   http://localhost:${port}`);
for (const ip of ips) console.log(`  Điện thoại: http://${ip}:${port}  (cùng mạng wifi)`);
console.log('\nNhấn Ctrl+C để dừng.');
