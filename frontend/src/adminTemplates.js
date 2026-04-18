export const ADMIN_TABS = [
  "languages",
  "levels",
  "roadmaps",
  "stages",
  "courses",
  "sections",
  "lessons",
  "vocabulary",
  "practice",
  "packages",
  "exams",
];

export const PRACTICE_LABELS = {
  flashcard: "Flashcard",
  quiz: "Quizz 4 đáp án",
  matching: "Ghép nối",
  image: "Qua hình ảnh",
  video: "Qua video ngắn",
  typing: "Nghĩa gõ từ",
  audio: "Audio",
  voice: "Voice với AI",
  mixed: "Hỗn hợp",
};

export const ADMIN_TEMPLATES = {
  languages: {
    label: "Ngôn ngữ",
    hint: "Ngôn ngữ",
    fields: [
      { key: "code", label: "Mã ngôn ngữ", defaultValue: "fr" },
      { key: "name", label: "Tên hiển thị", defaultValue: "French" },
    ],
  },
  levels: {
    label: "Cấp độ",
    hint: "Cấp độ",
    fields: [
      { key: "language_code", label: "Ngôn ngữ", defaultValue: "en" },
      { key: "code", label: "Mã cấp độ", defaultValue: "Core" },
      { key: "title", label: "Tên cấp độ", defaultValue: "Nền tảng giao tiếp" },
      { key: "description", label: "Mô tả", defaultValue: "Cấp độ dành cho người mới bắt đầu.", type: "textarea" },
      { key: "order_index", label: "Thứ tự", defaultValue: 1, type: "number" },
    ],
  },
  roadmaps: {
    label: "Lộ trình",
    hint: "Lộ trình",
    fields: [
      { key: "language_code", label: "Ngôn ngữ", defaultValue: "en" },
      { key: "level_id", label: "ID cấp độ", defaultValue: 1, type: "number" },
      { key: "title", label: "Tên lộ trình", defaultValue: "Lộ trình giao tiếp cơ bản" },
      { key: "description", label: "Mô tả", defaultValue: "Lộ trình học theo từng bước rõ ràng.", type: "textarea" },
    ],
  },
  stages: {
    label: "Chặng học",
    hint: "Chặng học",
    fields: [
      { key: "roadmap_id", label: "ID lộ trình", defaultValue: 1, type: "number" },
      { key: "title", label: "Tên chặng", defaultValue: "Chào hỏi và giới thiệu" },
      { key: "description", label: "Mô tả", defaultValue: "Người học làm quen với các mẫu câu mở đầu.", type: "textarea" },
      { key: "order_index", label: "Thứ tự", defaultValue: 1, type: "number" },
    ],
  },
  courses: {
    label: "Khóa học",
    hint: "Khóa học",
    fields: [
      { key: "language_code", label: "Ngôn ngữ", defaultValue: "en" },
      { key: "level_id", label: "ID cấp độ", defaultValue: 1, type: "number" },
      { key: "roadmap_id", label: "ID lộ trình", defaultValue: 1, type: "number" },
      { key: "title", label: "Tên khóa học", defaultValue: "Khóa giao tiếp cơ bản" },
      { key: "description", label: "Mô tả", defaultValue: "Khóa học mẫu cho admin.", type: "textarea" },
      { key: "is_free", label: "Khóa miễn phí", defaultValue: true, type: "checkbox" },
      { key: "is_published", label: "Đã xuất bản", defaultValue: true, type: "checkbox" },
      { key: "order_index", label: "Thứ tự", defaultValue: 1, type: "number" },
    ],
  },
  sections: {
    label: "Chương",
    hint: "Chương",
    fields: [
      { key: "course_id", label: "ID khóa học", defaultValue: 1, type: "number" },
      { key: "title", label: "Tên chương", defaultValue: "Bắt đầu giao tiếp" },
      { key: "description", label: "Mô tả", defaultValue: "Các bài học nền tảng trong chương.", type: "textarea" },
      { key: "is_published", label: "Đã xuất bản", defaultValue: true, type: "checkbox" },
      { key: "order_index", label: "Thứ tự", defaultValue: 1, type: "number" },
    ],
  },
  lessons: {
    label: "Bài học",
    hint: "Bài học",
    fields: [
      { key: "section_id", label: "ID chương", defaultValue: 1, type: "number" },
      { key: "stage_id", label: "ID chặng", defaultValue: 1, type: "number" },
      { key: "title", label: "Tên bài học", defaultValue: "Bài học mới" },
      { key: "summary", label: "Tóm tắt", defaultValue: "Mô tả ngắn cho bài học.", type: "textarea" },
      { key: "content", label: "Nội dung", defaultValue: "Nội dung mẫu để test admin.", type: "textarea" },
      { key: "order_index", label: "Thứ tự", defaultValue: 1, type: "number" },
      { key: "estimated_minutes", label: "Số phút", defaultValue: 10, type: "number" },
      { key: "is_free_preview", label: "Cho xem trước", defaultValue: true, type: "checkbox" },
      { key: "is_published", label: "Đã xuất bản", defaultValue: true, type: "checkbox" },
    ],
  },
  vocabulary: {
    label: "Học liệu",
    hint: "Học liệu",
    fields: [
      { key: "language_code", label: "Ngôn ngữ", defaultValue: "en" },
      { key: "word", label: "Từ", defaultValue: "hello" },
      { key: "reading", label: "Phiên âm", defaultValue: "hello" },
      { key: "part_of_speech", label: "Loại từ", defaultValue: "noun" },
      { key: "meaning_en", label: "Nghĩa EN", defaultValue: "A greeting.", type: "textarea" },
      { key: "meaning_vi", label: "Nghĩa VI", defaultValue: "Xin chào.", type: "textarea" },
      { key: "example", label: "Ví dụ", defaultValue: "Hello, how are you?", type: "textarea" },
      { key: "example_meaning_vi", label: "Dịch ví dụ", defaultValue: "Xin chào, bạn khỏe không?", type: "textarea" },
      { key: "source_name", label: "Nguồn", defaultValue: "Admin" },
      { key: "source_url", label: "URL nguồn", defaultValue: "https://example.com" },
      { key: "is_active", label: "Đang hoạt động", defaultValue: true, type: "checkbox" },
    ],
  },
  practice: {
    label: "Ôn luyện",
    hint: "Ôn luyện",
    fields: [
      { key: "language_code", label: "Ngôn ngữ", defaultValue: "en" },
      { key: "lesson_id", label: "ID bài học", defaultValue: 1, type: "number" },
      { key: "code", label: "Mã bài luyện", defaultValue: "admin-practice-1" },
      { key: "activity_type", label: "Loại bài luyện", defaultValue: "quiz" },
      { key: "title", label: "Tên bài luyện", defaultValue: "Quiz mới" },
      { key: "description", label: "Mô tả", defaultValue: "Activity tạo từ admin.", type: "textarea" },
      { key: "prompt", label: "Câu hỏi", defaultValue: "Chọn đáp án đúng.", type: "textarea" },
      {
        key: "payload",
        label: "Payload JSON",
        defaultValue: {
          options: [
            { id: "a", text: "Đáp án A" },
            { id: "b", text: "Đáp án B" },
          ],
          correct_option_id: "a",
        },
        type: "json",
      },
      { key: "order_index", label: "Thứ tự", defaultValue: 1, type: "number" },
      { key: "is_free", label: "Miễn phí", defaultValue: true, type: "checkbox" },
      { key: "is_active", label: "Đang hoạt động", defaultValue: true, type: "checkbox" },
    ],
  },
  packages: {
    label: "Gói mua",
    hint: "Gói mua",
    fields: [
      { key: "language_code", label: "Ngôn ngữ", defaultValue: "en" },
      { key: "code", label: "Mã gói", defaultValue: "en-special" },
      { key: "name", label: "Tên gói", defaultValue: "Gói nâng cao" },
      { key: "description", label: "Mô tả", defaultValue: "Gói học mẫu từ admin.", type: "textarea" },
      { key: "price_vnd", label: "Giá", defaultValue: 199000, type: "number" },
      { key: "duration_days", label: "Số ngày", defaultValue: 90, type: "number" },
      { key: "is_free", label: "Gói miễn phí", defaultValue: false, type: "checkbox" },
      { key: "is_active", label: "Đang hoạt động", defaultValue: true, type: "checkbox" },
    ],
  },
  exams: {
    label: "Bài thi",
    hint: "Bài thi",
    fields: [
      { key: "language_code", label: "Ngôn ngữ", defaultValue: "en" },
      { key: "title", label: "Tên đề thi", defaultValue: "Đề thi admin tạo" },
      { key: "description", label: "Mô tả", defaultValue: "Đề thi mẫu có thể làm ngay.", type: "textarea" },
      { key: "level_code", label: "Cấp độ", defaultValue: "Core" },
      { key: "duration_minutes", label: "Thời lượng", defaultValue: 20, type: "number" },
      { key: "passing_score", label: "Điểm đạt", defaultValue: 60, type: "number" },
      { key: "is_active", label: "Đang hoạt động", defaultValue: true, type: "checkbox" },
      {
        key: "questions",
        label: "Câu hỏi JSON",
        type: "json",
        defaultValue: [
          {
            question_type: "quiz",
            prompt: "Câu hỏi mẫu",
            payload: {
              options: [
                { id: "a", text: "Đáp án đúng" },
                { id: "b", text: "Đáp án sai" },
              ],
            },
            correct_answer: "a",
            points: 1,
            order_index: 1,
          },
        ],
      },
    ],
  },
};

export function buildTemplatePayload(collection) {
  const template = ADMIN_TEMPLATES[collection];
  if (!template) {
    return {};
  }

  return Object.fromEntries(template.fields.map((field) => [field.key, field.defaultValue]));
}
