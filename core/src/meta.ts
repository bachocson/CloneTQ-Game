// Tửu lâu (chiêu mộ) và nhiệm vụ.

import { cfg } from './config.js';
import { rand, weightedPick } from './rng.js';
import { gain } from './economy.js';
import { makeHero } from './state.js';
import { rosterLimit } from './heroes.js';
import type { ActionResult, GameState, Hero, QuestDef } from './types.js';

// ---------- Tửu lâu ----------

export function tavernOpen(state: GameState): boolean {
  return (state.buildings.tuuLau || 0) >= 1;
}

export function qualityWeights(tuuLauLv: number): { q: number; w: number }[] {
  return Object.entries(cfg().qualities)
    .map(([q, d]) => ({ q: Number(q), w: Math.max(d.weightMin, d.weightBase + d.weightPerLevel * tuuLauLv) }))
    .sort((a, b) => a.q - b.q);
}

function rollCandidates(state: GameState): string[] {
  const heroes = cfg().heroes;
  const owned = new Set(state.heroes.map((h) => h.tid));
  const weights = qualityWeights(state.buildings.tuuLau || 0);
  const picked: string[] = [];
  for (let i = 0; i < cfg().balance.tavern.candidates; i++) {
    const q = weights[weightedPick(rand(state), weights.map((x) => x.w))].q;
    let pool: string[] = [];
    // Hết người ở phẩm chất này thì lùi xuống phẩm thấp hơn, rồi lên cao hơn
    for (let tries = 0; tries < 10 && !pool.length; tries++) {
      const tryQ = tries < 5 ? q - tries : q + (tries - 4);
      pool = Object.keys(heroes).filter((tid) => heroes[tid].q === tryQ && !owned.has(tid) && !picked.includes(tid));
    }
    if (!pool.length) break;
    picked.push(pool[Math.floor(rand(state) * pool.length)]);
  }
  return picked;
}

export function refreshTavern(state: GameState, now: number, mode: 'free' | 'bac' | 'nguyenbao' = 'free'): ActionResult {
  if (!tavernOpen(state)) return { ok: false, reason: 'Cần xây Tửu Lâu' };
  const tv = cfg().balance.tavern;
  if (mode === 'free') {
    if (now < state.tavern.nextFree) return { ok: false, reason: 'Chưa tới lượt làm mới miễn phí' };
    state.tavern.nextFree = now + tv.freeRefreshSeconds * 1000;
  } else if (mode === 'bac') {
    if (state.res.bac < tv.refreshCostBac) return { ok: false, reason: `Cần ${tv.refreshCostBac} bạc` };
    state.res.bac -= tv.refreshCostBac;
  } else {
    if (state.res.nguyenbao < tv.refreshCostNguyenBao) return { ok: false, reason: `Cần ${tv.refreshCostNguyenBao} nguyên bảo` };
    state.res.nguyenbao -= tv.refreshCostNguyenBao;
  }
  state.tavern.candidates = rollCandidates(state);
  return { ok: true, msg: 'Khách mới vào tửu lâu' };
}

export function recruitCost(tid: string): number {
  return cfg().qualities[String(cfg().heroes[tid].q)].recruitCost;
}

export function recruit(state: GameState, tid: string): ActionResult & { hero?: Hero } {
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
  return { ok: true, msg: `${cfg().heroes[tid].name} gia nhập môn phái`, hero: h };
}

// ---------- Nhiệm vụ ----------

export function questDone(state: GameState, q: QuestDef): boolean {
  const c = q.cond;
  switch (c.type) {
    case 'building': return (state.buildings[c.target ?? ''] || 0) >= c.value;
    case 'stage': return (state.campaign.stars[c.target ?? ''] || 0) > 0;
    case 'playerLevel': return state.player.level >= c.value;
    case 'heroCount': return state.heroes.length >= c.value;
    case 'heroLevel': return state.heroes.some((h) => h.level >= c.value);
    case 'tier': return Object.values(state.troopTiers).some((t) => t >= c.value);
    case 'forged': return state.stats.forged >= c.value;
    case 'enhanced': return state.stats.maxEnhance >= c.value;
    case 'skillLevel': return state.heroes.some((h) => h.skillLv >= c.value);
    default: return false;
  }
}

export function questList(state: GameState): (QuestDef & { done: boolean; claimed: boolean })[] {
  return cfg().quests.map((q) => ({ ...q, done: questDone(state, q), claimed: !!state.quests.claimed[q.id] }));
}

export function claimQuest(state: GameState, id: string): ActionResult {
  const q = cfg().quests.find((x) => x.id === id);
  if (!q) return { ok: false, reason: 'Không có nhiệm vụ này' };
  if (state.quests.claimed[id]) return { ok: false, reason: 'Đã nhận thưởng' };
  if (!questDone(state, q)) return { ok: false, reason: 'Chưa hoàn thành' };
  gain(state, q.reward);
  state.quests.claimed[id] = true;
  return { ok: true, msg: `Hoàn thành: ${q.name}` };
}

export function claimableCount(state: GameState): number {
  return cfg().quests.filter((q) => !state.quests.claimed[q.id] && questDone(state, q)).length;
}
