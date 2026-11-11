# Định hướng mỹ thuật

Phong cách: **hoạt hình 2.5D cho mobile**. Khối tròn, viền nâu đậm, đổ bóng, màu tươi, nhìn chéo kiểu isometric. Lấy cảm hứng chung từ dòng game chiến thuật hoạt hình trên điện thoại. Không dùng nhân vật, hình ảnh, font hay giao diện của game khác.

Bối cảnh: Tam Quốc. Nhân vật là nhân vật lịch sử, vẽ theo kiểu chibi (đầu to bằng 1/2 chiều cao).

Bản web hiện tại vẽ mọi thứ bằng mã (`web/src/sprites.js`). Đây là **bản mẫu**, dùng để thống nhất bố cục, tỉ lệ và màu sắc trước khi đặt vẽ thật hoặc dựng trong Cocos Creator.

## Bảng màu

| Vai trò | Màu |
|---|---|
| Viền, chữ đậm | `#2b1d14` |
| Nền khung (giấy) | `#fbf3dc`, gờ dưới `#efe2bd` |
| Nút chính (xanh lá) | `#6cc644` → `#3f8a22` |
| Nút vàng | `#ffc83d` → `#c98a12` |
| Nút xanh dương, tab đang chọn | `#3fa4f0` → `#1f6fb2` |
| Đỏ (ruy băng, cảnh báo) | `#ec4e3c` → `#9e2a1d` |
| Trời | `#6cc3f5` → `#bfe7ff` |
| Cỏ | `#8fd15a` → `#6fbe45` |
| Phe Ngụy / Thục / Ngô / Quần Hùng | `#3b7fd9` / `#3fae4f` / `#e0463c` / `#9b5cc9` |
| Độ hiếm Thường → Huyền Thoại | `#a7b0ba`, `#5fd068`, `#4fa8ff`, `#c070ff`, `#ffb02e` |

## Chữ

- Tiêu đề, số: **Paytone One**, chữ trắng viền nâu đậm 2px và bóng đổ xuống 4px.
- Nội dung: **Baloo 2** (600–800).
- Cả hai đều có đủ dấu tiếng Việt, miễn phí (Google Fonts, giấy phép OFL).

## Thành phần giao diện

- **Khung:** bo góc 14px, viền 3px, gờ tối 4px ở đáy, bóng đổ 4px.
- **Nút:** gradient dọc, viền 3px, gờ tối ở đáy và gờ sáng ở trên; nhấn thì lún 2px.
- **Thẻ tướng:** khung màu theo độ hiếm, ảnh nền màu phe, cấp ở góc trái, tên viền chữ ở dưới, thanh binh lực đỏ.
- **Thanh tài nguyên:** viên thuốc tối mờ, biểu tượng to tràn ra mép trái.
- **Công trình trên bản đồ:** huy hiệu cấp màu xanh ở chân, mũi tên xanh nhấp nhô khi nâng cấp được, thanh tiến độ khi đang xây.

## Kích thước ảnh khi đặt vẽ

| Loại | Kích thước gốc | Ghi chú |
|---|---|---|
| Võ tướng (chibi) | 192 × 192 px | Nền trong suốt, chân chạm đáy, bóng đổ elip dưới chân |
| Võ tướng kỵ binh | 192 × 192 px | Người cưỡi ngựa nhìn nghiêng 3/4 sang phải |
| Công trình | 320 × 300 px | Isometric 2:1, điểm đặt ở 76% chiều cao (giữa nền nhà) |
| Biểu tượng tài nguyên | 80 × 80 px | Viền đậm, có mảng sáng |
| Nền bản đồ thành | 1040 × 832 px | Hình thoi isometric, có tường và đường đi |

Khi có ảnh thật, thay hàm vẽ tương ứng trong `sprites.js` (hoặc gán ảnh vào node trong Cocos) mà không cần đổi luật chơi hay dữ liệu.
