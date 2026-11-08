#!/usr/bin/env node
// Gói cả game thành một file HTML duy nhất (dist/game.html) để chép sang điện thoại hoặc đăng lên trang khác.
// Thêm --fragment để bỏ phần <html>/<head>/<body> (dùng khi đăng lên claude.ai Artifact).
// Cần esbuild: npm install (đã khai báo trong devDependencies).

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const fragment = process.argv.includes('--fragment');
const out = process.argv.find((a) => a.startsWith('--out='))?.slice(6) || (fragment ? 'dist/fragment.html' : 'dist/game.html');

const js = await build({ entryPoints: ['src/ui/app.js'], bundle: true, format: 'iife', minify: true, write: false, target: 'es2019' });
const code = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/ui/styles.css', 'utf8');
const html = readFileSync('index.html', 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).replace(/<script type="module"[^>]*><\/script>/, '');
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700&family=Pixelify+Sans:wght@500;700&display=swap">';

const head = `<title>Giang Hồ Chưởng Môn</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>${css}</style>`;
const main = `${body.trim()}
<script>${code}</script>`;

const page = fragment
  ? `${head}\n${main}\n`
  : `<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="theme-color" content="#1e1a29">\n${head}\n</head>\n<body>\n${main}\n</body>\n</html>\n`;

mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
writeFileSync(out, page);
console.log(`Đã ghi ${out} (${(page.length / 1024).toFixed(1)} KB)`);
