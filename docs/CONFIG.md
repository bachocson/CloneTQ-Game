# Sửa số liệu bằng Excel

File: `config/GiangHo.xlsx`. Mở bằng Excel (hoặc LibreOffice, WPS), sửa, lưu lại.

## Quy trình

1. Mở `choi-thu.bat`, để cửa sổ đen chạy.
2. Sửa Excel, bấm Lưu (Ctrl+S).
3. Cửa sổ đen báo `✓ Hợp lệ` thì trình duyệt tự tải lại với số liệu mới. Báo `✗` thì đọc lỗi, sửa lại Excel.

Không chạy `choi-thu.bat` thì bấm đúp `cap-nhat-du-lieu.bat` sau khi lưu Excel.

> Mẹo: trong lúc test, muốn chơi lại từ đầu với số liệu mới (ví dụ đổi tài nguyên khởi đầu) thì vào tab **Nhiệm vụ → Chơi lại từ đầu**.

## Quy tắc chung

- **Dòng 1 là tiêu đề**, dạng `Nhãn (khóa)`. Công cụ chỉ đọc phần trong ngoặc. Đổi phần nhãn thoải mái, không sửa phần trong ngoặc.
- Mỗi dòng là một mục. **Thêm dòng** để thêm mục, **xóa dòng** để bỏ mục. Dòng trống bị bỏ qua.
- Cột tiêu đề màu nâu là **bắt buộc**, màu tím là không bắt buộc.
- **Mã** (cột `id`) chỉ dùng chữ không dấu, số, `_`, `-`. Các sheet tham chiếu nhau bằng mã. Sau khi phát hành, đừng đổi mã vì dữ liệu lưu của người chơi dùng mã đó.
- **Tỉ lệ** viết dạng thập phân: `0.3` là 30%.
- **Màu** viết dạng `#RRGGBB`, ví dụ `#e8b84a`.
- Ô có **danh sách thả xuống**: chọn trong danh sách.
- **Công thức Excel** dùng được (ví dụ `=B2*1.5`), công cụ lấy kết quả.

## Các sheet

| Sheet | Nội dung | Ghi chú |
|---|---|---|
| Cân bằng | Mọi con số chung: thể lực, KN lên cấp, sát thương, độ khó địch, phần thưởng, giá rèn… | Chỉ sửa cột **Giá trị**. Cột Ý nghĩa giải thích từng dòng. |
| Xuất trận | Số người được xuất trận theo cấp chưởng môn | |
| Thưởng phe | % công cộng thêm khi đủ N người cùng phe | |
| Tài nguyên, Vật phẩm | Tên và mô tả | Mã `luong, go, sat, bac, nguyenbao, tieuHoanDan, huyenThiet, biKip` là bắt buộc. |
| Công trình | Giá, thời gian, sản lượng, cấp mở | Giá cấp N = giá gốc × hệ số giá^(N−1). Thứ tự dòng = thứ tự hiển thị. |
| Phe, Phẩm chất | Phe phái, phẩm chất hiệp khách, tỉ lệ gặp ở tửu lâu, giá chiêu mộ | |
| Hiệp khách | Chỉ số gốc, trưởng thành, sở trường, tuyệt kỹ, màu sắc | Chỉ số cấp N = gốc + trưởng thành × (N−1). |
| Tuyệt kỹ | Mục tiêu, hệ số, hiệu ứng | Xem cách viết hiệu ứng bên dưới. |
| Đệ tử, Bậc đệ tử | 4 hệ, chỉ số, khắc chế, tên và giá từng bậc | Số tên bậc ở sheet Đệ tử phải bằng số dòng sheet Bậc đệ tử. |
| Chương | Tên, cấp yêu cầu, tên lính, trùm | Đội địch tự sinh theo các dòng `balance.enemy.*` ở sheet Cân bằng. |
| Ô trang bị, Phẩm trang bị | Tên trang bị theo bậc, tỉ lệ phẩm khi rèn | |
| Nhiệm vụ | Điều kiện và phần thưởng | Đối tượng: mã công trình, hoặc mã ải dạng `chương-ải` như `2-5`. |

## Viết hiệu ứng tuyệt kỹ

Mỗi ô một hiệu ứng, dạng `loại tham_số=giá_trị ...`:

| Ví dụ | Nghĩa |
|---|---|
| `choang ti_le=0.3 so_luot=1` | 30% gây choáng 1 lượt |
| `trung_doc phan_tram=0.25 so_luot=2` | Trúng độc 2 lượt, mỗi lượt mất quân bằng 25% đòn đánh |
| `tang_cong phan_tram=0.15 so_luot=2 ban_than` | Bản thân tăng 15% công trong 2 lượt |
| `giam_phong phan_tram=0.2 so_luot=2` | Mục tiêu giảm 20% phòng trong 2 lượt |
| `giam_cong phan_tram=0.15 so_luot=2` | Mục tiêu giảm 15% công trong 2 lượt |
| `hoi_quan phan_tram=0.1 ban_than` | Bản thân hồi 10% quân đã mất |
| `hut_khi luong=30` | Mục tiêu mất 30 khí |
| `ca_doi_tang_cong phan_tram=0.2 so_luot=2` | Cả đội tăng 20% công trong 2 lượt |
| `ca_doi_hoi_quan phan_tram=0.15` | Cả đội hồi 15% quân đã mất |

Mục tiêu: `mot_muc_tieu`, `hang_truoc`, `hang_sau`, `toan_bo`, `ngau_nhien_2`, `ngau_nhien_3`, `it_quan_nhat`.

## Lỡ làm hỏng file Excel?

- Lấy lại bản trên GitHub, hoặc
- Chạy `npm run config:export` để tạo lại Excel từ `game-config.json` (bản dữ liệu hợp lệ gần nhất). File cũ được sao lưu thành `GiangHo.backup-<số>.xlsx`.
