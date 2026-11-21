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
  /** binh chủng thứ nhất (sở trường, được cộng công) */
  school: string;
  /** binh chủng thứ hai */
  school2: string;
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

/** Loại hoạt cảnh khi tung chiến pháp (chỉ ảnh hưởng hình ảnh) */
export type SkillVfx = 'slash' | 'pierce' | 'arrows' | 'fire' | 'thunder' | 'formation' | 'roar' | 'charm' | 'command' | 'heal' | 'whirl';

export interface SkillDef {
  name: string;
  desc: string;
  target: SkillTarget;
  mult: number;
  stat: StatKey;
  effects: SkillEffect[];
  vfx?: SkillVfx;
}

/** ngoai = vật công, doc = mưu công, phap = pháp công */
export type DmgType = 'ngoai' | 'doc' | 'phap';

export interface TroopDef {
  name: string;
  desc: string;
  dmgType: DmgType;
  range: 'melee' | 'ranged';
  hp: number;
  atk: number;
  defNgoai: number;
  defDoc: number;
  /** phòng pháp công; bỏ trống thì bằng phòng mưu */
  defPhap?: number;
  speed: number;
  beats: string[];
  tiers: string[];
}

/** Loại binh chủng: mỗi binh chủng có nhiều loại (vd Thương binh: Kích Vệ, Thương Vệ, Giáo Vệ). */
export interface TroopVariantDef {
  id: string;
  /** mã binh chủng */
  troop: string;
  name: string;
  desc: string;
  /** trọng số khi đổi ngẫu nhiên */
  weight: number;
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

/** Chỉ số trận hình tăng cho toàn đội */
export type FormationStat = 'vatCong' | 'vatPhong' | 'muuCong' | 'muuPhong' | 'phapCong' | 'phapPhong' | 'none';

/** Trận hình: lưới 3×3, ô đánh số 1–9 theo hàng (1–3 tiền quân, 4–6 trung quân, 7–9 hậu quân) */
export interface FormationDef {
  id: string;
  name: string;
  desc: string;
  /** 3 chuỗi, mỗi chuỗi 3 ký tự: x = đặt được tướng, o = không */
  rows: [string, string, string];
  stat: FormationStat;
  /** hiệu quả = basePct + max(0, cấp - perLevelFrom + 1) × perLevelPct */
  basePct: number;
  perLevelPct: number;
  perLevelFrom: number;
  maxLevel: number;
  /** fixed: ô mở theo thứ tự unlockOrder (phần tử thứ i mở ở cấp i); free: đặt ô bất kỳ, số ô theo freeCountLevels */
  mode: 'fixed' | 'free';
  unlockOrder: number[];
  freeCountLevels: number[];
  reqQuanMac: number;
  startLevel: number;
}

export type ShopLimit = 'none' | 'daily' | 'weekly' | 'once';

/** Mặt hàng trong cửa hàng: mua bằng nguyên bảo hoặc bạc */
export interface ShopItemDef {
  id: string;
  name: string;
  /** mã tài nguyên, vật phẩm, hoặc "stamina" (thể lực) */
  item: string;
  qty: number;
  currency: 'nguyenbao' | 'bac';
  price: number;
  limit: ShopLimit;
  limitCount: number;
  reqLevel: number;
}

/** Gói ưu đãi: nhiều thứ trong một gói, trả bằng VND (tiền thật), nguyên bảo hoặc bạc */
export interface PackDef {
  id: string;
  name: string;
  desc: string;
  currency: 'vnd' | 'nguyenbao' | 'bac';
  price: number;
  limit: ShopLimit;
  limitCount: number;
  reqLevel: number;
  badge: string;
  color: string;
  contents: Cost;
}

/** Gói nạp nguyên bảo bằng tiền thật */
export interface TopupDef {
  id: string;
  name: string;
  price: number;
  nguyenbao: number;
  firstBonus: number;
  badge: string;
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
  /** chi phí bạc nâng chiến pháp = floor(base * cấp^exp); tàn quyển = cấp hiện tại */
  skillCostBac: PowerFormula;
  /** cứ mỗi bao nhiêu cấp võ tướng thì được thêm 1 cấp chiến pháp tối đa */
  skillHeroLevelStep: number;
  /** giá nâng trận hình lên cấp L+1: bạc = costBacBase × costBacGrowth^L, tàn quyển = costBiKipBase + L × costBiKipPerLevel */
  formation: { costBacBase: number; costBacGrowth: number; costBiKipBase: number; costBiKipPerLevel: number };
  /** nguyên bảo mỗi lần đổi ngẫu nhiên loại binh chủng của một tướng */
  variantRerollCost: number;
}

export interface GameConfig {
  version: string;
  balance: BalanceConfig;
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
  shop: ShopItemDef[];
  packs: PackDef[];
  topups: TopupDef[];
  formations: FormationDef[];
  troopVariants: TroopVariantDef[];
}

// ---------- State lưu game ----------

export interface Hero {
  uid: number;
  tid: string;
  level: number;
  exp: number;
  /** binh chủng đang dẫn (một trong 2 binh chủng của tướng) */
  troopType: string;
  /** loại đang có của từng binh chủng: mã binh chủng → mã loại */
  variants: Record<string, string>;
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
  /** đội hình của trận hình đang dùng, 9 ô (0–8) */
  team: (number | null)[];
  /** trận hình đang dùng */
  formation: string;
  /** cấp trận hình đã nâng (trận hình đã mở mà chưa có ở đây là cấp 0) */
  formations: Record<string, number>;
  /** đội hình đã xếp cho từng trận hình, để đổi qua lại không mất */
  formationTeams: Record<string, (number | null)[]>;
  troopTiers: Record<string, number>;
  equipment: Equipment[];
  campaign: { stars: Record<string, number> };
  tavern: { candidates: string[]; nextFree: number };
  quests: { claimed: Record<string, boolean> };
  /** cheats: số lần dùng công cụ test (save có số này > 0 là đã bị chỉnh tay) */
  stats: { battles: number; wins: number; forged: number; maxEnhance: number; recruited: number; cheats?: number };
  settings: { autoRefill: boolean };
  shop: { bought: Record<string, { key: string; n: number }>; firstTopup: Record<string, boolean>; totalVnd: number; testPurchases: number };
}

/** Kết quả chung của mọi hành động */
export interface ActionResult {
  ok: boolean;
  msg?: string;
  reason?: string;
  missing?: Cost;
  [extra: string]: unknown;
}
