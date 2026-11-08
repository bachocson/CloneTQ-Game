// Nhiệm vụ chính tuyến: dẫn người chơi qua từng hệ thống. Làm lần lượt theo thứ tự.
// cond.type: building | stage | playerLevel | heroCount | heroLevel | tier | forged | enhanced | skillLevel
// stage dùng mã 'chương-ải', ví dụ '1-3'.

export const QUESTS = [
  { id: 'q1', name: 'Khai hoang', desc: 'Nâng Ruộng Lúa lên cấp 2.', cond: { type: 'building', id: 'ruong', level: 2 }, reward: { luong: 500, go: 300 } },
  { id: 'q2', name: 'Ra tay trừ bạo', desc: 'Vượt ải 1-1.', cond: { type: 'stage', id: '1-1' }, reward: { bac: 400, tieuHoanDan: 3 } },
  { id: 'q3', name: 'Tích trúc', desc: 'Nâng Rừng Trúc lên cấp 2.', cond: { type: 'building', id: 'xuongGo', level: 2 }, reward: { go: 500, luong: 300 } },
  { id: 'q4', name: 'Dẹp yên đầu trấn', desc: 'Vượt ải 1-3.', cond: { type: 'stage', id: '1-3' }, reward: { bac: 600, nguyenbao: 30 } },
  { id: 'q5', name: 'Mở rộng chính điện', desc: 'Nâng Chính Điện lên cấp 3.', cond: { type: 'building', id: 'chinhDien', level: 3 }, reward: { go: 1000, sat: 400 } },
  { id: 'q6', name: 'Chiêu hiền đãi sĩ', desc: 'Có 3 hiệp khách.', cond: { type: 'heroCount', count: 3 }, reward: { tieuHoanDan: 5, bac: 500 } },
  { id: 'q7', name: 'Trừ Độc Nhãn Hổ', desc: 'Vượt ải trùm 1-5.', cond: { type: 'stage', id: '1-5' }, reward: { nguyenbao: 50, huyenThiet: 10, biKip: 2 } },
  { id: 'q8', name: 'Luyện binh', desc: 'Xây Luyện Võ Trường cấp 1.', cond: { type: 'building', id: 'luyenVo', level: 1 }, reward: { luong: 1500, sat: 600 } },
  { id: 'q9', name: 'Đệ tử tinh nhuệ', desc: 'Nghiên cứu bậc 2 cho một hệ đệ tử.', cond: { type: 'tier', tier: 2 }, reward: { bac: 1500, tieuHoanDan: 5 } },
  { id: 'q10', name: 'Danh chấn một vùng', desc: 'Đạt cấp chưởng môn 5.', cond: { type: 'playerLevel', level: 5 }, reward: { nguyenbao: 60, daiHoanDan: 1 } },
  { id: 'q11', name: 'Tiến vào Hắc Phong', desc: 'Vượt ải 2-2.', cond: { type: 'stage', id: '2-2' }, reward: { luong: 2500, go: 2500 } },
  { id: 'q12', name: 'Đốt lò', desc: 'Xây Lò Rèn cấp 1.', cond: { type: 'building', id: 'loRen', level: 1 }, reward: { sat: 1500, huyenThiet: 10 } },
  { id: 'q13', name: 'Binh khí đầu tay', desc: 'Rèn 1 trang bị.', cond: { type: 'forged', count: 1 }, reward: { bac: 1500, huyenThiet: 6 } },
  { id: 'q14', name: 'Mài sắc', desc: 'Cường hóa một trang bị lên +3.', cond: { type: 'enhanced', level: 3 }, reward: { sat: 2000, bac: 1500 } },
  { id: 'q15', name: 'Dẹp Hắc Phong Trại', desc: 'Vượt ải trùm 2-5.', cond: { type: 'stage', id: '2-5' }, reward: { nguyenbao: 80, daiHoanDan: 2, biKip: 3 } },
  { id: 'q16', name: 'Khổ luyện', desc: 'Có một hiệp khách cấp 12.', cond: { type: 'heroLevel', level: 12 }, reward: { tieuHoanDan: 10, bac: 2500 } },
  { id: 'q17', name: 'Tàng kinh', desc: 'Xây Tàng Kinh Các cấp 1.', cond: { type: 'building', id: 'tangKinh', level: 1 }, reward: { biKip: 4, bac: 2000 } },
  { id: 'q18', name: 'Tuyệt kỹ tinh thông', desc: 'Nâng một tuyệt kỹ lên cấp 3.', cond: { type: 'skillLevel', level: 3 }, reward: { nguyenbao: 60, daiHoanDan: 1 } },
  { id: 'q19', name: 'Bến đò dậy sóng', desc: 'Vượt ải trùm 3-5.', cond: { type: 'stage', id: '3-5' }, reward: { nguyenbao: 120, daiHoanDan: 3, huyenThiet: 20 } },
  { id: 'q20', name: 'Bậc thầy luyện binh', desc: 'Nghiên cứu bậc 3 cho một hệ đệ tử.', cond: { type: 'tier', tier: 3 }, reward: { luong: 8000, sat: 4000, bac: 6000 } },
  { id: 'q21', name: 'Đại hội võ lâm', desc: 'Đạt cấp chưởng môn 15.', cond: { type: 'playerLevel', level: 15 }, reward: { nguyenbao: 150, daiHoanDan: 3 } },
  { id: 'q22', name: 'Đỉnh Thiên Kiếm', desc: 'Vượt ải trùm 4-5.', cond: { type: 'stage', id: '4-5' }, reward: { nguyenbao: 300, daiHoanDan: 5, biKip: 6 } },
];
