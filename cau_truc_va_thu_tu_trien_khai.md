# Cấu Trúc Và Thứ Tự Triển Khai Theo Sơ Đồ

File này là bản khóa để code bám theo sơ đồ. Không tự thêm menu, không tự xóa menu, không tự đổi luồng nếu chưa có sơ đồ hoặc yêu cầu mới.

## 1. Sơ đồ dùng làm chuẩn

Các sơ đồ đang dùng:

- `vmora_app_diagram_v2.svg`
- `auth_flow_diagram_v3.svg`
- `language_level_roadmap.svg`
- `course_learning_flow.svg`
- `nhanh_thay_doi_khoa_hoc.svg`
- `so_do_hoc_tap.svg`
- `so_do_on_luyen.svg`
- `so_do_trang_1.svg`
- `he_thong_hoc_tap.svg`
- `he_thong_hop_thu_cai_dat_lien_he.svg`
- `admin_tong_the.svg`
- `admin_nguoi_dung.svg`
- `admin_hoc_lieu.svg`
- `admin_on_luyen_thi.svg`
- `admin_goi_thanh_toan.svg`
- `admin_thong_bao_ho_tro.svg`
- `admin_cong_dong_he_thong.svg`

Quy tắc:

- `vmora_app_diagram_v2.svg` là sơ đồ menu tổng thể.
- Các sơ đồ còn lại là chi tiết nghiệp vụ cho từng nhánh.
- Nếu sơ đồ cũ có test đầu vào bắt buộc, dùng quyết định mới nhất đã chốt: test đầu vào không bắt buộc.

## 2. Luồng chính đã chốt

```text
Đăng nhập / đăng ký
  -> Chọn ngôn ngữ
  -> Khóa học
  -> Lộ trình
  -> Khóa học mua hoặc khóa học free
  -> Các gói
  -> Ôn luyện
  -> Chọn chặng học
  -> Chọn bài học
  -> Học bài
  -> Cập nhật tiến độ
  -> Mở bài tiếp theo
```

Ghi chú:

- Phải có cả khóa học mua và khóa học free.
- Người dùng được vào gói free ngay.
- Test đầu vào chỉ là gợi ý, không ép làm, không ép mua.

## 3. Cây chức năng người dùng

Theo `vmora_app_diagram_v2.svg`, app có các nhánh:

```text
Vmora
  -> Đăng nhập / đăng ký
  -> Chỉnh profile
  -> Chọn ngôn ngữ
  -> Bảng Vàng server
  -> Khóa học
  -> Liên hệ
  -> Hộp thư
  -> Profile
  -> Cài đặt
  -> Bảng xếp hạng
  -> Học tập
  -> Giải đấu
  -> Tiến độ
  -> Nhóm chat
  -> Lộ trình
  -> Pet
  -> THI
  -> Sổ tay
  -> Kho từ vựng
  -> Ôn luyện
```

Ngôn ngữ:

```text
T.Đức
T.ANH
T.Nhật
T.Trung
T.HÀN
```

## 4. Auth và profile

Theo `auth_flow_diagram_v3.svg`:

```text
Đăng nhập
  -> Gmail
  -> Pass

Đăng ký
  -> Gmail
  -> Pass
  -> Pin

Profile
  -> Avatar
  -> ID
  -> Gmail
  -> Name
  -> SĐT
  -> Địa chỉ
  -> Lưu và xác nhận
  -> Chỉnh sửa

Quên pass
  -> Nhập Gmail
  -> Pin
  -> OTP Gmail
  -> Đặt lại pass
  -> Xác thực
```

Làm trước:

1. Đăng ký
2. Đăng nhập
3. Quên pass
4. Profile
5. Chọn ngôn ngữ

## 5. Ngôn ngữ, cấp độ, học liệu

Theo `language_level_roadmap.svg`:

```text
Trung -> HSK 1-6
Đức -> A1, A2, B1, B2, C1, C2
Nhật -> N5 -> N1
Anh -> A1, A2, B1, B2, C1, C2
Hàn -> TOPIK I (1-2), TOPIK II (3-6)
```

Theo `admin_hoc_lieu.svg`, thứ tự tạo học liệu:

```text
Chọn ngôn ngữ
  -> Tạo cấp độ
  -> Tạo lộ trình
  -> Tạo khóa học
  -> Tạo chương
  -> Tạo bài học
  -> Thêm nội dung
  -> Xem trước
  -> Xuất bản
  -> Người dùng thấy trong app
```

Nội dung bài học gồm:

```text
Từ vựng
Ngữ pháp
Ví dụ
Âm thanh
Hình ảnh
```

## 6. Khóa học, gói, lộ trình

Theo `nhanh_thay_doi_khoa_hoc.svg`, `so_do_hoc_tap.svg`, `course_learning_flow.svg`:

```text
Khóa học
  -> Có các gói
  -> Gói free
  -> Gói mua
  -> Mua và thanh toán
  -> Kích hoạt gói
  -> Học tập
  -> Lộ trình
  -> Ôn luyện
```

Thứ tự triển khai:

1. Khóa học
2. Gói free
3. Gói mua
4. Các gói
5. Kích hoạt gói
6. Lộ trình
7. Tiến độ học
8. Ôn luyện

## 7. Ôn luyện

Theo `so_do_on_luyen.svg` và `vmora_app_diagram_v2.svg`, ôn luyện gồm 5 mục:

```text
Luyện từ vựng
Luyện viết
Luyện nghe
Luyện nói
Ngữ pháp
```

Các hoạt động trong ôn luyện:

```text
Flashcard
Quizz 4 đáp án
Ghép nối
Qua hình ảnh
Qua video ngắn
Nghĩa gõ từ
Audio
Voice với AI
Hỗn hợp
```

Thứ tự triển khai:

1. Flashcard
2. Quizz
3. Ghép nối
4. Hình ảnh
5. Video ngắn
6. Audio
7. Nghĩa gõ từ
8. Voice với AI
9. Hỗn hợp

## 8. Thi, tiến độ, bảng xếp hạng, giải đấu

Theo `he_thong_hoc_tap.svg`:

```text
Thi
  -> Kho đề thi
  -> Phân theo chứng chỉ

Giải đấu
  -> Bài thi hỗn hợp
  -> Form đăng kí
  -> Bảng xếp hạng
  -> Giải thưởng

Bảng xếp hạng
  -> Tiến độ
  -> Xong 1 bài +1đ
  -> Ôn luyện

Bảng Vàng server
  -> Ưu tiên
  -> V2 (+1)
  -> Giải đấu (+10)
  -> Thi (+10)
```

Thứ tự triển khai:

1. Tiến độ
2. Thi
3. Bảng xếp hạng
4. Giải đấu
5. Bảng Vàng server

## 9. Hộp thư, cài đặt, liên hệ

Theo `he_thong_hop_thu_cai_dat_lien_he.svg`:

```text
Hộp thư
  -> Thông báo từ admin, bạn bè
  -> Thành tích + huy hiệu
  -> Nhận quà / kích hoạt quà
  -> Kết quả & tiến độ

Cài đặt
  -> Chỉnh cấu hình sáng/tối
  -> Tùy chỉnh background
  -> API key Gemini

Liên hệ
  -> Chat với admin
  -> Thông tin
  -> Liên kết mạng xã hội
```

Thứ tự triển khai:

1. Hộp thư
2. Thông báo
3. Thành tích / huy hiệu
4. Quà
5. Liên hệ
6. Cài đặt

## 10. Sổ tay, kho từ vựng, pet, nhóm chat

Theo `so_do_trang_1.svg`:

```text
Sổ tay
  -> Từ vựng hay bài làm từ hệ thống user lưu lại
  -> Lệnh lịch / nhắc nhở
  -> Duy trì chuỗi

Kho từ vựng
  -> Phân loại theo cấp độ
  -> User tự upload
  -> Lấy vào ôn luyện
  -> Chọn kho từ vựng

Pet
  -> Tự đặt tên
  -> Tự cấu hình
  -> Voice với pet
  -> Level pet

Nhóm chat
  -> Kết nối / kết bạn
  -> ID nhóm pass
  -> Nhóm riêng
  -> Chat với bạn bè
  -> Khung chat tổng
```

Thứ tự triển khai:

1. Sổ tay
2. Kho từ vựng
3. Pet
4. Nhóm chat

## 11. Admin

Theo `admin_tong_the.svg`:

```text
Admin
  -> Bảng điều khiển
  -> Người dùng
  -> Học liệu
  -> Ôn luyện và bài thi
  -> Gói mua và thanh toán
  -> Thông báo và hỗ trợ
  -> Cộng đồng
  -> Cài đặt hệ thống
```

Theo các sơ đồ admin chi tiết:

```text
Người dùng
  -> Danh sách
  -> Chọn người dùng
  -> Xem hồ sơ
  -> Gói đang dùng
  -> Tiến độ học
  -> Lịch sử ôn / thi
  -> Vấn đề hỗ trợ
  -> Khóa / Mở khóa

Học liệu
  -> Chọn ngôn ngữ
  -> Tạo cấp độ
  -> Tạo lộ trình
  -> Tạo khóa học
  -> Tạo chương
  -> Tạo bài học
  -> Thêm nội dung
  -> Xem trước
  -> Xuất bản

Ôn luyện và bài thi
  -> Tạo câu hỏi
  -> Chọn dạng bài
  -> Nhập đáp án đúng
  -> Gắn âm thanh / hình ảnh
  -> Gắn cấp độ & chủ đề
  -> Tạo bộ ôn luyện hoặc đề thi
  -> Mở cho người dùng làm
  -> Xem kết quả & điểm số

Gói mua và thanh toán
  -> Gói miễn phí
  -> Gói trả phí
  -> Chọn khóa học được mở
  -> Người dùng mua gói
  -> Ghi nhận thanh toán
  -> Kích hoạt quyền học
  -> Hủy / Gia hạn / Hoàn tiền

Thông báo và hỗ trợ
  -> Soạn thông báo
  -> Chọn nhóm người nhận
  -> Gửi vào hộp thư
  -> Người dùng gửi yêu cầu hỗ trợ
  -> Admin xem yêu cầu
  -> Admin trả lời
  -> Đóng yêu cầu
  -> Chuyển phụ trách

Cộng đồng và hệ thống
  -> Báo cáo vi phạm
  -> Admin kiểm tra
  -> Xóa nội dung
  -> Cảnh cáo
  -> Khóa tài khoản
  -> Quản lý bảng xếp hạng & huy hiệu
  -> Cài đặt hệ thống
  -> Cấu hình AI & khóa API
  -> Bật / tắt tính năng
  -> Xem nhật ký lỗi
```

Thứ tự triển khai admin:

1. Bảng điều khiển
2. Người dùng
3. Học liệu
4. Ôn luyện và bài thi
5. Gói mua và thanh toán
6. Thông báo và hỗ trợ
7. Cộng đồng
8. Cài đặt hệ thống

## 12. Thứ tự triển khai tổng thể

Thứ tự triển khai phải bám dependency và sơ đồ:

1. Nền tảng kỹ thuật: frontend, backend, PostgreSQL, cấu hình môi trường.
2. Auth và profile: đăng ký, đăng nhập, quên pass, profile, chọn ngôn ngữ.
3. Ngôn ngữ, cấp độ, học liệu.
4. Khóa học, khóa free, khóa mua, các gói, thanh toán, kích hoạt gói.
5. Lộ trình, học bài, tiến độ.
6. Ôn luyện và các hoạt động ôn luyện.
7. Thi, bảng xếp hạng, giải đấu, Bảng Vàng server.
8. Hộp thư, liên hệ, cài đặt.
9. Sổ tay, kho từ vựng, pet, nhóm chat.
10. Admin theo 8 nhánh trong sơ đồ admin tổng thể.

## 13. Ghi chú bắt buộc khi code

- Trước khi sửa frontend route/menu phải đối chiếu `vmora_app_diagram_v2.svg`.
- Trước khi sửa luồng học phải đối chiếu `course_learning_flow.svg`, `nhanh_thay_doi_khoa_hoc.svg`, `so_do_hoc_tap.svg`.
- Trước khi sửa ôn luyện phải đối chiếu `so_do_on_luyen.svg`.
- Trước khi sửa admin phải đối chiếu đúng file `admin_*.svg`.
- Nếu chưa rõ nhánh nào trong sơ đồ, không tự suy diễn.
