// Kiểu dữ liệu của cấu hình game (sinh ra từ file Excel) và của state lưu game.

export type Cost = Record<string, number>;

/** Công thức lũy thừa: floor(base * level^exp) */
export interface PowerFormula {
  base: number;
  exp: number;
}

export interface ResourceDef { name: string; short: string; desc: string }
export interface ItemDef { name: string; desc: string; exp?: number }

export interface BuildingDef {
  name: string;
  desc: string;
  roof: string;
  cost: Cost;
  costGrowth: number;
  timeBase: number;
  timeGrowth: number;
  unlockLevel: number;
  startLevel: number;
  produces?: string;
  prodBase?: number;
  prodGrowth?: number;
  storageBase?: number;
  storageGrowth?: number;
}

export interface FactionDef { name: string; color: string }

export interface QualityDef {
  name: string;
  color: string;
  recruitCost: number;
  /** trọng số xuất hiện ở tửu lâu = max(weightMin, weightBase + weightPerLevel * cấp tửu lâu) */
  weightBase: number;
  weightPerLevel: number;
  weightMin: number;
}

export type StatKey = 'canCot' | 'voLuc' | 'ngoTinh';
export type Stats = Record<StatKey, number>;

export interface HeroDef {
  name: string;
  q: number;
  faction: string;
  school: string;
  base: [number, number, number];
  growth: [number, number, number];
  skill: string;
  palette: [string, string, string, string];
  bio: string;
}

export type SkillTarget = 'single' | 'row' | 'back' | 'all' | 'random2' | 'random3' | 'weakest';
export type EffectType = 'stun' | 'poison' | 'buffAtk' | 'atkDown' | 'defDown' | 'heal' | 'khiDrain' | 'teamBuffAtk' | 'teamHeal';

export interface SkillEffect {
  type: EffectType;
  chance?: number;
  pct?: number;
  turns?: number;
  amount?: number;
  self?: boolean;
}

export interface SkillDef {
  name: string;
  desc: string;
  target: SkillTarget;
  mult: number;
  stat: StatKey;
  effects: SkillEffect[];
}

export interface TroopDef {
  name: string;
  desc: string;
  dmgType: 'ngoai' | 'doc';
  range: 'melee' | 'ranged';
  hp: number;
  atk: number;
  defNgoai: number;
  defDoc: number;
  speed: number;
  beats: string[];
  tiers: string[];
}

export interface TierDef {
  mult: number;
  reqLuyenVo: number;
  cost: Cost;
}

export interface ChapterDef {
  id: number;
  name: string;
  reqLevel: number;
  desc: string;
  enemyNames: string[];
  boss: { name: string; type: string; skill: string };
  palette: [string, string, string, string];
}

export interface EquipSlotDef { name: string; stat: StatKey; tierNames: string[] }
export interface EquipQualityDef { name: string; color: string; mult: number; weight: number }

export type QuestCondType = 'building' | 'stage' | 'playerLevel' | 'heroCount' | 'heroLevel' | 'tier' | 'forged' | 'enhanced' | 'skillLevel';
export interface QuestDef {
  id: string;
  name: string;
  desc: string;
  cond: { type: QuestCondType; target?: string; value: number };
  reward: Cost;
}

export interface BalanceConfig {
  startRes: Cost;
  startItems: Cost;
  offlineCapHours: number;
  stamina: { max: number; regenSeconds: number; perWin: number; perLoss: number };
  playerExp: PowerFormula;
  playerMaxLevel: number;
  heroExp: PowerFormula;
  troops: { base: number; perCanCot: number; perLuyenVo: number };
  refill: { luong: number; bac: number };
  combat: {
    damageK: number;
    counterBonus: number;
    counterPenalty: number;
    schoolBonus: number;
    maxRounds: number;
    khiStart: number;
    khiPerAttack: number;
    khiPerHit: number;
    critBase: number;
    critPerNgoTinh: number;
    critMult: number;
    skillLevelBonus: number;
    skillMinTroopPct: number;
  };
  starThresholds: [number, number];
  speedUp: { freeSeconds: number; perMinute: number };
  baseTrickle: number;
  tavern: {
    freeRefreshSeconds: number;
    refreshCostBac: number;
    refreshCostNguyenBao: number;
    candidates: number;
    rosterBase: number;
    rosterPerLevel: number;
  };
  enemy: {
    counts: number[];
    levelPerStage: number;
    statBase: number;
    statPerLevel: number;
    statCurveMul: number;
    statCurveExp: number;
    troopsBase: number;
    troopsPerStage: number;
    troopsCurveMul: number;
    troopsCurveExp: number;
    bossStatMul: number;
    bossTroopMul: number;
    tierEveryStages: number;
    eliteFromStage: number;
    eliteSkill: string;
  };
  rewards: {
    expBase: number; expPerStage: number;
    luongBase: number; luongPerStage: number;
    goBase: number; goPerStage: number;
    bacBase: number; bacPerStage: number;
    repeatExpPct: number; repeatResPct: number;
    firstPillsBase: number; firstPillsEvery: number;
    firstNguyenBao: number;
    bossNguyenBaoBase: number; bossNguyenBaoPerStage: number;
    bossHuyenThietBase: number; bossBiKipEvery: number;
    sweepLuongBase: number; sweepLuongPerStage: number;
    sweepPillChance: number;
  };
  equip: {
    statPerTier: number;
    enhancePct: number;
    maxEnhancePerLoRen: number;
    tierEveryLoRen: number;
    forgeSatBase: number; forgeBacBase: number; forgeGrowth: number;
    forgeHuyenThietPerTier: number;
    enhanceSatBase: number; enhanceBacBase: number; enhanceGrowth: number;
    enhanceHuyenThietFrom: number;
    sellRatio: number;
  };
  releaseExpRefund: number;
  /** chi phí bạc nâng tuyệt kỹ = floor(base * cấp^exp); bí kíp = cấp hiện tại */
  skillCostBac: PowerFormula;
  /** cứ mỗi bao nhiêu cấp hiệp khách thì được thêm 1 cấp tuyệt kỹ tối đa */
  skillHeroLevelStep: number;
}

export interface GameConfig {
  version: string;
  balance: BalanceConfig;
  deploySlots: { level: number; slots: number }[];
  factionBonus: { count: number; bonus: number }[];
  resources: Record<string, ResourceDef>;
  items: Record<string, ItemDef>;
  buildings: Record<string, BuildingDef>;
  buildingOrder: string[];
  factions: Record<string, FactionDef>;
  qualities: Record<string, QualityDef>;
  heroes: Record<string, HeroDef>;
  starterHeroes: string[];
  skills: Record<string, SkillDef>;
  troopTypes: Record<string, TroopDef>;
  troopOrder: string[];
  tiers: TierDef[];
  chapters: ChapterDef[];
  stagesPerChapter: number;
  equipSlots: Record<string, EquipSlotDef>;
  equipQualities: EquipQualityDef[];
  quests: QuestDef[];
}

// ---------- State lưu game ----------

export interface Hero {
  uid: number;
  tid: string;
  level: number;
  exp: number;
  troopType: string;
  troops: number;
  skillLv: number;
  equip: Record<string, number | null>;
}

export interface Equipment {
  uid: number;
  slot: string;
  tier: number;
  q: number;
  enh: number;
}

export interface BuildQueue {
  id: string;
  toLevel: number;
  startedAt: number;
  endsAt: number;
}

export interface GameState {
  v: number;
  seed: number;
  rng: number;
  createdAt: number;
  lastTick: number;
  nextUid: number;
  player: { level: number; exp: number };
  res: Record<string, number>;
  items: Record<string, number>;
  stamina: { cur: number; last: number };
  buildings: Record<string, number>;
  queue: BuildQueue | null;
  heroes: Hero[];
  team: (number | null)[];
  troopTiers: Record<string, number>;
  equipment: Equipment[];
  campaign: { stars: Record<string, number> };
  tavern: { candidates: string[]; nextFree: number };
  quests: { claimed: Record<string, boolean> };
  stats: { battles: number; wins: number; forged: number; maxEnhance: number; recruited: number };
  settings: { autoRefill: boolean };
}

/** Kết quả chung của mọi hành động */
export interface ActionResult {
  ok: boolean;
  msg?: string;
  reason?: string;
  missing?: Cost;
  [extra: string]: unknown;
}
