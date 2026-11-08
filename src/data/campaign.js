// Phó bản: mỗi chương 5 ải, ải 5 là trùm. Đội địch sinh theo công thức trong engine/campaign.js
// từ chỉ số độ khó (power) của từng ải, để dễ thêm chương mới.

export const CHAPTERS = [
  {
    id: 1, name: 'Trấn Thanh Thủy', reqLevel: 1,
    desc: 'Sơn tặc kéo về quấy nhiễu trấn nhỏ dưới chân núi.',
    enemyNames: ['Sơn Tặc', 'Lâu La', 'Đầu Mục'],
    boss: { name: 'Độc Nhãn Hổ', type: 'thuong', skill: 'sonTacDao' },
    palette: ['#6a5a40', '#4a3e2c', '#1a140c', '#a04030'],
  },
  {
    id: 2, name: 'Rừng Hắc Phong', reqLevel: 5,
    desc: 'Hắc Phong Trại chiếm rừng, cướp tiêu xa.',
    enemyNames: ['Lâu La Hắc Phong', 'Đao Phỉ', 'Cung Thủ Rừng'],
    boss: { name: 'Hắc Phong Trại Chủ', type: 'quyen', skill: 'sonTacDao' },
    palette: ['#2a3a2a', '#1a261a', '#0a100a', '#60a040'],
  },
  {
    id: 3, name: 'Bến Đò Lạc Nhạn', reqLevel: 10,
    desc: 'Thủy khấu và Độc Môn tranh giành bến đò.',
    enemyNames: ['Thủy Khấu', 'Độc Môn Đồ', 'Sát Thủ Áo Đen'],
    boss: { name: 'Độc Môn Hộ Pháp', type: 'amkhi', skill: 'docChuong' },
    palette: ['#2a3a5a', '#1a263c', '#0a0e18', '#40c0a0'],
  },
  {
    id: 4, name: 'Núi Thiên Kiếm', reqLevel: 15,
    desc: 'Phản đồ kiếm phái chiếm đỉnh núi, thách đấu võ lâm.',
    enemyNames: ['Kiếm Đồ Phản Môn', 'Thủ Sơn Kiếm Sĩ', 'Trưởng Lão Phản Đồ'],
    boss: { name: 'Thiên Kiếm Phản Đồ', type: 'kiem', skill: 'luuVanKiem' },
    palette: ['#5a5a6a', '#3a3a48', '#101014', '#e0e0f0'],
  },
];

export const STAGES_PER_CHAPTER = 5;
export const STAMINA_PER_FIGHT = 6;
