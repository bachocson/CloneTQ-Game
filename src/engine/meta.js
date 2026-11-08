// Tửu lâu (chiêu mộ) và nhiệm vụ.

import { BALANCE } from '../data/balance.js';
import { HEROES } from '../data/heroes.js';
import { QUESTS } from '../data/quests.js';
import { rand, weightedPick } from './rng.js';
import { gain } from './economy.js';
import { makeHero } from './state.js';
import { rosterLimit } from './heroes.js';

// ---------- Tửu lâu ----------

export function tavernOpen(state) {
  return (state.buildings.tuuLau || 0) >= 1;
}

function rollCandidates(state) {
  const owned = new Set(state.heroes.map((h) => h.tid));
  const weights = BALANCE.tavern.weights(state.buildings.tuuLau || 0);
  const picked = [];
  for (let i = 0; i < BALANCE.tavern.candidates; i++) {
    let q = weightedPick(rand(state), weights) + 1;
    let pool = [];
    // Hết người ở phẩm chất này thì lùi xuống phẩm thấp hơn, rồi lên cao hơn
    for (let tries = 0; tries < 10 && !pool.length; tries++) {
      const tryQ = tries < 5 ? q - tries : q + (tries - 4);
      pool = Object.keys(HEROES).filter((tid) => HEROES[tid].q === tryQ && !owned.has(tid) && !picked.includes(tid));
    }
    if (!pool.length) break;
    picked.push(pool[Math.floor(rand(state) * pool.length)]);
  }
  return picked;
}

export function refreshTavern(state, now, mode = 'free') {
  if (!tavernOpen(state)) return { ok: false, reason: 'Cần xây Tửu Lâu' };
  const tv = BALANCE.tavern;
  if (mode === 'free') {
    if (now < state.tavern.nextFree) return { ok: false, reason: 'Chưa tới lượt làm mới miễn phí' };
    state.tavern.nextFree = now + tv.freeRefreshSeconds * 1000;
  } else if (mode === 'bac') {
    if (state.res.bac < tv.refreshCostBac) return { ok: false, reason: `Cần ${tv.refreshCostBac} bạc` };
    state.res.bac -= tv.refreshCostBac;
  } else if (mode === 'nguyenbao') {
    if (state.res.nguyenbao < tv.refreshCostNguyenBao) return { ok: false, reason: `Cần ${tv.refreshCostNguyenBao} nguyên bảo` };
    state.res.nguyenbao -= tv.refreshCostNguyenBao;
  }
  state.tavern.candidates = rollCandidates(state);
  return { ok: true, msg: 'Khách mới vào tửu lâu' };
}

export function recruitCost(tid) {
  return BALANCE.tavern.recruitCostBac[HEROES[tid].q];
}

export function recruit(state, tid) {
  if (!tavernOpen(state)) return { ok: false, reason: 'Cần xây Tửu Lâu' };
  if (!state.tavern.candidates.includes(tid)) return { ok: false, reason: 'Người này không có trong tửu lâu' };
  if (state.heroes.length >= rosterLimit(state)) return { ok: false, reason: `Môn phái chỉ chứa ${rosterLimit(state)} hiệp khách. Nâng Tửu Lâu hoặc mời bớt người đi.` };
  const cost = recruitCost(tid);
  if (state.res.bac < cost) return { ok: false, reason: `Cần ${cost} bạc` };
  state.res.bac -= cost;
  const h = makeHero(state, tid);
  state.heroes.push(h);
  state.tavern.candidates = state.tavern.candidates.filter((x) => x !== tid);
  state.stats.recruited++;
  return { ok: true, msg: `${HEROES[tid].name} gia nhập môn phái`, hero: h };
}

// ---------- Nhiệm vụ ----------

export function questDone(state, q) {
  const c = q.cond;
  switch (c.type) {
    case 'building': return (state.buildings[c.id] || 0) >= c.level;
    case 'stage': return (state.campaign.stars[c.id] || 0) > 0;
    case 'playerLevel': return state.player.level >= c.level;
    case 'heroCount': return state.heroes.length >= c.count;
    case 'heroLevel': return state.heroes.some((h) => h.level >= c.level);
    case 'tier': return Object.values(state.troopTiers).some((t) => t >= c.tier);
    case 'forged': return state.stats.forged >= c.count;
    case 'enhanced': return state.stats.maxEnhance >= c.level;
    case 'skillLevel': return state.heroes.some((h) => h.skillLv >= c.level);
    default: return false;
  }
}

export function questList(state) {
  return QUESTS.map((q) => ({ ...q, done: questDone(state, q), claimed: !!state.quests.claimed[q.id] }));
}

export function claimQuest(state, id) {
  const q = QUESTS.find((x) => x.id === id);
  if (!q) return { ok: false, reason: 'Không có nhiệm vụ này' };
  if (state.quests.claimed[id]) return { ok: false, reason: 'Đã nhận thưởng' };
  if (!questDone(state, q)) return { ok: false, reason: 'Chưa hoàn thành' };
  gain(state, q.reward);
  state.quests.claimed[id] = true;
  return { ok: true, msg: `Hoàn thành: ${q.name}` };
}

export function claimableCount(state) {
  return QUESTS.filter((q) => !state.quests.claimed[q.id] && questDone(state, q)).length;
}
