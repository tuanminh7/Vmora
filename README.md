# Vmora

Vmora là dự án web học ngôn ngữ gồm:

- `frontend`: React.js + Vite
- `backend`: FastAPI + PostgreSQL

## Nguồn chuẩn

Từ thời điểm này, toàn bộ code phải bám theo sơ đồ trong thư mục gốc.

Không tự thêm menu.  
Không tự xóa menu.  
Không tự đổi luồng nếu sơ đồ hoặc yêu cầu mới của chủ dự án chưa chốt.

Các sơ đồ đang dùng làm nguồn chuẩn:

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

Ghi chú:

- `lotrinh.svg` không còn dùng làm nguồn chuẩn.
- Luồng hiện tại chốt là: `Khóa học -> Lộ trình -> gói free / gói mua -> Học tập`.
- Bài test trong lộ trình là để gợi ý, không ép mua.
- Toàn bộ hệ thống phải đi theo hướng `realtime`.

## Luồng chính đã chốt

```text
Đăng nhập
-> Chọn 1 trong 5 ngôn ngữ
-> Vào Khóa học
-> Đi sang Lộ trình
-> Có khóa học free được cập nhật liên tục
-> Có các khóa học mua
-> Có các bài test để gợi ý gói phù hợp
-> Hệ thống chỉ gợi ý, không ép mua
-> Khi đã có quyền học
-> Vào Học tập
-> Chọn chặng
-> Chọn bài
-> Học bài
-> Cập nhật tiến độ
-> Mở bài tiếp theo
```

## Kiến trúc hiện tại

- Backend REST + WebSocket bằng FastAPI
- Database PostgreSQL
- Frontend React cập nhật trạng thái theo realtime
- Redis pub/sub đã có nền cho realtime nhiều instance

## Realtime hiện tại

Các phần đã có nền realtime:

- thông báo
- nhóm chat
- bảng xếp hạng
- tiến độ học
- ôn luyện
- thi
- giải đấu
- hộp thư / ticket
- admin refresh
- cộng đồng: tạo bài, bình luận, admin ẩn/xóa bài

## Dữ liệu hiện tại

Đã ưu tiên làm trước cho:

- `en` tiếng Anh
- `zh` tiếng Trung

Hiện trong database đang có cho mỗi ngôn ngữ `en` và `zh`:

- `60` từ vựng
- `2` khóa học
- `6` chương
- `18` bài học
- `2` gói học
- `10` hoạt động ôn luyện
- `1` đề thi

File seed dữ liệu riêng cho Anh và Trung:

- `data/seed/vocabulary_en_zh.json`
- `data/seed/learning_content_en_zh.json`

## Chạy dự án

Chạy PostgreSQL:

```powershell
docker compose up -d
```

Chạy backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

Lưu ý local backend:

- `VMORA_REDIS_URL` nên để `redis://localhost:6380/0` nếu dùng `docker-compose.yml` của repo này.
- `VMORA_ADMIN_BOOTSTRAP_EMAILS` chỉ nên chứa email được phép nhận quyền admin đầu tiên. Nếu để trống thì hệ thống sẽ không tự bootstrap admin.

Backend:

```text
http://127.0.0.1:8000
http://127.0.0.1:8000/api/health
http://127.0.0.1:8000/api/metrics
```

Chạy frontend:

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend:

```text
http://localhost:5173
```

## Seed dữ liệu

Fetch seed từ nguồn mở:

```powershell
backend\.venv\Scripts\python.exe scripts\fetch_vocabulary_seed.py --languages en zh --limit-per-language 50
```

Import và seed riêng cho Anh + Trung:

```powershell
backend\.venv\Scripts\python.exe scripts\import_vocabulary_seed.py --languages en zh
backend\.venv\Scripts\python.exe scripts\seed_learning_content.py --languages en zh
backend\.venv\Scripts\python.exe scripts\seed_packages.py --languages en zh
backend\.venv\Scripts\python.exe scripts\seed_practice_activities.py --languages en zh
backend\.venv\Scripts\python.exe scripts\seed_exam_content.py --languages en zh
```

## Ghi chú kỹ thuật

- Backend dùng prefix env là `VMORA_`
- `VMORA_DATABASE_AUTO_CREATE=true` phù hợp local
- `VMORA_REDIS_URL=redis://localhost:6380/0` khớp với cổng Redis đang map trong `docker-compose.yml`
- `VMORA_ADMIN_BOOTSTRAP_EMAILS` điều khiển email nào được phép bootstrap admin đầu tiên
- `VMORA_MOMO_MOCK=true` đang dùng để test local
- Các script seed hiện dùng `init_db()` để tự đảm bảo schema trước khi import
- Không chạy nhiều script seed song song trên cùng DB

## Những việc đã làm

- Chia frontend và backend
- Có đăng nhập, chọn ngôn ngữ, khóa học, lộ trình, học tập
- Có free package và paid package
- Có ôn luyện, thi, giải đấu, tiến độ
- Có hệ thống cộng đồng, hộp thư, liên hệ, cài đặt
- Có admin workspace theo các sơ đồ admin
- Có ngân hàng câu hỏi cho ôn luyện và đề thi
- Có preview / publish cho học liệu
- Có realtime nền và reconnect ở frontend
- Đã ưu tiên seed dữ liệu cho `en` và `zh`

## Những việc chưa làm

- Giao diện đẹp và đồng bộ theo bản thiết kế cuối
- Tích hợp MoMo thật
- Migration database chính thức
- Dữ liệu thật sâu hơn cho `en` và `zh`
- Dữ liệu cho `ja`, `ko`, `de`
- Media thật cho học liệu: ảnh, audio, video
- Mở rộng thêm bài học, bài luyện, đề thi thật
- Tối ưu toàn bộ hệ thống để sẵn sàng production
- Rà hết tất cả nhánh realtime còn lại
- Test tải thật cho mục tiêu concurrent cao

## Những việc cần làm tiếp theo

Ưu tiên tiếp theo nên đi theo thứ tự này:

```text
1. Bổ sung thêm dữ liệu thật cho tiếng Anh và tiếng Trung
2. Mở rộng học liệu, ôn luyện, đề thi cho 2 ngôn ngữ này
3. Rà lại toàn bộ realtime còn thiếu
4. Làm sạch UI theo sơ đồ
5. Hoàn thiện MoMo thật
6. Bổ sung migration và quy trình production
7. Sau đó mới mở rộng sang Nhật, Hàn, Đức
```

## Mục tiêu hiện tại

Giai đoạn này tập trung vào:

- bám đúng sơ đồ
- làm chắc luồng backend + frontend
- thêm dữ liệu thật trước cho `Anh` và `Trung`
- để phần `giao diện đẹp` và `MoMo thật` làm sau
