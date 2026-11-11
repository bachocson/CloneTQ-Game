// Cấu hình đang dùng. Client và server gọi setConfig() một lần lúc khởi động
// với nội dung file config/game-config.json (sinh từ Excel).

import type { GameConfig, PowerFormula } from './types.js';

let current: GameConfig | null = null;

export function setConfig(cfg: GameConfig): void {
  current = cfg;
}

export function cfg(): GameConfig {
  if (!current) throw new Error('Chưa nạp cấu hình game: gọi setConfig() trước');
  return current;
}

export function power(f: PowerFormula, level: number): number {
  return Math.floor(f.base * Math.pow(level, f.exp));
}

export function playerExpToNext(level: number): number {
  return power(cfg().balance.playerExp, level);
}

export function heroExpToNext(level: number): number {
  return power(cfg().balance.heroExp, level);
}

export function deploySlotsFor(level: number): number {
  let slots = 1;
  for (const row of cfg().deploySlots) if (level >= row.level) slots = row.slots;
  return slots;
}

export function factionBonusFor(count: number): number {
  let b = 0;
  for (const row of cfg().factionBonus) if (count >= row.count) b = row.bonus;
  return b;
}

export function maxTroopsFor(canCot: number, luyenVoLv: number): number {
  const t = cfg().balance.troops;
  return Math.floor(t.base + canCot * t.perCanCot + luyenVoLv * t.perLuyenVo);
}

export function tierMult(tier: number): number {
  return cfg().tiers[tier - 1].mult;
}

export function isResource(key: string): boolean {
  return key in cfg().resources;
}
