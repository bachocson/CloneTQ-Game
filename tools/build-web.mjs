// Đóng gói bản web.
//   node tools/build-web.mjs              → web/build/ (dùng với web/index.html) + dist/game.html (một file duy nhất)
//   node tools/build-web.mjs --fragment   → dist/fragment.html (bỏ <html>/<head>, để đăng lên claude.ai)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';

export const ESBUILD_OPTS = {
  entryPoints: ['web/src/app.js'],
  bundle: true,
  format: 'iife',
  target: 'es2019',
  loader: { '.json': 'json' },
};

const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700&family=Pixelify+Sans:wght@500;700&display=swap">';

export async function buildWeb({ fragment = false } = {}) {
  mkdirSync('web/build', { recursive: true });
  mkdirSync('dist', { recursive: true });
  await build({ ...ESBUILD_OPTS, minify: true, outfile: 'web/build/app.js' });
  copyFileSync('web/src/styles.css', 'web/build/app.css');

  const code = readFileSync('web/build/app.js', 'utf8').replace(/<\/script/gi, '<\\/script');
  const css = readFileSync('web/src/styles.css', 'utf8');
  const html = readFileSync('web/index.html', 'utf8');
  const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).replace(/<script[^>]*src="build\/app.js"[^>]*><\/script>/, '').trim();
  const head = `<title>Giang Hồ Chưởng Môn</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${FONTS}\n<style>${css}</style>`;
  const main = `${body}\n<script>${code}</script>`;
  const out = fragment ? 'dist/fragment.html' : 'dist/game.html';
  const page = fragment
    ? `${head}\n${main}\n`
    : `<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="theme-color" content="#1e1a29">\n${head}\n</head>\n<body>\n${main}\n</body>\n</html>\n`;
  writeFileSync(out, page);
  console.log(`Đã ghi web/build/ và ${out} (${(page.length / 1024).toFixed(1)} KB)`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('build-web.mjs')) {
  await buildWeb({ fragment: process.argv.includes('--fragment') });
}
