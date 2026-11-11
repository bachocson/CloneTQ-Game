// Pixel art vẽ bằng mã: mỗi hình là lưới ký tự, mỗi ký tự là một màu.
// Vẽ ra canvas rồi đổi thành data URL, có cache.

const cache = new Map();

function toDataURL(rows, colors, scale = 1) {
  const h = rows.length;
  const w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * scale;
  c.height = h * scale;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = colors[rows[y][x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c.toDataURL();
}

function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

const BODY = [
  '................',
  '......kkkk......',
  '.....khhhhk.....',
  '....khhhhhhk....',
  '....khaaaahk....',
  '....kskssksk....',
  '....kssssssk....',
  '.....kssssk.....',
  '....krrRRrrk....',
  '...krrrRRrrrk...',
  '..ksrrrRRrrrsk..',
  '..ksrbbbbbbrsk..',
  '...krrrrrrrrk...',
  '...krrrkkrrrk...',
  '...kRRk..kRRk...',
  '...kkkk..kkkk...',
];

function setPx(rows, x, y, ch) {
  if (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length) return;
  rows[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1);
}

// Vũ khí theo hệ đệ tử
function addWeapon(rows, type) {
  if (type === 'kiem') {
    for (let y = 1; y <= 9; y++) setPx(rows, 14, y, 'w');
    setPx(rows, 13, 10, 'W'); setPx(rows, 14, 10, 'W'); setPx(rows, 15, 10, 'W');
    setPx(rows, 14, 11, 'W');
  } else if (type === 'thuong') {
    for (let y = 2; y <= 15; y++) setPx(rows, 14, y, 'W');
    setPx(rows, 14, 0, 'w'); setPx(rows, 14, 1, 'w'); setPx(rows, 13, 1, 'w'); setPx(rows, 15, 1, 'w');
    setPx(rows, 13, 3, 'a'); setPx(rows, 15, 3, 'a');
  } else if (type === 'quyen') {
    setPx(rows, 1, 10, 'W'); setPx(rows, 2, 10, 'W'); setPx(rows, 1, 11, 'W'); setPx(rows, 2, 11, 'W');
    setPx(rows, 13, 10, 'W'); setPx(rows, 14, 10, 'W'); setPx(rows, 13, 11, 'W'); setPx(rows, 14, 11, 'W');
  } else if (type === 'amkhi') {
    // khăn che mặt và phi tiêu
    rows[6] = '....kRRRRRRk....';
    setPx(rows, 14, 7, 'w'); setPx(rows, 15, 8, 'w'); setPx(rows, 13, 8, 'w'); setPx(rows, 14, 9, 'w');
    setPx(rows, 1, 6, 'w'); setPx(rows, 0, 7, 'w'); setPx(rows, 2, 7, 'w'); setPx(rows, 1, 8, 'w');
  }
}

export function heroSprite(palette, type, { boss = false } = {}) {
  const key = `h|${palette.join(',')}|${type}|${boss}`;
  return cached(key, () => {
    const rows = [...BODY];
    addWeapon(rows, type);
    if (boss) {
      setPx(rows, 6, 1, 'a'); setPx(rows, 9, 1, 'a'); setPx(rows, 7, 0, 'a'); setPx(rows, 8, 0, 'a');
    }
    const [robe, robeDark, hair, accent] = palette;
    return toDataURL(rows, {
      k: '#120e16', s: '#f0c8a0', h: hair, a: accent, r: robe, R: robeDark,
      b: accent, w: '#dfe6ee', W: type === 'quyen' ? '#d8a63a' : '#8a5a2b',
    }, 4);
  });
}

const HOUSE = [
  '................',
  '.......kk.......',
  '......kRRk......',
  '....kkRRRRkk....',
  '...kRRRRRRRRk...',
  '..kRRRRRRRRRRk..',
  '.kkkkkkkkkkkkkk.',
  '...kwwwwwwwwk...',
  '...kwkkwwkkwk...',
  '...kwkfkwkfwk...',
  '...kwkkwwkkwk...',
  '...kwwwddwwwk...',
  '...kwwwddwwwk...',
  '..kkkkkddkkkkk..',
  '.kssssssssssssk.',
  '.kkkkkkkkkkkkkk.',
];

export function buildingSprite(roof, level) {
  const key = `b|${roof}|${level > 0}`;
  return cached(key, () => toDataURL(HOUSE, {
    k: '#120e16', R: level > 0 ? roof : '#4a4552', w: level > 0 ? '#e6d7b4' : '#5a5560',
    f: level > 0 ? '#f2c24a' : '#3a3540', d: '#5a3a22', s: '#7a7468',
  }, 4));
}

const ICONS = {
  luong: { rows: ['..kkkk..', '.kyyyyk.', 'kyyYyyyk', 'kyYyyYyk', 'kyyyYyyk', 'kyYyyyyk', '.kyyyyk.', '..kkkk..'], colors: { k: '#3a2a10', y: '#e8c860', Y: '#b8902a' } },
  go: { rows: ['........', '.kkkkkk.', 'kbbbbbbk', 'kBbbbbBk', 'kbbbbbbk', '.kkkkkk.', '........', '........'], colors: { k: '#2a1a0a', b: '#a8743a', B: '#d8b070' } },
  sat: { rows: ['........', '..kkkk..', '.kssssk.', 'kssSsssk', 'ksSsssSk', 'kkkkkkkk', '........', '........'], colors: { k: '#1a1c22', s: '#8a929e', S: '#d0d8e2' } },
  bac: { rows: ['..kkkk..', '.kwwwwk.', 'kwwWWwwk', 'kwWkkWwk', 'kwWkkWwk', 'kwwWWwwk', '.kwwwwk.', '..kkkk..'], colors: { k: '#2a2a32', w: '#d8dce4', W: '#9aa0ac' } },
  nguyenbao: { rows: ['........', 'k......k', 'kgk..kgk', 'kggkkggk', 'kgGGGGgk', '.kggggk.', '..kkkk..', '........'], colors: { k: '#3a2400', g: '#f0b030', G: '#ffe080' } },
  stamina: { rows: ['....kk..', '...kyk..', '..kyyk..', '.kyyykk.', '.kkyyyk.', '..kyyk..', '..kyk...', '..kk....'], colors: { k: '#3a2a00', y: '#ffd040' } },
  tieuHoanDan: { rows: ['........', '..kkkk..', '.krrrrk.', 'krRrrrrk', 'krrrrrrk', '.krrrrk.', '..kkkk..', '........'], colors: { k: '#3a0a0a', r: '#d84a3a', R: '#ffb0a0' } },
  daiHoanDan: { rows: ['..kkkk..', '.kggggk.', 'kgGggggk', 'kggggggk', 'kggggggk', 'kggggggk', '.kggggk.', '..kkkk..'], colors: { k: '#3a2a00', g: '#e8b030', G: '#fff0a0' } },
  huyenThiet: { rows: ['........', '...kk...', '..kppk..', '.kpPppk.', 'kpppppPk', '.kppppk.', '..kkkk..', '........'], colors: { k: '#100c18', p: '#4a4060', P: '#9a90c0' } },
  biKip: { rows: ['.kkkkkk.', '.kbbbbk.', '.kbwwbk.', '.kbbbbk.', '.kbwwbk.', '.kbbbbk.', '.kbbbbk.', '.kkkkkk.'], colors: { k: '#1a1410', b: '#3a6aa0', w: '#e0d8c0' } },
};

export function icon(name) {
  const def = ICONS[name];
  if (!def) return '';
  return cached(`i|${name}`, () => toDataURL(def.rows, def.colors, 3));
}
