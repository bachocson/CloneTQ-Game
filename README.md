# Giang Hồ Chưởng Môn

Game kiếm hiệp cày cuốc, đồ họa pixel, chơi trên trình duyệt điện thoại. Bạn là chưởng môn một môn phái nhỏ: xây công trình, chiêu mộ hiệp khách, luyện đệ tử, rèn binh khí và vượt phó bản.

Bản hiện tại là **bản chơi thử 0.1**: có vòng chơi chính, 20 ải (4 chương), 19 hiệp khách, 4 hệ đệ tử × 5 bậc, 10 công trình, lò rèn và 22 nhiệm vụ chính tuyến.

## Chạy thử

Không cần cài gì, chỉ cần một web server tĩnh:

```bash
python3 -m http.server 8080
# mở http://localhost:8080 trên máy tính, hoặc http://<IP-máy>:8080 trên điện thoại cùng mạng wifi
```

Muốn gói thành **một file HTML** duy nhất để gửi qua điện thoại hoặc đăng lên trang khác:

```bash
npm install
node tools/build-single.mjs          # → dist/game.html
```

Tiến trình tự lưu trong trình duyệt (localStorage). Ở tab Nhiệm vụ có nút chép và nạp mã lưu để chuyển sang máy khác.

## Cấu trúc

```
src/data/      Toàn bộ số liệu: công trình, hiệp khách, tuyệt kỹ, đệ tử, phó bản, trang bị, nhiệm vụ, cân bằng
src/engine/    Luật chơi, thuần JavaScript, không dùng DOM (chạy được cả trong Node)
src/ui/        Giao diện: app.js (màn hình), sprites.js (pixel art vẽ bằng mã), styles.css
tools/bot.js   Bot tự chơi để cân bằng game
tests/         Test cho engine
docs/          Tài liệu thiết kế
```

Muốn thêm hiệp khách, ải, công trình hay đổi con số: sửa file trong `src/data/`, không cần đụng engine.

## Test và bot cân bằng

```bash
npm test                                   # test engine
node tools/bot.js --days=7                 # bot vào game mỗi 15 phút, 14 giờ/ngày, trong 7 ngày
node tools/bot.js --days=7 --interval=60 --active=4   # người chơi lười: 4 giờ/ngày, mỗi giờ vào một lần
node tools/bot.js --days=3 --verbose       # in từng sự kiện
```

Bot in ra từng ngày: cấp chưởng môn, ải đang kẹt, cấp công trình, bậc đệ tử, tài nguyên tồn kho. Đổi số trong `src/data/balance.js` rồi chạy lại bot để xem nhịp độ thay đổi thế nào.

## Bản quyền nội dung

Lối chơi theo thể loại cày cuốc chiến thuật nói chung. Toàn bộ tên nhân vật, võ công, địa danh, binh chủng là tự đặt, không lấy từ tiểu thuyết hay game có sẵn. Đồ họa vẽ bằng mã trong `src/ui/sprites.js`.
