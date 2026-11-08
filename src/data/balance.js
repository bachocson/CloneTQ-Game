// Các hằng số cân bằng chung. Đổi số ở đây, không cần sửa engine.

export const BALANCE = {
  // Tài nguyên khi tạo game mới
  startRes: { luong: 2500, go: 2000, sat: 1000, bac: 1500, nguyenbao: 200 },
  startItems: { tieuHoanDan: 10, daiHoanDan: 0, huyenThiet: 20, biKip: 2 },

  // Offline tối đa bao nhiêu giờ thì ngừng sinh tài nguyên
  offlineCapHours: 12,

  // Thể lực: dùng để đánh phó bản
  stamina: { max: 120, regenSeconds: 120 },

  // Kinh nghiệm chưởng môn cần để lên cấp L → L+1
  playerExpToNext: (lv) => Math.floor(70 * Math.pow(lv, 1.75)),
  playerMaxLevel: 60,

  // Kinh nghiệm hiệp khách cần để lên cấp L → L+1
  heroExpToNext: (lv) => Math.floor(25 * Math.pow(lv, 1.6)),

  // Số hiệp khách được xuất trận theo cấp chưởng môn
  deploySlots: [
    { level: 1, slots: 2 },
    { level: 3, slots: 3 },
    { level: 8, slots: 4 },
    { level: 14, slots: 5 },
  ],

  // Quân số tối đa của một hiệp khách
  maxTroops: (canCot, luyenVoLv) => Math.floor(150 + canCot * 4 + luyenVoLv * 60),

  // Chi phí bổ sung một đệ tử (nhân với bậc binh chủng)
  refillCostPerTroop: { luong: 1.0, bac: 0.15 },

  // Hệ số sát thương: càng lớn trận càng ngắn
  damageK: 0.03,
  counterBonus: 1.3,
  counterPenalty: 0.8,
  schoolBonus: 0.15, // hiệp khách dùng đúng sở trường
  factionBonus: { 3: 0.08, 4: 0.12, 5: 0.18 }, // số người cùng phe trong đội
  maxRounds: 20,
  khiStart: 50,
  khiPerAttack: 25,
  khiPerHit: 10,
  critBase: 0.05,

  // Sao khi thắng: tỉ lệ quân tổn thất tối đa
  starThresholds: [0.25, 0.55],

  // Hoàn thành ngay: 1 nguyên bảo mỗi phút còn lại, miễn phí khi còn ≤ 30 giây
  speedUpFreeSeconds: 30,
  speedUpPerMinute: 1,

  // Tửu lâu
  tavern: {
    freeRefreshSeconds: 2 * 3600,
    refreshCostBac: 300,
    refreshCostNguyenBao: 20,
    candidates: 3,
    recruitCostBac: { 1: 200, 2: 600, 3: 2000, 4: 6000, 5: 15000 },
    // trọng số phẩm chất theo cấp tửu lâu: [q1,q2,q3,q4,q5]
    weights: (lv) => [
      Math.max(5, 40 - lv * 3),
      40,
      12 + lv * 2,
      Math.max(0, lv * 1.2 - 4),
      Math.max(0, lv * 0.4 - 3.5),
    ],
    rosterBase: 4,
    rosterPerLevel: 0.5,
  },
};

export function deploySlotsFor(level) {
  let slots = 1;
  for (const row of BALANCE.deploySlots) if (level >= row.level) slots = row.slots;
  return slots;
}
