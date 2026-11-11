// Hình vẽ bằng mã (Canvas 2D), phong cách hoạt hình 2.5D: khối tròn, viền đậm, đổ bóng, màu tươi.
// Đây là bản mẫu định hướng mỹ thuật; khi có họa sĩ, thay bằng ảnh PNG cùng kích thước.

const cache = new Map();
const OUT = '#2b1d14';
const SKIN = '#ffd5ad';
const SKIN_DK = '#e9a982';

function make(w, h, scale, draw) {
  const c = document.createElement('canvas');
  c.width = w * scale;
  c.height = h * scale;
  const g = c.getContext('2d');
  g.scale(scale, scale);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  draw(g);
  return c.toDataURL();
}
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

function shade(hex, amt) {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  const n = parseInt(f, 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
  const r = ch((n >> 16) & 255);
  const gg = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1)}`;
}

function fillStroke(g, fill, lw = 3, stroke = OUT) {
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = lw;
  g.strokeStyle = stroke;
  g.stroke();
}
function ellipse(g, x, y, rx, ry) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}
function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

// ---------------------------------------------------------------- Võ tướng chibi

// Chi tiết riêng cho một số tướng (chỉ là hình vẽ, không ảnh hưởng luật chơi)
const HERO_ART = {
  quanVu: { beard: 'long', face: '#d9563f' },
  truongPhi: { beard: 'bushy' },
  hoangTrung: { beard: 'long' },
  luBo: { plume: 'twin' },
  giaCatLuong: { hat: 'scholar' },
  chuDu: { hat: 'scholar' },
  tuMaY: { hat: 'scholar', beard: 'goatee' },
  lucTon: { hat: 'scholar' },
  tranCung: { hat: 'scholar', beard: 'goatee' },
  dieuThuyen: { hat: 'bun' },
  taoThao: { hat: 'crown', beard: 'goatee' },
  haHauDon: { eyepatch: true },
  dienVi: { beard: 'bushy' },
  huChu: { beard: 'bushy' },
  trinhPho: { beard: 'long' },
};

function drawHorse(g, coat) {
  // thân ngựa phía dưới người cưỡi
  ellipse(g, 48, 74, 26, 12);
  fillStroke(g, coat);
  for (const x of [30, 40, 58, 66]) {
    rrect(g, x - 3, 78, 7, 13, 3);
    fillStroke(g, shade(coat, -0.25), 2.5);
  }
  // đầu ngựa
  g.beginPath();
  g.moveTo(68, 70);
  g.quadraticCurveTo(86, 56, 84, 66);
  g.quadraticCurveTo(88, 74, 78, 76);
  g.closePath();
  fillStroke(g, coat);
  ellipse(g, 81, 64, 1.6, 1.6);
  g.fillStyle = OUT;
  g.fill();
  // bờm
  g.beginPath();
  g.moveTo(66, 66);
  g.quadraticCurveTo(72, 56, 80, 58);
  g.lineWidth = 4;
  g.strokeStyle = shade(coat, -0.45);
  g.stroke();
  // đuôi
  g.beginPath();
  g.moveTo(23, 72);
  g.quadraticCurveTo(12, 74, 15, 86);
  g.lineWidth = 5;
  g.strokeStyle = shade(coat, -0.45);
  g.stroke();
}

function drawWeapon(g, type, accent, faction) {
  if (type === 'thuong' || type === 'ky') {
    g.beginPath();
    g.moveTo(76, 76);
    g.lineTo(80, 10);
    g.lineWidth = 6;
    g.strokeStyle = OUT;
    g.stroke();
    g.lineWidth = 3;
    g.strokeStyle = '#a86b32';
    g.stroke();
    g.beginPath();
    g.moveTo(80, 2);
    g.lineTo(85, 16);
    g.lineTo(75, 16);
    g.closePath();
    fillStroke(g, '#e8eef5', 2.5);
    ellipse(g, 79.5, 19, 5, 2.6);
    fillStroke(g, accent, 2);
  } else if (type === 'bo') {
    // kiếm
    g.beginPath();
    g.moveTo(74, 64);
    g.lineTo(86, 30);
    g.lineWidth = 7;
    g.strokeStyle = OUT;
    g.stroke();
    g.lineWidth = 3.5;
    g.strokeStyle = '#e8eef5';
    g.stroke();
    g.beginPath();
    g.moveTo(70, 62);
    g.lineTo(80, 66);
    g.lineWidth = 5;
    g.strokeStyle = OUT;
    g.stroke();
    // khiên
    ellipse(g, 24, 62, 13, 15);
    fillStroke(g, faction, 3);
    ellipse(g, 24, 62, 6, 7);
    fillStroke(g, '#ffcf4a', 2.5);
  } else if (type === 'cung') {
    g.beginPath();
    g.arc(76, 52, 20, -1.2, 1.2);
    g.lineWidth = 6;
    g.strokeStyle = OUT;
    g.stroke();
    g.lineWidth = 3;
    g.strokeStyle = '#a86b32';
    g.stroke();
    g.beginPath();
    g.moveTo(83, 33);
    g.lineTo(83, 71);
    g.lineWidth = 1.5;
    g.strokeStyle = '#f4f1e6';
    g.stroke();
  } else if (type === 'muu') {
    // quạt lông
    g.beginPath();
    g.moveTo(74, 66);
    g.lineTo(70, 40);
    g.quadraticCurveTo(80, 30, 90, 40);
    g.closePath();
    fillStroke(g, '#f4f1e6', 2.5);
    for (const a of [74, 79, 84]) {
      g.beginPath();
      g.moveTo(74, 64);
      g.lineTo(a, 40);
      g.lineWidth = 1;
      g.strokeStyle = '#bdb6a3';
      g.stroke();
    }
  }
}

function drawHead(g, hair, accent, art, boss) {
  const face = art.face ?? SKIN;
  // đầu to
  ellipse(g, 48, 34, 21, 20);
  fillStroke(g, face);
  // má
  ellipse(g, 36, 40, 4, 2.5);
  g.fillStyle = 'rgba(255,120,110,0.35)';
  g.fill();
  ellipse(g, 60, 40, 4, 2.5);
  g.fill();
  // mắt
  for (const x of [40, 56]) {
    ellipse(g, x, 35, 3.2, 4.2);
    g.fillStyle = OUT;
    g.fill();
    ellipse(g, x + 1, 33.5, 1.2, 1.4);
    g.fillStyle = '#fff';
    g.fill();
  }
  if (art.eyepatch) {
    ellipse(g, 40, 35, 5, 5);
    fillStroke(g, '#1b1b1b', 2);
    g.beginPath();
    g.moveTo(28, 28);
    g.lineTo(66, 24);
    g.lineWidth = 2;
    g.strokeStyle = '#1b1b1b';
    g.stroke();
  }
  // lông mày
  g.lineWidth = 2.5;
  g.strokeStyle = OUT;
  g.beginPath();
  g.moveTo(35, 28);
  g.lineTo(44, 29.5);
  g.moveTo(52, 29.5);
  g.lineTo(61, 28);
  g.stroke();
  // râu
  if (art.beard === 'long') {
    g.beginPath();
    g.moveTo(38, 44);
    g.quadraticCurveTo(48, 72, 58, 44);
    g.quadraticCurveTo(48, 50, 38, 44);
    fillStroke(g, hair, 2.5);
  } else if (art.beard === 'bushy') {
    g.beginPath();
    g.moveTo(30, 38);
    g.quadraticCurveTo(48, 64, 66, 38);
    g.quadraticCurveTo(48, 50, 30, 38);
    fillStroke(g, hair, 2.5);
  } else if (art.beard === 'goatee') {
    g.beginPath();
    g.moveTo(45, 47);
    g.lineTo(48, 56);
    g.lineTo(51, 47);
    g.closePath();
    fillStroke(g, hair, 2);
  } else {
    g.beginPath();
    g.arc(48, 44, 3.5, 0.2, Math.PI - 0.2);
    g.lineWidth = 2;
    g.strokeStyle = OUT;
    g.stroke();
  }
  // mũ / mũ trụ
  const hat = art.hat ?? 'helmet';
  if (hat === 'scholar') {
    g.beginPath();
    g.moveTo(28, 26);
    g.quadraticCurveTo(48, 4, 68, 26);
    g.closePath();
    fillStroke(g, hair);
    rrect(g, 40, 6, 16, 12, 4);
    fillStroke(g, '#3a3a52', 2.5);
  } else if (hat === 'bun') {
    g.beginPath();
    g.moveTo(26, 34);
    g.quadraticCurveTo(26, 10, 48, 12);
    g.quadraticCurveTo(70, 10, 70, 34);
    g.quadraticCurveTo(60, 20, 48, 22);
    g.quadraticCurveTo(36, 20, 26, 34);
    fillStroke(g, hair);
    ellipse(g, 48, 10, 9, 7);
    fillStroke(g, hair);
    ellipse(g, 60, 12, 3.5, 3.5);
    fillStroke(g, accent, 2);
  } else if (hat === 'crown') {
    g.beginPath();
    g.moveTo(27, 30);
    g.quadraticCurveTo(48, 8, 69, 30);
    g.closePath();
    fillStroke(g, hair);
    rrect(g, 34, 6, 28, 8, 2);
    fillStroke(g, '#1b1b1b', 2.5);
    rrect(g, 40, 10, 16, 8, 2);
    fillStroke(g, '#ffcf4a', 2);
  } else {
    // mũ trụ
    g.beginPath();
    g.moveTo(26, 32);
    g.quadraticCurveTo(26, 10, 48, 10);
    g.quadraticCurveTo(70, 10, 70, 32);
    g.lineTo(62, 28);
    g.quadraticCurveTo(48, 22, 34, 28);
    g.closePath();
    fillStroke(g, '#c9a24a');
    g.beginPath();
    g.moveTo(30, 26);
    g.quadraticCurveTo(48, 16, 66, 26);
    g.lineWidth = 2;
    g.strokeStyle = shade('#c9a24a', -0.35);
    g.stroke();
    // chùm lông
    const plume = (dx, tilt) => {
      g.beginPath();
      g.moveTo(48 + dx, 12);
      g.quadraticCurveTo(48 + dx + tilt, -4, 48 + dx + tilt * 2, 4);
      g.lineWidth = 6;
      g.strokeStyle = OUT;
      g.stroke();
      g.lineWidth = 3.5;
      g.strokeStyle = accent;
      g.stroke();
    };
    if (art.plume === 'twin') {
      plume(-6, -10);
      plume(6, 10);
    } else plume(0, 6);
  }
  if (boss) {
    g.beginPath();
    g.moveTo(36, 8);
    g.lineTo(40, 0);
    g.lineTo(44, 6);
    g.lineTo(48, -1);
    g.lineTo(52, 6);
    g.lineTo(56, 0);
    g.lineTo(60, 8);
    g.closePath();
    fillStroke(g, '#ffcf4a', 2);
  }
}

function drawBody(g, armor, armorDk, accent) {
  // chân
  for (const x of [41, 55]) {
    rrect(g, x - 5, 70, 10, 14, 4);
    fillStroke(g, '#3d2e24');
  }
  // thân giáp
  g.beginPath();
  g.moveTo(32, 74);
  g.quadraticCurveTo(30, 52, 40, 50);
  g.lineTo(56, 50);
  g.quadraticCurveTo(66, 52, 64, 74);
  g.closePath();
  fillStroke(g, armor);
  g.beginPath();
  g.moveTo(48, 51);
  g.lineTo(48, 73);
  g.lineWidth = 2;
  g.strokeStyle = armorDk;
  g.stroke();
  // đai
  rrect(g, 33, 64, 30, 6, 3);
  fillStroke(g, accent, 2.5);
  // vai
  ellipse(g, 34, 54, 7, 6);
  fillStroke(g, armorDk, 2.5);
  ellipse(g, 62, 54, 7, 6);
  fillStroke(g, armorDk, 2.5);
  // tay
  ellipse(g, 70, 64, 5, 5);
  fillStroke(g, SKIN, 2.5);
}

/** Võ tướng chibi. pal = [áo, áo đậm, tóc, nhấn]. type = mã binh chủng. */
export function heroSprite(pal, type, { boss = false, tid = '', faction = null } = {}) {
  const key = `h|${pal.join(',')}|${type}|${boss}|${tid}|${faction}`;
  return cached(key, () => make(96, 96, 2, (g) => {
    const [armor, armorDk, hair, accent] = pal;
    const art = HERO_ART[tid] ?? {};
    // bóng đổ
    ellipse(g, 48, 90, 26, 5);
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.fill();
    if (type === 'ky') {
      g.save();
      g.translate(0, 4);
      drawHorse(g, tid === 'luBo' ? '#c0392b' : tid === 'trieuVan' || tid === 'maSieu' ? '#f2f2f2' : '#9a6a3c');
      g.restore();
      g.save();
      g.translate(0, -10);
      drawBody(g, armor, armorDk, accent);
      drawWeapon(g, type, accent, faction ?? armor);
      drawHead(g, hair, accent, art, boss);
      g.restore();
      return;
    }
    if (type === 'bo') drawWeapon(g, type, accent, faction ?? armor);
    drawBody(g, armor, armorDk, accent);
    if (type !== 'bo') drawWeapon(g, type, accent, faction ?? armor);
    drawHead(g, hair, accent, art, boss);
  }));
}

// ---------------------------------------------------------------- Công trình isometric

// Hệ tọa độ: tâm nền (0,0); x sang phải, y xuống; một ô = rộng 2w, cao w.
function isoBox(g, cx, cy, w, h, base) {
  const top = shade(base, 0.25);
  const left = shade(base, -0.05);
  const right = shade(base, -0.3);
  // mặt trái
  g.beginPath();
  g.moveTo(cx - w, cy);
  g.lineTo(cx, cy + w / 2);
  g.lineTo(cx, cy + w / 2 - h);
  g.lineTo(cx - w, cy - h);
  g.closePath();
  fillStroke(g, left, 2.5);
  // mặt phải
  g.beginPath();
  g.moveTo(cx + w, cy);
  g.lineTo(cx, cy + w / 2);
  g.lineTo(cx, cy + w / 2 - h);
  g.lineTo(cx + w, cy - h);
  g.closePath();
  fillStroke(g, right, 2.5);
  // mặt trên
  g.beginPath();
  g.moveTo(cx, cy - w / 2 - h);
  g.lineTo(cx + w, cy - h);
  g.lineTo(cx, cy + w / 2 - h);
  g.lineTo(cx - w, cy - h);
  g.closePath();
  fillStroke(g, top, 2.5);
}

function platform(g, cx, cy, w, color = '#cdb98f') {
  g.beginPath();
  g.moveTo(cx, cy - w / 2);
  g.lineTo(cx + w, cy);
  g.lineTo(cx, cy + w / 2);
  g.lineTo(cx - w, cy);
  g.closePath();
  fillStroke(g, color, 2.5);
  g.beginPath();
  g.moveTo(cx - w, cy);
  g.lineTo(cx, cy + w / 2);
  g.lineTo(cx + w, cy);
  g.lineTo(cx + w, cy + 5);
  g.lineTo(cx, cy + w / 2 + 5);
  g.lineTo(cx - w, cy + 5);
  g.closePath();
  fillStroke(g, shade(color, -0.3), 2.5);
}

// Mái cong kiểu Trung Hoa trên khối rộng w, đỉnh tường ở cy-h
function roof(g, cx, cy, w, h, color, rh = w * 0.75) {
  const y0 = cy - h;
  const ov = w * 0.22; // mái chìa ra
  const ridgeY = y0 - rh;
  const L = [cx - w - ov, y0 + 2];
  const B = [cx, y0 + w / 2 + ov * 0.6];
  const R = [cx + w + ov, y0 + 2];
  // mặt trái
  g.beginPath();
  g.moveTo(L[0], L[1] - 8);
  g.quadraticCurveTo(L[0] + 6, L[1], L[0] + 12, L[1] + 1);
  g.lineTo(B[0], B[1]);
  g.lineTo(cx, ridgeY + w * 0.25);
  g.lineTo(cx - w * 0.35, ridgeY);
  g.closePath();
  fillStroke(g, color, 2.5);
  // mặt phải
  g.beginPath();
  g.moveTo(R[0], R[1] - 8);
  g.quadraticCurveTo(R[0] - 6, R[1], R[0] - 12, R[1] + 1);
  g.lineTo(B[0], B[1]);
  g.lineTo(cx, ridgeY + w * 0.25);
  g.lineTo(cx + w * 0.35, ridgeY);
  g.closePath();
  fillStroke(g, shade(color, -0.28), 2.5);
  // nóc
  g.beginPath();
  g.moveTo(cx - w * 0.42, ridgeY - 4);
  g.quadraticCurveTo(cx, ridgeY + 2, cx + w * 0.42, ridgeY - 4);
  g.lineWidth = 5;
  g.strokeStyle = OUT;
  g.stroke();
  g.lineWidth = 2.5;
  g.strokeStyle = shade(color, -0.45);
  g.stroke();
  // ngói
  g.lineWidth = 1.2;
  g.strokeStyle = shade(color, -0.4);
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    g.beginPath();
    g.moveTo(cx - w * 0.35 * (1 - t) - (w + ov) * t, ridgeY + (L[1] - ridgeY) * t);
    g.lineTo(cx - w * 0.0, ridgeY + w * 0.25 + (B[1] - ridgeY - w * 0.25) * t);
    g.stroke();
  }
}

function door(g, cx, cy, w) {
  g.beginPath();
  g.moveTo(cx - w * 0.5, cy + w * 0.25);
  g.lineTo(cx - w * 0.15, cy + w * 0.42);
  g.lineTo(cx - w * 0.15, cy + w * 0.42 - w * 0.45);
  g.quadraticCurveTo(cx - w * 0.32, cy - w * 0.25, cx - w * 0.5, cy - w * 0.12);
  g.closePath();
  fillStroke(g, '#5a3420', 2);
}
function windowR(g, cx, cy, w) {
  g.beginPath();
  g.moveTo(cx + w * 0.3, cy + w * 0.1);
  g.lineTo(cx + w * 0.62, cy - w * 0.06);
  g.lineTo(cx + w * 0.62, cy - w * 0.36);
  g.lineTo(cx + w * 0.3, cy - w * 0.2);
  g.closePath();
  fillStroke(g, '#ffd36b', 2);
}
function flag(g, x, y, color) {
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x, y - 34);
  g.lineWidth = 4;
  g.strokeStyle = OUT;
  g.stroke();
  g.lineWidth = 2;
  g.strokeStyle = '#a86b32';
  g.stroke();
  g.beginPath();
  g.moveTo(x, y - 34);
  g.quadraticCurveTo(x + 10, y - 38, x + 18, y - 32);
  g.lineTo(x + 18, y - 20);
  g.quadraticCurveTo(x + 10, y - 26, x, y - 22);
  g.closePath();
  fillStroke(g, color, 2.5);
}
function lantern(g, x, y) {
  ellipse(g, x, y, 4.5, 6);
  fillStroke(g, '#e8423a', 2);
}

const KIND_DRAW = {
  chinhDien(g, c, lv) {
    platform(g, 0, 10, 62, '#d9c79c');
    isoBox(g, 0, 4, 44, 26, '#f1e3c4');
    door(g, 0, 4 - 26 + 20, 30);
    windowR(g, 0, -6, 30);
    roof(g, 0, 4, 44, 26, c);
    if (lv >= 3) {
      isoBox(g, 0, -40, 24, 16, '#f1e3c4');
      roof(g, 0, -40, 24, 16, c, 18);
    }
    flag(g, -46, 10, c);
    flag(g, 46, 10, c);
  },
  ruong(g, c) {
    platform(g, 0, 10, 60, '#8a6a3c');
    g.save();
    for (let i = -3; i <= 3; i++) {
      g.beginPath();
      g.moveTo(-50 + Math.abs(i) * 6 + i * 8, 10 + i * 4 - 20);
      g.lineTo(i * 8 + 40 - Math.abs(i) * 6, 10 + i * 4 + 20 - 20);
      g.lineWidth = 6;
      g.strokeStyle = i % 2 ? '#8fd14f' : '#f2c94c';
      g.stroke();
    }
    g.restore();
    isoBox(g, 28, -4, 14, 12, '#e6d2a8');
    roof(g, 28, -4, 14, 12, c, 12);
  },
  xuongGo(g, c) {
    platform(g, 0, 10, 56, '#9bc46a');
    for (const [x, y] of [[-24, 8], [-14, 14], [-30, 16]]) {
      ellipse(g, x, y, 14, 6);
      fillStroke(g, '#a8743a', 2.5);
      ellipse(g, x + 12, y, 5, 5);
      fillStroke(g, '#e8c48a', 2);
    }
    isoBox(g, 18, 0, 20, 16, '#c9a06a');
    roof(g, 18, 0, 20, 16, c, 14);
    // cây
    ellipse(g, 40, -26, 14, 16);
    fillStroke(g, '#4f9a35');
  },
  moSat(g, c) {
    platform(g, 0, 10, 56, '#9a8f80');
    g.beginPath();
    g.moveTo(-46, 12);
    g.quadraticCurveTo(-20, -40, 10, -14);
    g.quadraticCurveTo(30, -30, 44, 10);
    g.closePath();
    fillStroke(g, '#8a8f9c');
    ellipse(g, -6, -2, 12, 9);
    fillStroke(g, '#2b2b33', 2.5);
    for (const [x, y] of [[-24, -10], [14, -6], [-12, -24]]) {
      ellipse(g, x, y, 3, 2.5);
      fillStroke(g, '#cfe3ff', 1.5);
    }
    rrect(g, 18, 6, 18, 10, 2);
    fillStroke(g, c, 2.5);
  },
  tienTrang(g, c) {
    platform(g, 0, 10, 56, '#d9c79c');
    isoBox(g, 0, 4, 34, 18, '#f1e3c4');
    // mái vải sọc
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(-40 + i * 20, -16 + i * 0);
      g.lineTo(-20 + i * 20, -16);
      g.lineTo(-24 + i * 20, -2);
      g.lineTo(-44 + i * 20, -2);
      g.closePath();
      fillStroke(g, i % 2 ? '#ffffff' : c, 2);
    }
    for (const [x, col] of [[-16, '#ff8a3d'], [-4, '#8fd14f'], [8, '#ffd36b']]) {
      ellipse(g, x, 6, 5, 4);
      fillStroke(g, col, 2);
    }
    roof(g, 0, -10, 30, 6, shade(c, -0.1), 14);
  },
  khoHang(g, c) {
    platform(g, 0, 10, 60, '#d9c79c');
    isoBox(g, 0, 4, 42, 22, '#c98d55');
    door(g, 0, -10, 34);
    roof(g, 0, 4, 42, 22, c);
    for (const [x, y] of [[40, 12], [48, 6], [44, -2]]) {
      isoBox(g, x, y, 7, 8, '#e0b070');
    }
  },
  luyenVo(g, c) {
    platform(g, 0, 10, 62, '#d8b98a');
    // giá vũ khí
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(-34 + i * 8, 6 - i * 4);
      g.lineTo(-30 + i * 8, -34 - i * 4);
      g.lineWidth = 4;
      g.strokeStyle = OUT;
      g.stroke();
      g.lineWidth = 2;
      g.strokeStyle = '#d6dde6';
      g.stroke();
    }
    // hình nộm
    ellipse(g, 14, -8, 8, 12);
    fillStroke(g, '#d9b26a');
    ellipse(g, 14, -26, 7, 7);
    fillStroke(g, '#d9b26a');
    flag(g, 38, 10, c);
    flag(g, -46, 14, c);
  },
  tuuLau(g, c) {
    platform(g, 0, 10, 58, '#d9c79c');
    isoBox(g, 0, 4, 36, 22, '#f1e3c4');
    door(g, 0, -10, 28);
    roof(g, 0, 4, 36, 22, c, 18);
    isoBox(g, 0, -36, 26, 16, '#f1e3c4');
    windowR(g, 0, -46, 22);
    roof(g, 0, -36, 26, 16, c, 18);
    lantern(g, -30, -6);
    lantern(g, 30, -6);
  },
  loRen(g, c) {
    platform(g, 0, 10, 56, '#9a8f80');
    isoBox(g, -4, 4, 32, 20, '#8a7d70');
    roof(g, -4, 4, 32, 20, c, 16);
    // ống khói
    isoBox(g, 20, -28, 8, 26, '#6d6259');
    ellipse(g, 20, -62, 8, 6);
    g.fillStyle = 'rgba(200,200,210,0.75)';
    g.fill();
    ellipse(g, 26, -72, 10, 7);
    g.fill();
    // lửa lò
    ellipse(g, -16, 2, 7, 6);
    fillStroke(g, '#ff8a3d', 2.5);
    ellipse(g, -16, 2, 3.5, 3);
    g.fillStyle = '#ffe28a';
    g.fill();
    // đe
    rrect(g, 24, 6, 18, 8, 2);
    fillStroke(g, '#3a3f4a', 2.5);
  },
  tangKinh(g, c) {
    platform(g, 0, 10, 50, '#d9c79c');
    isoBox(g, 0, 4, 30, 18, '#f1e3c4');
    door(g, 0, -8, 24);
    roof(g, 0, 4, 30, 18, c, 14);
    isoBox(g, 0, -28, 22, 14, '#f1e3c4');
    roof(g, 0, -28, 22, 14, c, 14);
    isoBox(g, 0, -56, 14, 10, '#f1e3c4');
    roof(g, 0, -56, 14, 10, c, 14);
  },
};

/** Công trình 2.5D. level = 0 vẽ khung chờ xây. */
export function buildingSprite(id, roofColor, level) {
  const key = `b|${id}|${roofColor}|${level > 0}|${level >= 3}`;
  return cached(key, () => make(160, 150, 2, (g) => {
    g.translate(80, 104);
    ellipse(g, 0, 22, 70, 18);
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.fill();
    if (level <= 0) {
      g.setLineDash([6, 5]);
      g.beginPath();
      g.moveTo(0, -18);
      g.lineTo(56, 10);
      g.lineTo(0, 38);
      g.lineTo(-56, 10);
      g.closePath();
      g.lineWidth = 3;
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.stroke();
      g.setLineDash([]);
      // biển "xây"
      rrect(g, -6, -40, 6, 50, 2);
      fillStroke(g, '#a86b32', 2.5);
      rrect(g, -26, -52, 46, 22, 5);
      fillStroke(g, '#f1e3c4', 2.5);
      g.fillStyle = OUT;
      g.font = 'bold 13px sans-serif';
      g.textAlign = 'center';
      g.fillText('+', -3, -36);
      return;
    }
    (KIND_DRAW[id] ?? KIND_DRAW.khoHang)(g, roofColor, level);
  }));
}

// ---------------------------------------------------------------- Biểu tượng tài nguyên

const ICON_DRAW = {
  luong(g) {
    g.beginPath();
    g.moveTo(10, 30);
    g.quadraticCurveTo(4, 14, 14, 10);
    g.lineTo(26, 10);
    g.quadraticCurveTo(36, 14, 30, 30);
    g.closePath();
    fillStroke(g, '#e8c27a', 2.5);
    rrect(g, 12, 6, 16, 6, 3);
    fillStroke(g, '#c9963e', 2.5);
    ellipse(g, 20, 21, 5, 4);
    g.fillStyle = '#fff3c4';
    g.fill();
  },
  go(g) {
    for (const [y, x] of [[24, 6], [14, 10]]) {
      rrect(g, x, y, 24, 10, 5);
      fillStroke(g, '#b47a3e', 2.5);
      ellipse(g, x + 24, y + 5, 5, 5);
      fillStroke(g, '#f0cf96', 2);
    }
  },
  sat(g) {
    g.beginPath();
    g.moveTo(6, 30);
    g.lineTo(12, 14);
    g.lineTo(28, 14);
    g.lineTo(34, 30);
    g.closePath();
    fillStroke(g, '#8c99ab', 2.5);
    g.beginPath();
    g.moveTo(12, 14);
    g.lineTo(28, 14);
    g.lineTo(25, 20);
    g.lineTo(15, 20);
    g.closePath();
    g.fillStyle = '#dfe7f1';
    g.fill();
  },
  bac(g) {
    ellipse(g, 20, 21, 14, 14);
    fillStroke(g, '#dfe4ea', 2.5);
    rrect(g, 15, 16, 10, 10, 1);
    fillStroke(g, '#9aa3ae', 2);
  },
  nguyenbao(g) {
    g.beginPath();
    g.moveTo(4, 18);
    g.quadraticCurveTo(10, 34, 20, 32);
    g.quadraticCurveTo(30, 34, 36, 18);
    g.quadraticCurveTo(28, 22, 20, 22);
    g.quadraticCurveTo(12, 22, 4, 18);
    fillStroke(g, '#ffc23a', 2.5);
    ellipse(g, 20, 18, 8, 7);
    fillStroke(g, '#ffe07a', 2.5);
  },
  stamina(g) {
    g.beginPath();
    g.moveTo(23, 3);
    g.lineTo(9, 22);
    g.lineTo(19, 22);
    g.lineTo(15, 37);
    g.lineTo(31, 16);
    g.lineTo(21, 16);
    g.closePath();
    fillStroke(g, '#ffd23a', 2.5);
  },
  tieuHoanDan(g) {
    rrect(g, 8, 8, 24, 26, 3);
    fillStroke(g, '#4f8fd9', 2.5);
    rrect(g, 12, 12, 16, 6, 1);
    g.fillStyle = '#f4f1e6';
    g.fill();
  },
  daiHoanDan(g) {
    rrect(g, 5, 6, 30, 30, 3);
    fillStroke(g, '#c070ff', 2.5);
    rrect(g, 10, 11, 20, 7, 1);
    g.fillStyle = '#ffe07a';
    g.fill();
  },
  huyenThiet(g) {
    g.beginPath();
    g.moveTo(20, 4);
    g.lineTo(34, 18);
    g.lineTo(20, 36);
    g.lineTo(6, 18);
    g.closePath();
    fillStroke(g, '#6fd3ff', 2.5);
    g.beginPath();
    g.moveTo(20, 4);
    g.lineTo(26, 18);
    g.lineTo(20, 36);
    g.lineWidth = 1.5;
    g.strokeStyle = '#2f8fc0';
    g.stroke();
  },
  biKip(g) {
    g.beginPath();
    g.moveTo(6, 30);
    g.lineTo(10, 8);
    g.lineTo(34, 10);
    g.lineTo(30, 32);
    g.closePath();
    fillStroke(g, '#e8d3a0', 2.5);
    for (const y of [15, 21, 27]) {
      g.beginPath();
      g.moveTo(13, y);
      g.lineTo(28, y + 1);
      g.lineWidth = 1.5;
      g.strokeStyle = '#8a6a3c';
      g.stroke();
    }
  },
};

export function icon(name) {
  const fn = ICON_DRAW[name];
  if (!fn) return '';
  return cached(`i|${name}`, () => make(40, 40, 2, fn));
}

// ---------------------------------------------------------------- Bản đồ thành (nền)

/** Nền cỏ isometric có đường đi, tường thành, cây. size = [rộng, cao] theo px CSS. */
export function cityGround(w, h, tiles) {
  return cached(`g|${w}|${h}`, () => make(w, h, 2, (g) => {
    // trời/cỏ phía xa
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#79c74a');
    sky.addColorStop(1, '#5fae3a');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2 + 6;
    const R = w * 0.5;
    // nền đất thành (hình thoi)
    g.beginPath();
    g.moveTo(cx, cy - R / 2);
    g.lineTo(cx + R, cy);
    g.lineTo(cx, cy + R / 2);
    g.lineTo(cx - R, cy);
    g.closePath();
    g.fillStyle = '#8fd15a';
    g.fill();
    // ô cỏ caro
    g.save();
    g.clip();
    const n = tiles;
    const tw = (2 * R) / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if ((i + j) % 2) continue;
        const x = cx + (i - j) * (tw / 2);
        const y = cy - R / 2 + (i + j + 1) * (tw / 4);
        g.beginPath();
        g.moveTo(x, y - tw / 4);
        g.lineTo(x + tw / 2, y);
        g.lineTo(x, y + tw / 4);
        g.lineTo(x - tw / 2, y);
        g.closePath();
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.fill();
      }
    }
    // đường đất chữ thập
    g.lineWidth = 16;
    g.strokeStyle = '#e3c58e';
    g.beginPath();
    g.moveTo(cx - R / 2, cy - R / 4);
    g.lineTo(cx + R / 2, cy + R / 4);
    g.moveTo(cx + R / 2, cy - R / 4);
    g.lineTo(cx - R / 2, cy + R / 4);
    g.stroke();
    g.restore();
    // tường thành
    g.lineWidth = 9;
    g.strokeStyle = OUT;
    g.beginPath();
    g.moveTo(cx, cy - R / 2);
    g.lineTo(cx + R, cy);
    g.lineTo(cx, cy + R / 2);
    g.lineTo(cx - R, cy);
    g.closePath();
    g.stroke();
    g.lineWidth = 5;
    g.strokeStyle = '#c9b48a';
    g.stroke();
    // cây ngoài thành
    const tree = (x, y, s) => {
      ellipse(g, x, y + 10 * s, 12 * s, 4 * s);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fill();
      rrect(g, x - 2.5 * s, y, 5 * s, 10 * s, 2);
      fillStroke(g, '#8a5a2b', 2);
      ellipse(g, x, y - 6 * s, 11 * s, 12 * s);
      fillStroke(g, '#3f9a3a', 2.5);
      ellipse(g, x - 3 * s, y - 10 * s, 4 * s, 4 * s);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fill();
    };
    for (const [fx, fy, s] of [[0.06, 0.14, 1.1], [0.16, 0.06, 0.9], [0.9, 0.12, 1], [0.95, 0.3, 0.8], [0.04, 0.82, 1], [0.12, 0.93, 0.8], [0.88, 0.88, 1.1], [0.96, 0.7, 0.9], [0.5, 0.03, 0.8], [0.5, 0.97, 0.9]]) {
      tree(fx * w, fy * h, s);
    }
  }));
}
