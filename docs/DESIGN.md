# Thiết kế: Giang Hồ Chưởng Môn

## Ý tưởng

Game cày cuốc chiến thuật, bối cảnh kiếm hiệp. Người chơi làm chưởng môn, phát triển môn phái theo nhiều hệ thống đan xen. Mỗi hệ thống vừa là nguồn sức mạnh vừa là chỗ tiêu tài nguyên. Nhịp chơi: vào game vài phút mỗi lần, nhiều lần mỗi ngày.

## Vòng chơi chính

```
Công trình sinh tài nguyên ──► Nâng công trình, nghiên cứu bậc đệ tử, rèn đồ
        ▲                                   │
        │                                   ▼
Thưởng phó bản (bạc, lương, đan, nguyên liệu) ◄── Đánh phó bản (tốn thể lực, tốn quân)
        │                                   ▲
        ▼                                   │
Kinh nghiệm chưởng môn ──► mở cấp công trình, số người xuất trận, chương mới
```

- **Cấp chưởng môn** là thước đo tiến trình chính. Nó giới hạn cấp Chính Điện, cấp hiệp khách và số người xuất trận, đồng thời mở chương mới và công trình mới.
- **Chính Điện** giới hạn cấp mọi công trình khác.
- **Quân số** là chỗ tiêu lương thực lớn nhất: mỗi trận mất đệ tử, phải bổ sung bằng lương và bạc.
- **Thể lực** giới hạn số trận mỗi ngày (hồi 1 điểm mỗi 2 phút, tối đa 120).

## Hệ thống

| Hệ thống | Có trong 0.1 | Ghi chú |
|---|---|---|
| Công trình, tài nguyên, kho, offline | Có | 10 công trình, 1 hàng đợi xây, offline tối đa 12 giờ |
| Hiệp khách: 3 chỉ số, trưởng thành, phe | Có | Căn Cốt / Võ Lực / Ngộ Tính; Chính Phái / Tà Phái / Ẩn Thế, đủ 3 người cùng phe được cộng công |
| Đệ tử 4 hệ × 5 bậc, khắc chế | Có | Quyền › Thương › Kiếm › Quyền, Kiếm khắc Ám Khí; Ám Khí đánh hàng sau, gây độc |
| Trận đánh theo lượt, khí, tuyệt kỹ | Có | 2 hàng × 3 cột, khí đầy 100 tung tuyệt kỹ; choáng, độc, giảm công/phòng, hồi quân |
| Phó bản, sao, càn quét | Có | 4 chương × 5 ải; 3 sao mới càn quét được |
| Tửu lâu (chiêu mộ) | Có | 3 khách, làm mới miễn phí mỗi 2 giờ, phẩm chất theo cấp tửu lâu |
| Lò rèn: rèn, cường hóa | Có | 3 ô trang bị, 5 bậc, 4 phẩm chất |
| Nhiệm vụ chính tuyến | Có | 22 nhiệm vụ dẫn người chơi qua từng hệ thống |
| Tri kỷ, hậu duệ (kiểu nuôi dưỡng) | Chưa | Bản sau: tri kỷ cộng chỉ số, đủ thân mật thì có đệ tử chân truyền để nuôi |
| Chiến mã / linh thú | Chưa | Cộng chỉ số toàn đội, nâng theo bậc |
| Binh thư / trận pháp | Chưa | Kích hoạt ở lượt 3 và 6 |
| Hoạt động ngày, tháp thử thách, sự kiện | Chưa | |

## Công thức chính

- Chỉ số hiệp khách = gốc + trưởng thành × (cấp − 1) + trang bị.
- Quân tối đa = 150 + 4 × Căn Cốt + 60 × cấp Luyện Võ Trường.
- Sát thương (số đệ tử bị hạ) = công × 100 / (100 + phòng) × quân bên đánh × 0,03 × khắc chế × ngẫu nhiên (0,92–1,08) × hệ số chiêu ÷ máu mỗi đệ tử.
- Khắc chế: ×1,3 khi khắc, ×0,8 khi bị khắc. Sở trường đúng hệ: +15% công.
- Thắng với tổn thất ≤ 25% quân được 3 sao, ≤ 55% được 2 sao.

Tất cả hằng số nằm trong `src/data/balance.js`.

## Nhịp độ hiện tại (bot, seed 1)

Người chơi chăm (cứ 15 phút vào một lần, 14 giờ mỗi ngày):

- Qua chương 1 trong khoảng 1 giờ, chương 2 vào đầu ngày 2, chương 3 vào ngày 4, trùm chương 4 vào khoảng ngày 6–7.
- Thể lực là giới hạn chính; kho đầy thường xuyên từ ngày 2, nên cần thêm chỗ tiêu tài nguyên ở bản sau.
