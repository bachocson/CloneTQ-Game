// Trang bị: 3 ô. Bậc rèn tối đa = 1 + floor(cấp Lò Rèn / 4).
export const EQUIP_SLOTS = {
  weapon: { name: 'Binh khí', stat: 'voLuc', tierNames: ['Thiết Kiếm', 'Thanh Cương Kiếm', 'Hàn Thiết Đao', 'Huyền Thiết Trọng Kiếm', 'Thất Tinh Bảo Kiếm'] },
  armor: { name: 'Y phục', stat: 'canCot', tierNames: ['Áo Vải Thô', 'Giáp Da', 'Nhuyễn Giáp', 'Kim Ti Giáp', 'Thiên Tằm Bảo Y'] },
  acc: { name: 'Ngọc bội', stat: 'ngoTinh', tierNames: ['Ngọc Bội Đá', 'Bạch Ngọc Bội', 'Phỉ Thúy Bội', 'Huyết Ngọc Bội', 'Thông Linh Bảo Ngọc'] },
};

export const EQUIP_QUALITIES = [
  { name: 'Thường', color: '#c8c8c8', mult: 1.0, weight: 50 },
  { name: 'Tốt', color: '#6cc46c', mult: 1.3, weight: 32 },
  { name: 'Hiếm', color: '#5aa0f0', mult: 1.7, weight: 14 },
  { name: 'Quý', color: '#b67cf0', mult: 2.2, weight: 4 },
];

export const EQUIP = {
  statPerTier: 8, // chỉ số gốc = statPerTier * tier * hệ số phẩm chất
  enhancePct: 0.1, // mỗi cấp cường hóa +10% chỉ số gốc
  maxEnhancePerLoRen: 2, // giới hạn cường hóa = cấp Lò Rèn * 2
  forgeCost: (tier) => ({ sat: Math.floor(200 * Math.pow(2.2, tier - 1)), bac: Math.floor(150 * Math.pow(2.2, tier - 1)) }),
  forgeHuyenThiet: (tier) => tier * 3,
  enhanceCost: (tier, lv) => ({ sat: Math.floor(60 * tier * Math.pow(1.25, lv)), bac: Math.floor(80 * tier * Math.pow(1.25, lv)) }),
  enhanceHuyenThiet: (lv) => (lv >= 5 ? Math.ceil(lv / 3) : 0),
  sellRatio: 0.3,
};
