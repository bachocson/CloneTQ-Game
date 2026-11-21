// Giao diện. Toàn bộ luật chơi nằm trong engine; file này chỉ vẽ và gọi hành động.

import * as G from '../../core/src/index.ts';
import CONFIG from '../../config/game-config.json';

G.setConfig(CONFIG);
const C = CONFIG;
const BAL = C.balance;
const BUILDINGS = C.buildings;
const BUILDING_ORDER = C.buildingOrder;
const HEROES = C.heroes;
const SKILLS = C.skills;
const FACTIONS = C.factions;
const QUALITIES = C.qualities;
const TROOP_TYPES = C.troopTypes;
const TROOP_ORDER = C.troopOrder;
const RESOURCES = C.resources;
const ITEMS = C.items;
const CHAPTERS = C.chapters;
const STAGES_PER_CHAPTER = C.stagesPerChapter;
const EQUIP_SLOTS = C.equipSlots;
const EQUIP_QUALITIES = C.equipQualities;

// Lưu trên trình duyệt (riêng cho bản web; Cocos sẽ có cách lưu của nó)
const storage = {
  save(state) {
    try { localStorage.setItem(G.SAVE_KEY, G.serialize(state)); } catch { /* chế độ riêng tư */ }
  },
  load(t) {
    try { const raw = localStorage.getItem(G.SAVE_KEY); return raw ? G.deserialize(raw, t) : null; } catch { return null; }
  },
  clear() {
    try { localStorage.removeItem(G.SAVE_KEY); } catch { /* bỏ qua */ }
  },
};
import { heroSprite, buildingSprite, icon, cityGround } from './sprites.js';

// Bật/tắt công cụ test lúc build (esbuild define). Thiếu cờ thì coi như bật.
// eslint-disable-next-line no-undef
const DEV_TOOLS = typeof __DEV_TOOLS__ === 'undefined' ? true : __DEV_TOOLS__;

const now = () => Date.now();
let S = null;
const ui = {
  tab: 'city',
  heroTab: 'team',
  pickSlot: null,
  sheet: null, // { type: 'hero', uid } | { type: 'equipPick', uid, slot }
  openCh: null,
  forgeSlot: 'weapon',
  forgeTier: 1,
  confirm: null,
};

// ---------- tiện ích ----------
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function fmt(n) {
  n = Math.floor(n);
  if (n >= 1e7) return `${Math.floor(n / 1e6)}M`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e5) return `${Math.floor(n / 1e3)}K`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
function fmtTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}g ${String(m).padStart(2, '0')}p`;
  if (m) return `${m}p ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}
const nameOf = (k) => (RESOURCES[k] ? RESOURCES[k].short : ITEMS[k] ? ITEMS[k].name : k);
const img = (src, cls = '') => `<img class="px ${cls}" src="${src}" alt="">`;
const bar = (v, max, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100)).toFixed(1)}%"></i></div>`;
const heroImg = (tid, type) => heroSprite(HEROES[tid].palette, type, { tid, faction: FACTIONS[HEROES[tid].faction].color });

function costHtml(cost) {
  return `<div class="cost">${Object.entries(cost)
    .map(([k, v]) => {
      const have = RESOURCES[k] ? S.res[k] : S.items[k] || 0;
      const ic = icon(k);
      return `<span class="num ${have < v ? 'lack' : ''}">${ic ? img(ic) : `${esc(nameOf(k))} `}${fmt(v)}</span>`;
    })
    .join('')}</div>`;
}
function rewardHtml(r) {
  return Object.entries(r)
    .map(([k, v]) => (k === 'exp' ? `<span class="chip num">KN ${fmt(v)}</span>` : `<span class="chip num">${icon(k) ? img(icon(k)) : esc(nameOf(k))} ${fmt(v)}</span>`))
    .join(' ');
}
function missingText(m) {
  if (!m) return '';
  const parts = Object.entries(m).map(([k, v]) => `${fmt(v)} ${nameOf(k)}`);
  return parts.length ? `. Thiếu ${parts.join(', ')}` : '';
}

function toast(msg, bad = false) {
  if (!msg) return;
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast${bad ? ' bad' : ''}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 2600);
  while (box.children.length > 3) box.firstChild.remove();
}

function save() {
  storage.save(S);
}

function act(fn) {
  const r = fn();
  if (r && r.ok === false) toast(r.reason + missingText(r.missing), true);
  else if (r && r.msg) toast(r.msg);
  save();
  renderAll();
  return r;
}

// ---------- thanh trên ----------
function renderTop() {
  const need = G.playerExpToNext(S.player.level);
  const cap = G.storageCap(S);
  const st = S.stamina;
  const stLeft = st.cur < BAL.stamina.max ? BAL.stamina.regenSeconds - (now() - st.last) / 1000 : 0;
  const pill = (k) => {
    const full = k !== 'nguyenbao' && S.res[k] >= cap;
    const rate = k !== 'nguyenbao' ? ` (+${fmt(G.productionPerHour(S, k))}/giờ, kho ${fmt(cap)})` : '';
    return `<div class="res ${full ? 'full' : ''}" title="${RESOURCES[k].name}${rate}">${img(icon(k))}<span class="num disp">${fmt(S.res[k])}</span></div>`;
  };
  $('#top').innerHTML = `
    <div class="top-row">
      <div class="lv-badge" title="Cấp Chúa Công"><span class="disp">${S.player.level}</span></div>
      <div class="top-mid">
        <div class="row"><span class="top-title disp">Chúa Công</span><span class="spacer"></span><span class="num disp" style="font-size:12px">${fmt(S.player.exp)}/${fmt(need)}</span></div>
        ${bar(S.player.exp, need, 'blue')}
      </div>
      ${DEV_TOOLS ? '<button class="dev-btn disp" data-act="cheatOpen" aria-label="Mở công cụ test">TEST</button>' : ''}
    </div>
    <div class="res-row">
      ${['luong', 'go', 'sat', 'bac', 'nguyenbao'].map(pill).join('')}
      <div class="res" title="Thể lực">${img(icon('stamina'))}<span class="num disp">${st.cur}/${BAL.stamina.max}${stLeft > 0 ? ` <small style="font-size:10px">${fmtTime(stLeft)}</small>` : ''}</span></div>
    </div>`;
}

// ---------- Thành trì ----------
// Vị trí công trình trên bản đồ (tỉ lệ theo chiều rộng / chiều cao khung bản đồ).
const CITY_POS = {
  tangKinh: [0.5, 0.36], loRen: [0.667, 0.465], tuuLau: [0.333, 0.465],
  khoHang: [0.833, 0.57], chinhDien: [0.5, 0.57], luyenVo: [0.167, 0.57],
  xuongGo: [0.667, 0.675], ruong: [0.333, 0.675], tienTrang: [0.5, 0.78], moSat: [0.89, 0.86], quanMac: [0.11, 0.86],
};

function buildingEffect(id, lv) {
  const b = BUILDINGS[id];
  if (b.produces) return `${RESOURCES[b.produces].name}: +${fmt(G.buildingProduction(id, lv))}/giờ`;
  if (id === 'khoHang') return `Sức chứa: ${fmt(Math.floor((b.storageBase ?? 0) * Math.pow(b.storageGrowth ?? 1, Math.max(0, lv - 1))))}`;
  if (id === 'luyenVo') return `Binh lực tối đa +${lv * BAL.troops.perLuyenVo}`;
  if (id === 'tuuLau') return `Chứa ${Math.floor(BAL.tavern.rosterBase + lv * BAL.tavern.rosterPerLevel)} võ tướng`;
  if (id === 'loRen') return lv ? `Rèn tối đa bậc ${Math.min(5, 1 + Math.floor(lv / BAL.equip.tierEveryLoRen))}, cường hóa tối đa +${lv * BAL.equip.maxEnhancePerLoRen}` : 'Chưa xây';
  if (id === 'tangKinh') return `Chiến pháp tối đa cấp ${1 + lv}`;
  if (id === 'chinhDien') return `Công trình khác tối đa cấp ${lv}`;
  if (id === 'quanMac') return `Trận hình tối đa cấp ${lv}; mở ${C.formations.filter((f) => f.reqQuanMac <= lv).length}/${C.formations.length} trận hình`;
  return '';
}

function viewCity() {
  const q = S.queue;
  const ids = [...BUILDING_ORDER].sort((a, b) => (CITY_POS[a]?.[1] ?? 0) - (CITY_POS[b]?.[1] ?? 0));
  const pins = ids.map((id) => {
    const [x, y] = CITY_POS[id] ?? [0.5, 0.5];
    const b = BUILDINGS[id];
    const lv = S.buildings[id] || 0;
    const locked = S.player.level < b.unlockLevel;
    const building = q && q.id === id;
    const can = !q && G.upgradeCheck(S, id).ok;
    let over = '';
    if (building) {
      const total = (q.endsAt - q.startedAt) / 1000;
      const left = (q.endsAt - now()) / 1000;
      over = `<div class="pin-build"><span class="t num disp" data-timer="${q.endsAt}">${fmtTime(left)}</span><div data-progress="${q.startedAt}|${q.endsAt}">${bar(total - left, total, 'green')}</div></div>`;
    } else if (can) over = '<span class="pin-up">▲</span>';
    return `<button class="bld-pin ${ui.sheet?.id === id ? 'sel' : ''}" style="left:${x * 100}%;top:${y * 100}%;z-index:${Math.round(y * 100)};${locked ? 'filter:grayscale(1) opacity(.6)' : ''}" data-act="bldTap" data-id="${id}" aria-label="${esc(b.name)} cấp ${lv}">
      ${img(buildingSprite(id, b.roof, lv))}${lv ? `<span class="pin-lv num disp">${lv}</span>` : ''}${over}
    </button>`;
  }).join('');
  const list = BUILDING_ORDER.map((id) => {
    const b = BUILDINGS[id];
    const lv = S.buildings[id] || 0;
    const locked = S.player.level < b.unlockLevel;
    const can = !q && G.upgradeCheck(S, id).ok;
    return `<button class="bld-row ${can ? 'can' : ''} ${locked ? 'locked' : ''}" data-act="bldTap" data-id="${id}">
      ${img(buildingSprite(id, b.roof, lv))}
      <span style="min-width:0"><b>${esc(b.name)}</b><small>${locked ? `Mở ở cấp ${b.unlockLevel}` : q && q.id === id ? 'Đang xây…' : `Cấp ${lv}`}</small></span>
    </button>`;
  }).join('');
  const W = 520;
  return `
    <div class="city" style="background-image:url(${cityGround(W, Math.round(W * 0.8), 12)})">${pins}</div>
    ${q ? `<div class="panel hi row"><b>Đang xây:</b><span>${esc(BUILDINGS[q.id].name)} → cấp ${q.toLevel}</span><span class="spacer"></span><span class="num" data-timer="${q.endsAt}">${fmtTime((q.endsAt - now()) / 1000)}</span>
      <button class="btn small gold" data-act="speedUp">${G.speedUpCost(S, now()) ? `${G.speedUpCost(S, now())} ${img(icon('nguyenbao'))}` : 'Xong ngay'}</button></div>` : '<p class="muted" style="text-align:center">Chạm vào công trình để nâng cấp.</p>'}
    <div class="bld-list">${list}</div>`;
}

// Chức năng mở ra khi chạm vào công trình (tab đầu tiên của bảng công trình)
// Mỗi công trình: danh sách tab chức năng [mã tab, nhãn, hàm vẽ]. Tab đầu tiên mở mặc định.
const BUILDING_FEATURE = {
  quanMac: [['feature', 'Trận hình', () => viewFormations()], ['roster', 'Võ tướng', () => viewRoster()]],
  chinhDien: ['Tổng quan', () => viewOverview()],
  tuuLau: ['Chiêu mộ', () => viewTavern()],
  loRen: ['Rèn đồ', () => viewForge()],
  luyenVo: ['Luyện binh', () => viewTrain()],
  tangKinh: ['Chiến pháp', () => viewSkills()],
  tienTrang: ['Chợ', () => shopItemsHtml()],
  khoHang: ['Kho', () => viewStorage()],
};

function upgradePanel(id) {
  const b = BUILDINGS[id];
  const lv = S.buildings[id] || 0;
  const q = S.queue;
  const to = lv + 1;
  const chk = G.upgradeCheck(S, id);
  if (q && q.id === id) {
    const total = (q.endsAt - q.startedAt) / 1000;
    const left = (q.endsAt - now()) / 1000;
    const cost = G.speedUpCost(S, now());
    return `<div class="panel hi" style="display:flex;flex-direction:column;gap:6px">
      <div class="row"><b>Đang lên cấp ${q.toLevel}</b><span class="spacer"></span><span class="num" data-timer="${q.endsAt}">${fmtTime(left)}</span></div>
      <div data-progress="${q.startedAt}|${q.endsAt}">${bar(total - left, total, 'green')}</div>
      <button class="btn gold" data-act="speedUp">${cost ? `Xong ngay · ${cost} ${img(icon('nguyenbao'))}` : 'Xong ngay (miễn phí)'}</button></div>`;
  }
  if (S.player.level < b.unlockLevel) return `<div class="panel"><p>Mở khi Chúa Công đạt cấp ${b.unlockLevel}.</p></div>`;
  return `<div class="panel" style="display:flex;flex-direction:column;gap:8px">
    <div class="row"><b>Lên cấp ${to}</b><span class="spacer"></span><span class="muted num">Thời gian ${fmtTime(G.buildingTime(id, to))}</span></div>
    <p class="muted">${esc(buildingEffect(id, lv))} → <b style="color:var(--green-dk)">${esc(buildingEffect(id, to))}</b></p>
    ${costHtml(G.buildingCost(id, to))}
    ${chk.ok ? '' : `<p style="color:var(--red-dk)">${esc(chk.reason)}</p>`}
    <button class="btn" data-act="upgrade" data-id="${id}" ${chk.ok ? '' : 'disabled'}>${lv ? 'Nâng cấp' : 'Xây dựng'}</button></div>`;
}

function buildingSheet(id) {
  const b = BUILDINGS[id];
  const lv = S.buildings[id] || 0;
  const raw = lv > 0 ? BUILDING_FEATURE[id] : null;
  const features = !raw ? [] : Array.isArray(raw[0]) ? raw : [['feature', raw[0], raw[1]]];
  const tab = features.length ? ui.sheet.tab ?? 'feature' : 'upgrade';
  const canUp = !S.queue && G.upgradeCheck(S, id).ok;
  const building = S.queue && S.queue.id === id;
  const tabs = features.length ? `<div class="seg">
      ${features.map(([k, label]) => `<button class="${tab === k ? 'on' : ''}" data-act="bldTab" data-id="${k}">${label}</button>`).join('')}
      <button class="${tab === 'upgrade' ? 'on' : ''}" data-act="bldTab" data-id="upgrade">Nâng cấp${canUp ? ' ▲' : building ? ' …' : ''}</button>
    </div>` : '';
  const cur = features.find(([k]) => k === tab);
  const body = cur ? cur[2]() : `<p>${esc(buildingEffect(id, lv))}</p>${upgradePanel(id)}`;
  return `
    <div class="sheet-head">
      <div class="art" style="background:linear-gradient(#bfe7ff,#8fd15a)">${img(buildingSprite(id, b.roof, lv))}</div>
      <div style="flex:1;min-width:0">
        <div class="row"><h3 style="font-size:20px">${esc(b.name)}</h3><span class="spacer"></span><button class="btn small ghost" data-act="closeSheet">✕</button></div>
        <span class="chip num">Cấp ${lv}</span>${building ? ' <span class="chip">Đang nâng cấp</span>' : ''}
        <p class="muted" style="margin-top:4px">${esc(b.desc)}</p>
      </div>
    </div>
    ${tabs}${body}`;
}

function viewOverview() {
  const cap = G.storageCap(S);
  const rows = ['luong', 'go', 'sat', 'bac'].map((k) => `<div class="row">${img(icon(k), 'ico')}<span>${RESOURCES[k].name}</span><span class="spacer"></span><span class="num">+${fmt(G.productionPerHour(S, k))}/giờ</span></div>`).join('');
  const lvls = BUILDING_ORDER.map((id) => `<span class="chip">${esc(BUILDINGS[id].name)} ${S.buildings[id] || 0}</span>`).join(' ');
  return `<div class="panel" style="display:flex;flex-direction:column;gap:6px"><b>Sản lượng</b>${rows}
      <div class="row"><span>Sức chứa mỗi loại</span><span class="spacer"></span><span class="num">${fmt(cap)}</span></div>
      <div class="row"><span>Offline tối đa</span><span class="spacer"></span><span class="num">${BAL.offlineCapHours} giờ</span></div></div>
    <div class="panel" style="display:flex;flex-direction:column;gap:6px"><b>Công trình</b><div class="row wrap">${lvls}</div></div>`;
}

function viewStorage() {
  const cap = G.storageCap(S);
  return `<div class="panel" style="display:flex;flex-direction:column;gap:8px"><b>Sức chứa ${fmt(cap)} mỗi loại</b>
    ${['luong', 'go', 'sat', 'bac'].map((k) => `<div style="display:flex;flex-direction:column;gap:2px"><div class="row">${img(icon(k), 'ico')}<span>${RESOURCES[k].name}</span><span class="spacer"></span><span class="num">${fmt(S.res[k])}/${fmt(cap)}</span></div>${bar(S.res[k], cap, S.res[k] >= cap ? 'red' : 'green')}</div>`).join('')}
    <p class="muted">Kho đầy thì công trình ngừng sinh tài nguyên đó. Phần thưởng và đồ mua thì vẫn nhận vượt kho.</p></div>`;
}

function viewSkills() {
  const team = new Set(S.team.filter(Boolean));
  const list = [...S.heroes].sort((a, b) => (team.has(b.uid) - team.has(a.uid)) || b.level - a.level).map((h) => {
    const t = HEROES[h.tid];
    const sk = SKILLS[t.skill];
    const max = G.skillMaxLevel(S, h);
    return `<div class="panel" style="display:grid;grid-template-columns:56px minmax(0,1fr);gap:8px;align-items:center">
      <div class="art-sm" style="background:${FACTIONS[t.faction].color}">${img(heroImg(h.tid, h.troopType))}</div>
      <div style="display:flex;flex-direction:column;gap:3px;min-width:0">
        <div class="row"><b>${esc(t.name)}</b><span class="spacer"></span><span class="chip num">${h.skillLv}/${max}</span></div>
        <span class="muted">${esc(sk.name)}: ${esc(sk.desc)}</span>
        <div class="row">${h.skillLv < max ? costHtml(G.skillUpgradeCost(h)) : `<span class="muted">Đã tối đa (cần ${esc(BUILDINGS.tangKinh.name)} hoặc tướng cấp cao hơn)</span>`}<span class="spacer"></span>
          <button class="btn small" data-act="skillUp" data-uid="${h.uid}" ${h.skillLv < max ? '' : 'disabled'}>Lĩnh ngộ</button></div>
      </div></div>`;
  }).join('');
  return `<p class="muted">Cấp ${esc(BUILDINGS.tangKinh.name)} ${S.buildings.tangKinh} cho phép chiến pháp tối đa cấp ${1 + (S.buildings.tangKinh || 0)}.</p>${list}`;
}

// ---------- Cửa hàng ----------
const LIMIT_LABEL = { daily: 'hôm nay', weekly: 'tuần này', once: '', none: '' };

function limitText(def) {
  if (def.limit === 'none') return '';
  const left = G.remaining(S, def, now());
  if (def.limit === 'once') return left ? 'Chỉ mua 1 lần' : 'Đã mua';
  const reset = G.nextReset(def.limit, now());
  return `Còn ${left}/${def.limitCount} ${LIMIT_LABEL[def.limit]}${left ? '' : ` · làm mới sau <span data-timer="${reset}">${fmtTime((reset - now()) / 1000)}</span>`}`;
}
function priceLabel(currency, price) {
  if (currency === 'vnd') return G.formatVnd(price);
  return `${img(icon(currency))} ${fmt(price)}`;
}
function itemIcon(k) {
  return icon(k === 'stamina' ? 'stamina' : k);
}

function shopItemsHtml() {
  return C.shop.filter((d) => S.player.level >= d.reqLevel).map((d) => {
    const left = G.remaining(S, d, now());
    const can10 = left >= 10;
    return `<div class="panel shop-row">
      <span class="shop-ico">${img(itemIcon(d.item))}</span>
      <span style="min-width:0;display:flex;flex-direction:column"><b>${esc(d.name)} ×${fmt(d.qty)}</b><small class="muted">${limitText(d)}</small></span>
      <span style="display:flex;flex-direction:column;gap:4px;align-items:stretch">
        <button class="btn small ${d.currency === 'nguyenbao' ? 'gold' : ''}" data-act="buyItem" data-id="${d.id}" data-n="1" ${left ? '' : 'disabled'}>${priceLabel(d.currency, d.price)}</button>
        ${can10 ? `<button class="btn small ghost" data-act="buyItem" data-id="${d.id}" data-n="10">×10 · ${fmt(d.price * 10)}</button>` : ''}
      </span></div>`;
  }).join('') || '<div class="panel"><p class="muted">Chưa có mặt hàng.</p></div>';
}

function packCard(p) {
  const chk = G.packCheck(S, p, now());
  const confirm = ui.confirm === `buy-${p.id}`;
  const contents = Object.entries(p.contents).map(([k, v]) => `<span class="chip">${img(itemIcon(k))} ${fmt(v)}</span>`).join(' ');
  const btn = p.currency === 'vnd'
    ? `<button class="btn gold" data-act="buyReal" data-id="${p.id}" ${chk.ok ? '' : 'disabled'}>${confirm ? 'Chạm lần nữa để nhận (thử)' : G.formatVnd(p.price)}</button>`
    : `<button class="btn ${p.currency === 'nguyenbao' ? 'gold' : ''}" data-act="buyPack" data-id="${p.id}" ${chk.ok ? '' : 'disabled'}>${priceLabel(p.currency, p.price)}</button>`;
  return `<div class="pack" style="--pc:${p.color}">
    <div class="pack-head"><span class="disp">${esc(p.name)}</span>${p.badge ? `<span class="pack-badge disp">${esc(p.badge)}</span>` : ''}</div>
    <div class="pack-body">
      ${p.desc ? `<p class="muted">${esc(p.desc)}</p>` : ''}
      <div class="row wrap">${contents}</div>
      <div class="row"><small class="muted">${chk.ok ? limitText(p) : esc(chk.reason)}</small><span class="spacer"></span>${btn}</div>
    </div></div>`;
}

function topupCard(t) {
  const first = !S.shop.firstTopup[t.id] && t.firstBonus > 0;
  const confirm = ui.confirm === `buy-${t.id}`;
  return `<div class="topup">
    ${t.badge ? `<span class="pack-badge disp">${esc(t.badge)}</span>` : ''}
    ${first ? `<span class="first disp">Lần đầu +${fmt(t.firstBonus)}</span>` : ''}
    <img class="big" src="${icon('nguyenbao')}" alt="">
    <span class="disp amt">${fmt(t.nguyenbao)}</span>
    <small>${esc(t.name)}</small>
    <button class="btn small gold" data-act="buyReal" data-id="${t.id}">${confirm ? 'Chạm lần nữa' : G.formatVnd(t.price)}</button>
  </div>`;
}

function viewShop() {
  const tab = ui.shopTab ?? 'packs';
  const seg = `<div class="seg">
    <button class="${tab === 'packs' ? 'on' : ''}" data-act="shopTab" data-id="packs">Ưu đãi</button>
    <button class="${tab === 'topup' ? 'on' : ''}" data-act="shopTab" data-id="topup">Nạp</button>
    <button class="${tab === 'items' ? 'on' : ''}" data-act="shopTab" data-id="items">Vật phẩm</button>
  </div>`;
  const note = DEV_TOOLS
    ? '<div class="panel" style="background:#fff3c4"><p><b>Bản thử nghiệm:</b> chưa kết nối cổng thanh toán. Gói giá tiền thật sẽ nhận miễn phí để test (chạm hai lần).</p></div>'
    : '';
  let body;
  if (tab === 'topup') body = `${note}<div class="topups">${C.topups.map(topupCard).join('')}</div><p class="muted">Đã nạp: ${G.formatVnd(S.shop.totalVnd)}${S.shop.testPurchases ? ` (gồm ${S.shop.testPurchases} lần mua thử)` : ''}</p>`;
  else if (tab === 'items') body = shopItemsHtml();
  else body = `${note}${C.packs.filter((p) => S.player.level >= p.reqLevel || p.limit !== 'once').map(packCard).join('')}`;
  return `<h2 class="disp">Cửa hàng</h2>${seg}${body}`;
}

// ---------- Trận hình ----------
const FORMS = C.formations;
const formName = (id) => FORMS.find((f) => f.id === id)?.name ?? '';

/** Cấp mở của từng ô (0–8) theo kiểu cố định; null nếu không thuộc bố cục */
function cellUnlockLevels(f) {
  const out = Array(9).fill(null);
  const layout = G.layoutCells(f);
  if (f.mode === 'free') layout.forEach((c) => { out[c] = 0; });
  else f.unlockOrder.forEach((s, i) => { out[s - 1] = i; });
  return out;
}

function formationEffectText(f, lv) {
  if (f.stat === 'none') return f.mode === 'free' ? 'Đặt tướng vào ô bất kỳ' : 'Không tăng chỉ số';
  return `${G.STAT_LABEL[f.stat]} +${Math.round(G.formationBonus(f, lv) * 100)}% toàn đội`;
}

/** Ô trận hình để xếp tướng (trận hình đang dùng) */
function formationCell(cell, f, lv, cap) {
  const unlock = cellUnlockLevels(f)[cell];
  const pick = ui.pickSlot === cell ? 'pick' : '';
  if (unlock === null) return '<div class="slot blocked" aria-hidden="true"></div>';
  if (!cap.open.includes(cell)) return `<div class="slot locked"><span class="lock">Cấp ${unlock}</span></div>`;
  const uid = S.team[cell];
  const h = uid && G.findHero(S, uid);
  if (!h) return `<button class="slot ${pick}" data-act="slotTap" data-slot="${cell}" aria-label="Ô ${cell + 1} trống"><span class="muted" style="margin:auto">+</span><span class="cellno">${cell + 1}</span></button>`;
  const max = G.heroMaxTroops(S, h);
  return `<button class="slot filled ${pick}" data-act="slotTap" data-slot="${cell}">
    ${img(heroImg(h.tid, h.troopType))}<span class="name">${esc(HEROES[h.tid].name)}</span>${bar(h.troops, max, 'red')}<span class="cellno">${cell + 1}</span>
  </button>`;
}

function formationEditor({ withRoster = false } = {}) {
  const f = FORMS.find((x) => x.id === S.formation);
  if (!f) return '<div class="panel"><p>Chưa có trận hình.</p></div>';
  const lv = G.formationLevel(S, f.id);
  const cap = G.activeCapacity(S);
  const used = S.team.filter(Boolean).length;
  const counts = G.factionCounts(S);
  const factionLine = Object.entries(counts).map(([fc, n]) => {
    const b = G.factionBonusFor(n);
    return `<span class="chip" style="color:${FACTIONS[fc].color}">${FACTIONS[fc].name} ×${n}${b ? ` · +${Math.round(b * 100)}% công` : ''}</span>`;
  }).join(' ');
  const rc = teamRefillCost();
  const grid = [0, 1, 2].map((r) => `<span class="row-label">${G.ROW_NAMES[r]}${r === 0 ? ' · đỡ đòn cận chiến' : r === 2 ? ' · hợp Cung binh, Mưu sĩ' : ''}</span>
    <div class="formation">${[0, 1, 2].map((c) => formationCell(r * 3 + c, f, lv, cap)).join('')}</div>`).join('');
  const picker = ui.pickSlot !== null
    ? `<div class="row"><span class="muted">Chọn võ tướng bên dưới để đặt vào ô ${ui.pickSlot + 1}.</span><span class="spacer"></span><button class="btn small ghost" data-act="clearSlot">Bỏ trống ô</button><button class="btn small ghost" data-act="cancelPick">Hủy</button></div>`
    : `<p class="muted">Chạm ô trống hoặc ô có tướng để xếp. Ô khóa mở khi nâng cấp trận hình ở ${esc(BUILDINGS.quanMac.name)}.</p>`;
  const roster = withRoster && ui.pickSlot !== null
    ? `<div class="cards">${[...S.heroes].sort((a, b) => G.heroPower(S, b) - G.heroPower(S, a)).map(heroCard).join('')}</div>` : '';
  return `<div class="panel" style="display:flex;flex-direction:column;gap:8px">
      <div class="row"><b class="disp" style="font-size:18px;color:#fff">${esc(f.name)}</b><span class="chip num">Cấp ${lv}</span><span class="spacer"></span><span class="num">${used}/${cap.max} tướng</span></div>
      <p class="muted">${esc(formationEffectText(f, lv))}</p>
      ${grid}
      ${picker}
      ${factionLine ? `<div class="row wrap">${factionLine}</div>` : ''}
      <div class="row wrap"><label class="toggle"><input type="checkbox" id="autoRefill" data-act="toggleRefill" ${S.settings.autoRefill ? 'checked' : ''}> Tự bổ sung quân trước trận</label>
        <span class="spacer"></span><button class="btn small" data-act="refillTeam" ${rc.luong ? '' : 'disabled'}>Bổ sung quân</button></div>
      ${rc.luong ? costHtml(rc) : ''}
    </div>${roster}`;
}

function miniGrid(f, lv) {
  const levels = cellUnlockLevels(f);
  const cap = G.formationCapacity(f, Math.max(0, lv));
  return `<div class="mini-grid">${levels.map((l, i) => {
    if (l === null) return '<span class="mc off"></span>';
    const open = lv >= 0 && cap.open.includes(i) && (f.mode === 'fixed' || true);
    return `<span class="mc ${open ? 'on' : 'lock'}">${f.mode === 'fixed' ? (l === 0 ? '★' : l) : ''}</span>`;
  }).join('')}</div>`;
}

function formationList() {
  return FORMS.map((f) => {
    const lv = G.formationLevel(S, f.id);
    const active = S.formation === f.id;
    const unlocked = lv >= 0;
    const chk = G.formationUpgradeCheck(S, f.id);
    const cap = G.formationCapacity(f, Math.max(0, lv));
    const next = lv + 1;
    const nextCap = unlocked && next <= f.maxLevel ? G.formationCapacity(f, next).max : cap.max;
    let action;
    if (!unlocked) action = `<span class="muted">Mở khi ${esc(BUILDINGS.quanMac.name)} cấp ${f.reqQuanMac}</span>`;
    else action = `${active ? '<span class="chip" style="background:var(--green);color:#fff">Đang dùng</span>' : `<button class="btn small blue" data-act="useFormation" data-id="${f.id}">Dùng</button>`}
      <button class="btn small" data-act="upFormation" data-id="${f.id}" ${chk.ok ? '' : 'disabled'}>Nâng cấp</button>`;
    return `<div class="panel form-card ${active ? 'hi' : ''} ${unlocked ? '' : 'locked'}">
      ${miniGrid(f, lv)}
      <div style="display:flex;flex-direction:column;gap:3px;min-width:0">
        <div class="row"><b>${esc(f.name)}</b>${unlocked ? `<span class="chip num">${lv}/${f.maxLevel}</span>` : ''}<span class="spacer"></span><span class="muted num">${cap.max} ô</span></div>
        <span class="muted">${esc(formationEffectText(f, Math.max(0, lv)))}${unlocked && next <= f.maxLevel ? ` → cấp ${next}: ${nextCap > cap.max ? `${nextCap} ô` : esc(formationEffectText(f, next))}` : ''}</span>
        ${unlocked && lv < f.maxLevel ? `<div class="row wrap">${costHtml(G.formationUpgradeCost(lv))}${chk.ok ? '' : `<small style="color:var(--red-dk)">${esc(chk.reason)}</small>`}</div>` : ''}
        <div class="row wrap">${action}</div>
      </div></div>`;
  }).join('');
}

function viewFormations() {
  return `${formationEditor({ withRoster: true })}
    <p class="muted">Chọn trận hình rồi xếp tướng vào các ô sáng. Số trên ô nhỏ là cấp trận hình mở ô đó (★ = mở sẵn). Cấp trận hình không vượt cấp ${esc(BUILDINGS.quanMac.name)}.</p>
    ${formationList()}`;
}

function viewRoster() {
  const roster = [...S.heroes].sort((a, b) => G.heroPower(S, b) - G.heroPower(S, a)).map(heroCard).join('');
  return `<div class="row"><span class="muted">Chạm thẻ để xem, nâng cấp, đổi binh chủng, trang bị.</span><span class="spacer"></span><span class="num">${S.heroes.length}/${G.rosterLimit(S)}</span></div>
    <div class="cards">${roster}</div>
    <button class="btn blue" data-act="bldTap" data-id="tuuLau" data-tab="feature">Chiêu mộ thêm ở ${esc(BUILDINGS.tuuLau.name)}</button>`;
}

// ---------- Võ tướng ----------
function heroCard(h) {
  const t = HEROES[h.tid];
  const max = G.heroMaxTroops(S, h);
  const inTeam = S.team.includes(h.uid);
  return `<button class="hcard" style="--qc:${QUALITIES[t.q].color};--fc:${FACTIONS[t.faction].color}" data-act="heroTap" data-uid="${h.uid}" aria-label="${esc(t.name)} cấp ${h.level}">
    <span class="portrait">${img(heroImg(h.tid, h.troopType))}<span class="lv num disp">${h.level}</span>${inTeam ? '<span class="tag disp">TRẬN</span>' : ''}</span>
    <span class="nm disp">${esc(t.name)}</span>
    ${bar(h.troops, max, 'red')}
  </button>`;
}

function slotHtml(slot) {
  const uid = S.team[slot];
  const h = uid && G.findHero(S, uid);
  const pick = ui.pickSlot === slot ? 'pick' : '';
  if (!h) return `<button class="slot ${pick}" data-act="slotTap" data-slot="${slot}"><span class="muted" style="margin:auto">+</span></button>`;
  const max = G.heroMaxTroops(S, h);
  return `<button class="slot filled ${pick}" data-act="slotTap" data-slot="${slot}">
    ${img(heroImg(h.tid, h.troopType))}
    <span class="name">${esc(HEROES[h.tid].name)}</span>
    ${bar(h.troops, max, 'red')}
  </button>`;
}

function teamRefillCost() {
  let luong = 0;
  let bac = 0;
  for (const uid of S.team.filter(Boolean)) {
    const h = G.findHero(S, uid);
    const c = G.refillCost(S, h, G.heroMaxTroops(S, h) - h.troops);
    luong += c.luong;
    bac += c.bac;
  }
  return { luong, bac };
}

function viewHeroes() {
  const links = `<div class="row wrap"><button class="btn small blue" data-act="bldTap" data-id="quanMac" data-tab="feature">Đổi trận hình ở ${esc(BUILDINGS.quanMac.name)}</button><button class="btn small ghost" data-act="bldTap" data-id="tuuLau" data-tab="feature">Chiêu mộ</button><button class="btn small ghost" data-act="bldTap" data-id="luyenVo" data-tab="feature">Luyện binh</button></div>`;
  const roster = [...S.heroes].sort((a, b) => G.heroPower(S, b) - G.heroPower(S, a)).map(heroCard).join('');
  return `<h2 class="disp">Võ tướng</h2>${links}
    ${formationEditor()}
    <div class="row"><span class="disp" style="font-size:18px">Võ tướng</span><span class="spacer"></span><span class="num disp">${S.heroes.length}/${G.rosterLimit(S)}</span></div>
    <div class="cards">${roster}</div>`;
}

function viewTavern() {
  if (!G.tavernOpen(S)) return `<div class="panel"><p>Xây <b>Tửu Quán</b> ở Thành trì (cần cấp Chúa Công ${BUILDINGS.tuuLau.unlockLevel}) để chiêu mộ võ tướng.</p></div>`;
  const tv = BAL.tavern;
  const freeIn = (S.tavern.nextFree - now()) / 1000;
  const cards = S.tavern.candidates.length
    ? S.tavern.candidates.map((tid) => {
        const t = HEROES[tid];
        const cost = G.recruitCost(tid);
        return `<div class="panel" style="display:grid;grid-template-columns:52px minmax(0,1fr);gap:10px">
          ${img(heroImg(tid, t.school), '')}
          <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
            <div class="row"><b>${esc(t.name)}</b><span class="q-tag" style="color:${QUALITIES[t.q].color}">${QUALITIES[t.q].name}</span></div>
            <span class="muted">${FACTIONS[t.faction].name} · ${TROOP_TYPES[t.school].name} ★, ${TROOP_TYPES[t.school2].name} · ${esc(SKILLS[t.skill].name)}</span>
            <span class="muted num">Thống Soái ${t.base[0]} (+${t.growth[0]}) · Võ ${t.base[1]} (+${t.growth[1]}) · Ngộ ${t.base[2]} (+${t.growth[2]})</span>
            <p style="font-size:12px">${esc(t.bio)}</p>
            <div class="row">${costHtml({ bac: cost })}<span class="spacer"></span><button class="btn small" data-act="recruit" data-id="${tid}" ${S.res.bac >= cost ? '' : 'disabled'}>Chiêu mộ</button></div>
          </div>
        </div>`;
      }).join('')
    : `<div class="panel"><p class="muted">${esc(BUILDINGS.tuuLau.name)} đang vắng khách. Làm mới để mời khách mới.</p></div>`;
  return `<div class="panel" style="display:flex;flex-direction:column;gap:8px">
      <div class="row"><b>Tửu Quán cấp ${S.buildings.tuuLau}</b><span class="spacer"></span><span class="muted num">Võ tướng ${S.heroes.length}/${G.rosterLimit(S)}</span></div>
      <p class="muted">${esc(BUILDINGS.tuuLau.name)} cấp càng cao càng dễ gặp tướng ${esc(QUALITIES[4].name)} và ${esc(QUALITIES[5].name)}.</p>
      <div class="row wrap">
        <button class="btn small " data-act="tavernRefresh" data-id="free" ${freeIn > 0 ? 'disabled' : ''}>${freeIn > 0 ? `Miễn phí sau <span class="num" data-timer="${S.tavern.nextFree}">${fmtTime(freeIn)}</span>` : 'Làm mới miễn phí'}</button>
        <button class="btn small ghost" data-act="tavernRefresh" data-id="bac">${tv.refreshCostBac} bạc</button>
        <button class="btn small ghost" data-act="tavernRefresh" data-id="nguyenbao">${tv.refreshCostNguyenBao} N.Bảo</button>
      </div>
    </div>${cards}`;
}

function viewTrain() {
  return `<p class="muted">Giáo Trường cấp ${S.buildings.luyenVo || 0}. Bậc binh chủng áp dụng ngay cho mọi võ tướng dẫn hệ đó. Khắc chế: ${TROOP_ORDER.map((t) => `${TROOP_TYPES[t].name} khắc ${TROOP_TYPES[t].beats.map((b) => TROOP_TYPES[b].name).join(', ')}`).join('; ')}.</p>` +
    TROOP_ORDER.map((type) => {
      const tt = TROOP_TYPES[type];
      const tier = S.troopTiers[type];
      const m = C.tiers[tier - 1].mult;
      const chk = G.researchCheck(S, type);
      const next = C.tiers[tier];
      return `<div class="panel" style="display:grid;grid-template-columns:52px minmax(0,1fr);gap:10px">
        ${img(heroSprite(['#6a5a48', '#4a3e30', '#2a2018', '#c0a070'], type))}
        <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
          <div class="row"><b>${tt.name}</b><span class="chip">Bậc ${tier}/5</span><span class="spacer"></span><span class="muted">${esc(tt.tiers[tier - 1])}</span></div>
          <p class="muted">${esc(tt.desc)}</p>
          <div class="row wrap">${C.troopVariants.filter((v) => v.troop === type).map((v) => `<span class="chip" title="${esc(v.desc)}">${esc(v.name)}</span>`).join('')}</div>
          <span class="muted num">Máu/lính ${(tt.hp * m).toFixed(1)} · Công ×${(tt.atk * m).toFixed(2)} · Tốc ${tt.speed}</span>
          ${next ? `<div class="row wrap">${costHtml(next.cost)}<span class="muted">Giáo Trường ${next.reqLuyenVo}</span></div>
          <div class="row"><span class="muted">${chk.ok ? `Lên: ${esc(tt.tiers[tier])}` : esc(chk.reason)}</span><span class="spacer"></span><button class="btn small" data-act="research" data-id="${type}" ${chk.ok ? '' : 'disabled'}>Nghiên cứu</button></div>` : '<span class="muted">Đã đạt bậc cao nhất</span>'}
        </div>
      </div>`;
    }).join('');
}

function heroSheet(uid) {
  const h = G.findHero(S, uid);
  if (!h) return '';
  const t = HEROES[h.tid];
  const s = G.heroStats(S, h);
  const max = G.heroMaxTroops(S, h);
  const need = G.heroExpToNext(h.level);
  const sk = SKILLS[t.skill];
  const skMax = G.skillMaxLevel(S, h);
  const skCost = G.skillUpgradeCost(h);
  const capped = h.level >= S.player.level;
  const confirmRelease = ui.confirm === `release-${uid}`;
  const eqRows = Object.entries(EQUIP_SLOTS).map(([slot, def]) => {
    const eqUid = h.equip[slot];
    const eq = eqUid && S.equipment.find((e) => e.uid === eqUid);
    const val = eq && G.equipStatValue(eq);
    return `<div class="eq-slot"><span class="muted" style="width:70px">${def.name}</span>
      <span style="flex:1;min-width:0;color:${eq ? EQUIP_QUALITIES[eq.q].color : 'var(--text-dim)'}">${eq ? `${esc(G.equipName(eq))} <span class="num muted">+${val.value}</span>` : 'Trống'}</span>
      <button class="btn small ghost" data-act="equipPick" data-uid="${uid}" data-slot="${slot}">Đổi</button></div>`;
  }).join('');
  return `
    <div class="sheet-head">
      <div class="art" style="background:radial-gradient(circle at 50% 35%,#fff6,transparent 60%),${FACTIONS[t.faction].color};border-color:var(--ink);box-shadow:inset 0 0 0 3px ${QUALITIES[t.q].color}">${img(heroImg(h.tid, h.troopType))}</div>
      <div style="flex:1;min-width:0">
        <div class="row"><h3 style="font-size:21px">${esc(t.name)}</h3><span class="spacer"></span><button class="btn small ghost" data-act="closeSheet">✕</button></div>
        <div class="row wrap"><span class="chip" style="background:${QUALITIES[t.q].color}">${QUALITIES[t.q].name}</span><span class="chip" style="background:${FACTIONS[t.faction].color};color:#fff">${FACTIONS[t.faction].name}</span><span class="chip">${TROOP_TYPES[t.school].name} · ${TROOP_TYPES[t.school2].name}</span></div>
        <p class="muted" style="margin-top:4px">${esc(t.bio)}</p>
      </div>
    </div>
    <div>
      <div class="row"><b class="num">Lv ${h.level}</b><span class="muted">${capped ? '(bằng cấp Chúa Công)' : ''}</span><span class="spacer"></span><span class="muted num">${fmt(h.exp)}/${fmt(need)}</span></div>
      ${bar(h.exp, need, 'sky')}
      <div class="row wrap" style="margin-top:6px">
        <button class="btn small ghost" data-act="useExp" data-uid="${uid}" data-id="tieuHoanDan" data-n="1" ${capped || !S.items.tieuHoanDan ? 'disabled' : ''}>${img(icon('tieuHoanDan'))} Tiểu ×1 (${S.items.tieuHoanDan})</button>
        <button class="btn small ghost" data-act="useExp" data-uid="${uid}" data-id="tieuHoanDan" data-n="10" ${capped || !S.items.tieuHoanDan ? 'disabled' : ''}>×10</button>
        <button class="btn small ghost" data-act="useExp" data-uid="${uid}" data-id="daiHoanDan" data-n="1" ${capped || !S.items.daiHoanDan ? 'disabled' : ''}>${img(icon('daiHoanDan'))} Đại ×1 (${S.items.daiHoanDan})</button>
      </div>
    </div>
    <div class="stat-grid">
      <div class="stat"><small>Thống Soái</small><b>${Math.round(s.canCot)}</b><small>+${t.growth[0]}/cấp</small></div>
      <div class="stat"><small>Vũ Lực</small><b>${Math.round(s.voLuc)}</b><small>+${t.growth[1]}/cấp</small></div>
      <div class="stat"><small>Trí Lực</small><b>${Math.round(s.ngoTinh)}</b><small>+${t.growth[2]}/cấp</small></div>
    </div>
    <div>
      <div class="row"><b>Binh chủng</b><span class="spacer"></span><span class="num">${fmt(h.troops)}/${fmt(max)}</span></div>
      ${bar(h.troops, max, 'red')}
      <div class="troop-pick">${G.heroClasses(h.tid).map((ty) => `<button class="tp ${h.troopType === ty ? 'on' : ''}" data-act="troopType" data-uid="${uid}" data-id="${ty}">
          ${img(heroSprite(['#6a5a48', '#4a3e30', '#2a2018', '#c0a070'], ty))}
          <span class="tp-txt"><b>${TROOP_TYPES[ty].name}${ty === t.school ? ' ★' : ''}</b><span class="tp-var disp">${esc(G.variantName(h, ty)) || '—'}</span><small>Bậc ${S.troopTiers[ty]}</small></span>
        </button>`).join('')}</div>
      <div class="row wrap" style="margin-top:6px"><span class="muted" style="flex:1;min-width:0">Chạm để chọn binh chủng ra trận. Đổi binh chủng sẽ giải tán binh lính hiện có. ★ sở trường: +${Math.round(BAL.combat.schoolBonus * 100)}% công.</span>
        <button class="btn small gold" data-act="rerollVariant" data-uid="${uid}" ${(S.res.nguyenbao || 0) >= BAL.variantRerollCost ? '' : 'disabled'}>Đổi loại · ${BAL.variantRerollCost} ${img(icon('nguyenbao'))}</button></div>
      <div class="row" style="margin-top:6px">${h.troops < max ? costHtml(G.refillCost(S, h, max - h.troops)) : '<span class="muted">Đủ quân</span>'}<span class="spacer"></span><button class="btn small " data-act="refillOne" data-uid="${uid}" ${h.troops < max ? '' : 'disabled'}>Bổ sung</button></div>
    </div>
    <div class="panel">
      <div class="row"><b>${esc(sk.name)}</b><span class="chip num">Cấp ${h.skillLv}/${skMax}</span></div>
      <p class="muted">${esc(sk.desc)} Tung ra khi sĩ khí đạt 100 (đánh thường +${BAL.combat.khiPerAttack}, bị đánh +${BAL.combat.khiPerHit}, vào trận có sẵn ${BAL.combat.khiStart}). Mỗi cấp +8% sức mạnh.</p>
      <div class="row" style="margin-top:6px">${costHtml(skCost)}<span class="spacer"></span><button class="btn small" data-act="skillUp" data-uid="${uid}" ${h.skillLv < skMax ? '' : 'disabled'}>Lĩnh ngộ</button></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px"><b>Trang bị</b>${eqRows}</div>
    <div class="row"><span class="spacer"></span>
      <button class="btn small red" data-act="release" data-uid="${uid}">${confirmRelease ? 'Chạm lần nữa để mời rời đi' : 'Mời rời thành trì'}</button></div>`;
}

function equipPickSheet(uid, slot) {
  const h = G.findHero(S, uid);
  const items = S.equipment.filter((e) => e.slot === slot).sort((a, b) => G.equipStatValue(b).value - G.equipStatValue(a).value);
  const rows = items.length
    ? items.map((eq) => {
        const owner = G.equippedBy(S, eq.uid);
        const v = G.equipStatValue(eq);
        const mine = owner && owner.uid === uid;
        return `<div class="eq-slot"><span style="flex:1;min-width:0;color:${EQUIP_QUALITIES[eq.q].color}">${esc(G.equipName(eq))} <span class="num muted">+${v.value}</span>${owner ? `<br><span class="muted">${mine ? 'Đang mặc' : `Đang ở ${esc(HEROES[owner.tid].name)}`}</span>` : ''}</span>
          ${mine ? `<button class="btn small ghost" data-act="unequip" data-uid="${uid}" data-slot="${slot}">Tháo</button>` : `<button class="btn small" data-act="equip" data-uid="${uid}" data-id="${eq.uid}">Mặc</button>`}</div>`;
      }).join('')
    : `<p class="muted">Chưa có ${EQUIP_SLOTS[slot].name.toLowerCase()} nào. Rèn ở Lò Rèn.</p>`;
  return `<div class="row"><h3>${EQUIP_SLOTS[slot].name} cho ${esc(HEROES[h.tid].name)}</h3><span class="spacer"></span><button class="btn small ghost" data-act="backToHero" data-uid="${uid}">Quay lại</button></div>${rows}`;
}

// ---------- Chinh chiến ----------
function enemyPower(units) {
  return units.reduce((s, u) => s + (u.stats.canCot + u.stats.voLuc + u.stats.ngoTinh) * (1 + 0.2 * (u.tier - 1)) + u.troops * 0.3, 0);
}
function teamPower() {
  return S.team.filter(Boolean).reduce((s, uid) => s + G.heroPower(S, G.findHero(S, uid)), 0);
}

function viewCampaign() {
  const next = G.nextStage(S);
  const curCh = ui.openCh ?? (next ? G.parseStage(next).ch : CHAPTERS.length);
  const tp = teamPower();
  const chapters = CHAPTERS.map((c) => {
    const open = c.id === curCh;
    const lockedCh = S.player.level < c.reqLevel;
    const cleared = Array.from({ length: STAGES_PER_CHAPTER }, (_, i) => S.campaign.stars[G.stageId(c.id, i + 1)] || 0);
    const done = cleared.filter(Boolean).length;
    const head = `<button class="panel ${open ? 'hi' : ''}" data-act="openCh" data-id="${c.id}" style="border:0;text-align:left;cursor:pointer;width:100%;display:flex;flex-direction:column;gap:2px">
      <div class="row"><b>Chương ${c.id} · ${esc(c.name)}</b><span class="spacer"></span><span class="muted num">${done}/${STAGES_PER_CHAPTER}</span></div>
      <span class="muted">${lockedCh ? `Mở ở cấp Chúa Công ${c.reqLevel}` : esc(c.desc)}</span></button>`;
    if (!open) return head;
    const stages = Array.from({ length: STAGES_PER_CHAPTER }, (_, i) => {
      const id = G.stageId(c.id, i + 1);
      const info = G.stageInfo(id);
      const unlocked = G.isStageUnlocked(S, id);
      const stars = S.campaign.stars[id] || 0;
      const enemies = G.stageEnemies(id);
      const ep = enemyPower(enemies);
      const ratio = tp / ep;
      const hint = ratio > 1.25 ? ['Dễ', 'var(--green-dk)'] : ratio > 0.9 ? ['Ngang sức', 'var(--gold)'] : ['Nguy hiểm', 'var(--red)'];
      const names = [...new Set(enemies.map((e) => e.name))].join(', ');
      const first = !stars;
      return `<div class="panel stage ${unlocked ? '' : 'locked'}">
        <div style="min-width:0;display:flex;flex-direction:column;gap:3px">
          <div class="row"><b class="num">${id}</b>${info.isBoss ? '<span class="chip" style="color:var(--red)">Trùm</span>' : ''}<span class="stars">${[1, 2, 3].map((n) => (n <= stars ? '★' : '<span class="off">★</span>')).join('')}</span></div>
          <span class="muted">${esc(names)} · ${enemies.length} đội · Lv ${info.level}</span>
          ${unlocked ? `<span class="muted">Lực chiến địch <span class="num">${fmt(ep)}</span> · <span style="color:${hint[1]}">${hint[0]}</span></span>` : ''}
          <div class="row wrap">${rewardHtml(G.stageRewards(id, first))}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:stretch">
          <button class="btn small" data-act="fight" data-id="${id}" ${unlocked ? '' : 'disabled'}>${first ? 'Khiêu chiến' : 'Đánh lại'}</button>
          ${stars >= 3 ? `<button class="btn small " data-act="sweep" data-id="${id}" data-n="1">Càn quét</button><button class="btn small ghost" data-act="sweep" data-id="${id}" data-n="5">×5</button>` : ''}
        </div>
      </div>`;
    }).join('');
    return head + stages;
  }).join('');
  return `<h2 class="disp">Chinh chiến</h2>
    <div class="panel" style="display:flex;flex-direction:column;gap:6px">
      <div class="row"><span>Lực chiến đội hình</span><span class="spacer"></span><b class="num" style="color:var(--gold)">${fmt(tp)}</b></div>
      <div class="row"><span>Trận hình: <b>${esc(formName(S.formation))}</b> cấp ${G.formationLevel(S, S.formation)} · ${S.team.filter(Boolean).length}/${G.deployLimit(S)} tướng</span><span class="spacer"></span><button class="btn small blue" data-act="bldTap" data-id="quanMac" data-tab="feature">Đổi</button></div>
      <p class="muted">Mỗi trận thắng tốn ${BAL.stamina.perWin} thể lực, thua tốn ${BAL.stamina.perLoss}. Đạt 3 sao để càn quét (tốn thể lực và lương, không mất quân).</p>
      <label class="toggle"><input type="checkbox" id="autoRefill2" data-act="toggleRefill" ${S.settings.autoRefill ? 'checked' : ''}> Tự bổ sung quân trước trận</label>
    </div>${chapters}`;
}

// ---------- Lò rèn ----------
function viewForge() {
  const maxT = G.maxForgeTier(S);
  if (!maxT) return `<div class="panel"><p>Xây ${esc(BUILDINGS.loRen.name)} trước (cần cấp Chúa Công ${BUILDINGS.loRen.unlockLevel}).</p></div>`;
  ui.forgeTier = Math.min(Math.max(1, ui.forgeTier), maxT);
  const def = EQUIP_SLOTS[ui.forgeSlot];
  const cost = G.forgeCost(ui.forgeTier);
  const inv = [...S.equipment].sort((a, b) => b.tier - a.tier || b.q - a.q || b.enh - a.enh).map((eq) => {
    const owner = G.equippedBy(S, eq.uid);
    const v = G.equipStatValue(eq);
    const ec = G.enhanceCost(eq);
    const canEnh = eq.enh < G.maxEnhance(S);
    return `<div class="panel" style="display:flex;flex-direction:column;gap:4px">
      <div class="row"><b style="color:${EQUIP_QUALITIES[eq.q].color}">${esc(G.equipName(eq))}</b><span class="spacer"></span><span class="muted">${EQUIP_QUALITIES[eq.q].name} · bậc ${eq.tier}</span></div>
      <span class="muted">${EQUIP_SLOTS[eq.slot].name}: <span class="num">+${v.value}</span> ${v.stat === 'voLuc' ? 'Vũ Lực' : v.stat === 'canCot' ? 'Thống Soái' : 'Trí Lực'}${owner ? ` · đang ở ${esc(HEROES[owner.tid].name)}` : ''}</span>
      <div class="row wrap">${canEnh ? costHtml(ec) : `<span class="muted">Cường hóa tối đa +${G.maxEnhance(S)} (nâng Lò Rèn)</span>`}<span class="spacer"></span>
        <button class="btn small" data-act="enhance" data-id="${eq.uid}" ${canEnh ? '' : 'disabled'}>Cường hóa</button>
        <button class="btn small ghost" data-act="sell" data-id="${eq.uid}" ${owner ? 'disabled' : ''}>Bán</button></div>
    </div>`;
  }).join('');
  return `
    <div class="panel" style="display:flex;flex-direction:column;gap:8px">
      <div class="seg">${Object.entries(EQUIP_SLOTS).map(([k, d]) => `<button class="${ui.forgeSlot === k ? 'on' : ''}" data-act="forgeSlot" data-id="${k}">${d.name}</button>`).join('')}</div>
      <div class="seg">${Array.from({ length: maxT }, (_, i) => `<button class="${ui.forgeTier === i + 1 ? 'on' : ''}" data-act="forgeTier" data-id="${i + 1}">Bậc ${i + 1}</button>`).join('')}</div>
      <div class="row"><b>${esc(def.tierNames[ui.forgeTier - 1])}</b><span class="spacer"></span><span class="muted">Phẩm chất ngẫu nhiên</span></div>
      <div class="row wrap">${EQUIP_QUALITIES.map((q) => `<span class="chip" style="color:${q.color}">${q.name} ${q.weight}%</span>`).join('')}</div>
      <div class="row">${costHtml(cost)}<span class="spacer"></span><button class="btn" data-act="forge" ${G.canAfford(S, cost) ? '' : 'disabled'}>Rèn</button></div>
    </div>
    <div class="row"><b>Kho trang bị</b><span class="spacer"></span><span class="muted num">${S.equipment.length}</span></div>
    ${inv || '<div class="panel"><p class="muted">Kho trống.</p></div>'}`;
}

// ---------- Nhiệm vụ ----------
function viewQuests() {
  const list = G.questList(S);
  const firstOpen = list.findIndex((q) => !q.claimed);
  const shown = list.filter((q, i) => q.claimed || i <= firstOpen + 4);
  const rows = shown.map((q) => `<div class="panel ${q.done && !q.claimed ? 'hi' : ''}" style="display:flex;flex-direction:column;gap:4px;${q.claimed ? 'opacity:.55' : ''}">
      <div class="row"><b>${esc(q.name)}</b><span class="spacer"></span>${q.claimed ? '<span class="muted">Đã nhận</span>' : q.done ? '<span style="color:var(--green-dk)">Hoàn thành</span>' : '<span class="muted">Đang làm</span>'}</div>
      <span class="muted">${esc(q.desc)}</span>
      <div class="row wrap">${rewardHtml(q.reward)}<span class="spacer"></span>${!q.claimed ? `<button class="btn small" data-act="claim" data-id="${q.id}" ${q.done ? '' : 'disabled'}>Nhận thưởng</button>` : ''}</div>
    </div>`).reverse().join('');
  const confirmReset = ui.confirm === 'reset';
  const items = Object.entries(ITEMS).map(([k, it]) => `<span class="chip">${img(icon(k))} ${esc(it.name)} <span class="num">${S.items[k] || 0}</span></span>`).join(' ');
  return `<h2 class="disp">Nhiệm vụ</h2>${rows}
    <h2 class="disp">Túi đồ</h2><div class="panel"><div class="row wrap">${items}</div></div>
    <h2 class="disp">Cài đặt</h2>
    <div class="panel" style="display:flex;flex-direction:column;gap:8px">
      <p class="muted">Tiến trình tự lưu trên trình duyệt này. Muốn chuyển sang máy khác: chép mã lưu rồi dán ở máy kia.</p>
      ${DEV_TOOLS ? '<button class="btn small red" data-act="cheatOpen">Công cụ test (cheat)</button>' : ''}
      <div class="row wrap"><button class="btn small ghost" data-act="exportSave">Chép mã lưu</button><button class="btn small ghost" data-act="importSave">Nạp mã lưu đã dán</button></div>
      <textarea id="saveBox" placeholder="Dán mã lưu vào đây rồi bấm Nạp"></textarea>
      <div class="row"><span class="muted">Đã đánh ${S.stats.battles} trận, thắng ${S.stats.wins}.</span><span class="spacer"></span><button class="btn small red" data-act="reset">${confirmReset ? 'Chạm lần nữa để chơi lại từ đầu' : 'Chơi lại từ đầu'}</button></div>
    </div>`;
}

// ---------- thanh dưới ----------
function renderNav() {
  const claim = G.claimableCount(S);
  const tabs = [
    ['city', 'Thành trì', buildingSprite('chinhDien', BUILDINGS.chinhDien.roof, 3), (!S.queue && BUILDING_ORDER.some((id) => G.upgradeCheck(S, id).ok)) || (G.tavernOpen(S) && now() >= S.tavern.nextFree) ? '!' : ''],
    ['heroes', 'Võ tướng', heroImg('quanVu', 'ky'), ''],
    ['campaign', 'Chinh chiến', heroImg('luBo', 'ky'), S.stamina.cur >= BAL.stamina.max ? '!' : ''],
    ['shop', 'Cửa hàng', icon('nguyenbao'), C.packs.some((p) => p.currency !== 'vnd' && p.limit === 'daily' && G.packCheck(S, p, now()).ok) ? '!' : ''],
    ['quests', 'Nhiệm vụ', icon('biKip'), claim ? String(claim) : ''],
  ];
  $('#nav').innerHTML = `<div class="in">${tabs.map(([id, label, src, dot]) => `<button class="tab ${ui.tab === id ? 'on' : ''}" data-act="tab" data-id="${id}">${img(src)}<span>${label}</span>${dot ? `<span class="dot">${dot}</span>` : ''}</button>`).join('')}</div>`;
}

function renderSheet() {
  const wrap = $('#sheet');
  if (!ui.sheet) {
    wrap.hidden = true;
    wrap.innerHTML = '';
    return;
  }
  const inner = ui.sheet.type === 'hero' ? heroSheet(ui.sheet.uid)
    : ui.sheet.type === 'cheat' && DEV_TOOLS ? cheatSheet()
    : ui.sheet.type === 'building' ? buildingSheet(ui.sheet.id)
    : equipPickSheet(ui.sheet.uid, ui.sheet.slot);
  const prevScroll = wrap.querySelector('.sheet')?.scrollTop || 0;
  wrap.hidden = false;
  wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${inner}</div>`;
  wrap.querySelector('.sheet').scrollTop = prevScroll;
}

function renderAll() {
  renderTop();
  const views = { city: viewCity, heroes: viewHeroes, campaign: viewCampaign, shop: viewShop, quests: viewQuests };
  const box = $('#view');
  const saveText = box.querySelector('#saveBox')?.value;
  box.innerHTML = views[ui.tab]();
  if (saveText && box.querySelector('#saveBox')) box.querySelector('#saveBox').value = saveText;
  renderNav();
  renderSheet();
}

function updateTimers() {
  const t = now();
  document.querySelectorAll('[data-timer]').forEach((el) => {
    el.textContent = fmtTime((Number(el.dataset.timer) - t) / 1000);
  });
  document.querySelectorAll('[data-progress]').forEach((el) => {
    const [a, b] = el.dataset.progress.split('|').map(Number);
    const i = el.querySelector('i');
    if (i) i.style.width = `${Math.min(100, ((t - a) / (b - a)) * 100).toFixed(1)}%`;
  });
}

// ---------- trận đánh ----------
const battle = { timer: null, speed: 1, data: null, idx: 0, units: {}, finished: false, pending: [] };

// Hẹn giờ trong một sự kiện (theo tốc độ phát lại); bỏ qua trận thì hủy hết
function later(fn, ms) {
  const id = setTimeout(fn, ms / battle.speed);
  battle.pending.push(id);
  return id;
}
function clearPending() {
  battle.pending.forEach(clearTimeout);
  battle.pending = [];
}

function unitLook(u) {
  if (u.look.kind === 'hero') return heroImg(u.look.tid, u.look.type);
  const ch = CHAPTERS.find((c) => c.id === u.look.chapter);
  return heroSprite(ch.palette, u.look.type, { boss: u.look.boss, faction: ch.palette[0] });
}

// Vị trí trên chiến trường (tỉ lệ khung): hàng xa nhỏ hơn và hẹp hơn để tạo chiều sâu
// 3 hàng mỗi bên: hàng 0 tiền quân (gần giữa sân), hàng 2 hậu quân (xa nhất)
const ROWS = {
  B_2: { y: 0.22, k: 0.56, s: 0.66 },
  B_1: { y: 0.335, k: 0.64, s: 0.74 },
  B_0: { y: 0.455, k: 0.73, s: 0.83 },
  A_0: { y: 0.665, k: 0.86, s: 0.94 },
  A_1: { y: 0.80, k: 0.94, s: 1.01 },
  A_2: { y: 0.935, k: 1.02, s: 1.08 },
};
function unitPos(side, slot) {
  const row = ROWS[`${side}_${Math.floor(slot / 3)}`];
  const lane = [0.2, 0.5, 0.8][slot % 3];
  return { x: 0.5 + (lane - 0.5) * row.k, y: row.y, s: row.s };
}

function openBattle(r) {
  clearPending();
  battle.data = r;
  battle.idx = 0;
  battle.finished = false;
  battle.units = {};
  const khi0 = r.result.khiStart ?? 0;
  const unitHtml = (u, side) => {
    const uid = `${side}${u.slot}`;
    const p = unitPos(side, u.slot);
    battle.units[uid] = { name: u.name, side, troops: u.troops, max: u.maxTroops, khi: khi0, hasSkill: !!u.skill, ranged: TROOP_TYPES[u.type].range === 'ranged', type: u.type, ...p };
    return `<div class="unit ${side === 'B' ? 'enemy' : ''}" id="u-${uid}" style="left:${p.x * 100}%;top:${p.y * 100}%;width:${21 * p.s}%;z-index:${Math.round(p.y * 100)}">
      <span class="ring"></span>${img(unitLook(u))}<span class="uname disp">${esc(u.name)}</span>
      ${bar(u.troops, u.maxTroops, side === 'A' ? 'green' : 'red')}
      ${u.skill ? `<div class="khi-bar" title="Sĩ khí"><i style="width:${Math.min(100, khi0)}%"></i></div>` : ''}
      <span class="cnt num disp" data-cnt>${fmt(u.troops)}</span></div>`;
  };
  const el = $('#battle');
  el.hidden = false;
  el.innerHTML = `<div class="battle-inner">
    <div class="row"><span class="disp" style="font-size:18px">Ải ${r.stageId}</span><span class="spacer"></span><span class="round-tag disp" id="b-round">Hiệp 1</span></div>
    <div class="field" id="b-field"><div class="ground"></div><div class="dim"></div>${r.enemies.map((u) => unitHtml(u, 'B')).join('')}${r.team.map((u) => unitHtml(u, 'A')).join('')}</div>
    <p class="legend"><span class="lg-troop"></span>Binh lực <span class="lg-khi"></span>Sĩ khí: đầy 100 thì đến lượt sẽ tung chiến pháp</p>
    <div id="b-result"></div>
    <div class="blog" id="b-log"></div>
    <div class="row" id="b-ctrl"><button class="btn small ghost" data-act="bSpeed">Tốc độ ×${battle.speed}</button><span class="spacer"></span><button class="btn small gold" data-act="bSkip">Bỏ qua</button></div>
  </div>`;
  stepBattle();
}

function unitEl(uid) {
  return document.getElementById(`u-${uid}`);
}
function fieldEl() {
  return document.getElementById('b-field');
}
/** Tâm thân người (px trong khung chiến trường) */
function fieldPx(uid) {
  const f = fieldEl();
  const u = battle.units[uid];
  if (!f || !u) return null;
  return { x: u.x * f.clientWidth, y: u.y * f.clientHeight - 0.11 * f.clientWidth * u.s, s: u.s };
}

function setTroops(uid, left) {
  const st = battle.units[uid];
  if (!st) return;
  st.troops = Math.max(0, left);
  const u = unitEl(uid);
  if (!u) return;
  u.querySelector('.bar i').style.width = `${(st.troops / Math.max(1, st.max)) * 100}%`;
  u.querySelector('[data-cnt]').textContent = fmt(st.troops);
  u.classList.toggle('dead', st.troops <= 0);
  if (st.troops <= 0) u.classList.remove('ready', 'stunned');
}

function setKhi(uid, v) {
  const st = battle.units[uid];
  if (!st) return;
  st.khi = v;
  const u = unitEl(uid);
  const barEl = u?.querySelector('.khi-bar i');
  if (!barEl) return; // không có chiến pháp thì không hiện sĩ khí
  barEl.style.width = `${Math.max(0, Math.min(100, v))}%`;
  u.classList.toggle('ready', v >= 100 && st.troops > 0);
}

function floatAt(uid, text, cls = '') {
  const u = unitEl(uid);
  if (!u) return;
  const f = document.createElement('span');
  f.className = `float ${cls}`;
  f.textContent = text;
  u.appendChild(f);
  setTimeout(() => f.remove(), 900);
}

function logLine(html) {
  const box = $('#b-log');
  if (!box) return;
  const p = document.createElement('p');
  p.innerHTML = html;
  box.appendChild(p);
  box.scrollTop = box.scrollHeight;
}

function showBanner(text, cls = '', sub = '') {
  const f = fieldEl();
  if (!f) return;
  f.querySelector('.banner')?.remove();
  const b = document.createElement('div');
  b.className = `banner ${cls}`;
  b.innerHTML = sub ? `<small class="disp">${esc(sub)}</small><span class="disp">${esc(text)}</span>` : `<span class="disp">${esc(text)}</span>`;
  f.appendChild(b);
  if (cls !== 'win' && cls !== 'lose') setTimeout(() => b.remove(), 950 / battle.speed);
}

// ---------- Hiệu ứng hình ----------

/** Tạo một phần tử hiệu ứng tại (x, y) trong khung, tự xóa sau `life` ms */
function fx(cls, x, y, { life = 900, style = '', html = '' } = {}) {
  const f = fieldEl();
  if (!f) return null;
  const e = document.createElement('div');
  e.className = `vfx ${cls}`;
  e.style.cssText = `left:${x}px;top:${y}px;--spd:${battle.speed};${style}`;
  if (html) e.innerHTML = html;
  f.appendChild(e);
  setTimeout(() => e.remove(), life / battle.speed + 50);
  return e;
}

function lunge(fromUid, toUid, amount = 0.35) {
  const a = fieldPx(fromUid);
  const b = fieldPx(toUid);
  const el = unitEl(fromUid);
  if (!a || !b || !el || !el.animate) return;
  el.animate([{ translate: '0 0' }, { translate: `${(b.x - a.x) * amount}px ${(b.y - a.y) * amount}px` }, { translate: '0 0' }], { duration: 320 / battle.speed, easing: 'ease-out' });
}

function shoot(fromUid, toUid, kind = 'arrow') {
  const a = fieldPx(fromUid);
  const b = fieldPx(toUid);
  const f = fieldEl();
  if (!a || !b || !f) return;
  const s = document.createElement('span');
  s.className = `shot ${kind}`;
  s.style.left = `${a.x}px`;
  s.style.top = `${a.y}px`;
  f.appendChild(s);
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const anim = s.animate?.([
    { transform: `translate(-50%,-50%) rotate(${ang}deg)` },
    { transform: `translate(calc(${b.x - a.x}px - 50%), calc(${b.y - a.y}px - 50%)) rotate(${ang}deg)` },
  ], { duration: 300 / battle.speed, easing: 'ease-in' });
  if (anim) anim.onfinish = () => s.remove();
  else s.remove();
}

/** Loại hoạt cảnh của chiến pháp: lấy từ cột "Hiệu ứng hình" trong Excel, bỏ trống thì tự đoán */
function skillVfx(skillId) {
  const s = SKILLS[skillId];
  if (!s) return 'slash';
  if (s.vfx) return s.vfx;
  const types = s.effects.map((e) => e.type);
  if (types.includes('poison')) return 'fire';
  if (types.includes('teamHeal')) return 'heal';
  if (types.includes('teamBuffAtk')) return 'command';
  if (types.includes('stun') && s.stat === 'ngoTinh') return 'thunder';
  if (s.target === 'back' || s.target.startsWith('random')) return s.stat === 'ngoTinh' ? 'thunder' : 'arrows';
  if (s.target === 'all') return 'whirl';
  if (s.target === 'row') return 'slash';
  return 'pierce';
}

const VFX_PLAY = {
  slash(a, targets) {
    for (const t of targets) {
      fx('fx-slash', t.x, t.y, { style: `--rot:${-30 + Math.random() * 60}deg;--sz:${130 * t.s}px` });
      fx('fx-impact', t.x, t.y, { style: `--sz:${70 * t.s}px;animation-delay:${120 / battle.speed}ms` });
    }
  },
  pierce(a, targets) {
    for (const t of targets) {
      const dx = t.x - a.x;
      const dy = t.y - a.y;
      fx('fx-pierce', a.x, a.y, { life: 500, style: `width:${Math.hypot(dx, dy)}px;--rot:${(Math.atan2(dy, dx) * 180) / Math.PI}deg` });
      fx('fx-impact', t.x, t.y, { style: `--sz:${70 * t.s}px` });
    }
  },
  arrows(a, targets) {
    for (const t of targets) {
      for (let i = 0; i < 6; i++) {
        fx('fx-arrow', t.x + (Math.random() - 0.5) * 50 * t.s, t.y - 10, { life: 700, style: `animation-delay:${(i * 50) / battle.speed}ms` });
      }
    }
  },
  fire(a, targets) {
    for (const t of targets) {
      fx('fx-burst fire', t.x, t.y, { style: `--sz:${110 * t.s}px` });
      for (let i = 0; i < 4; i++) fx('fx-flame', t.x + (i - 1.5) * 14 * t.s, t.y + 10, { life: 1000, style: `animation-delay:${(i * 60) / battle.speed}ms;--sz:${34 * t.s}px` });
    }
  },
  thunder(a, targets) {
    const f = fieldEl();
    fx('fx-flash', f.clientWidth / 2, f.clientHeight / 2, { life: 350 });
    for (const t of targets) {
      fx('fx-bolt', t.x, t.y, { life: 500, style: `height:${t.y + 20}px` });
      fx('fx-impact thunder', t.x, t.y, { style: `--sz:${80 * t.s}px` });
    }
  },
  formation(a, targets) {
    if (!targets.length) return;
    const cx = targets.reduce((s, t) => s + t.x, 0) / targets.length;
    const cy = targets.reduce((s, t) => s + t.y, 0) / targets.length;
    fx('fx-formation', cx, cy + 20, { life: 1100 });
    for (const t of targets) fx('fx-whirl small', t.x, t.y, { life: 800, style: `--sz:${70 * t.s}px` });
  },
  roar(a, targets) {
    for (let i = 0; i < 3; i++) fx('fx-wave', a.x, a.y, { life: 800, style: `animation-delay:${(i * 120) / battle.speed}ms` });
    for (const t of targets) fx('fx-impact', t.x, t.y, { style: `--sz:${60 * t.s}px` });
  },
  charm(a, targets) {
    for (const t of targets) {
      for (let i = 0; i < 6; i++) fx('fx-petal', t.x + (Math.random() - 0.5) * 60 * t.s, t.y + (Math.random() - 0.5) * 30, { life: 1000, style: `animation-delay:${(i * 60) / battle.speed}ms;--rot:${Math.random() * 360}deg` });
    }
  },
  command(a, targets, allies) {
    fx('fx-wave gold', a.x, a.y, { life: 800 });
    for (const t of allies) fx('fx-aura', t.x, t.y + 30, { life: 1000, style: `--sz:${90 * t.s}px` });
    VFX_PLAY.slash(a, targets);
  },
  heal(a, targets, allies) {
    for (const t of allies) {
      fx('fx-aura heal', t.x, t.y + 30, { life: 1000, style: `--sz:${90 * t.s}px` });
      for (let i = 0; i < 4; i++) fx('fx-plus', t.x + (i - 1.5) * 12 * t.s, t.y + 10, { life: 900, style: `animation-delay:${(i * 80) / battle.speed}ms` });
    }
    VFX_PLAY.slash(a, targets);
  },
  whirl(a, targets) {
    for (const t of targets) fx('fx-whirl', t.x, t.y, { life: 800, style: `--sz:${100 * t.s}px` });
  },
};

const FX_LABEL = { stun: 'Choáng', poison: 'Thiêu đốt', defDown: 'Giảm phòng', atkDown: 'Giảm công', khiDrain: 'Mất sĩ khí', buffAtk: 'Tăng công' };

function applyHits(ev, animate) {
  for (const hit of ev.hits) {
    setTroops(hit.d, hit.left);
    if (animate) {
      floatAt(hit.d, `-${fmt(hit.kills)}`, hit.crit ? 'crit' : '');
      const t = unitEl(hit.d);
      if (t) {
        t.classList.remove('hit');
        void t.offsetWidth;
        t.classList.add('hit');
      }
    }
  }
  for (const f of ev.fx) {
    if (f.type === 'heal') {
      setTroops(f.u, f.left);
      if (animate) floatAt(f.u, `+${fmt(f.amount)}`, 'heal');
      continue;
    }
    if (f.type === 'stun') unitEl(f.u)?.classList.add('stunned');
    if (animate) floatAt(f.u, FX_LABEL[f.type] || f.type, 'fx');
  }
  for (const [uid, v] of Object.entries(ev.khi || {})) setKhi(uid, v);
}

function applyEvent(ev, animate) {
  const name = (uid) => esc(battle.units[uid]?.name || '?');
  if (ev.t === 'round') {
    const r = $('#b-round');
    if (r) r.textContent = `Hiệp ${ev.n}`;
    if (animate) logLine(`<span class="muted">— Hiệp ${ev.n} —</span>`);
    return;
  }
  if (ev.t === 'poison') {
    setTroops(ev.u, ev.left);
    if (animate) {
      const p = fieldPx(ev.u);
      if (p) fx('fx-flame', p.x, p.y + 10, { life: 700, style: `--sz:${30 * p.s}px` });
      floatAt(ev.u, `-${fmt(ev.kills)}`, 'poison');
      logLine(`${name(ev.u)} bị thiêu đốt -${fmt(ev.kills)}`);
    }
    return;
  }
  if (ev.t === 'stun') {
    unitEl(ev.u)?.classList.remove('stunned');
    if (animate) {
      floatAt(ev.u, 'Choáng', 'fx');
      logLine(`${name(ev.u)} bị choáng, mất lượt`);
    }
    return;
  }
  if (ev.t !== 'act') return;

  const logIt = () => {
    const hits = ev.hits.map((h) => `${name(h.d)} -${fmt(h.kills)}${h.crit ? ' (bạo kích)' : ''}`).join(', ');
    logLine(`${name(ev.a)} ${ev.kind === 'skill' ? `dùng <b style="color:var(--red-dk)">${esc(ev.skill)}</b>` : 'tấn công'}${hits ? `: ${hits}` : ''}`);
  };
  if (!animate) {
    applyHits(ev, false);
    return;
  }

  const actor = battle.units[ev.a];
  if (ev.kind !== 'skill') {
    const first = ev.hits[0]?.d;
    if (first) {
      if (actor?.ranged) shoot(ev.a, first, actor.type === 'muu' ? 'orb' : 'arrow');
      else lunge(ev.a, first);
    }
    later(() => applyHits(ev, true), actor?.ranged ? 280 : 160);
    logIt();
    return;
  }

  // Chiến pháp: tụ khí → tên chiêu → hoạt cảnh → trúng đòn
  const f = fieldEl();
  const el = unitEl(ev.a);
  const a = fieldPx(ev.a);
  f?.classList.add('casting');
  el?.classList.add('caster');
  setKhi(ev.a, Math.max(0, (actor?.khi ?? 100) - 100));
  if (a) fx('fx-charge', a.x, a.y + 26 * a.s, { life: 700, style: `--sz:${110 * a.s}px` });
  showBanner(ev.skill, actor?.side === 'A' ? 'skill' : 'skill enemy', actor?.name);
  logIt();
  later(() => {
    const kind = skillVfx(ev.skillId);
    const targets = ev.hits.map((h) => fieldPx(h.d)).filter(Boolean);
    const allyIds = ev.fx.filter((x) => x.type === 'heal' || x.type === 'buffAtk').map((x) => x.u);
    const allies = [...new Set(allyIds)].map((u) => fieldPx(u)).filter(Boolean);
    if (a) {
      if (!actor.ranged && ev.hits[0] && !['roar', 'command', 'heal', 'formation', 'thunder'].includes(kind)) lunge(ev.a, ev.hits[0].d, 0.45);
      (VFX_PLAY[kind] ?? VFX_PLAY.slash)(a, targets, allies);
    }
  }, 450);
  later(() => applyHits(ev, true), 760);
  later(() => {
    f?.classList.remove('casting');
    el?.classList.remove('caster');
  }, 1050);
}

function stepBattle() {
  clearTimeout(battle.timer);
  const log = battle.data.result.log;
  if (battle.idx >= log.length) return finishBattle();
  const ev = log[battle.idx++];
  if (ev.t === 'end') return finishBattle();
  applyEvent(ev, true);
  const delay = ev.t === 'round' ? 220 : ev.t === 'act' && ev.kind === 'skill' ? 1450 : ev.t === 'act' ? 560 : 420;
  battle.timer = setTimeout(stepBattle, delay / battle.speed);
}

function finishBattle() {
  clearTimeout(battle.timer);
  if (battle.finished) return;
  battle.finished = true;
  clearPending();
  const log = battle.data.result.log;
  // Sự kiện đang phát dở: áp lại cho chắc (các giá trị là tuyệt đối nên áp lại không sai)
  if (battle.idx > 0) applyEvent(log[battle.idx - 1], false);
  while (battle.idx < log.length) applyEvent(log[battle.idx++], false);
  fieldEl()?.classList.remove('casting');
  document.querySelectorAll('.unit.caster, .unit.stunned').forEach((u) => u.classList.remove('caster', 'stunned'));
  const r = battle.data;
  const win = r.result.win;
  showBanner(win ? 'Đại thắng!' : 'Thất bại', win ? 'win' : 'lose');
  $('#b-result').innerHTML = `<div class="panel ${win ? 'hi' : ''}" style="display:flex;flex-direction:column;gap:6px">
    <div class="row"><b style="font-size:16px;color:${win ? 'var(--gold-dk)' : 'var(--red)'}">${win ? 'Thắng' : 'Thua'}</b>${win ? `<span class="stars">${[1, 2, 3].map((n) => (n <= r.stars ? '★' : '<span class="off">★</span>')).join('')}</span>` : ''}<span class="spacer"></span><span class="muted">${r.result.rounds} hiệp · tổn thất ${Math.round(r.result.lossRatio * 100)}% quân</span></div>
    ${win ? `<div class="row wrap">${rewardHtml(r.rewards)}</div>` : `<p class="muted">Gợi ý: nâng cấp võ tướng, nghiên cứu bậc binh chủng, đổi hệ để khắc chế địch (${[...new Set(r.enemies.map((e) => TROOP_TYPES[e.type].name))].join(', ')}).</p>`}
    ${r.levels ? `<p style="color:var(--green-dk)">Chúa Công lên cấp ${S.player.level}!</p>` : ''}
  </div>`;
  $('#b-ctrl').innerHTML = `<span class="spacer"></span>${win && G.nextStage(S) && G.isStageUnlocked(S, G.nextStage(S)) ? `<button class="btn small ghost" data-act="bNext">Ải tiếp theo</button>` : ''}<button class="btn gold" data-act="bClose">Đóng</button>`;
}

function closeBattle() {
  clearTimeout(battle.timer);
  clearPending();
  battle.data = null;
  const el = $('#battle');
  el.hidden = true;
  el.innerHTML = '';
  renderAll();
}

function startFight(id) {
  const r = G.fightStage(S, id);
  save();
  if (!r.ok) {
    toast(r.reason, true);
    renderAll();
    return;
  }
  renderTop();
  openBattle(r);
}

// ---------- Công cụ test (cheat) ----------
// Chỉ có khi build bật công cụ test (npm run dev, npm run build). npm run build:release tắt hẳn.
function cheatSheet() {
  const cap = G.storageCap(S);
  const unowned = Object.entries(HEROES).filter(([tid]) => !S.heroes.some((h) => h.tid === tid)).sort((a, b) => b[1].q - a[1].q);
  const btn = (op, label, extra = '', cls = 'small') => `<button class="btn ${cls}" data-act="cheat" data-op="${op}" ${extra}>${label}</button>`;
  const res = ['luong', 'go', 'sat', 'bac'];
  return `
    <div class="row"><h3 style="font-size:20px">Công cụ test</h3><span class="chip" style="background:#ffe3dc">chỉ bản thử nghiệm</span><span class="spacer"></span><button class="btn small ghost" data-act="closeSheet">✕</button></div>
    <p class="muted">Save này đã dùng cheat ${S.stats.cheats || 0} lần. Bản phát hành không có bảng này.</p>

    <div class="panel cheat">
      <b>Tài nguyên</b>
      <div class="row wrap">${btn('fill', `Đầy kho (${fmt(cap)})`, '', 'small gold')}${btn('add', '+10K mỗi loại', 'data-n="10000"')}${btn('add', '+100K mỗi loại', 'data-n="100000"')}</div>
      <div class="row wrap">${res.map((k) => btn('addOne', `${img(icon(k))} +50K`, `data-k="${k}" data-n="50000"`, 'small ghost')).join('')}</div>
      <div class="row wrap">${btn('addOne', `${img(icon('nguyenbao'))} +1000`, 'data-k="nguyenbao" data-n="1000"', 'small ghost')}${btn('items', 'Mỗi vật phẩm +20', 'data-n="20"', 'small ghost')}${btn('stamina', `${img(icon('stamina'))} Đầy thể lực`, '', 'small ghost')}</div>
    </div>

    <div class="panel cheat">
      <b>Thời gian</b>
      <div class="row wrap">${btn('ff', 'Tua 10 phút', 'data-n="0.1667"')}${btn('ff', 'Tua 1 giờ', 'data-n="1"')}${btn('ff', 'Tua 8 giờ', 'data-n="8"')}${btn('finish', 'Xây xong ngay', S.queue ? '' : 'disabled', 'small gold')}${btn('tavern', 'Làm mới tửu quán', '', 'small ghost')}</div>
      <p class="muted">Tua giờ như thể đã offline: tài nguyên sinh thêm (tối đa ${BAL.offlineCapHours} giờ), công trình xây xong, thể lực hồi.</p>
    </div>

    <div class="panel cheat">
      <b>Chúa Công và công trình</b>
      <div class="row wrap"><label for="cheatLv">Cấp Chúa Công</label><input id="cheatLv" type="number" min="1" max="${BAL.playerMaxLevel}" value="${S.player.level}">${btn('level', 'Đặt')}</div>
      <div class="row wrap"><label for="cheatBld">Mọi công trình lên cấp</label><input id="cheatBld" type="number" min="0" max="${BAL.playerMaxLevel}" value="${S.buildings.chinhDien}">${btn('buildings', 'Đặt')}</div>
      <p class="muted">Công trình không vượt cấp Chúa Công; công trình chưa mở theo cấp thì giữ nguyên.</p>
    </div>

    <div class="panel cheat">
      <b>Võ tướng và binh chủng</b>
      <div class="row wrap">${btn('maxHeroes', 'Mọi tướng lên cấp tối đa + đầy quân')}${btn('troops', 'Đầy quân', '', 'small ghost')}${btn('tiers', `Binh chủng bậc ${C.tiers.length}`, '', 'small ghost')}${btn('skills', 'Chiến pháp tối đa (theo cấp tướng)', '', 'small ghost')}</div>
      <div class="row wrap"><label for="cheatHero">Thêm tướng</label>
        <select id="cheatHero">${unowned.map(([tid, h]) => `<option value="${tid}">${esc(h.name)} · ${QUALITIES[h.q].name}</option>`).join('')}</select>
        ${btn('hero', 'Thêm', unowned.length ? '' : 'disabled')}</div>
    </div>

    <div class="panel cheat">
      <b>Phó bản</b>
      <div class="row wrap"><label for="cheatCh">Mở tới chương</label>
        <select id="cheatCh">${CHAPTERS.map((c) => `<option value="${c.id}">${c.id}. ${esc(c.name)}</option>`).join('')}</select>
        ${btn('chapter', 'Mở')}</div>
      <p class="muted">Mọi ải trước chương đó đạt 3 sao (càn quét được); cấp Chúa Công nâng lên mức chương yêu cầu nếu đang thấp hơn.</p>
    </div>`;
}

function runCheat(d) {
  const val = (id) => document.getElementById(id)?.value;
  const t = now();
  switch (d.op) {
    case 'fill': return G.cheatFillStorage(S);
    case 'add': return G.cheatAdd(S, Object.fromEntries(['luong', 'go', 'sat', 'bac'].map((k) => [k, Number(d.n)])));
    case 'addOne': return G.cheatAdd(S, { [d.k]: Number(d.n) });
    case 'items': return G.cheatAddItems(S, Number(d.n));
    case 'stamina': return G.cheatFullStamina(S, t);
    case 'ff': return G.cheatFastForward(S, t, Number(d.n));
    case 'finish': return G.cheatFinishBuild(S);
    case 'tavern': return G.cheatResetTavern(S, t);
    case 'level': return G.cheatSetPlayerLevel(S, Number(val('cheatLv')));
    case 'buildings': return G.cheatSetBuildings(S, Number(val('cheatBld')));
    case 'maxHeroes': return G.cheatMaxHeroes(S);
    case 'troops': return G.cheatFullTroops(S);
    case 'tiers': return G.cheatMaxTiers(S);
    case 'skills': S.heroes.forEach((h) => G.cheatMaxSkill(S, h.uid)); return { ok: true, msg: 'Chiến pháp lên mức tối đa theo cấp tướng' };
    case 'hero': return G.cheatAddHero(S, val('cheatHero'));
    case 'chapter': return G.cheatUnlockChapter(S, Number(val('cheatCh')));
    default: return { ok: false, reason: 'Lệnh không rõ' };
  }
}

// ---------- hành động ----------
const ACTIONS = {
  tab: (d) => { ui.tab = d.id; ui.pickSlot = null; ui.confirm = null; renderAll(); window.scrollTo(0, 0); },
  upgrade: (d) => act(() => G.startUpgrade(S, d.id, now())),
  speedUp: () => act(() => G.speedUp(S, now())),
  cheatOpen: () => { if (DEV_TOOLS) { ui.sheet = { type: 'cheat' }; renderAll(); } },
  cheat: (d) => { if (DEV_TOOLS) act(() => runCheat(d)); },
  bldTap: (d) => { ui.sheet = { type: 'building', id: d.id, tab: d.tab }; ui.confirm = null; renderAll(); },
  bldTab: (d) => { ui.sheet = { ...ui.sheet, tab: d.id }; ui.pickSlot = null; renderSheet(); },
  useFormation: (d) => { ui.pickSlot = null; act(() => G.setFormation(S, d.id)); },
  upFormation: (d) => act(() => G.upgradeFormation(S, d.id)),
  shopTab: (d) => { ui.shopTab = d.id; ui.confirm = null; renderAll(); },
  buyItem: (d) => act(() => G.buyShopItem(S, d.id, Number(d.n), now())),
  buyPack: (d) => act(() => G.buyPack(S, d.id, now())),
  buyReal: (d) => {
    if (!DEV_TOOLS) { toast('Thanh toán sẽ mở ở bản phát hành chính thức', true); return; }
    const key = `buy-${d.id}`;
    if (ui.confirm !== key) { ui.confirm = key; renderAll(); return; }
    ui.confirm = null;
    act(() => G.grantPurchase(S, d.id, now(), { test: true }));
  },
  goto: (d) => { ui.sheet = null; ui.tab = d.id; if (d.sub) ui.heroTab = d.sub; renderAll(); window.scrollTo(0, 0); },
  heroTab: (d) => { ui.heroTab = d.id; ui.pickSlot = null; renderAll(); },
  slotTap: (d) => { const s = Number(d.slot); ui.pickSlot = ui.pickSlot === s ? null : s; renderAll(); },
  cancelPick: () => { ui.pickSlot = null; renderAll(); },
  clearSlot: () => { const s = ui.pickSlot; ui.pickSlot = null; act(() => G.setTeamSlot(S, s, null)); },
  heroTap: (d) => {
    const uid = Number(d.uid);
    if (ui.pickSlot !== null) {
      const s = ui.pickSlot;
      ui.pickSlot = null;
      act(() => G.setTeamSlot(S, s, uid));
    } else {
      ui.sheet = { type: 'hero', uid };
      ui.confirm = null;
      renderSheet();
    }
  },
  closeSheet: () => { ui.sheet = null; ui.confirm = null; renderAll(); },
  backToHero: (d) => { ui.sheet = { type: 'hero', uid: Number(d.uid) }; renderSheet(); },
  useExp: (d) => act(() => G.useExpItem(S, Number(d.uid), d.id, Number(d.n))),
  troopType: (d) => act(() => G.setTroopType(S, Number(d.uid), d.id)),
  rerollVariant: (d) => act(() => G.rerollVariants(S, Number(d.uid))),
  refillOne: (d) => act(() => { const n = G.refillHero(S, G.findHero(S, Number(d.uid))); return n ? { ok: true, msg: `Bổ sung ${n} binh lính` } : { ok: false, reason: 'Không đủ lương thực hoặc bạc' }; }),
  refillTeam: () => act(() => { const n = G.refillTeam(S); return n ? { ok: true, msg: `Bổ sung ${n} binh lính` } : { ok: false, reason: 'Không đủ lương thực hoặc bạc' }; }),
  toggleRefill: () => { S.settings.autoRefill = !S.settings.autoRefill; save(); renderAll(); },
  skillUp: (d) => act(() => G.upgradeSkill(S, Number(d.uid))),
  equipPick: (d) => { ui.sheet = { type: 'equipPick', uid: Number(d.uid), slot: d.slot }; renderSheet(); },
  equip: (d) => { act(() => G.equip(S, Number(d.uid), Number(d.id))); ui.sheet = { type: 'hero', uid: Number(d.uid) }; renderSheet(); },
  unequip: (d) => { act(() => G.unequip(S, Number(d.uid), d.slot)); ui.sheet = { type: 'hero', uid: Number(d.uid) }; renderSheet(); },
  release: (d) => {
    const key = `release-${d.uid}`;
    if (ui.confirm !== key) { ui.confirm = key; renderSheet(); return; }
    ui.confirm = null;
    ui.sheet = null;
    act(() => G.releaseHero(S, Number(d.uid)));
  },
  recruit: (d) => act(() => G.recruit(S, d.id)),
  tavernRefresh: (d) => act(() => G.refreshTavern(S, now(), d.id)),
  research: (d) => act(() => G.researchTier(S, d.id)),
  openCh: (d) => { const id = Number(d.id); const cur = ui.openCh ?? (G.nextStage(S) ? G.parseStage(G.nextStage(S)).ch : null); ui.openCh = cur === id ? -1 : id; renderAll(); },
  fight: (d) => startFight(d.id),
  sweep: (d) => act(() => {
    const r = G.sweepStage(S, d.id, Number(d.n));
    if (r.ok) r.msg = `Càn quét ${r.done} lần: +${fmt(r.total.exp)} KN, +${fmt(r.total.luong)} lương, +${fmt(r.total.bac)} bạc${r.total.tieuHoanDan ? `, +${r.total.tieuHoanDan} Binh Thư Nhỏ` : ''}${r.levels ? `. Lên cấp ${S.player.level}!` : ''}`;
    return r;
  }),
  forgeSlot: (d) => { ui.forgeSlot = d.id; renderAll(); },
  forgeTier: (d) => { ui.forgeTier = Number(d.id); renderAll(); },
  forge: () => act(() => G.forge(S, ui.forgeSlot, ui.forgeTier)),
  enhance: (d) => act(() => { const r = G.enhance(S, Number(d.id)); if (r.ok) r.msg = `Cường hóa thành công: ${r.msg}`; return r; }),
  sell: (d) => act(() => G.sell(S, Number(d.id))),
  claim: (d) => act(() => G.claimQuest(S, d.id)),
  bSpeed: (d, el) => { battle.speed = battle.speed === 1 ? 2 : battle.speed === 2 ? 4 : 1; el.textContent = `Tốc độ ×${battle.speed}`; },
  bSkip: () => finishBattle(),
  bClose: () => closeBattle(),
  bNext: () => { const id = G.nextStage(S); closeBattle(); if (id) startFight(id); },
  exportSave: () => {
    const text = btoa(unescape(encodeURIComponent(G.serialize(S))));
    const box = $('#saveBox');
    box.value = text;
    box.select();
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast('Đã chép mã lưu'), () => toast('Mã lưu đã hiện trong ô, hãy chép tay'));
    else toast('Mã lưu đã hiện trong ô, hãy chép tay');
  },
  importSave: () => {
    const text = $('#saveBox').value.trim();
    if (!text) return toast('Dán mã lưu vào ô trước', true);
    try {
      S = G.deserialize(decodeURIComponent(escape(atob(text))), now());
      G.tick(S, now());
      save();
      toast('Đã nạp tiến trình');
      renderAll();
    } catch {
      toast('Mã lưu không đúng. Kiểm tra lại đã chép đủ chưa.', true);
    }
  },
  reset: () => {
    if (ui.confirm !== 'reset') { ui.confirm = 'reset'; renderAll(); return; }
    ui.confirm = null;
    storage.clear();
    S = G.newGame(now());
    save();
    ui.tab = 'city';
    toast('Bắt đầu lại từ đầu');
    renderAll();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el) {
    const fn = ACTIONS[el.dataset.act];
    if (fn) {
      if (el.tagName !== 'INPUT') e.preventDefault();
      fn(el.dataset, el);
    }
    return;
  }
  if (e.target.id === 'sheet') {
    ui.sheet = null;
    ui.confirm = null;
    renderAll();
  }
});

// ---------- vòng lặp ----------
let lastSave = 0;
function loop() {
  const done = G.tick(S, now());
  if (done.length) {
    for (const q of done) toast(`${BUILDINGS[q.id].name} đạt cấp ${q.toLevel}`);
    save();
    if (!battle.data) renderAll();
  } else {
    renderTop();
    updateTimers();
  }
  if (now() - lastSave > 10000) {
    save();
    lastSave = now();
  }
}

function start(data = {}) {
  S = null;
  if (data.save) {
    try { S = G.deserialize(data.save, now()); } catch { S = null; }
  }
  S = S || storage.load(now()) || G.newGame(now());
  G.tick(S, now());
  if (G.tavernOpen(S) && !S.tavern.candidates.length && now() >= S.tavern.nextFree) G.refreshTavern(S, now(), 'free');
  save();
  renderAll();
  setInterval(loop, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
    else loop();
  });
  window.claude?.hot?.snapshot?.(() => ({ save: G.serialize(S) }));
}

const hot = window.claude?.hot;
if (hot?.ready) hot.ready(start);
else start(hot?.data ?? {});
