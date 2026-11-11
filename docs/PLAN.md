# Kế hoạch kỹ thuật

## Chọn công nghệ

| Mục tiêu | Lựa chọn |
|---|---|
| Chạy tốt trên mobile, chống lag | **Cocos Creator 3.8** (2D, WebGL/native, nhẹ) |
| Bạn tự chỉnh UI, hình ảnh | Editor kéo thả của Cocos Creator (Windows) |
| Bạn tự chỉnh số liệu | Excel `config/DuLieuGame.xlsx` → JSON, có kiểm tra lỗi |
| Chi phí thấp | Cocos Creator, Node.js, PostgreSQL đều miễn phí. Chỉ tốn phí tài khoản Google Play (một lần) / App Store (hằng năm) khi phát hành |
| Dễ test trên PC | Bản web (`choi-thu.bat`) và nút Preview của Cocos chạy ngay trên trình duyệt |
| Phát hành online sau này | `core/` TypeScript thuần chạy được cả trên server Node.js để xác nhận mọi hành động |

## Kiến trúc

```
                 config/DuLieuGame.xlsx
                         │ npm run config (kiểm tra lỗi)
                         ▼
                 config/game-config.json
                         │
        ┌────────────────┼──────────────────┐
        ▼                ▼                  ▼
   web/ (thử nhanh)   cocos/ (bản chính)   server/ (sau này)
        └────────────────┴──────────────────┘
                 cùng dùng core/src (luật chơi)
```

- `core/` không dùng DOM, không dùng API của Cocos. Mọi hàm nhận `state` và `now`, nên chạy được ở client, server và bot.
- Trận đánh tính xong ngay bằng seed; client chỉ phát lại `log`. Server chạy lại với cùng seed là ra cùng kết quả, dùng để chống gian lận.

## Các bước

1. **Xong:** `core/` TypeScript, cấu hình Excel, bot, test. Bot cho kết quả trùng khớp với bản 0.1.
2. **Client Cocos Creator:**
   - Bạn cài Cocos Dashboard và Cocos Creator 3.8 trên Windows.
   - Mình tạo dự án `cocos/`. Script đồng bộ chép `core/src` và `game-config.json` vào `cocos/assets`.
   - Mình viết các component: thanh tài nguyên, danh sách công trình, đội hình, phát lại trận đánh, lưu game. Mỗi component gắn vào node theo tên, nên bạn kéo thả, đổi hình, đổi bố cục thoải mái mà không cần sửa code.
   - Kiểm tra: kết nối máy Windows vào phiên làm việc (Remote Control trong ứng dụng Claude) để mình chạy build và xem lỗi trực tiếp, hoặc bạn build rồi gửi ảnh và lỗi.
3. **Android:** build từ Cocos Creator (cần Android Studio/SDK), thử trên máy thật.
4. **Server:** Node.js + PostgreSQL. Client gửi hành động, server chạy `core/` để xác nhận. Thời gian offline tính theo giờ server.
