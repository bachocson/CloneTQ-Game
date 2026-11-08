// Hiệp khách. Tên đều tự đặt, không lấy từ tiểu thuyết.
// Chỉ số: canCot (Căn Cốt: quân số, phòng thủ), voLuc (Võ Lực: ngoại công),
// ngoTinh (Ngộ Tính: độc, tuyệt kỹ, kháng độc). growth = tăng mỗi cấp.
// school: hệ sở trường, dùng đúng hệ được cộng sát thương.

export const FACTIONS = {
  chinh: { name: 'Chính Phái', color: '#e8c35a' },
  ta: { name: 'Tà Phái', color: '#c4455a' },
  an: { name: 'Ẩn Thế', color: '#6fb3c9' },
};

export const QUALITIES = {
  1: { name: 'Vô Danh', color: '#9aa0a6' },
  2: { name: 'Thiếu Hiệp', color: '#6cc46c' },
  3: { name: 'Đại Hiệp', color: '#5aa0f0' },
  4: { name: 'Tông Sư', color: '#b67cf0' },
  5: { name: 'Võ Thánh', color: '#f0a040' },
};

// palette: robe, robeDark, hair, accent
export const HEROES = {
  // Vô Danh
  laTieu: { name: 'La Tiểu Cẩu', q: 1, faction: 'chinh', school: 'quyen', base: [34, 30, 20], growth: [1.6, 1.4, 1.0], skill: 'thietDau', palette: ['#8b6b4a', '#5e4630', '#2b1d12', '#c9b28a'], bio: 'Tiểu nhị quán trọ, học lỏm được vài đường quyền.' },
  vuongNhi: { name: 'Vương Nhị Nương', q: 1, faction: 'an', school: 'amkhi', base: [26, 24, 32], growth: [1.1, 1.2, 1.6], skill: 'phiTieu', palette: ['#6d5a7a', '#4a3c55', '#1a1420', '#d0b0d8'], bio: 'Bà chủ tiệm thuốc, ra tay bằng kim bạc.' },
  // Thiếu Hiệp
  lyThanhPhong: { name: 'Lý Thanh Phong', q: 2, faction: 'chinh', school: 'kiem', base: [36, 44, 30], growth: [1.8, 2.3, 1.5], skill: 'luuVanKiem', palette: ['#3d6fb0', '#264a7a', '#1b1b24', '#e8eef8'], bio: 'Đệ tử út phái Thanh Sơn, kiếm pháp nhanh như gió.' },
  duongTieuMai: { name: 'Đường Tiểu Mai', q: 2, faction: 'an', school: 'amkhi', base: [30, 30, 46], growth: [1.5, 1.5, 2.4], skill: 'maiHoaCham', palette: ['#c25a7c', '#8a3a55', '#2a1a20', '#f6d0dc'], bio: 'Con gái nhà làm ám khí, tính khí thất thường.' },
  manhThietNguu: { name: 'Mạnh Thiết Ngưu', q: 2, faction: 'chinh', school: 'quyen', base: [48, 38, 22], growth: [2.5, 1.9, 1.1], skill: 'thietDau', palette: ['#b07a3d', '#7a5226', '#1c140c', '#f0d8a8'], bio: 'Thợ rèn khỏe như trâu, một quyền vỡ đá.' },
  hoTamLang: { name: 'Hồ Tam Lang', q: 2, faction: 'ta', school: 'thuong', base: [40, 42, 26], growth: [2.0, 2.2, 1.3], skill: 'hoanhTaoThienQuan', palette: ['#5a4a3a', '#3a2e24', '#120c08', '#c84a3a'], bio: 'Thổ phỉ Hắc Phong Trại, cây thương không rời tay.' },
  // Đại Hiệp
  toVanHac: { name: 'Tô Vân Hạc', q: 3, faction: 'an', school: 'kiem', base: [42, 54, 44], growth: [2.1, 2.9, 2.2], skill: 'hacMinhCuuThien', palette: ['#e8e4dc', '#b8b0a4', '#2a2a30', '#3a8a9a'], bio: 'Kiếm khách áo trắng, ẩn cư bên hồ Lạc Nhạn.' },
  lacBangNhi: { name: 'Lạc Băng Nhi', q: 3, faction: 'chinh', school: 'amkhi', base: [36, 34, 58], growth: [1.8, 1.7, 3.0], skill: 'hanBangTieu', palette: ['#7ec8e3', '#4a90b0', '#e8f4f8', '#ffffff'], bio: 'Nữ đệ tử Tuyết Lĩnh, ám khí lạnh như băng.' },
  tanBaSon: { name: 'Tần Bá Sơn', q: 3, faction: 'ta', school: 'quyen', base: [60, 48, 30], growth: [3.0, 2.4, 1.5], skill: 'baSonQuyen', palette: ['#7a2a2a', '#521a1a', '#0c0606', '#e0a040'], bio: 'Trại chủ một vùng, quyền phong như núi đổ.' },
  chuHanGiang: { name: 'Chu Hàn Giang', q: 3, faction: 'chinh', school: 'thuong', base: [50, 52, 36], growth: [2.5, 2.6, 1.8], skill: 'giangHaiThuong', palette: ['#2f6b4f', '#1f4a36', '#101814', '#d8e8c0'], bio: 'Tổng tiêu đầu tiêu cục Hàn Giang.' },
  lieuNhuYen: { name: 'Liễu Như Yên', q: 3, faction: 'ta', school: 'amkhi', base: [34, 40, 56], growth: [1.7, 2.0, 2.9], skill: 'yenVuDoc', palette: ['#4a2a5a', '#30183c', '#0e0812', '#9ad04a'], bio: 'Mỹ nhân dùng độc, cười một tiếng là có người ngã.' },
  // Tông Sư
  bachVoNgan: { name: 'Bạch Vô Ngân', q: 4, faction: 'an', school: 'kiem', base: [52, 68, 54], growth: [2.6, 3.6, 2.7], skill: 'vongTinhKiem', palette: ['#f4f4f8', '#c8c8d4', '#d0d0d8', '#6a6af0'], bio: 'Kiếm khách tóc bạc, nghe nói chưa từng rút kiếm hai lần.' },
  hacSatThien: { name: 'Hắc Sát Thiên', q: 4, faction: 'ta', school: 'quyen', base: [74, 60, 40], growth: [3.7, 3.0, 2.0], skill: 'hacSatChuong', palette: ['#20202a', '#101016', '#05050a', '#d03030'], bio: 'Giáo chủ một tà giáo, chưởng lực âm hàn.' },
  phongLinhTu: { name: 'Phong Linh Tử', q: 4, faction: 'an', school: 'amkhi', base: [46, 46, 72], growth: [2.3, 2.3, 3.6], skill: 'phongLinhVanTieu', palette: ['#8ac8a0', '#5a9a70', '#203028', '#f0f0c0'], bio: 'Đạo sĩ vân du, tay áo giấu ngàn phi tiêu.' },
  taKinhThuong: { name: 'Tạ Kình Thương', q: 4, faction: 'chinh', school: 'thuong', base: [64, 66, 46], growth: [3.2, 3.3, 2.3], skill: 'kinhLoiThuong', palette: ['#c8a040', '#8a6a20', '#201808', '#f8f0d0'], bio: 'Đại tướng quân về ở ẩn, thương pháp như sấm.' },
  // Võ Thánh
  thaiHuChanNhan: { name: 'Thái Hư Chân Nhân', q: 5, faction: 'an', school: 'kiem', base: [66, 84, 76], growth: [3.3, 4.4, 3.8], skill: 'thaiHuKiemY', palette: ['#5a5ab0', '#3a3a80', '#e8e8f0', '#f0d060'], bio: 'Đạo nhân trăm tuổi, kiếm ý vô hình.' },
  kimCuongDaiSu: { name: 'Kim Cương Đại Sư', q: 5, faction: 'chinh', school: 'quyen', base: [92, 72, 58], growth: [4.6, 3.6, 2.9], skill: 'kimCuongBatHoai', palette: ['#e0a030', '#b07818', '#e0a030', '#f8e8b0'], bio: 'Phương trượng chùa Thạch Lâm, thân như kim cương.' },
  huyetMaLaoTo: { name: 'Huyết Ma Lão Tổ', q: 5, faction: 'ta', school: 'amkhi', base: [62, 64, 90], growth: [3.1, 3.2, 4.6], skill: 'huyetMaDocVu', palette: ['#8a1020', '#5a0814', '#c0c0c0', '#40ff60'], bio: 'Ma đầu sống sót qua ba lần vây quét của võ lâm.' },
  loiChan: { name: 'Lôi Chấn', q: 5, faction: 'ta', school: 'thuong', base: [80, 86, 56], growth: [4.0, 4.4, 2.8], skill: 'loiDinhVanQuan', palette: ['#303848', '#1c2230', '#0a0c10', '#60c0ff'], bio: 'Thương thần phương Bắc, mỗi đòn kèm tiếng sấm.' },
};

// Tuyệt kỹ. target: single | row | back | all | random2 | random3
// stat: chỉ số dùng tính sát thương. effects: hiệu ứng thêm.
export const SKILLS = {
  thietDau: { name: 'Thiết Đầu Công', desc: 'Húc một mục tiêu, 30% gây choáng 1 lượt.', target: 'single', mult: 1.5, stat: 'voLuc', effects: [{ type: 'stun', chance: 0.3, turns: 1 }] },
  phiTieu: { name: 'Liên Hoàn Phi Tiêu', desc: 'Ném tiêu vào 2 mục tiêu ngẫu nhiên.', target: 'random2', mult: 0.9, stat: 'ngoTinh', effects: [] },
  luuVanKiem: { name: 'Lưu Vân Kiếm', desc: 'Chém một mục tiêu, tăng 15% công bản thân 2 lượt.', target: 'single', mult: 1.7, stat: 'voLuc', effects: [{ type: 'buffAtk', pct: 0.15, turns: 2, self: true }] },
  maiHoaCham: { name: 'Mai Hoa Châm', desc: 'Bắn cả hàng sau, gây trúng độc 2 lượt.', target: 'back', mult: 0.9, stat: 'ngoTinh', effects: [{ type: 'poison', pct: 0.25, turns: 2 }] },
  hoanhTaoThienQuan: { name: 'Hoành Tảo Thiên Quân', desc: 'Quét cả hàng trước.', target: 'row', mult: 1.0, stat: 'voLuc', effects: [] },
  hacMinhCuuThien: { name: 'Hạc Minh Cửu Thiên', desc: 'Một kiếm cực mạnh vào mục tiêu ít quân nhất.', target: 'weakest', mult: 2.4, stat: 'voLuc', effects: [] },
  hanBangTieu: { name: 'Hàn Băng Tiêu', desc: 'Đánh 3 mục tiêu, 25% đóng băng 1 lượt.', target: 'random3', mult: 0.8, stat: 'ngoTinh', effects: [{ type: 'stun', chance: 0.25, turns: 1 }] },
  baSonQuyen: { name: 'Bạt Sơn Quyền', desc: 'Đánh hàng trước, giảm 20% phòng 2 lượt.', target: 'row', mult: 1.1, stat: 'voLuc', effects: [{ type: 'defDown', pct: 0.2, turns: 2 }] },
  giangHaiThuong: { name: 'Giang Hải Thương', desc: 'Đâm xuyên một mục tiêu, hồi 10% quân đã mất cho bản thân.', target: 'single', mult: 1.9, stat: 'voLuc', effects: [{ type: 'heal', pct: 0.1, self: true }] },
  yenVuDoc: { name: 'Yên Vũ Độc', desc: 'Rải độc toàn bộ địch 3 lượt.', target: 'all', mult: 0.45, stat: 'ngoTinh', effects: [{ type: 'poison', pct: 0.35, turns: 3 }] },
  vongTinhKiem: { name: 'Vong Tình Kiếm', desc: 'Chém cả hàng trước, hút 30 khí của mỗi mục tiêu.', target: 'row', mult: 1.35, stat: 'voLuc', effects: [{ type: 'khiDrain', amount: 30 }] },
  hacSatChuong: { name: 'Hắc Sát Chưởng', desc: 'Đánh toàn bộ địch, giảm 15% công 2 lượt.', target: 'all', mult: 0.75, stat: 'voLuc', effects: [{ type: 'atkDown', pct: 0.15, turns: 2 }] },
  phongLinhVanTieu: { name: 'Phong Linh Vạn Tiêu', desc: 'Mưa tiêu toàn bộ địch.', target: 'all', mult: 0.85, stat: 'ngoTinh', effects: [] },
  kinhLoiThuong: { name: 'Kinh Lôi Thương', desc: 'Đánh hàng trước, 35% choáng 1 lượt.', target: 'row', mult: 1.2, stat: 'voLuc', effects: [{ type: 'stun', chance: 0.35, turns: 1 }] },
  thaiHuKiemY: { name: 'Thái Hư Kiếm Ý', desc: 'Kiếm ý phủ toàn trận, tăng 20% công cả đội 2 lượt.', target: 'all', mult: 1.0, stat: 'voLuc', effects: [{ type: 'teamBuffAtk', pct: 0.2, turns: 2 }] },
  kimCuongBatHoai: { name: 'Kim Cương Bất Hoại', desc: 'Đánh hàng trước, hồi 15% quân đã mất cho cả đội.', target: 'row', mult: 1.1, stat: 'canCot', effects: [{ type: 'teamHeal', pct: 0.15 }] },
  huyetMaDocVu: { name: 'Huyết Ma Độc Vũ', desc: 'Độc toàn trận 3 lượt, hút 20 khí mỗi mục tiêu.', target: 'all', mult: 0.7, stat: 'ngoTinh', effects: [{ type: 'poison', pct: 0.4, turns: 3 }, { type: 'khiDrain', amount: 20 }] },
  loiDinhVanQuan: { name: 'Lôi Đình Vạn Quân', desc: 'Sấm sét toàn trận, 25% choáng 1 lượt.', target: 'all', mult: 1.0, stat: 'voLuc', effects: [{ type: 'stun', chance: 0.25, turns: 1 }] },
  // Chiêu của địch
  sonTacDao: { name: 'Loạn Đao', desc: 'Chém loạn 2 mục tiêu.', target: 'random2', mult: 1.0, stat: 'voLuc', effects: [] },
  docChuong: { name: 'Độc Chưởng', desc: 'Một chưởng độc.', target: 'single', mult: 1.4, stat: 'ngoTinh', effects: [{ type: 'poison', pct: 0.3, turns: 2 }] },
};

export const STARTER_HEROES = ['lyThanhPhong', 'manhThietNguu'];
