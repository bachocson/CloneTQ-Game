import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../core/src/index.js';
import { loadConfig } from '../tools/load-config.js';

const CFG = loadConfig();

const T0 = Date.UTC(2026, 0, 1);
const H = 3600 * 1000;

test('tài nguyên sinh theo giờ và dừng ở sức chứa kho', () => {
  const s = G.newGame(T0, 1);
  const before = s.res.luong;
  G.tick(s, T0 + H);
  const rate = G.productionPerHour(s, 'luong');
  assert.ok(Math.abs(s.res.luong - before - rate) < 1, 'sinh đúng 1 giờ');
  G.tick(s, T0 + 200 * H);
  assert.equal(Math.floor(s.res.luong), G.storageCap(s));
});

test('offline quá giới hạn thì chỉ tính tối đa offlineCapHours', () => {
  const s = G.newGame(T0, 1);
  s.buildings.khoHang = 30; // kho rất lớn để không bị chặn
  const before = s.res.go;
  G.tick(s, T0 + 100 * H);
  const expected = G.productionPerHour(s, 'go') * CFG.balance.offlineCapHours;
  assert.ok(Math.abs(s.res.go - before - expected) < 1);
});

test('nâng công trình: trừ tài nguyên, xong đúng giờ, có kiểm tra cấp Phủ', () => {
  const s = G.newGame(T0, 1);
  const goBefore = s.res.go;
  const r = G.startUpgrade(s, 'ruong', T0);
  assert.ok(r.ok);
  assert.ok(s.res.go < goBefore);
  assert.equal(G.upgradeCheck(s, 'xuongGo').ok, false, 'chỉ một hàng đợi');
  G.tick(s, T0 + G.buildingTime('ruong', 2) * 1000);
  assert.equal(s.buildings.ruong, 2);
  assert.equal(G.upgradeCheck(s, 'ruong').reason, `Cần ${CFG.buildings.chinhDien.name} cấp 3`);
});

test('trận đánh cho cùng kết quả với cùng seed', () => {
  const s = G.newGame(T0, 7);
  G.refillTeam(s);
  const team = G.teamUnits(s);
  const enemies = G.stageEnemies('1-3');
  const a = G.simulateBattle(team, enemies, 12345);
  const b = G.simulateBattle(team, enemies, 12345);
  assert.deepEqual(a, b);
  assert.equal(a.log.at(-1).t, 'end');
});

test('đội khởi đầu thắng được ải 1-1, nhận thưởng và mở ải 1-2', () => {
  const s = G.newGame(T0, 3);
  const r = G.fightStage(s, '1-1') as G.FightOutcome;
  assert.ok(r.ok);
  assert.ok(r.result.win);
  assert.ok(s.campaign.stars['1-1'] >= 1);
  assert.ok(G.isStageUnlocked(s, '1-2'));
  assert.equal(G.isStageUnlocked(s, '1-3'), false);
});

test('khắc chế: Bộ binh đánh Thương binh mạnh hơn chiều ngược lại', () => {
  const mk = (type: string): G.BattleUnit => ({ id: 1, slot: 1, name: 'x', stats: { canCot: 50, voLuc: 50, ngoTinh: 50 }, type, tier: 1, troops: 300, maxTroops: 300, skill: null, bonus: 0 });
  const att = G.simulateBattle([mk('bo')], [mk('thuong')], 1);
  const def = G.simulateBattle([mk('thuong')], [mk('bo')], 1);
  assert.ok(att.win, 'Bộ thắng Thương');
  assert.equal(def.win, false, 'Thương thua Bộ');
});

test('lưu và tải lại giữ nguyên tiến trình', () => {
  const s = G.newGame(T0, 9);
  G.fightStage(s, '1-1');
  const back = G.deserialize(G.serialize(s), T0);
  assert.deepEqual(back, s);
});

test('tải save thiếu trường mới vẫn chạy được', () => {
  const s = G.newGame(T0, 9);
  const raw = JSON.parse(G.serialize(s));
  delete raw.settings;
  delete raw.stats.forged;
  const back = G.deserialize(JSON.stringify(raw), T0);
  assert.equal(back.settings.autoRefill, true);
  assert.equal(back.stats.forged, 0);
});

test('tửu lâu: chiêu mộ trừ bạc, không trùng người đã có', () => {
  const s = G.newGame(T0, 5);
  s.buildings.tuuLau = 3;
  s.res.bac = 1e6;
  G.refreshTavern(s, T0, 'free');
  assert.equal(s.tavern.candidates.length, 3);
  const owned = new Set(s.heroes.map((h) => h.tid));
  for (const tid of s.tavern.candidates) assert.ok(!owned.has(tid));
  const tid = s.tavern.candidates[0];
  const r = G.recruit(s, tid);
  assert.ok(r.ok);
  assert.equal(s.heroes.length, 3);
  assert.equal(G.refreshTavern(s, T0 + 1000, 'free').ok, false, 'chưa tới giờ miễn phí');
});

test('rèn, cường hóa, mặc trang bị làm tăng chỉ số', () => {
  const s = G.newGame(T0, 5);
  s.buildings.loRen = 2;
  s.res.sat = s.res.bac = 1e6;
  s.items.huyenThiet = 100;
  const h = s.heroes[0];
  const before = G.heroStats(s, h).voLuc;
  const r = G.forge(s, 'weapon', 1);
  assert.ok(r.ok && r.eq);
  G.equip(s, h.uid, r.eq!.uid);
  assert.ok(G.heroStats(s, h).voLuc > before);
  const mid = G.heroStats(s, h).voLuc;
  assert.ok(G.enhance(s, r.eq!.uid).ok);
  assert.ok(G.heroStats(s, h).voLuc > mid);
  assert.equal(G.sell(s, r.eq!.uid).ok, false, 'đang mặc thì không bán được');
});

test('nhiệm vụ chỉ nhận được khi hoàn thành, và chỉ một lần', () => {
  const s = G.newGame(T0, 5);
  assert.equal(G.claimQuest(s, 'q2').ok, false);
  G.fightStage(s, '1-1');
  assert.ok(G.claimQuest(s, 'q2').ok);
  assert.equal(G.claimQuest(s, 'q2').ok, false);
});

test('trận hình: chỉ đặt tướng vào ô đã mở, nâng cấp mở thêm ô', () => {
  const s = G.newGame(T0, 5);
  const giap = CFG.formations.find((f) => f.id === 'giapTran')!;
  assert.equal(s.formation, 'giapTran');
  assert.equal(G.deployLimit(s), giap.startLevel + 1);
  s.buildings.tuuLau = 3;
  s.res.bac = 1e6;
  s.items.biKip = 100;
  G.refreshTavern(s, T0, 'free');
  const r = G.recruit(s, s.tavern.candidates[0]);
  const third = giap.unlockOrder[2] - 1; // ô mở ở cấp 2
  assert.equal(G.setTeamSlot(s, third, r.hero!.uid).ok, false, 'ô chưa mở');
  assert.equal(G.setTeamSlot(s, 4, r.hero!.uid).ok, false, 'ô 5 (giữa) là o trong Giáp trận');
  assert.equal(G.upgradeFormation(s, 'giapTran').ok, false, 'cấp trận hình không vượt cấp Quân Mạc');
  s.buildings.quanMac = 3;
  assert.ok(G.upgradeFormation(s, 'giapTran').ok);
  assert.ok(G.setTeamSlot(s, third, r.hero!.uid).ok);
  assert.equal(G.deployLimit(s), 3);
});

test('trận hình: hiệu quả theo cấp, đổi trận giữ đội hình, Hư trận đặt tự do', () => {
  const s = G.newGame(T0, 6);
  const giap = CFG.formations.find((f) => f.id === 'giapTran')!;
  assert.equal(G.formationBonus(giap, 0), 0.15);
  assert.equal(G.formationBonus(giap, 4), 0.15);
  assert.ok(Math.abs(G.formationBonus(giap, 5) - 0.16) < 1e-9);
  assert.ok(Math.abs(G.formationBonus(giap, 20) - 0.31) < 1e-9, 'cấp 20 = 31%');
  assert.equal(G.setFormation(s, 'thapTran').ok, false, 'chưa đủ cấp Quân Mạc');
  s.buildings.quanMac = 20;
  const before = s.team.filter(Boolean).length;
  assert.ok(G.setFormation(s, 'thapTran').ok);
  assert.equal(s.team.filter(Boolean).length, 1, 'Thập trận cấp 0 chỉ 1 ô');
  assert.ok(G.setFormation(s, 'giapTran').ok);
  assert.equal(s.team.filter(Boolean).length, before, 'đổi về giữ đội hình cũ');
  const hu = CFG.formations.find((f) => f.id === 'huTran')!;
  assert.equal(G.formationCapacity(hu, 4).max, 1);
  assert.equal(G.formationCapacity(hu, 20).max, 5);
  assert.equal(G.formationCapacity(hu, 20).open.length, 9, 'Hư trận đặt được mọi ô');
  // hiệu quả vào trận: Giáp trận tăng vật phòng toàn đội
  const u = G.teamUnits(s)[0];
  assert.equal(u.mods?.def?.ngoai, G.formationBonus(giap, G.formationLevel(s, 'giapTran')));
});

test('save cũ đội hình 6 ô được chuyển sang lưới 9 ô', () => {
  const s = G.newGame(T0, 7);
  const raw = JSON.parse(G.serialize(s));
  raw.team = [raw.heroes[1].uid, raw.heroes[0].uid, null, null, null, null];
  delete raw.formation;
  delete raw.formations;
  delete raw.formationTeams;
  const back = G.deserialize(JSON.stringify(raw), T0);
  assert.equal(back.team.length, 9);
  assert.equal(back.formation, 'giapTran');
  assert.equal(back.team.filter(Boolean).length, 2);
});

test('công cụ test: cộng tài nguyên, đầy kho, tua giờ, mở chương, thêm tướng', () => {
  const s = G.newGame(T0, 11);
  G.cheatAdd(s, { bac: 5000, biKip: 3 });
  assert.equal(s.res.bac, CFG.balance.startRes.bac + 5000);
  assert.equal(s.items.biKip, CFG.balance.startItems.biKip + 3);
  G.cheatFillStorage(s, 100);
  assert.ok(s.res.luong >= G.storageCap(s));

  G.startUpgrade(s, 'ruong', T0);
  G.cheatFastForward(s, T0, 1);
  assert.equal(s.queue, null, 'tua 1 giờ thì công trình ngắn đã xây xong');
  assert.equal(s.buildings.ruong, 2);

  G.cheatUnlockChapter(s, 3);
  assert.equal(s.campaign.stars['2-5'], 3);
  assert.ok(G.isStageUnlocked(s, '3-1'));
  assert.ok(s.player.level >= CFG.chapters[2].reqLevel);

  const tid = Object.keys(CFG.heroes).find((t) => !s.heroes.some((h) => h.tid === t))!;
  assert.ok(G.cheatAddHero(s, tid).ok);
  assert.equal(G.cheatAddHero(s, tid).ok, false, 'không thêm trùng');
  G.cheatMaxHeroes(s);
  assert.ok(s.heroes.every((h) => h.level === s.player.level));
  assert.ok((s.stats.cheats ?? 0) > 0, 'save bị đánh dấu đã dùng cheat');
});

test('cửa hàng: mua vật phẩm, giới hạn theo ngày, gói ưu đãi, nạp lần đầu', () => {
  const s = G.newGame(T0, 12);
  s.res.nguyenbao = 10000;
  s.res.bac = 100000;
  const stam = s.stamina.cur;
  assert.ok(G.buyShopItem(s, 'muaTheLuc', 1, T0).ok);
  assert.equal(s.stamina.cur, stam + 60, 'thể lực được vượt mức tối đa');
  const lim = CFG.shop.find((x) => x.id === 'muaTheLuc')!.limitCount;
  for (let i = 1; i < lim; i++) assert.ok(G.buyShopItem(s, 'muaTheLuc', 1, T0).ok);
  assert.equal(G.buyShopItem(s, 'muaTheLuc', 1, T0).ok, false, 'hết lượt trong ngày');
  assert.ok(G.buyShopItem(s, 'muaTheLuc', 1, T0 + 24 * H).ok, 'sang ngày mới mua lại được');

  assert.ok(G.buyPack(s, 'goiNgay', T0).ok);
  assert.equal(G.buyPack(s, 'goiNgay', T0).ok, false);
  assert.equal(G.buyPack(s, 'goiTanThu', T0).ok, false, 'gói tiền thật không mua bằng nguyên bảo được');

  const nb = s.res.nguyenbao;
  const top = CFG.topups[0];
  assert.ok(G.grantPurchase(s, top.id, T0, { test: true }).ok);
  assert.equal(s.res.nguyenbao, nb + top.nguyenbao + top.firstBonus, 'lần đầu có thưởng');
  G.grantPurchase(s, top.id, T0, { test: true });
  assert.equal(s.res.nguyenbao, nb + 2 * top.nguyenbao + top.firstBonus, 'lần sau không thưởng');
  assert.ok(G.grantPurchase(s, 'goiTanThu', T0, { test: true }).ok);
  assert.equal(G.grantPurchase(s, 'goiTanThu', T0, { test: true }).ok, false, 'gói một lần');
  assert.equal(s.shop.testPurchases, 3);
});
