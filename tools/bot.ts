// Bot tự chơi để cân bằng game. Chạy: npm run bot -- --days=5 --interval=15 --active=14 --seed=1
// Mô phỏng một người chơi vào game mỗi `interval` phút trong `active` giờ mỗi ngày, rồi in báo cáo tiến trình.

import * as G from '../core/src/index.js';
import type { GameState, Hero } from '../core/src/index.js';
import { loadConfig } from './load-config.js';

const CFG = loadConfig(process.argv.find((a) => a.startsWith('--config='))?.slice(9));
const BUILDING_ORDER = CFG.buildingOrder;
const BUILDINGS = CFG.buildings;
const HEROES = CFG.heroes;
const TROOP_TYPES = CFG.troopTypes;
const EQUIP_SLOTS = CFG.equipSlots;

const args: Record<string, string | boolean> = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? true : v];
}));
const DAYS = Number(args.days || 5);
const INTERVAL = Number(args.interval || 15);
const ACTIVE = Number(args.active || 14);
const SEED = Number(args.seed || 1);
const VERBOSE = !!args.verbose;
const JSON_OUT = !!args.json;

const MIN = 60 * 1000;
const t0 = Date.UTC(2026, 0, 1, 8, 0, 0);
const state: GameState = G.newGame(t0, SEED);
const events: { h: number; msg: string }[] = [];
const counters = { fights: 0, losses: 0, sweeps: 0, capped: 0, checkins: 0, upgrades: 0 };

function log(now: number, msg: string) {
  const h = (now - t0) / 3600000;
  events.push({ h: Math.round(h * 100) / 100, msg });
  if (VERBOSE) console.log(`[${fmtH(h)}] ${msg}`);
}
function fmtH(h: number) {
  const d = Math.floor(h / 24);
  const hh = Math.floor(h % 24);
  const mm = Math.round((h * 60) % 60);
  return `ngày ${d + 1} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function clone(s: GameState): GameState {
  return JSON.parse(JSON.stringify(s));
}

const BUILD_WEIGHT: Record<string, number> = { chinhDien: 0, ruong: 1, xuongGo: 1, moSat: 1.1, tienTrang: 1, khoHang: 1.2, luyenVo: 0.9, tuuLau: 1.6, loRen: 1.3, tangKinh: 1.8 };

function chooseBuilding(now: number) {
  if (state.queue) return;
  const cands = [];
  for (const id of BUILDING_ORDER) {
    const chk = G.upgradeCheck(state, id);
    if (!chk.ok) continue;
    const lv = state.buildings[id] || 0;
    let score = id === 'chinhDien' ? -1 : lv * (BUILD_WEIGHT[id] ?? 1);
    // Kho đầy thì ưu tiên kho
    if (id === 'khoHang' && Object.entries(state.res).some(([k, v]) => k !== 'nguyenbao' && v >= G.storageCap(state) * 0.9)) score -= 5;
    cands.push({ id, score });
  }
  if (!cands.length) return;
  cands.sort((a, b) => a.score - b.score);
  const id = cands[0].id;
  const r = G.startUpgrade(state, id, now);
  if (r.ok) {
    counters.upgrades++;
    if (G.speedUpCost(state, now) === 0) G.speedUp(state, now);
  }
}

function heroValue(h: Hero) {
  return G.heroPower(state, h) + HEROES[h.tid].q * 40;
}

function arrangeTeam() {
  const limit = G.deployLimit(state);
  const sorted = [...state.heroes].sort((a, b) => heroValue(b) - heroValue(a)).slice(0, limit);
  const team: (number | null)[] = [null, null, null, null, null, null];
  const front = [1, 0, 2, 4, 3, 5];
  const back = [4, 3, 5, 1, 0, 2];
  for (const h of sorted) {
    const order = TROOP_TYPES[h.troopType].range === 'ranged' ? back : front;
    const slot = order.find((s) => team[s] === null);
    if (slot !== undefined) team[slot] = h.uid;
  }
  state.team = team;
}

function tavern(now: number) {
  if (!G.tavernOpen(state)) return;
  if (now >= state.tavern.nextFree) G.refreshTavern(state, now, 'free');
  for (const tid of [...state.tavern.candidates].sort((a, b) => HEROES[b].q - HEROES[a].q)) {
    const q = HEROES[tid].q;
    const cost = G.recruitCost(tid);
    if (state.res.bac < cost * 1.2) continue;
    if (state.heroes.length >= G.rosterLimit(state)) {
      const worst = [...state.heroes].sort((a, b) => HEROES[a.tid].q - HEROES[b.tid].q || a.level - b.level)[0];
      if (HEROES[worst.tid].q >= q) continue;
      G.releaseHero(state, worst.uid);
    }
    const r = G.recruit(state, tid);
    if (r.ok) log(now, `Chiêu mộ ${HEROES[tid].name} (phẩm ${q})`);
  }
}

function growHeroes() {
  const team = state.team.filter(Boolean).map((uid) => G.findHero(state, uid) as Hero);
  for (const item of ['daiHoanDan', 'tieuHoanDan']) {
    let guard = 200;
    while (state.items[item] > 0 && guard-- > 0) {
      const target = team.filter((h) => h.level < state.player.level).sort((a, b) => a.level - b.level)[0];
      if (!target) break;
      G.useExpItem(state, target.uid, item, 1);
    }
  }
  for (const h of team) {
    let guard = 10;
    while (guard-- > 0 && G.upgradeSkill(state, h.uid).ok);
  }
  const types = new Set(team.map((h) => h.troopType));
  for (const t of types) {
    const chk = G.researchCheck(state, t);
    if (chk.ok) {
      G.researchTier(state, t);
    }
  }
}

function smithy(_now: number) {
  const maxT = G.maxForgeTier(state);
  if (!maxT) return;
  const team = state.team.filter(Boolean).map((uid) => G.findHero(state, uid) as Hero);
  for (const h of team) {
    for (const slot of Object.keys(EQUIP_SLOTS)) {
      const curUid = h.equip[slot];
      const cur = curUid && state.equipment.find((e) => e.uid === curUid);
      if (cur && cur.tier >= maxT) continue;
      const cost = G.forgeCost(maxT);
      if (!G.canAfford(state, cost) || state.res.sat < cost.sat * 1.5) continue;
      const r = G.forge(state, slot, maxT);
      if (r.ok && r.eq) {
        G.equip(state, h.uid, r.eq.uid);
        if (cur) G.sell(state, cur.uid);
      }
    }
  }
  // cường hóa nhẹ nếu dư sắt
  for (const eq of state.equipment) {
    let guard = 5;
    while (guard-- > 0) {
      const c = G.enhanceCost(eq);
      if (state.res.sat < c.sat * 3 || state.res.bac < c.bac * 3) break;
      if (!G.enhance(state, eq.uid).ok) break;
    }
  }
}

function battles(now: number) {
  let guard = 30;
  while (guard-- > 0 && state.stamina.cur >= 6) {
    const next = G.nextStage(state);
    let fought = false;
    if (next && G.isStageUnlocked(state, next)) {
      const preview = clone(state);
      const pr = G.fightStage(preview, next) as G.FightOutcome;
      if (pr.ok && pr.result.win) {
        const r = G.fightStage(state, next) as G.FightOutcome;
        counters.fights++;
        if (r.result.win) log(now, `Vượt ải ${next} (${r.stars} sao, ${r.result.rounds} hiệp)`);
        else counters.losses++;
        if (r.levels) log(now, `Chúa Công lên cấp ${state.player.level}`);
        fought = true;
      }
    }
    if (fought) continue;
    // Không thắng được ải mới: cày lại ải 3 sao cao nhất, hoặc đánh lại để lấy 3 sao
    const stars = state.campaign.stars;
    const three = Object.keys(stars).filter((id) => stars[id] >= 3).sort((a, b) => G.parseStage(b).index - G.parseStage(a).index)[0];
    const notThree = Object.keys(stars).filter((id) => stars[id] < 3).sort((a, b) => G.parseStage(b).index - G.parseStage(a).index)[0];
    if (notThree) {
      const preview = clone(state);
      const pr = G.fightStage(preview, notThree) as G.FightOutcome;
      if (pr.ok && pr.result.win && pr.stars === 3) {
        G.fightStage(state, notThree);
        counters.fights++;
        continue;
      }
    }
    if (three) {
      const before = state.player.level;
      const r = G.sweepStage(state, three, 1);
      if (!r.ok) break;
      counters.sweeps++;
      if (state.player.level > before) log(now, `Chúa Công lên cấp ${state.player.level}`);
      continue;
    }
    break;
  }
}

function checkin(now: number) {
  counters.checkins++;
  const done = G.tick(state, now);
  for (const q of done) log(now, `${BUILDINGS[q.id].name} → cấp ${q.toLevel}`);
  const cap = G.storageCap(state);
  if (['luong', 'go', 'sat', 'bac'].some((r) => state.res[r] >= cap)) counters.capped++;
  for (const q of G.questList(state)) if (q.done && !q.claimed) G.claimQuest(state, q.id);
  tavern(now);
  arrangeTeam();
  growHeroes();
  smithy(now);
  chooseBuilding(now);
  battles(now);
  chooseBuilding(now);
}

const daily: any[] = [];
for (let day = 0; day < DAYS; day++) {
  const dayStart = t0 + day * 24 * 60 * MIN;
  for (let m = 0; m < ACTIVE * 60; m += INTERVAL) checkin(dayStart + m * MIN);
  const end = dayStart + 24 * 60 * MIN - 1;
  G.tick(state, end);
  daily.push({
    day: day + 1,
    level: state.player.level,
    stage: G.nextStage(state) || 'xong',
    buildings: { ...state.buildings },
    heroes: state.heroes.map((h) => `${HEROES[h.tid].name} lv${h.level}`).join(', '),
    tiers: { ...state.troopTiers },
    res: Object.fromEntries(Object.entries(state.res).map(([k, v]) => [k, Math.floor(v)])),
    cap: G.storageCap(state),
  });
}

if (JSON_OUT) {
  console.log(JSON.stringify({ daily, counters, events }, null, 1));
} else {
  console.log(`\n=== Bot tự chơi: ${DAYS} ngày, vào game mỗi ${INTERVAL} phút, ${ACTIVE} giờ/ngày, seed ${SEED} ===\n`);
  for (const d of daily) {
    console.log(`Ngày ${d.day}: cấp ${d.level}, ải tiếp theo ${d.stage}`);
    console.log(`  Công trình: ${Object.entries(d.buildings as Record<string, number>).map(([k, v]) => `${BUILDINGS[k].name} ${v}`).join(', ')}`);
    console.log(`  Bậc binh chủng: ${Object.entries(d.tiers as Record<string, number>).map(([k, v]) => `${TROOP_TYPES[k].name} ${v}`).join(', ')}`);
    console.log(`  Võ tướng: ${d.heroes}`);
    console.log(`  Tài nguyên (kho ${d.cap}): ${Object.entries(d.res as Record<string, number>).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  }
  const milestones = events.filter((e) => /Vượt ải \d-5|lên cấp (5|10|15|20)$/.test(e.msg));
  console.log('\nMốc chính:');
  for (const e of milestones) console.log(`  ${fmtH(e.h)}  ${e.msg}`);
  console.log(`\nSố lần vào game ${counters.checkins}, đánh ${counters.fights} (thua ${counters.losses}), càn quét ${counters.sweeps}, nâng công trình ${counters.upgrades}, lần thấy kho đầy ${counters.capped}`);
}
