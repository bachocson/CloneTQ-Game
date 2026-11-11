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
  xuongGo: [0.667, 0.675], ruong: [0.333, 0.675], tienTrang: [0.5, 0.78], moSat: [0.89, 0.86],
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

function buildingSheet(id) {
  const b = BUILDINGS[id];
  const lv = S.buildings[id] || 0;
  const q = S.queue;
  const to = lv + 1;
  const chk = G.upgradeCheck(S, id);
  const locked = S.player.level < b.unlockLevel;
  let action;
  if (q && q.id === id) {
    const total = (q.endsAt - q.startedAt) / 1000;
    const left = (q.endsAt - now()) / 1000;
    const cost = G.speedUpCost(S, now());
    action = `<div class="panel hi" style="display:flex;flex-direction:column;gap:6px">
      <div class="row"><b>Đang lên cấp ${q.toLevel}</b><span class="spacer"></span><span class="num" data-timer="${q.endsAt}">${fmtTime(left)}</span></div>
      <div data-progress="${q.startedAt}|${q.endsAt}">${bar(total - left, total, 'green')}</div>
      <button class="btn gold" data-act="speedUp">${cost ? `Xong ngay · ${cost} ${img(icon('nguyenbao'))}` : 'Xong ngay (miễn phí)'}</button></div>`;
  } else if (locked) {
    action = `<div class="panel"><p>Mở khi Chúa Công đạt cấp ${b.unlockLevel}.</p></div>`;
  } else {
    action = `<div class="panel" style="display:flex;flex-direction:column;gap:8px">
      <div class="row"><b>Lên cấp ${to}</b><span class="spacer"></span><span class="muted num">Thời gian ${fmtTime(G.buildingTime(id, to))}</span></div>
      <p class="muted">${esc(buildingEffect(id, lv))} → <b style="color:var(--green-dk)">${esc(buildingEffect(id, to))}</b></p>
      ${costHtml(G.buildingCost(id, to))}
      ${chk.ok ? '' : `<p style="color:var(--red-dk)">${esc(chk.reason)}</p>`}
      <button class="btn" data-act="upgrade" data-id="${id}" ${chk.ok ? '' : 'disabled'}>${lv ? 'Nâng cấp' : 'Xây dựng'}</button></div>`;
  }
  const extra = id === 'tuuLau' && lv ? '<button class="btn blue" data-act="goto" data-id="heroes" data-sub="tavern">Vào Tửu Quán</button>'
    : id === 'luyenVo' && lv ? '<button class="btn blue" data-act="goto" data-id="heroes" data-sub="train">Luyện binh</button>'
    : id === 'loRen' && lv ? '<button class="btn blue" data-act="goto" data-id="forge">Vào Lò Rèn</button>' : '';
  return `
    <div class="sheet-head">
      <div class="art" style="background:linear-gradient(#bfe7ff,#8fd15a)">${img(buildingSprite(id, b.roof, lv))}</div>
      <div style="flex:1;min-width:0">
        <div class="row"><h3 style="font-size:20px">${esc(b.name)}</h3><span class="spacer"></span><button class="btn small ghost" data-act="closeSheet">✕</button></div>
        <span class="chip num">Cấp ${lv}</span>
        <p class="muted" style="margin-top:4px">${esc(b.desc)}</p>
      </div>
    </div>
    <p>${esc(buildingEffect(id, lv))}</p>
    ${action}${extra}`;
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
  const seg = `<div class="seg">
    <button class="${ui.heroTab === 'team' ? 'on' : ''}" data-act="heroTab" data-id="team">Đội hình</button>
    <button class="${ui.heroTab === 'tavern' ? 'on' : ''}" data-act="heroTab" data-id="tavern">Tửu Quán</button>
    <button class="${ui.heroTab === 'train' ? 'on' : ''}" data-act="heroTab" data-id="train">Luyện binh</button>
  </div>`;
  if (ui.heroTab === 'tavern') return `<h2 class="disp">Võ tướng</h2>${seg}${viewTavern()}`;
  if (ui.heroTab === 'train') return `<h2 class="disp">Võ tướng</h2>${seg}${viewTrain()}`;

  const used = S.team.filter(Boolean).length;
  const counts = G.factionCounts(S);
  const factionLine = Object.entries(counts)
    .map(([f, n]) => {
      const b = G.factionBonusFor(n);
      return `<span class="chip" style="color:${FACTIONS[f].color}">${FACTIONS[f].name} ×${n}${b ? ` · +${Math.round(b * 100)}% công` : ''}</span>`;
    })
    .join(' ');
  const rc = teamRefillCost();
  const roster = [...S.heroes].sort((a, b) => G.heroPower(S, b) - G.heroPower(S, a)).map(heroCard).join('');
  return `<h2 class="disp">Võ tướng</h2>${seg}
    <div class="panel" style="display:flex;flex-direction:column;gap:8px">
      <div class="row"><b>Đội hình</b><span class="spacer"></span><span class="muted num">${used}/${G.deployLimit(S)} người</span></div>
      <span class="row-label">Hàng trước · đỡ đòn cận chiến</span>
      <div class="formation">${[0, 1, 2].map(slotHtml).join('')}</div>
      <span class="row-label">Hàng sau · hợp với Cung binh, Mưu sĩ</span>
      <div class="formation">${[3, 4, 5].map(slotHtml).join('')}</div>
      ${ui.pickSlot !== null ? `<div class="row"><span class="muted">Chọn võ tướng bên dưới để đặt vào ô đã chọn.</span><span class="spacer"></span><button class="btn small ghost" data-act="clearSlot">Bỏ trống ô</button><button class="btn small ghost" data-act="cancelPick">Hủy</button></div>` : '<p class="muted">Chạm một ô để đổi người. Đủ 3 người cùng phe được cộng công.</p>'}
      ${factionLine ? `<div class="row wrap">${factionLine}</div>` : ''}
      <div class="row wrap"><label class="toggle"><input type="checkbox" id="autoRefill" data-act="toggleRefill" ${S.settings.autoRefill ? 'checked' : ''}> Tự bổ sung quân trước trận</label>
        <span class="spacer"></span><button class="btn small " data-act="refillTeam" ${rc.luong ? '' : 'disabled'}>Bổ sung quân</button></div>
      ${rc.luong ? costHtml(rc) : ''}
    </div>
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
            <span class="muted">${FACTIONS[t.faction].name} · sở trường ${TROOP_TYPES[t.school].name} · ${esc(SKILLS[t.skill].name)}</span>
            <span class="muted num">Thống Soái ${t.base[0]} (+${t.growth[0]}) · Võ ${t.base[1]} (+${t.growth[1]}) · Ngộ ${t.base[2]} (+${t.growth[2]})</span>
            <p style="font-size:12px">${esc(t.bio)}</p>
            <div class="row">${costHtml({ bac: cost })}<span class="spacer"></span><button class="btn small" data-act="recruit" data-id="${tid}" ${S.res.bac >= cost ? '' : 'disabled'}>Chiêu mộ</button></div>
          </div>
        </div>`;
      }).join('')
    : `<div class="panel"><p class="muted">Tửu lâu đang vắng khách. Làm mới để mời khách mới.</p></div>`;
  return `<div class="panel" style="display:flex;flex-direction:column;gap:8px">
      <div class="row"><b>Tửu Quán cấp ${S.buildings.tuuLau}</b><span class="spacer"></span><span class="muted num">Võ tướng ${S.heroes.length}/${G.rosterLimit(S)}</span></div>
      <p class="muted">Tửu lâu cấp càng cao càng dễ gặp Tông Sư và Võ Thánh.</p>
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
        <div class="row wrap"><span class="chip" style="background:${QUALITIES[t.q].color}">${QUALITIES[t.q].name}</span><span class="chip" style="background:${FACTIONS[t.faction].color};color:#fff">${FACTIONS[t.faction].name}</span><span class="chip">${TROOP_TYPES[t.school].name}</span></div>
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
      ${bar(h.troops, max, 'blood')}
      <div class="seg" style="margin-top:6px">${TROOP_ORDER.map((ty) => `<button class="${h.troopType === ty ? 'on' : ''}" data-act="troopType" data-uid="${uid}" data-id="${ty}">${TROOP_TYPES[ty].name}${ty === t.school ? '★' : ''}</button>`).join('')}</div>
      <p class="muted" style="margin-top:4px">${esc(TROOP_TYPES[h.troopType].tiers[S.troopTiers[h.troopType] - 1])} (bậc ${S.troopTiers[h.troopType]}). Đổi hệ sẽ giải tán binh lính hiện có. ★ là sở trường: +${Math.round(BAL.combat.schoolBonus * 100)}% công.</p>
      <div class="row" style="margin-top:6px">${h.troops < max ? costHtml(G.refillCost(S, h, max - h.troops)) : '<span class="muted">Đủ quân</span>'}<span class="spacer"></span><button class="btn small " data-act="refillOne" data-uid="${uid}" ${h.troops < max ? '' : 'disabled'}>Bổ sung</button></div>
    </div>
    <div class="panel">
      <div class="row"><b>${esc(sk.name)}</b><span class="chip num">Cấp ${h.skillLv}/${skMax}</span></div>
      <p class="muted">${esc(sk.desc)} Kích hoạt khi khí đạt 100. Mỗi cấp +8% sức mạnh.</p>
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
      <p class="muted">Mỗi trận thắng tốn ${BAL.stamina.perWin} thể lực, thua tốn ${BAL.stamina.perLoss}. Đạt 3 sao để càn quét (tốn thể lực và lương, không mất quân).</p>
      <label class="toggle"><input type="checkbox" id="autoRefill2" data-act="toggleRefill" ${S.settings.autoRefill ? 'checked' : ''}> Tự bổ sung quân trước trận</label>
    </div>${chapters}`;
}

// ---------- Lò rèn ----------
function viewForge() {
  const maxT = G.maxForgeTier(S);
  if (!maxT) return `<h2 class="disp">Lò rèn</h2><div class="panel"><p>Xây <b>Lò Rèn</b> ở Thành trì (cần cấp Chúa Công ${BUILDINGS.loRen.unlockLevel}) để rèn trang bị.</p></div>`;
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
  return `<h2 class="disp">Lò rèn</h2>
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
      <div class="row wrap"><button class="btn small ghost" data-act="exportSave">Chép mã lưu</button><button class="btn small ghost" data-act="importSave">Nạp mã lưu đã dán</button></div>
      <textarea id="saveBox" placeholder="Dán mã lưu vào đây rồi bấm Nạp"></textarea>
      <div class="row"><span class="muted">Đã đánh ${S.stats.battles} trận, thắng ${S.stats.wins}.</span><span class="spacer"></span><button class="btn small red" data-act="reset">${confirmReset ? 'Chạm lần nữa để chơi lại từ đầu' : 'Chơi lại từ đầu'}</button></div>
    </div>`;
}

// ---------- thanh dưới ----------
function renderNav() {
  const claim = G.claimableCount(S);
  const tabs = [
    ['city', 'Thành trì', buildingSprite('chinhDien', BUILDINGS.chinhDien.roof, 3), S.queue ? '' : BUILDING_ORDER.some((id) => G.upgradeCheck(S, id).ok) ? '!' : ''],
    ['heroes', 'Võ tướng', heroImg('quanVu', 'ky'), G.tavernOpen(S) && now() >= S.tavern.nextFree ? '!' : ''],
    ['campaign', 'Chinh chiến', heroImg('luBo', 'ky'), S.stamina.cur >= BAL.stamina.max ? '!' : ''],
    ['forge', 'Lò rèn', buildingSprite('loRen', BUILDINGS.loRen.roof, 1), ''],
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
    : ui.sheet.type === 'building' ? buildingSheet(ui.sheet.id)
    : equipPickSheet(ui.sheet.uid, ui.sheet.slot);
  const prevScroll = wrap.querySelector('.sheet')?.scrollTop || 0;
  wrap.hidden = false;
  wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${inner}</div>`;
  wrap.querySelector('.sheet').scrollTop = prevScroll;
}

function renderAll() {
  renderTop();
  const views = { city: viewCity, heroes: viewHeroes, campaign: viewCampaign, forge: viewForge, quests: viewQuests };
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
const battle = { timer: null, speed: 1, data: null, idx: 0, units: {}, finished: false };

function unitLook(u) {
  if (u.look.kind === 'hero') return heroImg(u.look.tid, u.look.type);
  const ch = CHAPTERS.find((c) => c.id === u.look.chapter);
  return heroSprite(ch.palette, u.look.type, { boss: u.look.boss, faction: ch.palette[0] });
}

// Vị trí trên chiến trường (tỉ lệ khung): hàng xa nhỏ hơn và hẹp hơn để tạo chiều sâu
const ROWS = {
  B_back: { y: 0.27, k: 0.6, s: 0.74 },
  B_front: { y: 0.46, k: 0.74, s: 0.86 },
  A_front: { y: 0.7, k: 0.88, s: 0.98 },
  A_back: { y: 0.93, k: 1.0, s: 1.1 },
};
function unitPos(side, slot) {
  const row = ROWS[`${side}_${slot < 3 ? 'front' : 'back'}`];
  const lane = [0.2, 0.5, 0.8][slot % 3];
  return { x: 0.5 + (lane - 0.5) * row.k, y: row.y, s: row.s };
}

function openBattle(r) {
  battle.data = r;
  battle.idx = 0;
  battle.finished = false;
  battle.units = {};
  const unitHtml = (u, side) => {
    const uid = `${side}${u.slot}`;
    const p = unitPos(side, u.slot);
    battle.units[uid] = { name: u.name, troops: u.troops, max: u.maxTroops, ranged: TROOP_TYPES[u.type].range === 'ranged', type: u.type, ...p };
    return `<div class="unit ${side === 'B' ? 'enemy' : ''}" id="u-${uid}" style="left:${p.x * 100}%;top:${p.y * 100}%;width:${21 * p.s}%;z-index:${Math.round(p.y * 100)}">
      ${img(unitLook(u))}<span class="uname disp">${esc(u.name)}</span>${bar(u.troops, u.maxTroops, side === 'A' ? 'green' : 'red')}<span class="cnt num disp" data-cnt>${fmt(u.troops)}</span></div>`;
  };
  const el = $('#battle');
  el.hidden = false;
  el.innerHTML = `<div class="battle-inner">
    <div class="row"><span class="disp" style="font-size:18px">Ải ${r.stageId}</span><span class="spacer"></span><span class="round-tag disp" id="b-round">Hiệp 1</span></div>
    <div class="field" id="b-field"><div class="ground"></div>${r.enemies.map((u) => unitHtml(u, 'B')).join('')}${r.team.map((u) => unitHtml(u, 'A')).join('')}</div>
    <div id="b-result"></div>
    <div class="blog" id="b-log"></div>
    <div class="row" id="b-ctrl"><button class="btn small ghost" data-act="bSpeed">Tốc độ ×${battle.speed}</button><span class="spacer"></span><button class="btn small gold" data-act="bSkip">Bỏ qua</button></div>
  </div>`;
  stepBattle();
}

function fieldPx(uid) {
  const f = document.getElementById('b-field');
  const u = battle.units[uid];
  if (!f || !u) return null;
  return { x: u.x * f.clientWidth, y: u.y * f.clientHeight - 0.09 * f.clientWidth * u.s };
}
function lunge(fromUid, toUid) {
  const a = fieldPx(fromUid);
  const b = fieldPx(toUid);
  const el = document.getElementById(`u-${fromUid}`);
  if (!a || !b || !el || !el.animate) return;
  const dx = (b.x - a.x) * 0.35;
  const dy = (b.y - a.y) * 0.35;
  el.animate([{ translate: '0 0' }, { translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: 300 / battle.speed, easing: 'ease-out' });
}
function shoot(fromUid, toUid, orb) {
  const a = fieldPx(fromUid);
  const b = fieldPx(toUid);
  const f = document.getElementById('b-field');
  if (!a || !b || !f) return;
  const s = document.createElement('span');
  s.className = `shot${orb ? ' orb' : ''}`;
  s.style.left = `${a.x}px`;
  s.style.top = `${a.y}px`;
  f.appendChild(s);
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const anim = s.animate?.([
    { transform: `translate(-50%,-50%) rotate(${ang}deg)` },
    { transform: `translate(calc(${b.x - a.x}px - 50%), calc(${b.y - a.y}px - 50%)) rotate(${ang}deg)` },
  ], { duration: 280 / battle.speed, easing: 'ease-in' });
  if (anim) anim.onfinish = () => s.remove();
  else s.remove();
}

function floatAt(uid, text, cls = '') {
  const u = document.getElementById(`u-${uid}`);
  if (!u) return;
  const f = document.createElement('span');
  f.className = `float ${cls}`;
  f.textContent = text;
  u.appendChild(f);
  setTimeout(() => f.remove(), 900);
}
function setTroops(uid, left) {
  const st = battle.units[uid];
  if (!st) return;
  st.troops = Math.max(0, left);
  const u = document.getElementById(`u-${uid}`);
  if (!u) return;
  u.querySelector('.bar i').style.width = `${(st.troops / Math.max(1, st.max)) * 100}%`;
  u.querySelector('[data-cnt]').textContent = fmt(st.troops);
  u.classList.toggle('dead', st.troops <= 0);
}
function logLine(html) {
  const box = $('#b-log');
  if (!box) return;
  const p = document.createElement('p');
  p.innerHTML = html;
  box.appendChild(p);
  box.scrollTop = box.scrollHeight;
}
const FX_LABEL = { stun: 'Choáng', poison: 'Thiêu đốt', defDown: 'Giảm phòng', atkDown: 'Giảm công', khiDrain: 'Mất khí', buffAtk: 'Tăng công' };

function applyEvent(ev, animate) {
  const name = (uid) => esc(battle.units[uid]?.name || '?');
  if (ev.t === 'round') {
    const r = $('#b-round');
    if (r) r.textContent = `Hiệp ${ev.n}`;
    if (animate) logLine(`<span class="muted">— Hiệp ${ev.n} —</span>`);
  } else if (ev.t === 'act') {
    if (animate) {
      const actor = battle.units[ev.a];
      const first = ev.hits[0]?.d;
      if (ev.kind === 'skill') {
        showBanner(`${actor.name}: ${ev.skill}`);
        for (const h of ev.hits) shoot(ev.a, h.d, true);
      } else if (first) {
        if (actor?.ranged) shoot(ev.a, first, actor.type === 'muu');
        else lunge(ev.a, first);
      }
    }
    for (const hit of ev.hits) {
      setTroops(hit.d, hit.left);
      if (animate) {
        floatAt(hit.d, `-${fmt(hit.kills)}`, hit.crit ? 'crit' : '');
        const t = document.getElementById(`u-${hit.d}`);
        if (t) {
          t.classList.remove('hit');
          void t.offsetWidth;
          t.classList.add('hit');
        }
      }
    }
    for (const fx of ev.fx) {
      if (fx.type === 'heal') {
        setTroops(fx.u, fx.left);
        if (animate) floatAt(fx.u, `+${fmt(fx.amount)}`, 'heal');
      } else if (animate) floatAt(fx.u, FX_LABEL[fx.type] || fx.type, 'fx');
    }
    if (animate) {
      const hits = ev.hits.map((h) => `${name(h.d)} -${fmt(h.kills)}${h.crit ? ' (bạo kích)' : ''}`).join(', ');
      logLine(`${name(ev.a)} ${ev.kind === 'skill' ? `dùng <b style="color:var(--red-dk)">${esc(ev.skill)}</b>` : 'tấn công'}${hits ? `: ${hits}` : ''}`);
    }
  } else if (ev.t === 'poison') {
    setTroops(ev.u, ev.left);
    if (animate) {
      floatAt(ev.u, `-${fmt(ev.kills)}`, 'poison');
      logLine(`${name(ev.u)} bị thiêu đốt -${fmt(ev.kills)}`);
    }
  } else if (ev.t === 'stun') {
    if (animate) {
      floatAt(ev.u, 'Choáng', 'fx');
      logLine(`${name(ev.u)} bị choáng, mất lượt`);
    }
  }
}

function showBanner(text, cls = '') {
  const f = document.getElementById('b-field');
  if (!f) return;
  f.querySelector('.banner')?.remove();
  const b = document.createElement('div');
  b.className = `banner disp ${cls}`;
  b.textContent = text;
  f.appendChild(b);
  if (!cls) setTimeout(() => b.remove(), 900 / battle.speed);
}

function stepBattle() {
  clearTimeout(battle.timer);
  const log = battle.data.result.log;
  if (battle.idx >= log.length) return finishBattle();
  const ev = log[battle.idx++];
  if (ev.t === 'end') return finishBattle();
  applyEvent(ev, true);
  const delay = ev.t === 'round' ? 200 : ev.t === 'act' && ev.kind === 'skill' ? 800 : 480;
  battle.timer = setTimeout(stepBattle, delay / battle.speed);
}

function finishBattle() {
  clearTimeout(battle.timer);
  if (battle.finished) return;
  battle.finished = true;
  const log = battle.data.result.log;
  while (battle.idx < log.length) applyEvent(log[battle.idx++], false);
  const r = battle.data;
  const win = r.result.win;
  showBanner(win ? 'Đại thắng!' : 'Thất bại', win ? 'win' : '');
  $('#b-result').innerHTML = `<div class="panel ${win ? 'hi' : ''}" style="display:flex;flex-direction:column;gap:6px">
    <div class="row"><b style="font-size:16px;color:${win ? 'var(--gold)' : 'var(--red)'}">${win ? 'Thắng' : 'Thua'}</b>${win ? `<span class="stars">${[1, 2, 3].map((n) => (n <= r.stars ? '★' : '<span class="off">★</span>')).join('')}</span>` : ''}<span class="spacer"></span><span class="muted">${r.result.rounds} hiệp · tổn thất ${Math.round(r.result.lossRatio * 100)}% quân</span></div>
    ${win ? `<div class="row wrap">${rewardHtml(r.rewards)}</div>` : `<p class="muted">Gợi ý: nâng cấp võ tướng, nghiên cứu bậc binh chủng, đổi hệ để khắc chế địch (${[...new Set(r.enemies.map((e) => TROOP_TYPES[e.type].name))].join(', ')}).</p>`}
    ${r.levels ? `<p style="color:var(--green-dk)">Chúa Công lên cấp ${S.player.level}!</p>` : ''}
  </div>`;
  $('#b-ctrl').innerHTML = `<span class="spacer"></span>${win && G.nextStage(S) && G.isStageUnlocked(S, G.nextStage(S)) ? `<button class="btn small ghost" data-act="bNext">Ải tiếp theo</button>` : ''}<button class="btn gold" data-act="bClose">Đóng</button>`;
}

function closeBattle() {
  clearTimeout(battle.timer);
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

// ---------- hành động ----------
const ACTIONS = {
  tab: (d) => { ui.tab = d.id; ui.pickSlot = null; ui.confirm = null; renderAll(); window.scrollTo(0, 0); },
  upgrade: (d) => act(() => G.startUpgrade(S, d.id, now())),
  speedUp: () => act(() => G.speedUp(S, now())),
  bldTap: (d) => { ui.sheet = { type: 'building', id: d.id }; renderAll(); },
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
