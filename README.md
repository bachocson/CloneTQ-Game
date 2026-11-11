# Giang Hồ Chưởng Môn

Game kiếm hiệp cày cuốc chiến thuật cho điện thoại. Bạn là chưởng môn một môn phái nhỏ: xây công trình, chiêu mộ hiệp khách, luyện đệ tử, rèn binh khí, vượt phó bản.

Phiên bản 0.2: luật chơi viết bằng TypeScript, dùng chung được cho bản web, bản Cocos Creator và server online sau này. Toàn bộ số liệu nằm trong **một file Excel**.

## Bắt đầu trên Windows

1. Cài [Node.js](https://nodejs.org) bản LTS (chỉ cần một lần).
2. Bấm đúp **`cai-dat.bat`** (chỉ cần một lần).
3. Bấm đúp **`choi-thu.bat`**: trình duyệt tự mở game. Điện thoại cùng mạng wifi thì mở địa chỉ IP hiện trong cửa sổ đen.

| File | Dùng khi |
|---|---|
| `choi-thu.bat` | Chơi thử trên PC hoặc điện thoại. Sửa Excel và lưu là game tự cập nhật. |
| `cap-nhat-du-lieu.bat` | Kiểm tra file Excel và cập nhật dữ liệu game (khi không chạy `choi-thu.bat`). |
| `bot-can-bang.bat` | Cho bot tự chơi 7 ngày, xem nhịp độ tiến trình sau khi đổi số. |

## Sửa số liệu: `config/GiangHo.xlsx`

Mỗi sheet là một loại dữ liệu: Cân bằng, Công trình, Hiệp khách, Tuyệt kỹ, Đệ tử, Bậc đệ tử, Chương, Nhiệm vụ, Trang bị… Sheet **Hướng dẫn** trong file giải thích quy tắc. Rê chuột vào tiêu đề cột để xem ghi chú.

Sửa xong, lưu file. Công cụ kiểm tra và báo lỗi đúng chỗ, ví dụ:

```
✗ [Hiệp khách] dòng 4, cột "Căn Cốt gốc": "năm mươi" không phải con số
✗ [Hiệp khách] lyThanhPhong: tuyệt kỹ "khongCo" không có trong sheet Tuyệt kỹ
```

Có lỗi thì dữ liệu game giữ nguyên bản cũ, không bị hỏng. Chi tiết: [docs/CONFIG.md](docs/CONFIG.md).

## Cấu trúc

```
config/GiangHo.xlsx       ← bạn sửa file này
config/game-config.json   ← sinh ra từ Excel, game đọc file này (đừng sửa tay)
core/src/                 Luật chơi (TypeScript, không phụ thuộc giao diện): dùng chung cho web, Cocos, server
web/                      Bản chơi thử chạy trên trình duyệt
tools/config/             Công cụ Excel ↔ JSON và kiểm tra lỗi
tools/bot.ts              Bot tự chơi để cân bằng
tests/                    Test tự động
docs/                     Tài liệu thiết kế, hướng dẫn cấu hình, kế hoạch
```

## Lệnh cho người lập trình

```bash
npm install
npm run dev              # chạy thử, tự tải lại khi sửa code hoặc Excel
npm run config           # Excel → JSON (có kiểm tra)
npm run config:export    # JSON → Excel (sao lưu file Excel cũ trước khi ghi đè)
npm test                 # test engine + test cấu hình
npm run typecheck        # kiểm tra kiểu TypeScript
npm run bot -- --days=7 --interval=15 --active=14
npm run build            # dist/game.html: cả game trong một file
```

## Kế hoạch

- [x] Luật chơi TypeScript dùng chung, số liệu trong Excel, bot cân bằng, test
- [ ] Client Cocos Creator (Windows): UI và hình ảnh chỉnh bằng kéo thả, dùng chung `core/`
- [ ] Đóng gói Android
- [ ] Server online: kiểm tra mọi hành động bằng cùng `core/`, chống chỉnh giờ

Xem [docs/PLAN.md](docs/PLAN.md).

## Bản quyền nội dung

Lối chơi theo thể loại cày cuốc chiến thuật nói chung. Tên nhân vật, võ công, địa danh, binh chủng đều tự đặt. Đồ họa vẽ bằng mã trong `web/src/sprites.js`.
