# Kế hoạch dữ liệu `en` và `zh` cho toàn bộ chức năng Vmora

## Mục tiêu

Tạo bộ dữ liệu thật cho 2 ngôn ngữ:

- `en` = tiếng Anh
- `zh` = tiếng Trung

Ưu tiên triển khai:

1. tiếng Anh trước
2. sau đó mới mở rộng sang tiếng Trung

Mật độ dữ liệu mục tiêu cho các lesson ôn luyện:

- trung bình khoảng `20 câu / 20 mục luyện / 20 từ` cho mỗi lesson chính
- tránh kiểu lesson quá mỏng chỉ có 3 đến 6 câu như bộ seed demo ban đầu

Mục tiêu không phải chỉ có vài bản ghi để test, mà là đủ để toàn bộ luồng chính trên web chạy đúng:

`Đăng nhập -> Chọn ngôn ngữ -> Khóa học -> Lộ trình -> Gói free / gói mua -> Học tập -> Ôn luyện -> Thi -> Giải đấu -> Cộng đồng / Hộp thư / Cài đặt / Admin`

## Nguyên tắc triển khai

1. Chỉ tập trung `en` và `zh`.
2. Không seed lại `ja`, `ko`, `de`.
3. Không đưa dữ liệu demo rác hoặc nội dung thử nghiệm lên DB chính.
4. Những khu cần nhiều người dùng thật như cộng đồng, bạn bè, chat, leaderboard sẽ không bơm user giả nếu vẫn giữ yêu cầu “chỉ còn admin và datminhtuan07@gmail.com”.
5. Với các khu social không có dữ liệu thật, phải hiển thị empty state sạch, đúng ngữ cảnh, không vỡ UI.
6. Dữ liệu seed phải đi được từ admin xuống frontend, tránh tình trạng frontend dùng mock cứng một kiểu còn backend/admin một kiểu khác.

---

## Phạm vi dữ liệu theo chức năng

### 1. Ngôn ngữ

Cần giữ:

- `en` English
- `zh` Chinese

Việc cần làm:

- rà lại bảng `languages`
- chỉ để 2 ngôn ngữ active
- icon, tên hiển thị, mã ngôn ngữ, màu nhận diện phải đồng nhất giữa frontend và backend

### 2. Cấp độ, lộ trình, chặng

Mỗi ngôn ngữ cần tối thiểu:

- 1 level nền tảng để đóng full flow
- 1 roadmap chính
- 3 stage trong roadmap

Đề xuất:

- `en`: `A1 - Nền tảng`
- `zh`: `HSK1 - Nhập môn`

Mỗi roadmap gồm:

1. Làm quen
2. Xây nền
3. Ứng dụng

### 3. Khóa học, chương, bài học

Mỗi ngôn ngữ cần:

- 2 khóa học
- 3 section / khóa
- 3 lesson / section
- tổng 18 lesson / 2 ngôn ngữ nếu giữ MVP hiện tại

Đề xuất cấu trúc:

- 1 khóa free
- 1 khóa paid

`en`

- Free: Tiếng Anh cho người mới
- Paid: Giao tiếp Anh mở rộng

`zh`

- Free: Tiếng Trung cho người mới
- Paid: HSK 1 mở rộng

Nội dung lesson phải có:

- `title`
- `summary`
- `content`
- `estimated_minutes`
- `is_free_preview`
- liên kết đúng `stage_id`

### 4. Gói học và quyền truy cập

Mỗi ngôn ngữ cần:

- 1 gói free
- 1 gói paid
- map đúng course vào package

Yêu cầu:

- free package mở được nhánh ôn luyện free
- paid package mở được các nội dung premium
- code package phải ổn định để frontend dùng được

### 5. Từ vựng

Đây là nền cho nhiều module khác nên phải làm kỹ.

Mỗi ngôn ngữ nên có ít nhất:

- 120 từ cho bản full đầu tiên
- chia theo 6 chủ đề
- mỗi chủ đề 20 từ

Đề xuất chủ đề:

1. Chào hỏi
2. Gia đình
3. Học tập
4. Công việc
5. Ăn uống
6. Di chuyển hằng ngày

Mỗi từ cần đủ:

- từ gốc
- phiên âm / reading
- nghĩa Việt
- nghĩa Anh nếu hệ thống đang dùng
- ví dụ
- nghĩa ví dụ
- cờ active

Ghi chú:

- `en` dùng IPA hoặc reading ngắn gọn
- `zh` phải có `pinyin`
- dữ liệu từ vựng phải đủ sạch để tái sử dụng cho quiz, flashcard, exam, writing, listening

### 6. Ôn luyện

Hiện site đã có hoặc đang dùng các nhánh:

- từ vựng
- luyện viết
- luyện nghe
- ngữ pháp
- luyện nói

#### 6.1. Luyện từ vựng

Mỗi ngôn ngữ cần:

- 4 topic
- mỗi topic 3 lesson
- mỗi lesson khoảng 20 từ

Mode cần có dữ liệu:

- xem danh sách
- lật thẻ
- trắc nghiệm

Nguồn dữ liệu:

- ưu tiên build từ `vocabulary_entries`
- không để mock cứng riêng ở frontend nếu backend/admin đã có dữ liệu tương đương

#### 6.2. Luyện viết

Mỗi ngôn ngữ cần:

- 6 bài cơ bản
- 6 bài trung cấp
- 4 bài nâng cao

Mỗi cụm lesson chính nên gom khoảng 20 bài / 20 prompt để người học có đủ vòng lặp luyện tập.

Tổng:

- 16 bài / ngôn ngữ

Cần đủ 2 loại:

- `write_sentence`
- `type_by_meaning`

Ghi chú:

- `zh` dùng Hán tự + pinyin + nghĩa
- `en` dùng câu tiếng Anh + nghĩa Việt
- phải có `answer`, `hints`, `difficulty`, `explanation`

#### 6.3. Luyện nghe

Mỗi ngôn ngữ cần đủ 3 hoạt động:

- `audio_choice`
- `audio_write`
- `video_choice`

Tối thiểu:

- 20 bài / lesson chính / loại / ngôn ngữ

Tổng:

- 12 bài / ngôn ngữ

Ghi chú:

- giai đoạn 1 có thể dùng transcript + TTS / placeholder media
- nhưng cấu trúc dữ liệu phải sẵn để sau này thay audio/video thật không phải sửa schema

#### 6.4. Ngữ pháp

Mỗi ngôn ngữ cần:

- 4 topic
- 3 lesson / topic
- khoảng 20 câu hỏi / lesson

Tổng:

- 12 lesson
- 60 câu hỏi / ngôn ngữ

Ví dụ topic:

`en`

- To be
- Câu hỏi cơ bản
- Hiện tại đơn
- Giới từ căn bản

`zh`

- 是 / 不是
- 吗 / 呢
- Trật tự câu cơ bản
- Lượng từ căn bản

#### 6.5. Luyện nói

Hiện chức năng đang để placeholder UI, nên kế hoạch dữ liệu chỉ cần:

- 1 topic / ngôn ngữ
- 3 lesson placeholder / ngôn ngữ
- text mô tả ngắn, đúng ngôn ngữ

Không cần seed sâu trước khi tính năng nói thật hoàn thiện.

### 7. Đề thi

Mỗi ngôn ngữ cần:

- 2 đề thi
- mỗi đề 12 câu

Cơ cấu:

- quiz chọn đáp án
- typing
- đọc hiểu ngắn nếu UI đã hỗ trợ

Đề xuất:

- `en`: Đề nền tảng A1 số 1, số 2
- `zh`: Đề nền tảng HSK1 số 1, số 2

Ngoài bảng `exams`, nên đồng bộ luôn với `question_bank_items` để admin còn tái tạo đề hoặc tái dùng cho ôn luyện.

### 8. Giải đấu

Mỗi ngôn ngữ cần:

- 1 giải đấu active
- 8 đến 10 câu hỏi
- reward title / reward description

Lưu ý quan trọng:

- có thể seed tournament cho `en` và `zh`
- nhưng không nên seed leaderboard giả nếu vẫn giữ DB sạch và không tạo thêm user test

Kết luận:

- seed giải đấu: có
- seed bảng xếp hạng giả: không

### 9. Cộng đồng

Đây là khu nhạy cảm vì liên quan user thật.

Nếu giữ đúng yêu cầu trước đó:

- chỉ còn `admin@vmora.local`
- và `datminhtuan07@gmail.com`

thì không nên bơm:

- post giả
- comment giả
- bạn bè giả
- chat giả
- direct message giả

Kế hoạch đề xuất:

- không seed social demo
- chỉ đảm bảo:
  - empty state đẹp, rõ
  - lọc theo `en` và `zh` hoạt động đúng
  - admin có thể tự tạo post thật sau này

Nếu sau này bạn muốn khu cộng đồng “trông đông”, phải chấp nhận tạo thêm tập user seed riêng cho môi trường demo, không dùng DB sạch hiện tại.

### 10. Hộp thư / ticket hỗ trợ

Không nên seed hội thoại giả nếu đang giữ DB thật sạch.

Nên làm:

- để empty state
- admin vẫn xử lý ticket thật khi người dùng tạo

Có thể seed rất nhẹ:

- 1 thông báo hệ thống chào mừng cho tài khoản người dùng thật

Không nên seed:

- ticket giả
- reply giả

### 11. Thông báo

Có thể seed hệ thống tối thiểu, vì không làm bẩn dữ liệu xã hội:

- 1 thông báo chào mừng cho user
- 1 thông báo hướng dẫn mở gói free
- 1 thông báo nhắc vào ôn luyện

Áp dụng cho:

- `datminhtuan07@gmail.com`
- admin nếu cần kiểm tra UI admin/user

### 12. Sổ tay và nhắc học

Không nên seed hàng loạt demo.

Chỉ seed nếu cần test UI:

- 1 note mẫu / user
- 1 reminder mẫu / user

Nếu mục tiêu là DB sạch, có thể bỏ seed phần này và dùng empty state.

### 13. Ngân hàng từ cá nhân

Không seed dữ liệu giả mặc định.

Lý do:

- đây là dữ liệu hành vi cá nhân
- seed cứng sẽ làm tài khoản nhìn như tài khoản test

Nên để người dùng tự thêm sau.

### 14. Pet và cài đặt

Đây là dữ liệu cá nhân nhưng có thể khởi tạo mặc định:

- 1 pet profile mặc định / user
- 1 user setting mặc định / user

Không cần seed hội thoại pet giả dài dòng.

### 15. Admin workspace

Admin phải nhìn thấy đủ dữ liệu quản trị cho 2 ngôn ngữ:

- languages
- levels
- roadmaps
- stages
- courses
- sections
- lessons
- vocabulary
- practice
- packages
- exams

Với `en` và `zh`, admin cần:

- chỉnh sửa được
- publish/unpublish được
- preview được
- không lẫn dữ liệu `ja/ko/de`

---

## Những phần hiện đã có và những phần còn thiếu

### Đã có nền seed

- `scripts/import_vocabulary_seed.py`
- `scripts/seed_learning_content.py`
- `scripts/seed_packages.py`
- `scripts/seed_practice_activities.py`
- `scripts/seed_exam_content.py`
- `data/seed/vocabulary_en_zh.json`
- `data/seed/learning_content_en_zh.json`

### Thiếu hoặc cần làm lại

1. Seed sâu hơn cho từ vựng `en/zh`
2. Seed practice theo đúng cấu trúc module mới, không chỉ vài activity chung
3. Seed ngữ pháp theo topic/lesson/question rõ ràng
4. Seed writing và listening đúng format frontend đang dùng
5. Seed tournament cho `en/zh`
6. Đồng bộ dữ liệu admin với các module ôn luyện đang còn dùng mock frontend
7. Loại hẳn dữ liệu test/demo của ngôn ngữ khác khỏi màn admin nếu còn sót

---

## File và script cần tạo / sửa

### File dữ liệu

Nên bổ sung:

- `data/seed/vocabulary_en_zh_full.json`
- `data/seed/learning_content_en_zh_full.json`
- `data/seed/practice_en_zh_full.json`
- `data/seed/exams_en_zh_full.json`
- `data/seed/tournaments_en_zh_full.json`

### Script

Nên sửa hoặc thêm:

- `scripts/import_vocabulary_seed.py`
- `scripts/seed_learning_content.py`
- `scripts/seed_practice_activities.py`
- `scripts/seed_exam_content.py`
- `scripts/seed_tournaments.py` mới
- `scripts/seed_system_content.py` mới
- `scripts/seed_en_zh_full.py` mới

`seed_en_zh_full.py` sẽ là script tổng để chạy theo thứ tự:

1. vocabulary
2. learning content
3. packages
4. practice
5. exams
6. tournaments
7. system notifications mặc định

---

## Kế hoạch thực hiện theo giai đoạn

### Giai đoạn 1. Chuẩn hóa dữ liệu gốc

Mục tiêu:

- khóa hẳn phạm vi về `en` và `zh`
- làm sạch cấu trúc seed

Việc làm:

- kiểm tra bảng `languages`
- rà dữ liệu đang còn của `ja/ko/de`
- gom toàn bộ seed `en/zh` về file riêng rõ ràng

### Giai đoạn 2. Học liệu chính

Mục tiêu:

- hoàn chỉnh khóa học, section, lesson, roadmap, package

Việc làm:

- nâng bộ `learning_content_en_zh`
- map package-course chính xác
- test luồng free / paid

### Giai đoạn 3. Ôn luyện

Mục tiêu:

- làm dữ liệu cho từ vựng, viết, nghe, ngữ pháp, nói

Việc làm:

- bỏ mock cứng ở nơi cần bỏ
- chuyển sang đọc từ nguồn seed/backend
- kiểm tra đủ topic, lesson, difficulty, answer, hint

### Giai đoạn 4. Thi và giải đấu

Mục tiêu:

- có đề thi và giải đấu hoạt động thật cho `en/zh`

Việc làm:

- seed 2 đề / ngôn ngữ
- seed 1 tournament / ngôn ngữ
- test nộp bài, chấm điểm, kết quả

### Giai đoạn 5. Nội dung hệ thống

Mục tiêu:

- hoàn chỉnh các phần phụ trợ mà không làm bẩn DB

Việc làm:

- thông báo chào mừng
- default pet
- default setting
- giữ community/ticket ở trạng thái sạch

### Giai đoạn 6. Rà admin và nghiệm thu

Mục tiêu:

- admin nhìn thấy đúng dữ liệu
- frontend và backend không lệch schema

Việc làm:

- kiểm tra tất cả tab admin
- kiểm tra đổi ngôn ngữ `en/zh`
- kiểm tra không còn dữ liệu lạ của `ja/ko/de`

---

## Checklist nghiệm thu

Khi hoàn tất, cần đạt đủ:

- chọn `English` thì tất cả trang chính có dữ liệu thật của Anh
- chọn `Chinese` thì tất cả trang chính có dữ liệu thật của Trung
- khóa học free vào được ôn luyện free
- khóa paid hiển thị đúng nội dung premium
- admin tab không lẫn dữ liệu `ja/ko/de`
- trang ôn luyện có dữ liệu thật cho:
  - từ vựng
  - viết
  - nghe
  - ngữ pháp
  - nói placeholder
- trang thi có ít nhất 2 đề / ngôn ngữ
- trang giải đấu có ít nhất 1 giải / ngôn ngữ
- community, chat, bạn bè, inbox không có dữ liệu fake
- empty state của social sạch và không lỗi

---

## Quyết định quan trọng cần chốt trước khi code dữ liệu

### Khuyến nghị của tôi

Nên đi theo hướng này:

1. Dữ liệu học tập `en/zh`: seed đầy đủ
2. Dữ liệu social: không seed user giả
3. Dữ liệu ticket/notebook/vocabulary bank: để trống hoặc rất tối thiểu
4. Admin vẫn có đủ dữ liệu quản trị cho `en/zh`

### Lý do

Vì trước đó bạn đã yêu cầu làm sạch DB và chỉ giữ 2 tài khoản. Nếu bây giờ seed thêm community, leaderboard, chat, bạn bè cho “đẹp dữ liệu”, thực chất sẽ quay lại đúng kiểu demo/test mà bạn đã muốn bỏ.

---

## Kết luận

Kế hoạch tốt nhất cho trạng thái hiện tại là:

- seed sâu và sạch cho `en` và `zh` ở toàn bộ khu học tập
- giữ social/user-generated ở trạng thái thật, không bơm giả
- đồng bộ dữ liệu admin với frontend
- đóng full flow cho: khóa học, lộ trình, gói học, học tập, ôn luyện, thi, giải đấu

Nếu bạn duyệt kế hoạch này, bước tiếp theo tôi sẽ triển khai dữ liệu theo đúng thứ tự trong file này và ưu tiên làm từ:

1. vocabulary
2. learning content
3. packages
4. practice
5. exams
6. tournaments
