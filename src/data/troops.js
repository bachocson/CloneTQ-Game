// Bốn hệ đệ tử. Vòng khắc chế: Quyền > Thương > Kiếm > Quyền. Kiếm cũng khắc Ám Khí.
// dmgType: 'ngoai' (ngoại công) hoặc 'doc' (độc, ám khí).
// Mỗi bậc nhân hp/atk/def theo TIER_MULT. reqLuyenVo: cấp Luyện Võ Trường để nghiên cứu.

export const TROOP_TYPES = {
  quyen: {
    name: 'Quyền',
    desc: 'Võ tăng tay không. Máu dày, chậm. Khắc Thương.',
    dmgType: 'ngoai',
    range: 'melee',
    hp: 12, atk: 0.9, defNgoai: 1.2, defDoc: 1.0, speed: 7,
    beats: ['thuong'],
    tiers: ['Hương Dũng', 'Thiết Quyền Tăng', 'Kim Cương Võ Tăng', 'La Hán Trận', 'Bất Động Minh Vương'],
  },
  thuong: {
    name: 'Thương',
    desc: 'Trường côn, trường thương. Cân bằng. Khắc Kiếm.',
    dmgType: 'ngoai',
    range: 'melee',
    hp: 10, atk: 1.0, defNgoai: 1.05, defDoc: 0.95, speed: 9,
    beats: ['kiem'],
    tiers: ['Trường Côn Binh', 'Thiết Thương Vệ', 'Bá Vương Thương', 'Liệt Hỏa Thương Trận', 'Phá Quân Vệ'],
  },
  kiem: {
    name: 'Kiếm',
    desc: 'Kiếm khách nhanh nhẹn, ra đòn trước. Khắc Quyền và Ám Khí.',
    dmgType: 'ngoai',
    range: 'melee',
    hp: 9, atk: 1.12, defNgoai: 0.9, defDoc: 0.9, speed: 12,
    beats: ['quyen', 'amkhi'],
    tiers: ['Kiếm Đồng', 'Kiếm Khách', 'Lưu Vân Kiếm Sĩ', 'Thất Tinh Kiếm Trận', 'Kiếm Tiên Vệ'],
  },
  amkhi: {
    name: 'Ám Khí',
    desc: 'Phi tiêu, độc châm. Đánh thẳng hàng sau, gây sát thương độc. Máu mỏng.',
    dmgType: 'doc',
    range: 'ranged',
    hp: 7, atk: 1.05, defNgoai: 0.75, defDoc: 1.2, speed: 11,
    beats: [],
    tiers: ['Phi Tiêu Thủ', 'Ám Tiễn Khách', 'Độc Châm Môn Đồ', 'Vạn Độc Thủ', 'U Linh Sát Thủ'],
  },
};

export const TROOP_ORDER = ['quyen', 'thuong', 'kiem', 'amkhi'];

export const TIER_MULT = [1.0, 1.25, 1.55, 1.9, 2.3];

// Điều kiện và chi phí nghiên cứu bậc 2..5 (index = bậc - 1)
export const TIER_RESEARCH = [
  null,
  { reqLuyenVo: 1, cost: { luong: 800, sat: 300, bac: 600 } },
  { reqLuyenVo: 5, cost: { luong: 4000, sat: 1800, bac: 3000 } },
  { reqLuyenVo: 10, cost: { luong: 15000, sat: 7000, bac: 12000 } },
  { reqLuyenVo: 15, cost: { luong: 50000, sat: 25000, bac: 40000 } },
];
