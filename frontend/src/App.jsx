import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AccountSection from "./components/AccountSection";
import AdminSection from "./components/AdminSection";
import ExamSection from "./components/ExamSection";
import PracticeSection from "./components/PracticeSection";
import VmoraLanding from "./components/VmoraLanding";
import useVmoraApp from "./hooks/useVmoraApp";
import VocabularyFlashcardPage from "./modules/vocabulary/VocabularyFlashcardPage";
import VocabularyLessonViewPage from "./modules/vocabulary/VocabularyLessonViewPage";
import VocabularyQuizPage from "./modules/vocabulary/VocabularyQuizPage";
import VocabularyTopicsPage from "./modules/vocabulary/VocabularyTopicsPage";
import GrammarPracticePage from "./modules/grammar/GrammarPracticePage";
import GrammarTopicsPage from "./modules/grammar/GrammarTopicsPage";
import ListeningActivitiesPage from "./modules/listening/ListeningActivitiesPage";
import ListeningLessonsPage from "./modules/listening/ListeningLessonsPage";
import ListeningPracticePage from "./modules/listening/ListeningPracticePage";
import SpeakingPlaceholderPage from "./modules/speaking/SpeakingPlaceholderPage";
import WritingPracticePage from "./modules/writing/WritingPracticePage";

const PRACTICE_SKILLS = [
  { key: "vocabulary", label: "Luyện từ vựng", path: "/on-luyen/luyen-tu-vung" },
  { key: "writing", label: "Luyện viết", path: "/on-luyen/luyen-viet" },
  { key: "listening", label: "Luyện nghe", path: "/on-luyen/luyen-nghe" },
  { key: "speaking", label: "Luyện nói", path: "/on-luyen/luyen-noi" },
  { key: "grammar", label: "Ngữ pháp", path: "/on-luyen/ngu-phap" },
];
const PRACTICE_BRANCHES = [
  { key: "free", label: "Nhánh free", description: "Chỉ hiển thị bài ôn luyện free." },
  { key: "paid", label: "Nhánh mua", description: "Chỉ hiển thị bài ôn luyện của gói mua." },
];
const VOCABULARY_PRACTICE_DEMOS = {
  en: [
    {
      key: "giao-tiep",
      category: "GIAO TIẾP",
      title: "Nền tảng giao tiếp",
      description: "Lật thẻ để nhớ từ và nghĩa nhanh.",
      lessonCount: 3,
      lessonTitle: "Bài 1 — Chào hỏi cơ bản",
      progressCurrent: 7,
      progressTotal: 20,
      words: [
        { word: "Hello", ipa: "/həˈloʊ/", meaning: "Xin chào" },
        { word: "Thank you", ipa: "/ˈθæŋk juː/", meaning: "Cảm ơn" },
        { word: "Excuse me", ipa: "/ɪkˈskjuːz miː/", meaning: "Xin lỗi / Cho hỏi" },
        { word: "Goodbye", ipa: "/ɡʊdˈbaɪ/", meaning: "Tạm biệt" },
      ],
    },
    {
      key: "hang-ngay",
      category: "HẰNG NGÀY",
      title: "Sinh hoạt hàng ngày",
      description: "Ôn nhanh từ vựng theo chủ đề quen thuộc.",
      lessonCount: 2,
      lessonTitle: "Bài 1 — Hoạt động mỗi ngày",
      progressCurrent: 5,
      progressTotal: 16,
      words: [
        { word: "Breakfast", ipa: "/ˈbrekfəst/", meaning: "Bữa sáng" },
        { word: "Shower", ipa: "/ˈʃaʊər/", meaning: "Tắm" },
        { word: "Commute", ipa: "/kəˈmjuːt/", meaning: "Đi làm / đi học" },
        { word: "Laundry", ipa: "/ˈlɔːndri/", meaning: "Giặt đồ" },
      ],
    },
    {
      key: "cong-viec",
      category: "CÔNG VIỆC",
      title: "Văn phòng & nghề nghiệp",
      description: "Từ vựng cho môi trường làm việc.",
      lessonCount: 4,
      lessonTitle: "Bài 2 — Giao tiếp nơi công sở",
      progressCurrent: 9,
      progressTotal: 24,
      words: [
        { word: "Meeting", ipa: "/ˈmiːtɪŋ/", meaning: "Cuộc họp" },
        { word: "Deadline", ipa: "/ˈdedlaɪn/", meaning: "Hạn chót" },
        { word: "Colleague", ipa: "/ˈkɑːliːɡ/", meaning: "Đồng nghiệp" },
        { word: "Presentation", ipa: "/ˌpriːzenˈteɪʃən/", meaning: "Bài thuyết trình" },
      ],
    },
    {
      key: "du-lich",
      category: "DU LỊCH",
      title: "Đi lại & khám phá",
      description: "Những từ cần thiết khi ra ngoài.",
      lessonCount: 2,
      lessonTitle: "Bài 1 — Hỏi đường và di chuyển",
      progressCurrent: 4,
      progressTotal: 14,
      words: [
        { word: "Ticket", ipa: "/ˈtɪkɪt/", meaning: "Vé" },
        { word: "Station", ipa: "/ˈsteɪʃən/", meaning: "Nhà ga" },
        { word: "Map", ipa: "/mæp/", meaning: "Bản đồ" },
        { word: "Luggage", ipa: "/ˈlʌɡɪdʒ/", meaning: "Hành lý" },
      ],
    },
  ],
  zh: [
    {
      key: "giao-tiep",
      category: "GIAO TIẾP",
      title: "Nền tảng giao tiếp",
      description: "Lật thẻ để nhớ từ và nghĩa nhanh.",
      lessonCount: 3,
      lessonTitle: "Bài 1 — Chào hỏi cơ bản",
      progressCurrent: 7,
      progressTotal: 20,
      words: [
        { word: "你好", ipa: "/nǐ hǎo/", meaning: "Xin chào" },
        { word: "谢谢", ipa: "/xiè xie/", meaning: "Cảm ơn" },
        { word: "对不起", ipa: "/duì bu qǐ/", meaning: "Xin lỗi" },
        { word: "再见", ipa: "/zài jiàn/", meaning: "Tạm biệt" },
      ],
    },
    {
      key: "hang-ngay",
      category: "HẰNG NGÀY",
      title: "Sinh hoạt hàng ngày",
      description: "Ôn nhanh từ vựng theo chủ đề quen thuộc.",
      lessonCount: 2,
      lessonTitle: "Bài 1 — Hoạt động mỗi ngày",
      progressCurrent: 5,
      progressTotal: 16,
      words: [
        { word: "起床", ipa: "/qǐ chuáng/", meaning: "Thức dậy" },
        { word: "吃饭", ipa: "/chī fàn/", meaning: "Ăn cơm" },
        { word: "上班", ipa: "/shàng bān/", meaning: "Đi làm" },
        { word: "休息", ipa: "/xiū xi/", meaning: "Nghỉ ngơi" },
      ],
    },
    {
      key: "cong-viec",
      category: "CÔNG VIỆC",
      title: "Văn phòng & nghề nghiệp",
      description: "Từ vựng cho môi trường làm việc.",
      lessonCount: 4,
      lessonTitle: "Bài 2 — Giao tiếp nơi công sở",
      progressCurrent: 9,
      progressTotal: 24,
      words: [
        { word: "会议", ipa: "/huì yì/", meaning: "Cuộc họp" },
        { word: "文件", ipa: "/wén jiàn/", meaning: "Tài liệu" },
        { word: "同事", ipa: "/tóng shì/", meaning: "Đồng nghiệp" },
        { word: "经理", ipa: "/jīng lǐ/", meaning: "Quản lý" },
      ],
    },
    {
      key: "du-lich",
      category: "DU LỊCH",
      title: "Đi lại & khám phá",
      description: "Những từ cần thiết khi ra ngoài.",
      lessonCount: 2,
      lessonTitle: "Bài 1 — Hỏi đường và di chuyển",
      progressCurrent: 4,
      progressTotal: 14,
      words: [
        { word: "车票", ipa: "/chē piào/", meaning: "Vé xe" },
        { word: "地图", ipa: "/dì tú/", meaning: "Bản đồ" },
        { word: "酒店", ipa: "/jiǔ diàn/", meaning: "Khách sạn" },
        { word: "行李", ipa: "/xíng li/", meaning: "Hành lý" },
      ],
    },
  ],
};

function getVocabularyPracticeDemo(languageCode) {
  return VOCABULARY_PRACTICE_DEMOS[languageCode] ?? VOCABULARY_PRACTICE_DEMOS.en;
}
const ROADMAP_TESTS = [
  ["nen-tang", "Test nền tảng", "Kiểm tra mức bắt đầu để tư vấn khóa học phù hợp."],
  ["giao-tiep", "Test giao tiếp", "Kiểm tra phản xạ nghe, nói và tình huống hằng ngày."],
  ["chung-chi", "Test chứng chỉ", "Kiểm tra mục tiêu luyện thi hoặc chứng chỉ."],
];
const PRACTICE_PATHS = PRACTICE_SKILLS.map((item) => item.path);
const DEFAULT_PRACTICE_PATH = PRACTICE_SKILLS[0].path;
const COURSE_HUB_ITEMS = [
  {
    path: "/bang-xep-hang",
    icon: "",
    title: "Bảng xếp hạng",
    description: "Xem vị trí học tập và điểm số của bạn trong cộng đồng.",
    tone: "blue",
  },
  {
    path: "/giai-dau",
    icon: "🏆",
    title: "Giải đấu",
    description: "Vào các cuộc thi theo mùa, làm bài và leo bảng thành tích.",
    tone: "gold",
  },
  {
    path: "/tien-do",
    icon: "",
    title: "Tiến độ",
    description: "Theo dõi phần trăm hoàn thành của từng khóa học.",
    tone: "green",
  },
  {
    path: "/nhom-chat",
    icon: "",
    title: "Nhóm chat",
    description: "Kết nối bạn bè, nhóm riêng và cộng đồng học tập.",
    tone: "cyan",
  },
  {
    path: "/lo-trinh",
    icon: "",
    title: "Lộ trình",
    description: "Chọn chặng, mở bài học và đi tiếp từng bước rõ ràng.",
    tone: "pink",
  },
  {
    path: "/hoc-tap",
    icon: "",
    title: "Học tập",
    description: "Vào khu học sâu gồm pet, thi, sổ tay, từ vựng và ôn luyện.",
    tone: "violet",
  },
];
const LEARNING_HUB_ITEMS = [
  {
    path: "/pet",
    icon: "🐾",
    title: "Pet",
    description: "Cấu hình và tương tác với pet đồng hành.",
    tone: "pink",
  },
  {
    path: "/thi",
    icon: "📝",
    title: "Thi",
    description: "Vào kho đề thi theo chứng chỉ và cấp độ.",
    tone: "gold",
  },
  {
    path: "/so-tay",
    icon: "📓",
    title: "Sổ tay",
    description: "Lưu ghi chú, nhắc nhở và chuỗi học.",
    tone: "green",
  },
  {
    path: "/kho-tu-vung",
    icon: "🔤",
    title: "Kho từ vựng",
    description: "Chọn kho từ, quản lý từ vựng và đưa vào ôn luyện.",
    tone: "blue",
  },
  {
    path: "/on-luyen",
    icon: "🎯",
    title: "Ôn luyện",
    description: "Chọn kỹ năng luyện từ vựng, viết, nghe, nói và ngữ pháp.",
    tone: "violet",
  },
];
const PRACTICE_HUB_ITEMS = [
  {
    path: "/luyen-tu-vung",
    skillKey: "vocabulary",
    icon: "🔠",
    title: "Luyện từ vựng",
    description: "Ôn flashcard, chọn đáp án và ghi nhớ từ theo cấp độ.",
    tone: "blue",
  },
  {
    path: "/luyen-viet",
    skillKey: "writing",
    icon: "✍️",
    title: "Luyện viết",
    description: "Rèn câu trả lời, đoạn văn và phản xạ viết.",
    tone: "pink",
  },
  {
    path: "/luyen-nghe",
    skillKey: "listening",
    icon: "🎧",
    title: "Luyện nghe",
    description: "Nghe nội dung, chọn đáp án và kiểm tra khả năng hiểu.",
    tone: "cyan",
  },
  {
    path: "/luyen-noi",
    skillKey: "speaking",
    icon: "🎙️",
    title: "Luyện nói",
    description: "Luyện phản xạ nói và phát âm qua bài thực hành.",
    tone: "gold",
  },
  {
    path: "/ngu-phap",
    skillKey: "grammar",
    icon: "🧩",
    title: "Ngữ pháp",
    description: "Ôn cấu trúc câu, quy tắc và bài tập ngữ pháp.",
    tone: "green",
  },
];
const LANGUAGE_LABELS = {
  de: "T.Đức",
  en: "T.ANH",
  ja: "T.Nhật",
  zh: "T.Trung",
  ko: "T.HÀN",
};
const LANGUAGE_FLAGS = {
  de: "🇩🇪",
  en: "🇬🇧",
  ja: "🇯🇵",
  zh: "🇨🇳",
  ko: "🇰🇷",
};
const LANGUAGE_SHOWCASE_ITEMS = [
  { code: "en", label: "Tiếng Anh", sub: "English", image: "/images/anh.svg" },
  { code: "zh", label: "Tiếng Trung", sub: "中文", image: "/images/trung.webp" },
  { code: "ja", label: "Tiếng Nhật", sub: "日本語", image: "/images/nhat.jpg" },
  { code: "ko", label: "Tiếng Hàn", sub: "한국어", image: "/images/han.svg" },
  { code: "de", label: "Tiếng Đức", sub: "Deutsch", image: "/images/duc.png" },
];

const GOLDEN_BOARD_BADGES = [
  { image: "/images/cupvang.png", label: "Hạng 1", tone: "gold" },
  { image: "/images/cupbac-cutout.png", label: "Hạng 2", tone: "silver" },
  { image: "/images/cupdong-cutout.png", label: "Hạng 3", tone: "bronze" },
  { image: "/images/ve4-cutout.png", label: "Hạng 4", tone: "ticket" },
  { image: "/images/ve5-cutout.png", label: "Hạng 5", tone: "ticket" },
  { image: "/images/ve6-cutout.png", label: "Hạng 6", tone: "ticket" },
];
const RANKING_SPOTLIGHT_IMAGES = [
  { rank: 1, image: "/images/1.jpg", label: "Top 1" },
  { rank: 2, image: "/images/2.jpg", label: "Top 2" },
  { rank: 3, image: "/images/3.jpg", label: "Top 3" },
];

const MAIL_NODES = [
  "Thông báo từ admin, bạn bè",
  "Thành tích + huy hiệu",
  "Nhận quà / kích hoạt quà",
  "Kết quả & tiến độ",
];

const CONTACT_NODES = ["Chat với admin", "Thông tin", "Liên kết mạng xã hội"];
const CONTACT_SOCIAL_LINKS = [
  { label: "Facebook", icon: "📘", href: "https://facebook.com", accent: "facebook" },
  { label: "TikTok", icon: "🎵", href: "https://www.tiktok.com", accent: "tiktok" },
  { label: "YouTube", icon: "▶️", href: "https://www.youtube.com", accent: "youtube" },
  { label: "GitHub", icon: "🐙", href: "https://github.com", accent: "github" },
  { label: "LinkedIn", icon: "💼", href: "https://www.linkedin.com", accent: "linkedin" },
];
const CONTACT_ADMIN_PROFILE = {
  name: "Vmora Admin",
  initials: "VA",
  publicId: "00001",
  email: "admin@vmora.local",
  phone: "0900 000 001",
  address: "Trung tâm hỗ trợ Vmora",
  avatarUrl: "",
};
const SETTINGS_NODES = ["Chỉnh cấu hình sáng/tối", "Tùy chỉnh background"];
const TOURNAMENT_NODES = ["Bài thi", "Đăng ký", "Xếp hạng", "Thưởng"];
const GROUP_NODES = ["Kết nối / kết bạn", "ID nhóm pass", "Nhóm riêng", "Chat với bạn bè", "Khung chat tổng"];
const PET_NODES = ["Tự đặt tên", "Tự cấu hình", "Voice với pet", "Level pet"];
const NOTE_NODES = ["Lưu từ vựng hay bài làm", "Lịch / nhắc nhở", "Duy trì chuỗi"];
const BANK_NODES = ["Phân loại theo cấp độ", "User tự upload", "Lấy vào ôn luyện", "Chọn kho từ vựng"];
const COMMUNITY_DISCOVER_FILTERS = ["Tất cả", "Giao tiếp", "Ngữ pháp", "Luyện thi", "Nghe", "Đọc hiểu"];
const COMMUNITY_FRIEND_GOALS = ["Tất cả", "Giao tiếp", "Luyện thi", "Học đều", "Ngữ pháp"];

function getLanguageDisplayName(languageCode) {
  return LANGUAGE_SHOWCASE_ITEMS.find((item) => item.code === languageCode)?.label ?? LANGUAGE_LABELS[languageCode] ?? "Đa ngôn ngữ";
}

function getLanguageFlag(languageCode) {
  return LANGUAGE_FLAGS[languageCode] ?? "🌐";
}

function getRoadmapPreviewLabels(languageCode, branch) {
  const languageName = getLanguageDisplayName(languageCode);

  if (languageCode === "zh") {
    return branch === "paid"
      ? ["HSK tăng tốc", "Khẩu ngữ theo chủ đề", "Đọc hiểu nâng cao"]
      : ["Phát âm & thanh điệu", "Chào hỏi cơ bản", "Từ vựng đời sống"];
  }

  if (languageCode === "ja") {
    return branch === "paid"
      ? ["JLPT theo cấp độ", "Kaiwa ứng dụng", "Đọc hiểu nâng cao"]
      : ["Hiragana & Katakana", "Mẫu câu nhập môn", "Từ vựng thường ngày"];
  }

  if (languageCode === "ko") {
    return branch === "paid"
      ? ["TOPIK theo mục tiêu", "Giao tiếp thực tế", "Nghe hiểu nâng cao"]
      : ["Hangeul nền tảng", "Mẫu câu cơ bản", "Từ vựng sinh hoạt"];
  }

  if (languageCode === "de") {
    return branch === "paid"
      ? ["Giao tiếp công việc", "Ngữ pháp nâng cao", "Luyện thi chứng chỉ"]
      : ["Phát âm căn bản", "Mẫu câu nhập môn", "Từ vựng thường dùng"];
  }

  return branch === "paid"
    ? [`Luyện thi ${languageName}`, `Giao tiếp nâng cao ${languageName}`, `Đọc hiểu chuyên sâu ${languageName}`]
    : [`Nền tảng ${languageName}`, `Giao tiếp cơ bản ${languageName}`, `Từ vựng thường ngày ${languageName}`];
}

function getCommunityGroupShowcase(languageCode) {
  if (languageCode === "zh") {
    return [
      {
        key: "hsk-morning",
        name: "HSK 3 Buổi sáng",
        description: "Ôn từ vựng, đọc hiểu ngắn và chữa bài theo nhịp học mỗi sáng.",
        tags: ["Luyện thi", "Đọc hiểu", "Nghe"],
        activity: "Rất sôi nổi",
        members: 126,
        accent: "blue",
      },
      {
        key: "khau-ngu-10p",
        name: "Khẩu ngữ 10 phút",
        description: "Luyện phản xạ giao tiếp cơ bản, gọi nhanh và sửa câu ngay sau buổi học.",
        tags: ["Giao tiếp", "Nghe"],
        activity: "Đang tăng tốc",
        members: 72,
        accent: "green",
      },
      {
        key: "ngu-phap-hsk",
        name: "Ngữ pháp HSK nền tảng",
        description: "Mỗi ngày một cấu trúc, ví dụ ngắn và bài tập chữa lỗi theo chủ điểm.",
        tags: ["Ngữ pháp", "Học đều"],
        activity: "Học đều",
        members: 58,
        accent: "gold",
      },
      {
        key: "doi-song-trung",
        name: "Tiếng Trung đời sống",
        description: "Ôn từ vựng đi lại, ăn uống và tình huống thường gặp khi ra ngoài.",
        tags: ["Giao tiếp", "Đọc hiểu"],
        activity: "Mới nổi bật",
        members: 88,
        accent: "pink",
      },
    ];
  }

  return [
    {
      key: "toeic-morning",
      name: "TOEIC 750+ Buổi sáng",
      description: "Ôn đọc hiểu, nghe part 3 và chữa đề theo nhịp học mỗi sáng.",
      tags: ["Luyện thi", "Đọc hiểu", "Nghe"],
      activity: "Rất sôi nổi",
      members: 128,
      accent: "blue",
    },
    {
      key: "speaking-buddy",
      name: "Giao tiếp 15 phút",
      description: "Ghép cặp luyện phản xạ nói nhanh, gọi 15 phút và feedback ngay.",
      tags: ["Giao tiếp", "Nghe"],
      activity: "Đang tăng tốc",
      members: 76,
      accent: "green",
    },
    {
      key: "grammar-lab",
      name: "Ngữ pháp mỗi ngày",
      description: "Mỗi ngày một điểm ngữ pháp, ví dụ ngắn và bài tập chữa lỗi.",
      tags: ["Ngữ pháp", "Học đều"],
      activity: "Học đều",
      members: 54,
      accent: "gold",
    },
    {
      key: "ielts-writing",
      name: "Luyện thi học thuật",
      description: "Chấm chéo bài viết, lưu dàn ý mạnh và ôn theo từng chủ đề.",
      tags: ["Luyện thi", "Đọc hiểu"],
      activity: "Mới nổi bật",
      members: 91,
      accent: "pink",
    },
  ];
}

function getCommunityFriendShowcase(languageCode) {
  if (languageCode === "zh") {
    return [
      {
        key: "linh-chi-zh",
        name: "Linh Chi",
        publicId: "20418",
        goal: "Giao tiếp",
        status: "Online",
        headline: "Muốn tìm partner luyện khẩu ngữ 20 phút mỗi tối.",
        badges: ["Tiếng Trung", "Giao tiếp", "Học đều"],
        accent: "blue",
      },
      {
        key: "minh-quan-zh",
        name: "Minh Quân",
        publicId: "31025",
        goal: "Luyện thi",
        status: "Đang ôn HSK",
        headline: "Đang tập trung HSK và thích học theo checklist rõ ràng.",
        badges: ["HSK", "Đọc hiểu", "Nghe"],
        accent: "gold",
      },
      {
        key: "yuna-kim-zh",
        name: "Yuna Kim",
        publicId: "18402",
        goal: "Học đều",
        status: "Mới tham gia",
        headline: "Thích ôn từ vựng, nhắn nhau nhắc streak và học mỗi ngày.",
        badges: ["Từ vựng", "Streak", "Daily"],
        accent: "green",
      },
    ];
  }

  return [
    {
      key: "lan-anh",
      name: "Lan Anh",
      publicId: "20418",
      goal: "Giao tiếp",
      status: "Online",
      headline: "Muốn tìm partner luyện giao tiếp 20 phút mỗi tối.",
      badges: ["Tiếng Anh", "Giao tiếp", "Học đều"],
      accent: "blue",
    },
    {
      key: "minh-quan",
      name: "Minh Quân",
      publicId: "31025",
      goal: "Luyện thi",
      status: "Đang ôn đề",
      headline: "Đang tập trung TOEIC và thích học theo checklist rõ ràng.",
      badges: ["TOEIC", "Đọc hiểu", "Nghe"],
      accent: "gold",
    },
    {
      key: "yuna-kim",
      name: "Yuna Kim",
      publicId: "18402",
      goal: "Học đều",
      status: "Mới tham gia",
      headline: "Thích ôn từ vựng, nhắn nhau nhắc streak và học mỗi ngày.",
      badges: ["Từ vựng", "Streak", "Daily"],
      accent: "green",
    },
  ];
}

function getContactInitials(profile) {
  const source = profile?.full_name || profile?.email || "Admin";
  return (
    source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "A"
  );
}

const FOOTER_LINK_GROUPS = [
  {
    title: "Học tập",
    links: [
      ["/khoa-hoc", "Khóa học"],
      ["/lo-trinh", "Lộ trình"],
      ["/hoc-tap", "Học tập"],
      ["/on-luyen", "Ôn luyện"],
    ],
  },
  {
    title: "Thi và tiến độ",
    links: [
      ["/thi", "Kho đề thi"],
      ["/giai-dau", "Giải đấu"],
      ["/tien-do", "Tiến độ"],
      ["/bang-xep-hang", "Bảng xếp hạng"],
    ],
  },
  {
    title: "Cộng đồng",
    links: [
      ["/nhom-chat", "Nhóm chat"],
      ["/hop-thu", "Hộp thư"],
      ["/lien-he", "Liên hệ admin"],
      ["/profile", "Tài khoản"],
    ],
  },
  {
    title: "Cá nhân hóa",
    links: [
      ["/chon-ngon-ngu", "Chọn ngôn ngữ"],
      ["/pet", "Pet đồng hành"],
      ["/so-tay", "Sổ tay"],
      ["/cai-dat", "Cài đặt"],
    ],
  },
];

function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [threshold]);
  return scrolled;
}

function useMousePosition() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);
  return mouse;
}

function TopNav({ app }) {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const [navHidden, setNavHidden] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const courseMenuRef = useRef(null);
  const courseMenuTriggerRef = useRef(null);
  const courseMenuPanelRef = useRef(null);
  const [courseMenuPosition, setCourseMenuPosition] = useState({ left: 0, top: 64 });

  const hasUser = Boolean(app.user);
  const hasLanguage = Boolean(app.user?.learning_language_code);

  useMotionValueEvent(scrollY, "change", (current) => {
    const previous = scrollY.getPrevious() ?? current;
    setNavScrolled(current > 8);

    if (menuOpen || courseMenuOpen || current < 72) {
      setNavHidden(false);
      return;
    }

    if (current > previous + 3) {
      setNavHidden(true);
    } else if (current < previous - 3) {
      setNavHidden(false);
    }
  });

  useEffect(() => {
    if (menuOpen || courseMenuOpen) {
      setNavHidden(false);
    }
  }, [courseMenuOpen, menuOpen]);

  const mainLinks = hasUser && hasLanguage
    ? [
        ["/bang-vang-server", "🏆", "Bảng Vàng"],
        ["/khoa-hoc", "", "Khóa học"],
        ["/lien-he", "", "Liên hệ"],
        ["/hop-thu", "", "Hộp thư"],
        ...(app.user?.is_admin ? [["/admin", "", "Admin"]] : []),
        ["/profile", "👤", "Profile"],
        ["/cai-dat", "settings-bars", "Cài đặt"],
      ]
    : hasUser
    ? [
        ["/chon-ngon-ngu", "", "Chọn ngôn ngữ"],
        ...(app.user?.is_admin ? [["/admin", "", "Admin"]] : []),
        ["/profile", "👤", "Profile"],
      ]
    : [["/dang-nhap", "", "Đăng nhập"]];

  const handleCourseMenuItemClick = useCallback((path) => {
    setCourseMenuOpen(false);
    setMenuOpen(false);
    navigate(path);
  }, [navigate]);

  const updateCourseMenuPosition = useCallback(() => {
    const rect = courseMenuTriggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCourseMenuPosition({
      left: rect.left + rect.width / 2,
      top: rect.bottom + 8,
    });
  }, []);

  useLayoutEffect(() => {
    if (!courseMenuOpen) return;
    updateCourseMenuPosition();
  }, [courseMenuOpen, updateCourseMenuPosition]);

  useEffect(() => {
    function handleClickOutside(event) {
      const isInsideTrigger = courseMenuRef.current?.contains(event.target);
      const isInsidePanel = courseMenuPanelRef.current?.contains(event.target);
      if (!isInsideTrigger && !isInsidePanel) {
        setCourseMenuOpen(false);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!courseMenuOpen) return;
    window.addEventListener("resize", updateCourseMenuPosition);
    window.addEventListener("scroll", updateCourseMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateCourseMenuPosition);
      window.removeEventListener("scroll", updateCourseMenuPosition, true);
    };
  }, [courseMenuOpen, updateCourseMenuPosition]);

  function renderNavIcon(icon) {
    if (!icon) return null;
    if (icon === "settings-bars") {
      return (
        <span aria-hidden="true" className="topnav-link-icon topnav-link-icon-bars">
          <span />
          <span />
        </span>
      );
    }
    return <span className="topnav-link-icon">{icon}</span>;
  }

  return (
    <>
      <motion.header
        animate={{ y: navHidden ? -56 : 0 }}
        className={`topnav${navScrolled ? " topnav-scrolled" : ""}`}
        initial={false}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="topnav-inner">
          <button className="topnav-logo" onClick={() => { navigate("/"); setMenuOpen(false); }} type="button">
            <span className="topnav-logo-icon">✨</span>
            <span className="topnav-logo-text">Vmora</span>
            {app.user?.learning_language_code ? (
              <span className="topnav-lang-pill">{LANGUAGE_LABELS[app.user.learning_language_code] ?? app.user.learning_language_code}</span>
            ) : null}
          </button>

          <nav className="topnav-links" aria-label="Menu chính">
            {mainLinks.map(([to, icon, label]) =>
              to === "/khoa-hoc" ? (
                <div
                  className="topnav-dropdown"
                  key={to}
                  ref={courseMenuRef}
                >
                  <button
                    aria-expanded={courseMenuOpen}
                    className={`topnav-link topnav-dropdown-trigger${courseMenuOpen ? " topnav-dropdown-trigger-open" : ""}`}
                    onClick={() => {
                      updateCourseMenuPosition();
                      setCourseMenuOpen((current) => !current);
                    }}
                    ref={courseMenuTriggerRef}
                    type="button"
                  >
                    {renderNavIcon(icon)}
                    <span className="topnav-link-label">{label}</span>
                    <span aria-hidden="true" className="topnav-dropdown-caret">▾</span>
                  </button>

                  {courseMenuOpen && typeof document !== "undefined"
                    ? createPortal(
                        <div
                          className="topnav-dropdown-panel"
                          ref={courseMenuPanelRef}
                          style={{ left: courseMenuPosition.left, top: courseMenuPosition.top }}
                        >
                          {COURSE_HUB_ITEMS.map((item) => (
                            <a
                              className="topnav-dropdown-item"
                              href={item.path}
                              key={item.path}
                              onClick={(event) => {
                                event.preventDefault();
                                handleCourseMenuItemClick(item.path);
                              }}
                            >
                              {item.icon ? <span className="topnav-dropdown-item-icon">{item.icon}</span> : null}
                              <span className="topnav-dropdown-item-label">{item.title}</span>
                            </a>
                          ))}
                        </div>,
                        document.body,
                      )
                    : null}
                </div>
              ) : (
                <NavLink
                  className={({ isActive }) => `topnav-link${isActive ? " topnav-link-active" : ""}`}
                  key={to}
                  onClick={() => setMenuOpen(false)}
                  to={to}
                >
                  {renderNavIcon(icon)}
                  <span className="topnav-link-label">{label}</span>
                </NavLink>
              ),
            )}
          </nav>

          <button
            aria-label="Mở menu"
            className={`topnav-burger${menuOpen ? " topnav-burger-open" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            type="button"
          >
            <span /><span /><span />
          </button>
        </div>

        {menuOpen ? (
          <div className="topnav-mobile-dropdown">
            {mainLinks.map(([to, icon, label]) => (
              <NavLink
                className={({ isActive }) => `topnav-mobile-link${isActive ? " topnav-mobile-link-active" : ""}`}
                key={to}
                onClick={() => setMenuOpen(false)}
                to={to}
              >
                {renderNavIcon(icon)} {label}
              </NavLink>
            ))}
          </div>
        ) : null}
      </motion.header>
    </>
  );
}

function Footer({ app }) {
  const hasUser = Boolean(app.user);
  const hasLanguage = Boolean(app.user?.learning_language_code);
  const learningLabel = app.user?.learning_language_code
    ? LANGUAGE_LABELS[app.user.learning_language_code] ?? app.user.learning_language_code
    : "Chưa chọn";
  const footerNote = hasUser
    ? hasLanguage
      ? "Bạn đang ở trong hệ sinh thái học tập có lộ trình, ôn luyện, thi và cộng đồng realtime."
      : "Bạn đã đăng nhập. Chọn ngôn ngữ để mở toàn bộ khu học tập và hành trình cá nhân hóa."
    : "Đăng nhập để chọn ngôn ngữ, kích hoạt lộ trình và đi tiếp từng chặng rõ ràng trong Vmora.";

  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <section className="site-footer-brand">
          <div className="site-footer-logo">
            <span className="site-footer-logo-mark">✦</span>
            <div>
              <strong>Vmora</strong>
              <span>Nền tảng học ngôn ngữ theo lộ trình realtime</span>
            </div>
          </div>
          <p className="site-footer-copy">{footerNote}</p>
          <div className="site-footer-status-row">
            <span className="site-footer-chip">{app.apiStatus}</span>
            <span className="site-footer-chip">Ngôn ngữ: {learningLabel}</span>
            <span className="site-footer-chip">Admin: {app.user?.is_admin ? "Có" : "Không"}</span>
          </div>
        </section>

        {FOOTER_LINK_GROUPS.map((group) => (
          <nav aria-label={group.title} className="site-footer-nav" key={group.title}>
            <p className="site-footer-title">{group.title}</p>
            <div className="site-footer-links">
              {group.links.map(([to, label]) => (
                <NavLink className="site-footer-link" key={to} to={to}>
                  {label}
                </NavLink>
              ))}
            </div>
          </nav>
        ))}
      </div>

      <div className="site-footer-bottom">
        <p>Vmora kết nối khóa học, lộ trình, ôn luyện, thi, cộng đồng và quản trị trong cùng một hệ thống.</p>
        <p>{`© ${new Date().getFullYear()} Vmora. Học đều từng ngày, mở dần từng chặng.`}</p>
      </div>
    </footer>
  );
}

function useReveal(rootMargin = "-60px") {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);
  return [ref, visible];
}

function Card({ eyebrow, title, children, action, className = "" }) {

  return (
    <article className={`course-card ${className}`.trim()}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h3>{title}</h3>
      {children}
      {action}
    </article>
  );
}

function SimplePage({ title, eyebrow, children, showBackButton = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  const historyIndex = typeof window !== "undefined" && typeof window.history?.state?.idx === "number" ? window.history.state.idx : 0;
  const canGoBack = historyIndex > 0 || location.key !== "default";

  function handleBack() {
    if (canGoBack) {
      navigate(-1);
      return;
    }
    navigate("/");
  }

  return (
    <section className="flow-card">
      {showBackButton || eyebrow || title ? (
        <div className="simple-page-head">
          {showBackButton ? (
            <button className="ghost-button mini-button simple-page-back" onClick={handleBack} type="button">
              <span aria-hidden="true">←</span>
              <span>Quay lại</span>
            </button>
          ) : null}
          {eyebrow || title ? (
            <div className="section-heading simple-page-heading">
              {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
              {title ? <h2>{title}</h2> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function MenuHubPage({ eyebrow, title, summary, items }) {
  const navigate = useNavigate();

  return (
    <SimplePage eyebrow={eyebrow} title={title}>
      <section className="menu-hub-shell">
        {summary ? (
          <div className="menu-hub-summary">
            <p>{summary}</p>
          </div>
        ) : null}

        <div className="menu-hub-list">
          {items.map((item, index) => (
            <button
              className={`menu-hub-item menu-hub-item-${item.tone ?? "default"}`}
              key={item.path}
              onClick={() => navigate(item.path)}
              type="button"
            >
              <div className="menu-hub-item-main">
                <span className="menu-hub-item-order">{String(index + 1).padStart(2, "0")}</span>
                {item.icon ? <span className="menu-hub-item-icon">{item.icon}</span> : null}
                <div className="menu-hub-item-copy">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
              <span className="menu-hub-item-arrow">↗</span>
            </button>
          ))}
        </div>
      </section>
    </SimplePage>
  );
}

function getAccessibleLessonsByStage(overview, stageId) {
  const courses = overview?.courses ?? [];
  return courses
    .filter((course) => course.has_access)
    .flatMap((course) =>
      course.sections.flatMap((section) =>
        section.lessons
          .filter((lesson) => lesson.stage_id === stageId)
          .map((lesson) => ({
            ...lesson,
            courseTitle: course.title,
            sectionTitle: section.title,
          })),
      ),
    )
    .sort((left, right) => left.order_index - right.order_index || left.id - right.id);
}

function findStageIdByLessonId(overview, lessonId) {
  const courses = overview?.courses ?? [];
  for (const course of courses) {
    for (const section of course.sections) {
      for (const lesson of section.lessons) {
        if (lesson.id === lessonId) {
          return lesson.stage_id ?? null;
        }
      }
    }
  }
  return null;
}

function normalizePracticeBranch(branch, hasPaidPracticeAccess) {
  if (branch === "paid" && hasPaidPracticeAccess) return "paid";
  return "free";
}

function filterPracticeActivitiesByBranch(items, branch) {
  return items.filter((item) => (branch === "paid" ? !item.is_free : item.is_free));
}

function getPracticeTopic(item) {
  const rawTopic = item.topic || item.payload?.topic;
  if (typeof rawTopic !== "string") {
    return null;
  }
  const normalizedTopic = rawTopic.trim();
  return normalizedTopic || null;
}

async function handlePackageSelection(app, navigate, packageItem) {
  const result = await app.packageAction(packageItem);
  if (result?.externalUrl) {
    window.open(result.externalUrl, "_blank", "noopener,noreferrer");
    return;
  }
  if (result?.redirectToPractice) {
    navigate(`/on-luyen?branch=${packageItem.is_free ? "free" : "paid"}`);
  }
}

async function handleFreePracticeEntry(app, navigate, freePackage) {
  if (app.canOpenPractice) {
    navigate("/on-luyen?branch=free");
    return;
  }

  if (freePackage) {
    const result = await app.packageAction(freePackage);
    if (result?.externalUrl) {
      window.open(result.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (result?.ok) {
      navigate("/on-luyen?branch=free");
      return;
    }
    return;
  }

  navigate("/on-luyen?branch=free");
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN");
}

function getTournamentCountdown(endsAt) {
  const target = endsAt ? new Date(endsAt) : null;
  if (!target || Number.isNaN(target.getTime())) {
    return { days: "00", hours: "00", minutes: "00" };
  }

  const diff = Math.max(0, target.getTime() - Date.now());
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
  };
}

function getElapsedDuration(since) {
  const start = since ? new Date(since) : null;
  if (!start || Number.isNaN(start.getTime())) {
    return { hours: "00", minutes: "00", seconds: "00" };
  }

  const diff = Math.max(0, Date.now() - start.getTime());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

function getTournamentExamRemaining(startedAt, durationMinutes = 0) {
  const start = startedAt ? new Date(startedAt) : null;
  if (!start || Number.isNaN(start.getTime())) {
    return { minutes: "00", seconds: "00", isOver: false };
  }

  const endAt = start.getTime() + durationMinutes * 60 * 1000;
  const diff = Math.max(0, endAt - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
    isOver: diff === 0,
  };
}

function buildAchievementBadges(app) {
  const badges = [];
  if ((app.stats?.completed_lessons ?? 0) > 0) badges.push(`Hoàn thành ${app.stats.completed_lessons} bài học`);
  if ((app.stats?.practice_attempts ?? 0) > 0) badges.push(`Ôn luyện ${app.stats.practice_attempts} lượt`);
  if ((app.stats?.exam_attempts ?? 0) > 0) badges.push(`Thi ${app.stats.exam_attempts} lượt`);
  if ((app.stats?.tournament_attempts ?? 0) > 0) badges.push(`Giải đấu ${app.stats.tournament_attempts} lượt`);
  if ((app.streak?.current_streak ?? 0) > 0) badges.push(`Duy trì chuỗi ${app.streak.current_streak} ngày`);
  return badges;
}

function buildGiftItems(app) {
  return app.currentLanguageEntitlements.map((item) => ({
    id: item.id,
    title: item.package_name ?? "Gói đã kích hoạt",
    content: item.is_free ? "Quà/gói free đã kích hoạt" : "Gói mua đã kích hoạt",
  }));
}

function getMailTypeMeta(type) {
  switch (type) {
    case "system":
    case "study_reminder":
      return { icon: "🛎️", label: "Hệ thống", tone: "system" };
    case "friend":
      return { icon: "💬", label: "Bạn bè", tone: "friend" };
    case "achievement":
    case "badge":
      return { icon: "🏅", label: "Thành tích", tone: "achievement" };
    case "reward":
    case "gift":
      return { icon: "🎁", label: "Phần quà", tone: "reward" };
    default:
      return { icon: "✉️", label: "Thông báo", tone: "default" };
  }
}

function safeClassPart(value, fallback = "default") {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
}

function clampPercent(value) {
  const numericValue = Number(value) || 0;
  return Math.max(0, Math.min(100, Math.round(numericValue)));
}

function buildConicGradient(segments, emptyColor = "rgba(148, 163, 184, 0.16)") {
  const normalizedSegments = (segments ?? [])
    .map((segment) => ({
      color: segment.color,
      value: Math.max(0, Number(segment.value) || 0),
    }))
    .filter((segment) => segment.value > 0);
  const total = normalizedSegments.reduce((sum, segment) => sum + segment.value, 0);

  if (!total) {
    return `conic-gradient(${emptyColor} 0deg 360deg)`;
  }

  let currentAngle = 0;
  const gradientStops = normalizedSegments.map((segment) => {
    const startAngle = currentAngle;
    currentAngle += (segment.value / total) * 360;
    return `${segment.color} ${startAngle}deg ${currentAngle}deg`;
  });

  if (currentAngle < 360) {
    gradientStops.push(`${emptyColor} ${currentAngle}deg 360deg`);
  }

  return `conic-gradient(${gradientStops.join(", ")})`;
}

function HomePage({ app }) {
  return <VmoraLanding app={app} languages={LANGUAGE_SHOWCASE_ITEMS} />;

  const navigate = useNavigate();
  const hasUser = Boolean(app.user);
  const hasLanguage = Boolean(app.user?.learning_language_code);
  const startPath = hasUser ? (hasLanguage ? "/khoa-hoc" : "/chon-ngon-ngu") : "/dang-nhap";
  const [featRef, featVisible] = useReveal("-40px");
  const [langRef, langVisible] = useReveal("-80px");
  const [openFeatureKey, setOpenFeatureKey] = useState("roadmap");
  const mouse = useMousePosition();

  // Calculate parallax offset for blobs
  const tx = (mouse.x - window.innerWidth / 2) * 0.05;
  const ty = (mouse.y - window.innerHeight / 2) * 0.05;

  const features = [
    {
      key: "roadmap",
      icon: "🚀",
      title: "Lộ trình bài bản",
      desc: "Từ cơ bản đến nâng cao theo đường dẫn cá nhân hóa.",
      detail: "Người học đi từ khóa học sang lộ trình, chọn chặng, mở bài, cập nhật tiến độ và mở tiếp bài sau theo đúng nhịp học đã chốt.",
      accent: "violet",
    },
    {
      key: "ai",
      icon: "🤖",
      title: "AI Ôn luyện",
      desc: "Nghe, nói, đọc, viết và được gợi ý ngay lập tức.",
      detail: "Hệ thống gom hoạt động từ vựng, viết, nghe, nói và ngữ pháp trong cùng một luồng ôn luyện để bạn luyện đúng kỹ năng còn yếu.",
      accent: "pink",
    },
    {
      key: "rank",
      icon: "🏆",
      title: "Giải đấu & Rank",
      desc: "Thi theo mùa, leo bảng vũ đài và rinh quà hấp dẫn.",
      detail: "Từ bài thi thường đến giải đấu, mọi kết quả đều quay về bảng xếp hạng và tiến độ cá nhân để người học nhìn thấy sự tiến bộ rõ ràng.",
      accent: "gold",
    },
    {
      key: "community",
      icon: "💬",
      title: "Cộng đồng sôi nổi",
      desc: "Kết bạn, tạo nhóm riêng và học cùng nhau mọi lúc.",
      detail: "Người học có thể vào nhóm chat, hộp thư, ticket hỗ trợ và tương tác cộng đồng trong cùng một hệ sinh thái realtime, không bị tách rời.",
      accent: "sky",
    },
    {
      key: "pet",
      icon: "🐾",
      title: "Pet AI cạnh bên",
      desc: "Pet có AI ghi nhớ và đồng hành cùng hành trình của bạn.",
      detail: "Pet đóng vai trò bạn đồng hành, lưu tương tác, phản hồi theo tiến độ và giúp trải nghiệm học tập có cảm giác sống động hơn từng ngày.",
      accent: "mint",
    },
    {
      key: "languages",
      icon: "🌍",
      title: "5 ngôn ngữ",
      desc: "Tiếng Anh, Trung, Nhật, Hàn, Đức trên một nền tảng duy nhất.",
      detail: "Toàn bộ luồng học liệu, ôn luyện, thi và cộng đồng đều bám theo ngôn ngữ bạn chọn để không bị loãng trải nghiệm khi học nhiều chương trình khác nhau.",
      accent: "sunset",
    },
  ];
  const languages = LANGUAGE_SHOWCASE_ITEMS;
  const testimonials = [
    {
      quote: "Trước đây mình học rất thất thường. Vào Vmora thì có lộ trình rõ, tối nào cũng biết nên học gì tiếp theo.",
      name: "Linh Chi",
      role: "Người học tiếng Anh giao tiếp",
    },
    {
      quote: "Mình thích nhất là vừa ôn với AI vừa có nhóm chat để hỏi nhanh. Cảm giác không bị học một mình nữa.",
      name: "Minh Quân",
      role: "Đang học tiếng Hàn từ đầu",
    },
    {
      quote: "Phần thi đấu và bảng xếp hạng khiến mình quay lại đều hơn. Mỗi tuần nhìn thấy tiến bộ rõ ràng hơn hẳn.",
      name: "Thu Hà",
      role: "Luyện JLPT N4",
    },
  ];
  const impactStats = [
    { value: "5", label: "ngôn ngữ đang mở", note: "Anh, Trung, Nhật, Hàn, Đức" },
    { value: "24/7", label: "AI đồng hành", note: "Gợi ý và ôn luyện liên tục" },
    { value: "1 nơi", label: "học + chat + thi", note: "Không phải đổi qua nhiều công cụ" },
  ];
  const roadmapPreview = [
    {
      day: "Ngày 1",
      title: "Khởi động đúng trình độ",
      detail: "Chọn mục tiêu, test nhanh và nhận lộ trình cá nhân hóa theo ngôn ngữ bạn đang học.",
    },
    {
      day: "Ngày 3",
      title: "Ôn luyện với AI",
      detail: "Luyện nghe, nói, đọc, viết theo điểm yếu hiện tại và được phản hồi ngay sau mỗi lượt làm.",
    },
    {
      day: "Ngày 7",
      title: "Vào nhịp cộng đồng",
      detail: "Tham gia chat tổng, nhóm riêng hoặc bảng xếp hạng để giữ động lực học đều mỗi ngày.",
    },
  ];
  const homeFaqs = [
    {
      question: "Vmora phù hợp cho người mới bắt đầu không?",
      answer: "Có. Bạn có thể bắt đầu từ mức cơ bản, chọn ngôn ngữ muốn học và đi theo lộ trình được gợi ý sẵn.",
    },
    {
      question: "AI trong Vmora hỗ trợ những gì?",
      answer: "AI hỗ trợ luyện tập, gợi ý bước học tiếp theo, phản hồi câu trả lời và giúp bạn ôn lại phần còn yếu.",
    },
    {
      question: "Mình có thể vừa học vừa tham gia cộng đồng không?",
      answer: "Có. Bạn có thể vào chat tổng, nhóm riêng, kết bạn và theo dõi tiến độ học trong cùng một hệ thống.",
    },
  ];

  return (
    <>
      <section className="hero-landing">
        <div 
          className="hero-blob hero-blob-1" 
          style={{ transform: `translate(${tx}px, ${ty}px)` }}
        />
        <div 
          className="hero-blob hero-blob-2" 
          style={{ transform: `translate(${-tx * 1.5}px, ${-ty * 1.5}px)` }}
        />
        <div 
          className="hero-blob hero-blob-3" 
          style={{ transform: `translate(${tx * 0.8}px, ${-ty * 0.8}px)` }}
        />
        <div aria-hidden="true" className="hero-motion-orbit hero-motion-orbit-1" />
        <div aria-hidden="true" className="hero-motion-orbit hero-motion-orbit-2" />
        <div className="hero-content">
          <div className="hero-badge reveal-fade-up" style={{ animationDelay: "0ms" }}>
            <span>🌟</span> Nền tảng học ngôn ngữ thế hệ mới
          </div>
          <h1 className="hero-title reveal-fade-up" style={{ animationDelay: "80ms" }}>
            Chinh phục ngôn ngữ<br />
            <span className="hero-title-gradient">theo cách của bạn</span>
          </h1>
          <p className="hero-subtitle reveal-fade-up" style={{ animationDelay: "160ms" }}>
            Vmora kết hợp lộ trình thông minh, AI ôn luyện và cộng đồng sôi nổi —
            giúp bạn tiến bộ rõ rệt mỗi ngày.
          </p>
          <div className="hero-actions reveal-fade-up" style={{ animationDelay: "240ms" }}>
            <button
              className="hero-cta-primary"
              id="hero-start-btn"
              onClick={() => navigate(startPath)}
              type="button"
            >
              {hasUser ? "⚡ Vào học ngay" : "🚀 Bắt đầu miễn phí"}
            </button>
            {!hasUser ? (
              <button
                className="hero-cta-secondary"
                onClick={() => navigate("/dang-nhap")}
                type="button"
              >
                Đăng nhập
              </button>
            ) : null}
          </div>
          <div className="hero-stats reveal-fade-up" style={{ animationDelay: "320ms" }}>
            <div className="hero-stat">
              <strong>5</strong><span>Ngôn ngữ</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <strong>AI</strong><span>Trợ lý</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <strong>Live</strong><span>Realtime</span>
            </div>
          </div>
        </div>
      </section>

      <section className={`language-showcase-section${langVisible ? " language-showcase-visible" : ""}`} ref={langRef}>
        <div className="language-showcase-grid">
          {languages.map((item, index) => (
            <article className="language-showcase-card" key={item.code} style={{ transitionDelay: `${index * 90}ms` }}>
              <div className="language-showcase-flag-wrap">
                <img alt={item.label} className="language-showcase-flag" src={item.image} />
              </div>
              <div className="language-showcase-meta">
                <strong>{item.label}</strong>
                <span>{item.sub}</span>
              </div>
            </article>
          ))}
        </div>
        <div className="language-showcase-head">
          <div>
            <p className="eyebrow">5 ngôn ngữ đang mở</p>
          </div>
        </div>
      </section>

      <section className="home-proof-section">
        <div className="home-section-head">
          <div>
            <p className="eyebrow">Học thật, tiến bộ thật</p>
            <h2>Vmora giúp người học bám được nhịp mỗi ngày</h2>
          </div>
        </div>
        <div className="home-proof-grid">
          {testimonials.map((item) => (
            <article className="home-proof-card" key={item.name}>
              <p>{item.quote}</p>
              <strong>{item.name}</strong>
              <span>{item.role}</span>
            </article>
          ))}
        </div>
        <div className="home-impact-grid">
          {impactStats.map((item) => (
            <article className="home-impact-card" key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              <small>{item.note}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="home-roadmap-section">
        <div className="home-section-head">
          <div>
            <p className="eyebrow">Demo lộ trình mẫu</p>
            <h2>Xem trước 7 ngày đầu học trên Vmora</h2>
          </div>
        </div>
        <div className="home-roadmap-layout">
          <div className="home-roadmap-list">
            {roadmapPreview.map((item) => (
              <article className="home-roadmap-step" key={item.day}>
                <span className="home-roadmap-day">{item.day}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
          <aside className="home-roadmap-highlight">
            <p className="eyebrow">Điểm khác biệt</p>
            <h3>Không chỉ học bài, mà còn giữ được đà học</h3>
            <p>
              Lộ trình, AI, cộng đồng và bảng xếp hạng được nối chung trong một flow. Người học biết mình đang ở đâu và nên làm gì tiếp theo.
            </p>
            <button className="hero-cta-primary" onClick={() => navigate(startPath)} type="button">
              {hasUser ? "Vào học ngay" : "Bắt đầu miễn phí"}
            </button>
          </aside>
        </div>
      </section>

      <section className="home-faq-section">
        <div className="home-section-head">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2>Những điều người mới thường hỏi trước khi bắt đầu</h2>
          </div>
        </div>
        <div className="home-faq-list">
          {homeFaqs.map((item) => (
            <details className="home-faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="features-section" ref={featRef}>
        <div className="features-timeline-head">
          <div>
            <p className="eyebrow">Bản đồ tính năng</p>
            <h2>Khám phá Vmora</h2>
          </div>
        </div>
        <div className={`features-timeline${featVisible ? " features-timeline-visible" : ""}`}>
          {features.map((feat, index) => {
            const isLeft = index % 2 === 0;
            const isOpen = openFeatureKey === feat.key;
            return (
              <div
                className={isLeft ? "timeline-row timeline-row-left" : "timeline-row timeline-row-right"}
                key={feat.key}
                style={{ transitionDelay: `${index * 90}ms` }}
              >
                {isLeft ? (
                  <div className="timeline-side">
                    <article className={isOpen ? `timeline-card timeline-card-open timeline-card-${feat.accent}` : `timeline-card timeline-card-${feat.accent}`}>
                      <button
                        aria-expanded={isOpen}
                        className="timeline-card-trigger"
                        onClick={() => setOpenFeatureKey((current) => (current === feat.key ? null : feat.key))}
                        type="button"
                      >
                        <div className="timeline-card-topline">
                          <span className="timeline-icon">{feat.icon}</span>
                          <span className="timeline-toggle">{isOpen ? "−" : "+"}</span>
                        </div>
                        <h3 className="timeline-title">{feat.title}</h3>
                        <p className="timeline-desc">{feat.desc}</p>
                      </button>
                      <div className={isOpen ? "timeline-panel timeline-panel-open" : "timeline-panel"}>
                        <p>{feat.detail}</p>
                      </div>
                    </article>
                  </div>
                ) : (
                  <div aria-hidden="true" className="timeline-side timeline-side-empty" />
                )}

                <div className="timeline-center">
                  <span className={isOpen ? "timeline-dot timeline-dot-active" : "timeline-dot"} />
                </div>

                {!isLeft ? (
                  <div className="timeline-side">
                    <article className={isOpen ? `timeline-card timeline-card-open timeline-card-${feat.accent}` : `timeline-card timeline-card-${feat.accent}`}>
                      <button
                        aria-expanded={isOpen}
                        className="timeline-card-trigger"
                        onClick={() => setOpenFeatureKey((current) => (current === feat.key ? null : feat.key))}
                        type="button"
                      >
                        <div className="timeline-card-topline">
                          <span className="timeline-icon">{feat.icon}</span>
                          <span className="timeline-toggle">{isOpen ? "−" : "+"}</span>
                        </div>
                        <h3 className="timeline-title">{feat.title}</h3>
                        <p className="timeline-desc">{feat.desc}</p>
                      </button>
                      <div className={isOpen ? "timeline-panel timeline-panel-open" : "timeline-panel"}>
                        <p>{feat.detail}</p>
                      </div>
                    </article>
                  </div>
                ) : (
                  <div aria-hidden="true" className="timeline-side timeline-side-empty" />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function AccountPage({ app }) {
  return (
    <AccountSection
      authError={app.authError}
      authForm={app.authForm}
      authMessage={app.authMessage}
      authMode={app.authMode}
      authSubmitting={app.authSubmitting}
      onAuthFieldChange={(field, value) => app.setAuthForm((current) => ({ ...current, [field]: value }))}
      onAuthModeChange={app.setAuthMode}
      onAuthSubmit={app.authSubmit}
      onLogout={app.doLogout}
      onProfileFieldChange={(field, value) => app.setProfileForm((current) => ({ ...current, [field]: value }))}
      onSaveProfile={app.saveProfile}
      passwordResetStep={app.passwordResetStep}
      profileForm={app.profileForm}
      user={app.user}
    />
  );
}

function MessagesPage({ app }) {
  const selectedFriend = app.friends.find((friend) => friend.friend_user_id === app.selectedFriendId) ?? app.friends[0] ?? null;

  function renderAvatar(name, email, avatarUrl) {
    const initials = getContactInitials({ full_name: name, email });
    return avatarUrl ? (
      <img alt={name || email || "avatar"} className="community-avatar community-avatar-small" src={avatarUrl} />
    ) : (
      <span className="community-avatar community-avatar-small community-avatar-fallback">{initials}</span>
    );
  }

  return (
    <SimplePage eyebrow="Tin nhắn" title="Tin nhắn">
      <section className="messages-hub-shell">
        <aside className="messages-sidebar community-panel">
          <div className="community-panel-head">
            <div>
              <p className="eyebrow">Bạn bè</p>
              <h3>Chat riêng</h3>
            </div>
          </div>
          <div className="community-compact-list">
            {app.friends.length === 0 ? <p className="community-empty-copy">Bạn chưa có bạn bè. Hãy kết bạn trong Nhóm chat trước.</p> : null}
            {app.friends.map((friend) => (
              <button
                className={app.selectedFriendId === friend.friend_user_id ? "messages-friend-link messages-friend-link-active" : "messages-friend-link"}
                key={friend.id}
                onClick={() => app.setSelectedFriendId(friend.friend_user_id)}
                type="button"
              >
                {renderAvatar(friend.friend_name, friend.friend_email, friend.friend_avatar_url)}
                <span>
                  <strong>{friend.friend_name || friend.friend_email}</strong>
                  <small>ID {friend.friend_public_user_id}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="messages-main community-panel">
          <div className="messages-chat-head">
            {selectedFriend ? (
              <>
                {renderAvatar(selectedFriend.friend_name, selectedFriend.friend_email, selectedFriend.friend_avatar_url)}
                <div>
                  <strong>{selectedFriend.friend_name || selectedFriend.friend_email}</strong>
                  <span>{selectedFriend.friend_email}</span>
                </div>
              </>
            ) : (
              <div>
                <strong>Chọn một người bạn để chat</strong>
                <span>Tin nhắn riêng sẽ hiện ở đây.</span>
              </div>
            )}
          </div>

          <div className="messages-thread">
            {selectedFriend && app.directMessages.length === 0 ? <p className="community-empty-copy">Chưa có tin nhắn nào với bạn này.</p> : null}
            {app.directMessages.map((message) => {
              const isMine = message.sender_user_id === app.user?.id;
              return (
                <article className={isMine ? "messages-bubble-row messages-bubble-row-mine" : "messages-bubble-row"} key={message.id}>
                  {!isMine ? renderAvatar(message.sender_name, "", message.sender_avatar_url) : null}
                  <div className="messages-bubble">
                    <strong>{isMine ? "Bạn" : message.sender_name}</strong>
                    <p>{message.content}</p>
                    <span>{formatDateTime(message.created_at)}</span>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="messages-composer">
            <input
              disabled={!selectedFriend}
              onChange={(event) => app.setDirectMessageText(event.target.value)}
              placeholder={selectedFriend ? "Nhập tin nhắn..." : "Chọn bạn trước khi nhắn"}
              value={app.directMessageText}
            />
            <button disabled={!selectedFriend} onClick={app.sendFriendMessage} type="button">
              Gửi
            </button>
          </div>
        </main>

        <aside className="messages-global community-panel">
          <div className="community-panel-head">
            <div>
              <p className="eyebrow">Khung tổng</p>
              <h3>Cộng đồng</h3>
            </div>
          </div>
          <div className="community-compact-list">
            {app.posts.slice(0, 8).map((post) => (
              <article className="messages-global-post" key={post.id}>
                <strong>{post.title}</strong>
                <p>{post.content}</p>
                <span>{post.comments?.length ?? 0} bình luận · {post.share_count ?? 0} chia sẻ</span>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </SimplePage>
  );
}

function LanguagePage({ app }) {
  const navigate = useNavigate();
  const languageCards = app.languages.map((language) => {
    const showcaseItem = LANGUAGE_SHOWCASE_ITEMS.find((item) => item.code === language.code);
    return {
      ...language,
      label: showcaseItem?.label ?? language.name,
      sub: showcaseItem?.sub ?? (LANGUAGE_LABELS[language.code] ?? language.code.toUpperCase()),
      image: showcaseItem?.image ?? "/images/anh.svg",
    };
  });

  return (
    <SimplePage eyebrow="Ngôn ngữ" title="Chọn ngôn ngữ">
      <section className="language-selector-shell">
        <div className="language-selector-head">
          <p>Chọn ngôn ngữ bạn muốn học để mở đúng khóa học, lộ trình, ôn luyện và thi cho chương trình đó.</p>
        </div>

        <div className="language-selector-grid">
          {languageCards.map((language, index) => (
            <button
              className="language-selector-card"
              key={language.code}
              onClick={async () => {
                await app.changeLanguage({ target: { value: language.code } });
                navigate("/khoa-hoc");
              }}
              style={{ transitionDelay: `${index * 80}ms` }}
              type="button"
            >
              <div className="language-showcase-flag-wrap language-selector-flag-wrap">
                <img alt={language.label} className="language-showcase-flag" src={language.image} />
              </div>
              <div className="language-showcase-meta language-selector-meta">
                <p className="eyebrow">{LANGUAGE_LABELS[language.code] ?? language.code.toUpperCase()}</p>
                <strong>{language.label}</strong>
                <span>{language.sub}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </SimplePage>
  );
}

function CoursePage() {
  return (
    <MenuHubPage
      eyebrow="Khóa học"
      items={COURSE_HUB_ITEMS}
      summary="Chọn nhanh khu vực học tập bạn muốn vào. Trên thanh menu chính, rê chuột vào Khóa học cũng sẽ hiện danh sách này."
      title="Chọn khu vực"
    />
  );
}

function StudyPage({ app }) {
  return (
    <MenuHubPage
      eyebrow="Học tập"
      items={LEARNING_HUB_ITEMS}
      summary="Khu học tập gom các công cụ học sâu: pet đồng hành, thi, sổ tay, kho từ vựng và ôn luyện theo kỹ năng."
      title="Chọn công cụ học tập"
    />
  );
}

function PracticeHubPage({ app }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeBranch = normalizePracticeBranch(searchParams.get("branch"), app.hasPaidPracticeAccess);
  const branchActivities = filterPracticeActivitiesByBranch(app.practiceActivities, activeBranch);
  const availableSkillKeys = new Set(branchActivities.map((item) => item.practice_skill));
  const branchItems = PRACTICE_HUB_ITEMS
    .filter((item) => availableSkillKeys.has(item.skillKey))
    .map((item) => ({ ...item, path: `${item.path}?branch=${activeBranch}` }));
  const branchMeta = PRACTICE_BRANCHES.find((item) => item.key === activeBranch) ?? PRACTICE_BRANCHES[0];

  if (activeBranch === "paid" && !app.hasPaidPracticeAccess) {
    return (
      <SimplePage eyebrow="Ôn luyện" title="Ôn luyện">
        <div className="lesson-detail-panel">
          <p className="eyebrow">Ôn luyện mua</p>
          <h2>Chưa mở nhánh mua</h2>
          <p>Bạn cần kích hoạt gói mua trước khi vào nhánh ôn luyện nâng cao.</p>
          <div className="lesson-detail-actions">
            <button className="ghost-button complete-button" onClick={() => navigate("/lo-trinh")} type="button">
              Quay về lộ trình
            </button>
          </div>
        </div>
      </SimplePage>
    );
  }

  return (
    <SimplePage eyebrow="Ôn luyện" title="Chọn nhánh ôn luyện">
      <section className="menu-hub-shell">
        <div className="menu-hub-summary">
          <p>{branchMeta.description}</p>
        </div>
        <div className="practice-nav">
          {PRACTICE_BRANCHES.filter((item) => item.key === "free" || app.hasPaidPracticeAccess).map((item) => (
            <button
              className={item.key === activeBranch ? "practice-tab practice-tab-active" : "practice-tab"}
              key={item.key}
              onClick={() => navigate(`/on-luyen?branch=${item.key}`)}
              type="button"
            >
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </button>
          ))}
        </div>
        {branchItems.length > 0 ? (
          <div className="menu-hub-list">
            {branchItems.map((item, index) => (
              <button
                className={`menu-hub-item menu-hub-item-${item.tone ?? "default"}`}
                key={`${activeBranch}-${item.path}`}
                onClick={() => navigate(item.path)}
                type="button"
              >
                <div className="menu-hub-item-main">
                  <span className="menu-hub-item-order">{String(index + 1).padStart(2, "0")}</span>
                  <span className="menu-hub-item-icon">{item.icon}</span>
                  <div className="menu-hub-item-copy">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
                <span className="menu-hub-item-arrow">↗</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="lesson-detail-panel">
            <p className="eyebrow">{branchMeta.label}</p>
            <h2>Chưa có bài ôn luyện</h2>
            <p>Hiện chưa có kỹ năng ôn luyện nào được mở trong nhánh này.</p>
          </div>
        )}
      </section>
    </SimplePage>
  );
}

function RoadmapPage({ app }) {
  const navigate = useNavigate();
  const stages = app.overview?.roadmap?.stages ?? [];
  const courses = app.overview?.courses ?? [];
  const freeCourses = courses.filter((item) => item.is_free);
  const paidCourses = courses.filter((item) => !item.is_free);
  const freePackage = app.packages.find((item) => item.is_free);
  const paidPackages = app.packages.filter((item) => !item.is_free);
  const hasLearningAccess = app.currentLanguageEntitlements.length > 0;
  const [selectedStageId, setSelectedStageId] = useState(null);
  const [selectedTestKey, setSelectedTestKey] = useState(null);

  useEffect(() => {
    if (stages.length === 0) {
      setSelectedStageId(null);
      return;
    }
    setSelectedStageId((current) => (stages.some((stage) => stage.id === current) ? current : stages[0].id));
  }, [stages]);

  const selectedStage = stages.find((stage) => stage.id === selectedStageId) ?? null;
  const stageLessons = selectedStage ? getAccessibleLessonsByStage(app.overview, selectedStage.id) : [];
  const visibleLessonIds = new Set(stageLessons.map((lesson) => lesson.id));
  const visibleLessonDetail = app.lessonDetail && visibleLessonIds.has(app.lessonDetail.id) ? app.lessonDetail : null;
  const recommendedPackage = paidPackages[0] ?? null;

  async function completeCurrentLesson() {
    const result = await app.finishLesson();
    if (result?.next_lesson_id) {
      const nextStageId = findStageIdByLessonId(app.overview, result.next_lesson_id);
      if (nextStageId) {
        setSelectedStageId(nextStageId);
      }
      await app.openLesson({ id: result.next_lesson_id });
    }
  }

  return (
    <SimplePage eyebrow="Lộ trình" title="Lộ trình">
      <div className="route-flow-grid">
        <Card
          action={
            freePackage ? (
              <button className="primary-button complete-button" onClick={() => handleFreePracticeEntry(app, navigate, freePackage)} type="button">
                Kích hoạt khóa free
              </button>
            ) : null
          }
          eyebrow="Khóa free"
          title="Free cập nhật liên tục"
        >
          <div className="mini-list">
            {freeCourses.length === 0 ? <p>Chưa có khóa free.</p> : null}
            {freeCourses.map((course) => (
              <p key={course.id}>
                <strong>{course.title}</strong> - {course.description ?? "Đang cập nhật liên tục."}
              </p>
            ))}
          </div>
        </Card>
        <Card eyebrow="Khóa học mua" title="Các khóa mua">
          <div className="mini-list">
            {paidCourses.length === 0 ? <p>Chưa có khóa mua.</p> : null}
            {paidCourses.map((course) => (
              <p key={course.id}>
                <strong>{course.title}</strong> - {course.description ?? "Khóa học mở rộng."}
              </p>
            ))}
            {paidPackages.map((item) => (
              <button className="plain-list-button" key={item.id} onClick={() => handlePackageSelection(app, navigate, item)} type="button">
                Mua / kích hoạt {item.name}
              </button>
            ))}
          </div>
        </Card>
        <Card eyebrow="Bài test" title="Test tư vấn khóa học">
          <div className="mini-list">
            {ROADMAP_TESTS.map(([key, title, description]) => (
              <button className="plain-list-button" key={key} onClick={() => setSelectedTestKey(key)} type="button">
                {title} - {description}
              </button>
            ))}
            {selectedTestKey ? (
              <p>
                Gợi ý hiện tại: {recommendedPackage ? recommendedPackage.name : "chọn khóa free để bắt đầu trước"}. Hệ thống chỉ gợi ý, không ép mua.
              </p>
            ) : (
              <p>Chọn một bài test để nhận gợi ý khóa học phù hợp.</p>
            )}
          </div>
        </Card>
      </div>

      {!hasLearningAccess ? (
        <div className="lesson-detail-panel">
          <p className="eyebrow">Lộ trình</p>
          <h2>Chưa có quyền học</h2>
          <p>Chọn khóa free, mua khóa phù hợp hoặc làm bài test tư vấn. Sau khi có quyền học, bạn sẽ vào Học tập để học thật.</p>
          <div className="lesson-detail-actions">
            {freePackage ? (
              <button className="primary-button complete-button" onClick={() => handleFreePracticeEntry(app, navigate, freePackage)} type="button">
                Bắt đầu học ngay
              </button>
            ) : (
              <span className="completion-badge">Chưa có khóa free</span>
            )}
          </div>
        </div>
      ) : (
        <div className="lesson-detail-panel">
          <p className="eyebrow">Học tập</p>
          <h2>Đã có quyền học</h2>
          <p>Bạn có thể vào Học tập hoặc chọn chặng bên dưới trong lộ trình.</p>
          <div className="lesson-detail-actions">
            <button className="primary-button complete-button" onClick={() => navigate("/hoc-tap")} type="button">
              Vào Học tập
            </button>
          </div>
        </div>
      )}

      {stages.length > 0 ? (
        <div className="course-grid">
          {stages.map((stage) => (
            <button
              className={selectedStageId === stage.id ? "course-card diagram-button-card course-card-active" : "course-card diagram-button-card"}
              key={stage.id}
              onClick={() => setSelectedStageId(stage.id)}
              type="button"
            >
              <p className="eyebrow">{`Chặng ${stage.order_index}`}</p>
              <h3>{stage.title}</h3>
              {stage.description ? <p>{stage.description}</p> : null}
            </button>
          ))}
        </div>
      ) : null}

      {hasLearningAccess && selectedStage ? (
        <section className="flow-card nested-flow-card">
          <div className="section-heading compact-heading">
            <p className="eyebrow">Chọn bài</p>
            <h2>{selectedStage.title}</h2>
          </div>
          {stageLessons.length === 0 ? (
            <p className="empty-copy">Chặng này chưa có bài học được gắn vào.</p>
          ) : (
            <div className="course-grid">
              {stageLessons.map((lesson) => (
                <button
                  className={lesson.is_locked ? "course-card diagram-button-card course-card-disabled" : "course-card diagram-button-card"}
                  key={lesson.id}
                  onClick={() => app.openLesson(lesson)}
                  type="button"
                >
                  <p className="eyebrow">{lesson.courseTitle}</p>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.summary ?? lesson.sectionTitle}</p>
                  <p>{lesson.estimated_minutes} phút</p>
                  <div className="inline-badge-row">
                    <span className={lesson.is_completed ? "completion-badge done" : "completion-badge"}>
                      {lesson.is_completed ? "Đã xong" : "Chưa học"}
                    </span>
                    {lesson.is_locked ? <span className="completion-badge">Đang khóa</span> : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {visibleLessonDetail ? (
        <div className="lesson-detail-panel">
          <p className="eyebrow">Học bài</p>
          <h2>{visibleLessonDetail.title}</h2>
          {visibleLessonDetail.summary ? <p>{visibleLessonDetail.summary}</p> : null}
          <div className="lesson-detail-copy">
            <p>{visibleLessonDetail.content ?? visibleLessonDetail.locked_reason ?? "Bài học chưa có nội dung."}</p>
          </div>
          <div className="lesson-detail-actions">
            <span className={visibleLessonDetail.is_completed ? "completion-badge done" : "completion-badge"}>
              {visibleLessonDetail.is_completed ? "Đã hoàn thành" : `${visibleLessonDetail.estimated_minutes} phút`}
            </span>
            {visibleLessonDetail.is_locked ? (
              <button className="ghost-button complete-button" onClick={() => navigate("/khoa-hoc")} type="button">
                Mở quyền học
              </button>
            ) : !visibleLessonDetail.is_completed ? (
              <button className="primary-button complete-button" onClick={completeCurrentLesson} type="button">
                Học xong, cập nhật tiến độ
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </SimplePage>
  );
}

function RoadmapPageCinematic({ app }) {
  const navigate = useNavigate();
  const stages = app.overview?.roadmap?.stages ?? [];
  const courses = app.overview?.courses ?? [];
  const packages = app.packages ?? [];
  const currentLanguageCode = app.user?.learning_language_code ?? app.selectedLanguage ?? "en";
  const currentLanguageName = getLanguageDisplayName(currentLanguageCode);
  const freeCourses = courses.filter((item) => item.is_free);
  const paidCourses = courses.filter((item) => !item.is_free);
  const freePackage = packages.find((item) => item.is_free);
  const paidPackages = packages.filter((item) => !item.is_free);
  const hasLearningAccess = app.currentLanguageEntitlements.length > 0;
  const [selectedStageId, setSelectedStageId] = useState(null);
  const [selectedTestKey, setSelectedTestKey] = useState(null);
  const [selectedRoadmapKey, setSelectedRoadmapKey] = useState("test");

  useEffect(() => {
    if (stages.length === 0) {
      setSelectedStageId(null);
      return;
    }
    setSelectedStageId((current) => (stages.some((stage) => stage.id === current) ? current : stages[0].id));
  }, [stages]);

  const selectedStage = stages.find((stage) => stage.id === selectedStageId) ?? null;
  const stageLessons = selectedStage ? getAccessibleLessonsByStage(app.overview, selectedStage.id) : [];
  const visibleLessonIds = new Set(stageLessons.map((lesson) => lesson.id));
  const visibleLessonDetail = app.lessonDetail && visibleLessonIds.has(app.lessonDetail.id) ? app.lessonDetail : null;
  const recommendedPackage = paidPackages[0] ?? null;
  const selectedTest = ROADMAP_TESTS.find(([key]) => key === selectedTestKey) ?? null;
  const roadmapRecommendation = selectedTest
    ? recommendedPackage?.name ?? `Bắt đầu với nhánh ${currentLanguageName} free phù hợp`
    : `Làm bài test để nhận gợi ý lộ trình ${currentLanguageName}`;
  const roadmapHint = hasLearningAccess
    ? `Bạn đã có quyền học ${currentLanguageName}, có thể đi thẳng vào nhánh phù hợp bên dưới.`
    : `Bắt đầu từ khóa ${currentLanguageName} free hoặc làm test để hệ thống gợi ý đúng lộ trình.`;
  const freeCoursePreview = freeCourses.slice(0, 3);
  const paidCoursePreview = paidCourses.slice(0, 3);
  const freePreviewLabels = freeCoursePreview.length > 0 ? freeCoursePreview.map((course) => course.title) : getRoadmapPreviewLabels(currentLanguageCode, "free");
  const paidPreviewLabels = paidCoursePreview.length > 0 ? paidCoursePreview.map((course) => course.title) : getRoadmapPreviewLabels(currentLanguageCode, "paid");

  async function completeCurrentLesson() {
    const result = await app.finishLesson();
    if (result?.next_lesson_id) {
      const nextStageId = findStageIdByLessonId(app.overview, result.next_lesson_id);
      if (nextStageId) {
        setSelectedStageId(nextStageId);
      }
      await app.openLesson({ id: result.next_lesson_id });
    }
  }

  return (
    <SimplePage eyebrow={"L\u1ed9 tr\u00ecnh"} title={"L\u1ed9 tr\u00ecnh h\u1ecdc"}>
      <section className="roadmap-page-shell">
        <section className="roadmap-board">
          <div className="roadmap-board-head">
            <div className="roadmap-board-copy">
              <p className="roadmap-board-eyebrow">L\u1ed8 TR\u00ccNH</p>
              <h2>{`Lộ trình ${currentLanguageName}`}</h2>
              <p>{roadmapHint}</p>
            </div>
            <div className="roadmap-board-status">
              <span className={hasLearningAccess ? "roadmap-status-chip roadmap-status-chip-open" : "roadmap-status-chip"}>
                {hasLearningAccess ? "\u0110\u00e3 m\u1edf quy\u1ec1n h\u1ecdc" : "Ch\u01b0a m\u1edf quy\u1ec1n h\u1ecdc"}
              </span>
              <p>
                {selectedTest
                  ? `Test \u0111ang ch\u1ecdn: ${selectedTest[1]}`
                  : `Chọn bài test tư vấn để nhận gợi ý phù hợp cho ${currentLanguageName}.`}
              </p>
            </div>
          </div>

          <div className="roadmap-steps">
            <div className="roadmap-step-row">
              <div className={selectedRoadmapKey === "free" ? "roadmap-step-index roadmap-step-index-active" : "roadmap-step-index"}>1</div>
              <article className={selectedRoadmapKey === "free" ? "roadmap-step-card roadmap-step-card-active" : "roadmap-step-card"}>
                <div className="roadmap-step-card-head">
                  <div>
                    <p className="roadmap-step-kicker">{"Kh\u00f3a free"}</p>
                    <h3>{freePackage?.name ?? `Khởi đầu ${currentLanguageName}`}</h3>
                  </div>
                  <span className="roadmap-step-badge roadmap-step-badge-free">{"Mi\u1ec5n ph\u00ed"}</span>
                </div>
                <p className="roadmap-step-copy">
                  {freeCourses.length > 0
                    ? `${freeCourses.length} khóa nền tảng ${currentLanguageName} đang sẵn sàng để bạn bắt đầu đúng nhịp.`
                    : `Bắt đầu với các bài học ${currentLanguageName} nền tảng, dễ vào và có thể học ngay.`}
                </p>
                <div className="roadmap-chip-list">
                  {freePreviewLabels.map((label) => (
                    <span className="roadmap-chip" key={`free-${label}`}>
                      {label}
                    </span>
                  ))}
                </div>
                <button
                  className="roadmap-step-action"
                  onClick={async () => {
                    setSelectedRoadmapKey("free");
                    await handleFreePracticeEntry(app, navigate, freePackage);
                  }}
                  type="button"
                >
                  {"V\u00e0o \u00f4n luy\u1ec7n free"}
                </button>
              </article>
            </div>

            <div className="roadmap-step-row">
              <div className={selectedRoadmapKey === "test" ? "roadmap-step-index roadmap-step-index-active" : "roadmap-step-index"}>2</div>
              <article className={selectedRoadmapKey === "test" ? "roadmap-step-card roadmap-step-card-active roadmap-step-card-focus" : "roadmap-step-card roadmap-step-card-focus"}>
                <div className="roadmap-step-card-head">
                  <div>
                    <p className="roadmap-step-kicker">{"Test t\u01b0 v\u1ea5n"}</p>
                    <h3>{`Chọn đúng điểm bắt đầu cho ${currentLanguageName}`}</h3>
                  </div>
                  <span className="roadmap-step-badge roadmap-step-badge-active">{"\u0110ang l\u00e0m"}</span>
                </div>
                <p className="roadmap-step-copy">
                  {`Làm bài test ngắn để hệ thống đề xuất lộ trình, mục tiêu và khóa học ${currentLanguageName} phù hợp nhất cho bạn.`}
                </p>
                <div className="roadmap-test-list">
                  {ROADMAP_TESTS.map(([key, title]) => (
                    <button
                      className={selectedTestKey === key ? "roadmap-test-chip roadmap-test-chip-active" : "roadmap-test-chip"}
                      key={key}
                      onClick={() => {
                        setSelectedRoadmapKey("test");
                        setSelectedTestKey(key);
                      }}
                      type="button"
                    >
                      {title}
                    </button>
                  ))}
                </div>
                <button
                  className="roadmap-step-action"
                  onClick={() => {
                    setSelectedRoadmapKey("test");
                    setSelectedTestKey((current) => current ?? ROADMAP_TESTS[0][0]);
                  }}
                  type="button"
                >
                  {"L\u00e0m b\u00e0i test ngay"}
                </button>
              </article>
            </div>

            <div className="roadmap-step-row">
              <div className={selectedRoadmapKey === "paid" ? "roadmap-step-index roadmap-step-index-active" : "roadmap-step-index"}>3</div>
              <article className={selectedRoadmapKey === "paid" ? "roadmap-step-card roadmap-step-card-active" : "roadmap-step-card"}>
                <div className="roadmap-step-card-head">
                  <div>
                    <p className="roadmap-step-kicker">{"Kh\u00f3a h\u1ecdc mua"}</p>
                    <h3>{recommendedPackage?.name ?? `Nâng cao ${currentLanguageName}`}</h3>
                  </div>
                  <span className="roadmap-step-badge roadmap-step-badge-paid">{"Tr\u1ea3 ph\u00ed"}</span>
                </div>
                <p className="roadmap-step-copy">
                  {paidCourses.length > 0
                    ? `${paidCourses.length} khóa học ${currentLanguageName} chuyên sâu dành cho mục tiêu giao tiếp, thi cử và nâng cấp trình độ.`
                    : `Khi cần học sâu hơn, bạn có thể chuyển sang các khóa ${currentLanguageName} nâng cao có lộ trình rõ ràng.`}
                </p>
                <div className="roadmap-chip-list">
                  {paidPreviewLabels.map((label) => (
                    <span className="roadmap-chip" key={`paid-${label}`}>
                      {label}
                    </span>
                  ))}
                </div>
                <button
                  className="roadmap-step-action roadmap-step-action-secondary"
                  onClick={() => {
                    setSelectedRoadmapKey("paid");
                    if (recommendedPackage) {
                      handlePackageSelection(app, navigate, recommendedPackage);
                      return;
                    }
                    navigate("/khoa-hoc");
                  }}
                  type="button"
                >
                  {recommendedPackage ? "Xem g\u00f3i g\u1ee3i \u00fd" : "Xem kh\u00f3a h\u1ecdc"}
                </button>
              </article>
            </div>
          </div>

          <div className="roadmap-board-footer">
            <div>
              <p className="roadmap-board-footer-label">{"G\u1ee3i \u00fd ti\u1ebfp theo"}</p>
              <strong>{roadmapRecommendation}</strong>
              <p>
                {selectedTest
                  ? `Sau khi hoàn thành test, hệ thống sẽ ưu tiên đề xuất khóa học ${currentLanguageName} phù hợp với mục tiêu của bạn.`
                  : `Chọn một bài test để nhận gợi ý khóa học ${currentLanguageName}, sau đó bạn có thể bắt đầu ngay.`}
              </p>
            </div>
            <div className="roadmap-board-actions">
              <button
                className="primary-button complete-button"
                onClick={() => {
                  setSelectedRoadmapKey("test");
                  setSelectedTestKey((current) => current ?? ROADMAP_TESTS[0][0]);
                }}
                type="button"
              >
                {"L\u00e0m b\u00e0i test ngay"}
              </button>
              <button
                className="ghost-button complete-button"
                onClick={() => navigate(hasLearningAccess ? `/on-luyen?branch=${app.hasPaidPracticeAccess ? "paid" : "free"}` : "/khoa-hoc")}
                type="button"
              >
                {hasLearningAccess ? "Vào ôn luyện" : "Xem toàn bộ khóa"}
              </button>
            </div>
          </div>
        </section>

        {!hasLearningAccess ? (
          <div className="lesson-detail-panel">
            <p className="eyebrow">{"L\u1ed9 tr\u00ecnh"}</p>
            <h2>{"Ch\u01b0a c\u00f3 quy\u1ec1n h\u1ecdc"}</h2>
            <p>
              {`Bạn có thể bắt đầu từ khóa ${currentLanguageName} free, làm bài test tư vấn hoặc chọn gói phù hợp. Khi đã mở quyền học, các chặng sẽ hiện ngay bên dưới.`}
            </p>
            <div className="lesson-detail-actions">
              {freePackage ? (
                <button className="primary-button complete-button" onClick={() => handleFreePracticeEntry(app, navigate, freePackage)} type="button">
                  {"B\u1eaft \u0111\u1ea7u h\u1ecdc ngay"}
                </button>
              ) : (
                <span className="completion-badge">{"Ch\u01b0a c\u00f3 kh\u00f3a free"}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="lesson-detail-panel">
            <p className="eyebrow">Ôn luyện</p>
            <h2>{`Đã mở quyền học ${currentLanguageName}`}</h2>
            <p>{`Từ lộ trình ${currentLanguageName}, bạn có thể đi thẳng vào nhánh ôn luyện free hoặc nhánh ôn luyện mua.`}</p>
            <div className="lesson-detail-actions">
              <button className="primary-button complete-button" onClick={() => handleFreePracticeEntry(app, navigate, freePackage)} type="button">
                Vào nhánh free
              </button>
              {app.hasPaidPracticeAccess ? (
                <button className="ghost-button complete-button" onClick={() => navigate("/on-luyen?branch=paid")} type="button">
                  Vào nhánh mua
                </button>
              ) : null}
            </div>
          </div>
        )}

        {false && hasLearningAccess && stages.length > 0 ? (
          <section className="flow-card nested-flow-card roadmap-stage-panel">
            <div className="section-heading compact-heading">
              <p className="eyebrow">{"C\u00e1c ch\u1eb7ng \u0111ang m\u1edf"}</p>
              <h2>{"Ch\u1ecdn ch\u1eb7ng \u0111\u1ec3 ti\u1ebfp t\u1ee5c h\u1ecdc"}</h2>
            </div>
            <div className="course-grid">
              {stages.map((stage) => (
                <button
                  className={selectedStageId === stage.id ? "course-card diagram-button-card course-card-active" : "course-card diagram-button-card"}
                  key={stage.id}
                  onClick={() => setSelectedStageId(stage.id)}
                  type="button"
                >
                  <p className="eyebrow">{`Ch\u1eb7ng ${stage.order_index}`}</p>
                  <h3>{stage.title}</h3>
                  {stage.description ? <p>{stage.description}</p> : null}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {false && hasLearningAccess && selectedStage ? (
          <section className="flow-card nested-flow-card">
            <div className="section-heading compact-heading">
              <p className="eyebrow">{"Ch\u1ecdn b\u00e0i"}</p>
              <h2>{selectedStage.title}</h2>
            </div>
            {stageLessons.length === 0 ? (
              <p className="empty-copy">{"Ch\u1eb7ng n\u00e0y ch\u01b0a c\u00f3 b\u00e0i h\u1ecdc \u0111\u01b0\u1ee3c g\u1eafn v\u00e0o."}</p>
            ) : (
              <div className="course-grid">
                {stageLessons.map((lesson) => (
                  <button
                    className={lesson.is_locked ? "course-card diagram-button-card course-card-disabled" : "course-card diagram-button-card"}
                    key={lesson.id}
                    onClick={() => app.openLesson(lesson)}
                    type="button"
                  >
                    <p className="eyebrow">{lesson.courseTitle}</p>
                    <h3>{lesson.title}</h3>
                    <p>{lesson.summary ?? lesson.sectionTitle}</p>
                    <p>{`${lesson.estimated_minutes} ph\u00fat`}</p>
                    <div className="inline-badge-row">
                      <span className={lesson.is_completed ? "completion-badge done" : "completion-badge"}>
                        {lesson.is_completed ? "\u0110\u00e3 xong" : "Ch\u01b0a h\u1ecdc"}
                      </span>
                      {lesson.is_locked ? <span className="completion-badge">{"\u0110ang kh\u00f3a"}</span> : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {false && visibleLessonDetail ? (
          <div className="lesson-detail-panel">
            <p className="eyebrow">{"H\u1ecdc b\u00e0i"}</p>
            <h2>{visibleLessonDetail.title}</h2>
            {visibleLessonDetail.summary ? <p>{visibleLessonDetail.summary}</p> : null}
            <div className="lesson-detail-copy">
              <p>{visibleLessonDetail.content ?? visibleLessonDetail.locked_reason ?? "B\u00e0i h\u1ecdc ch\u01b0a c\u00f3 n\u1ed9i dung."}</p>
            </div>
            <div className="lesson-detail-actions">
              <span className={visibleLessonDetail.is_completed ? "completion-badge done" : "completion-badge"}>
                {visibleLessonDetail.is_completed ? "\u0110\u00e3 ho\u00e0n th\u00e0nh" : `${visibleLessonDetail.estimated_minutes} ph\u00fat`}
              </span>
              {visibleLessonDetail.is_locked ? (
                <button className="ghost-button complete-button" onClick={() => navigate("/khoa-hoc")} type="button">
                  {"M\u1edf quy\u1ec1n h\u1ecdc"}
                </button>
              ) : !visibleLessonDetail.is_completed ? (
                <button className="primary-button complete-button" onClick={completeCurrentLesson} type="button">
                  {"H\u1ecdc xong, c\u1eadp nh\u1eadt ti\u1ebfn \u0111\u1ed9"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </SimplePage>
  );
}

function ProgressPage({ app }) {
  const courses = app.overview?.courses ?? [];
  const courseProgress = courses.map((course) => ({
    ...course,
    completedLessons: Number(course.completed_lessons) || 0,
    totalLessons: Number(course.total_lessons) || 0,
    progressPercent: clampPercent(course.progress_percent),
  }));
  const totalLessons = courseProgress.reduce((sum, course) => sum + course.totalLessons, 0);
  const completedLessons = courseProgress.reduce((sum, course) => sum + course.completedLessons, 0);
  const overallProgress = totalLessons ? clampPercent((completedLessons / totalLessons) * 100) : 0;
  const strongestCourse = [...courseProgress].sort((left, right) => right.progressPercent - left.progressPercent)[0];
  const activitySegments = [
    { label: "Học bài", value: app.stats?.completed_lessons ?? completedLessons, color: "#f59e0b" },
    { label: "Ôn luyện", value: app.stats?.practice_attempts ?? 0, color: "#06b6d4" },
    { label: "Thi", value: app.stats?.exam_attempts ?? 0, color: "#22c55e" },
    { label: "Giải đấu", value: app.stats?.tournament_attempts ?? 0, color: "#ef4444" },
  ];
  const activityGradient = buildConicGradient(activitySegments);
  const overallGradient = buildConicGradient([
    { value: overallProgress, color: "#f59e0b" },
    { value: Math.max(0, 100 - overallProgress), color: "rgba(148, 163, 184, 0.2)" },
  ]);
  const studyActions = activitySegments.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  return (
    <SimplePage eyebrow="Tiến độ" title="Tiến độ học tập">
      <section className="progress-dashboard-shell">
        <div className="progress-overview-grid">
          <article className="progress-panel progress-panel-main">
            <div className="progress-panel-copy">
              <p className="eyebrow">Biểu đồ tròn</p>
              <h3>Tổng quan lộ trình</h3>
              <p>
                Bạn đã hoàn thành {completedLessons}/{totalLessons || 0} bài học. Cứ giữ nhịp này, hệ thống sẽ cập nhật tiến độ theo từng khóa học.
              </p>
            </div>
            <div className="progress-donut progress-donut-large" style={{ background: overallGradient }}>
              <div className="progress-donut-hole">
                <strong>{overallProgress}%</strong>
                <span>hoàn thành</span>
              </div>
            </div>
          </article>

          <article className="progress-panel">
            <div className="progress-panel-head">
              <div>
                <p className="eyebrow">Cơ cấu hoạt động</p>
                <h3>Học, ôn luyện và thi</h3>
              </div>
              <span>{studyActions} lượt</span>
            </div>
            <div className="progress-activity-layout">
              <div className="progress-donut progress-donut-small" style={{ background: activityGradient }}>
                <div className="progress-donut-hole">
                  <strong>{studyActions}</strong>
                  <span>hoạt động</span>
                </div>
              </div>
              <div className="progress-legend">
                {activitySegments.map((item) => (
                  <div className="progress-legend-item" key={item.label}>
                    <span style={{ backgroundColor: item.color }} />
                    <strong>{item.label}</strong>
                    <em>{Number(item.value) || 0}</em>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>

        <div className="progress-kpi-grid">
          <article className="progress-kpi-card">
            <span>Khóa học</span>
            <strong>{courseProgress.length}</strong>
          </article>
          <article className="progress-kpi-card">
            <span>Bài hoàn thành</span>
            <strong>{completedLessons}</strong>
          </article>
          <article className="progress-kpi-card">
            <span>Chuỗi học</span>
            <strong>{app.streak?.current_streak ?? 0} ngày</strong>
          </article>
          <article className="progress-kpi-card">
            <span>Khóa nổi bật</span>
            <strong>{strongestCourse?.title ?? "Chưa có"}</strong>
          </article>
        </div>

        <article className="progress-panel progress-panel-bars">
          <div className="progress-panel-head">
            <div>
              <p className="eyebrow">Biểu đồ cột</p>
              <h3>Tiến độ từng khóa học</h3>
            </div>
            <span>{courseProgress.length} khóa</span>
          </div>

          {courseProgress.length ? (
            <div className="progress-column-chart">
              {courseProgress.map((course, index) => (
                <article className="progress-column-item" key={course.id}>
                  <span className="progress-column-percent">{course.progressPercent}%</span>
                  <div className="progress-column-track">
                    <div
                      className={`progress-column-fill progress-column-fill-${(index % 5) + 1}`}
                      style={{ height: `${Math.max(course.progressPercent, course.progressPercent > 0 ? 8 : 3)}%` }}
                    />
                  </div>
                  <strong title={course.title}>{course.title}</strong>
                  <span>{course.completedLessons}/{course.totalLessons} bài</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="progress-empty-state">
              <strong>Chưa có dữ liệu tiến độ.</strong>
              <p>Vào khóa học và hoàn thành bài đầu tiên, biểu đồ sẽ tự cập nhật tại đây.</p>
            </div>
          )}
        </article>
      </section>
    </SimplePage>
  );
}

function MailPage({ app }) {
  const badges = buildAchievementBadges(app);
  const gifts = buildGiftItems(app);
  const courses = app.overview?.courses ?? [];
  const notifications = app.notifications ?? [];
  const tickets = app.tickets ?? [];
  const [mailTab, setMailTab] = useState("notifications");
  const [selectedMailId, setSelectedMailId] = useState("");
  const [dismissedMailIds, setDismissedMailIds] = useState([]);

  const notificationEntries = notifications.map((item) => {
    const meta = getMailTypeMeta(item.notification_type);
    return {
      id: `notification-${item.id}`,
      source: "notification",
      sourceId: item.id,
      title: item.title,
      summary: item.content,
      content: item.content,
      timeLabel: formatDateTime(item.created_at),
      statusLabel: item.is_read ? "Đã đọc" : "Mới",
      icon: meta.icon,
      tab: "notifications",
      typeLabel: meta.label,
      tone: meta.tone,
      isRead: item.is_read,
      actionLabel: item.is_read ? "Đã xem" : "Mở thư",
      bannerTitle: meta.label,
      bannerCaption: "Thông báo cập nhật mới nhất",
      footerLabel: "Hộp thư Vmora",
    };
  });

  const systemEntries = [
    ...gifts.map((item) => ({
      id: `gift-${item.id}`,
      source: "gift",
      sourceId: item.id,
      title: item.title,
      summary: item.content,
      content: `${item.content}. Gói này đang sẵn sàng trong hệ thống học tập của bạn.`,
      timeLabel: "Hệ thống vừa kích hoạt",
      statusLabel: "Sẵn sàng",
      icon: "🎁",
      tab: "system",
      typeLabel: "Phần quà",
      tone: "reward",
      isRead: true,
      actionLabel: "Đã nhận",
      bannerTitle: "Phần thưởng",
      bannerCaption: "Gói học tập vừa được mở",
      footerLabel: "Kho quà cá nhân",
    })),
    ...courses.slice(0, 6).map((course) => ({
      id: `progress-${course.id}`,
      source: "progress",
      sourceId: course.id,
      title: course.title,
      summary: `${course.completed_lessons}/${course.total_lessons} bài đã hoàn thành`,
      content: `Khóa học đang ở mức ${course.progress_percent}%. Bạn đã hoàn thành ${course.completed_lessons}/${course.total_lessons} bài và có thể tiếp tục học ngay.`,
      timeLabel: "Tiến độ gần nhất",
      statusLabel: `${course.progress_percent}%`,
      icon: "📘",
      tab: "system",
      typeLabel: "Tiến độ",
      tone: "system",
      isRead: true,
      actionLabel: "Theo dõi",
      bannerTitle: "Tiến độ",
      bannerCaption: "Lộ trình đang tiến lên",
      footerLabel: "Theo dõi khóa học",
    })),
  ];

  const feedbackEntries = tickets.length
    ? tickets.map((item) => ({
        id: `ticket-${item.id}`,
        source: "ticket",
        sourceId: item.id,
        title: item.subject,
        summary: item.message,
        content: item.admin_reply
          ? `${item.message}\n\nPhản hồi từ admin:\n${item.admin_reply}`
          : `${item.message}\n\nYêu cầu của bạn đang được xử lý bởi đội ngũ hỗ trợ.`,
        timeLabel: formatDateTime(item.created_at),
        statusLabel: item.status,
        icon: "⚠️",
        tab: "feedback",
        typeLabel: "Phản hồi",
        tone: "friend",
        isRead: item.status !== "open",
        actionLabel: item.admin_reply ? "Đã phản hồi" : "Đang xử lý",
        bannerTitle: "Hỗ trợ",
        bannerCaption: "Kênh phản hồi người dùng",
        footerLabel: "Ticket hỗ trợ",
      }))
    : badges.map((item, index) => ({
        id: `badge-${index}`,
        source: "badge",
        sourceId: index,
        title: `Thành tích ${index + 1}`,
        summary: item,
        content: `${item}. Hãy tiếp tục giữ nhịp học để mở thêm nhiều mốc thành tích tiếp theo.`,
        timeLabel: "Thành tích đã ghi nhận",
        statusLabel: "Đã lưu",
        icon: "🏅",
        tab: "feedback",
        typeLabel: "Thành tích",
        tone: "achievement",
        isRead: true,
        actionLabel: "Đã lưu",
        bannerTitle: "Thành tích",
        bannerCaption: "Mốc tiến bộ của bạn",
        footerLabel: "Hồ sơ thành tựu",
      }));

  const systemNotificationTypes = new Set(["system", "reward", "achievement", "gift", "badge", "study_reminder"]);
  const notificationTypeByEntryId = new Map(notifications.map((item) => [`notification-${item.id}`, item.notification_type]));
  const inboxNotificationEntries = notificationEntries.filter((item) => !systemNotificationTypes.has(notificationTypeByEntryId.get(item.id)));
  const inboxSystemEntries = notificationEntries.filter((item) => systemNotificationTypes.has(notificationTypeByEntryId.get(item.id)));
  const inboxFeedbackEntries = tickets.map((item) => ({
    id: `ticket-${item.id}`,
    source: "ticket",
    sourceId: item.id,
    title: item.title,
    summary: item.content,
    content: item.admin_reply
      ? `${item.content}\n\nPhản hồi từ admin:\n${item.admin_reply}`
      : `${item.content}\n\nYêu cầu của bạn đang được xử lý bởi đội ngũ hỗ trợ.`,
    timeLabel: formatDateTime(item.created_at),
    statusLabel: item.status,
    icon: "!",
    tab: "feedback",
    typeLabel: "Phản hồi",
    tone: "friend",
    isRead: item.status !== "open",
    actionLabel: item.admin_reply ? "Đã phản hồi" : "Đang xử lý",
    bannerTitle: "Hỗ trợ",
    bannerCaption: "Kênh phản hồi người dùng",
    footerLabel: "Ticket hỗ trợ",
  }));

  const mailTabs = [
    { key: "notifications", label: "Thông báo", icon: "📢", count: notificationEntries.length },
    { key: "system", label: "Hệ thống", icon: "✉️", count: systemEntries.length },
    { key: "feedback", label: "Phản hồi", icon: "⚠️", count: feedbackEntries.length },
  ];

  const activeItems = (
    mailTab === "notifications"
      ? notificationEntries
      : mailTab === "system"
        ? systemEntries
        : feedbackEntries
  ).filter((item) => !dismissedMailIds.includes(item.id));

  const selectedMail = activeItems.find((item) => item.id === selectedMailId) ?? activeItems[0] ?? null;
  const unreadCount = notificationEntries.filter((item) => !item.isRead).length;
  const canClaimAll = activeItems.some((item) => item.source === "notification" && !item.isRead);
  const visibleMailTabs = [
    { key: "notifications", label: "Thông báo", icon: "📢", count: inboxNotificationEntries.length },
    { key: "system", label: "Hệ thống", icon: "✉️", count: inboxSystemEntries.length },
    { key: "feedback", label: "Phản hồi", icon: "⚠️", count: inboxFeedbackEntries.length },
  ];
  const visibleActiveItems = (
    mailTab === "notifications"
      ? inboxNotificationEntries
      : mailTab === "system"
        ? inboxSystemEntries
        : inboxFeedbackEntries
  ).filter((item) => !dismissedMailIds.includes(item.id));
  const visibleSelectedMail = visibleActiveItems.find((item) => item.id === selectedMailId) ?? visibleActiveItems[0] ?? null;
  const visibleUnreadCount = inboxNotificationEntries.filter((item) => !item.isRead).length;
  const visibleCanClaimAll = visibleActiveItems.some((item) => item.source === "notification" && !item.isRead);

  useEffect(() => {
    if (!visibleSelectedMail && selectedMailId) {
      setSelectedMailId("");
      return;
    }
    if (visibleSelectedMail && visibleSelectedMail.id !== selectedMailId) {
      setSelectedMailId(visibleSelectedMail.id);
    }
  }, [visibleSelectedMail, selectedMailId]);

  async function handlePrimaryAction() {
    if (!visibleSelectedMail) return;
    if (visibleSelectedMail.source === "notification" && !visibleSelectedMail.isRead) {
      await app.markRead(visibleSelectedMail.sourceId);
    }
  }

  async function handleClaimAll() {
    const unreadNotifications = visibleActiveItems.filter((item) => item.source === "notification" && !item.isRead);
    if (!unreadNotifications.length) return;
    await Promise.all(unreadNotifications.map((item) => app.markRead(item.sourceId)));
  }

  function dismissItems(ids) {
    if (!ids.length) return;
    setDismissedMailIds((current) => Array.from(new Set([...current, ...ids])));
  }

  return (
    <SimplePage>
      <section className="mail-game-shell">
        <header className="mail-game-topbar">
          <div className="mail-game-tabs">
            {visibleMailTabs.map((tab) => (
              <button
                className={mailTab === tab.key ? "mail-game-tab mail-game-tab-active" : "mail-game-tab"}
                key={tab.key}
                onClick={() => setMailTab(tab.key)}
                type="button"
              >
                <span className="mail-game-tab-icon">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="mail-game-topbar-meta">
            <span>Thư</span>
            <button className="mail-game-close" type="button">✕</button>
          </div>
        </header>

        <div className="mail-game-board">
          <aside className="mail-game-sidebar">
            <div className="mail-game-sidebar-list">
              {visibleActiveItems.length === 0 ? <p className="mail-game-empty">Chưa có thư trong mục này.</p> : null}
              {visibleActiveItems.map((item) => (
                <button
                  className={visibleSelectedMail?.id === item.id ? "mail-game-list-item mail-game-list-item-active" : "mail-game-list-item"}
                  key={item.id}
                  onClick={() => setSelectedMailId(item.id)}
                  type="button"
                >
                  <span className="mail-game-list-icon">{item.icon}</span>
                  <div className="mail-game-list-copy">
                    <strong>{item.title}</strong>
                    <span>{item.statusLabel}</span>
                    <small>{item.timeLabel}</small>
                  </div>
                </button>
              ))}
            </div>
            <div className="mail-game-sidebar-footer">Thư: {visibleActiveItems.length}/50</div>
          </aside>

          <section className="mail-game-detail">
            {visibleSelectedMail ? (
              <>
                <div className="mail-game-detail-head">
                  <div>
                    <p className="eyebrow">{visibleSelectedMail.typeLabel}</p>
                    <h3>{visibleSelectedMail.title}</h3>
                  </div>
                  <span className={`mail-game-status mail-game-status-${visibleSelectedMail.tone}`}>{visibleSelectedMail.statusLabel}</span>
                </div>

                <div className={`mail-game-poster mail-game-poster-${visibleSelectedMail.tone}`}>
                  <div className="mail-game-poster-badge">{visibleSelectedMail.bannerTitle}</div>
                  <div className="mail-game-poster-main">
                    <div className="mail-game-poster-icon">{visibleSelectedMail.icon}</div>
                    <div>
                      <strong>{visibleSelectedMail.title}</strong>
                      <span>{visibleSelectedMail.bannerCaption}</span>
                    </div>
                  </div>
                  <div className="mail-game-poster-footer">{visibleSelectedMail.footerLabel}</div>
                </div>

                <div className="mail-game-message">
                  <div className="mail-game-message-meta">
                    <span>{visibleSelectedMail.timeLabel}</span>
                    <span>{visibleSelectedMail.typeLabel}</span>
                  </div>
                  <p>{visibleSelectedMail.content}</p>
                </div>

                <div className="mail-game-detail-actions">
                  <button className="mail-game-cta" onClick={handlePrimaryAction} type="button">
                    {visibleSelectedMail.actionLabel}
                  </button>
                </div>
              </>
            ) : (
              <div className="mail-game-detail-empty">
                <strong>Chưa có thư nào</strong>
                <p>Hãy chọn một mục ở bên trái để xem nội dung chi tiết.</p>
              </div>
            )}
          </section>
        </div>

        <footer className="mail-game-bottom">
          <div className="mail-game-bottom-left">
            <button className="mail-game-bottom-button" onClick={() => dismissItems(visibleActiveItems.map((item) => item.id))} type="button">
              Xóa tất cả
            </button>
            <button className="mail-game-bottom-button mail-game-bottom-button-primary" disabled={!visibleCanClaimAll} onClick={handleClaimAll} type="button">
              Nhận tất cả
            </button>
          </div>
          <button
            className="mail-game-bottom-button"
            disabled={!visibleSelectedMail}
            onClick={() => dismissItems(visibleSelectedMail ? [visibleSelectedMail.id] : [])}
            type="button"
          >
            Xóa
          </button>
        </footer>
      </section>
    </SimplePage>
  );
}

function ContactPage({ app }) {
  useEffect(() => {
    app.loadAdminContactProfile?.();
  }, []);

  const adminProfile = app.adminContactProfile ?? null;
  const adminName = adminProfile?.full_name || "Vmora Admin";
  const adminInitials = getContactInitials(adminProfile);
  const adminPublicId = adminProfile?.public_user_id || "00001";
  const adminEmail = adminProfile?.email || "admin@vmora.local";
  const adminPhone = adminProfile?.phone_number || "Chưa cập nhật";
  const adminAddress = adminProfile?.address || "Chưa cập nhật";
  const adminAvatar = adminProfile?.avatar_url || "";
  const contactMessages = [...(app.tickets ?? [])]
    .sort((left, right) => new Date(left.created_at ?? 0).getTime() - new Date(right.created_at ?? 0).getTime())
    .flatMap((ticket) => {
      const messages = [
        {
          key: `user-${ticket.id}`,
          role: "user",
          title: ticket.title,
          content: ticket.content,
          time: ticket.created_at,
          status: ticket.status,
        },
      ];
      if (ticket.admin_reply) {
        messages.push({
          key: `admin-${ticket.id}`,
          role: "admin",
          title: "Admin phản hồi",
          content: ticket.admin_reply,
          time: ticket.updated_at ?? ticket.created_at,
          status: "answered",
        });
      }
      return messages;
    });

  return (
    <SimplePage>
      <section className="contact-shell">
        <div className="contact-top-grid">
          <section className="contact-info-card">
            <p className="eyebrow">{CONTACT_NODES[1]}</p>
            <h2>Liên hệ Vmora</h2>
            <p>
              Gặp vấn đề khi học tập hoặc sử dụng hệ thống? Hãy gửi yêu cầu cho chúng tôi — đội ngũ Vmora luôn sẵn sàng hỗ trợ bạn nhanh chóng và hiệu quả.
            </p>
            <div className="contact-social-inline">
              <div className="contact-social-head">
                <div>
                  <p className="eyebrow">{CONTACT_NODES[2]}</p>
                </div>
              </div>
              <div className="contact-social-grid">
                {CONTACT_SOCIAL_LINKS.map((item) => (
                  <a
                    className={`contact-social-link contact-social-link-${item.accent}`}
                    href={item.href}
                    key={item.label}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>{item.icon}</span>
                    <strong>{item.label}</strong>
                  </a>
                ))}
              </div>
            </div>
          </section>

          <aside className="contact-profile-card">
            <div className="contact-profile-avatar">
              {adminAvatar ? (
                <img alt={adminName} src={adminAvatar} />
              ) : (
                <span>{adminInitials}</span>
              )}
            </div>
            <h3>{adminName}</h3>
            <span className="contact-profile-id">ID: {adminPublicId}</span>
            <p>{adminEmail}</p>
            <div className="contact-profile-mini">
              <span>📞 {adminPhone}</span>
              <span>📍 {adminAddress}</span>
            </div>
          </aside>
        </div>

        <section className="contact-chat-card">
          <header className="contact-chat-head">
            <div className="contact-chat-admin">
              <span className="contact-chat-admin-avatar">{adminInitials}</span>
              <div>
                <strong>{CONTACT_NODES[0]}</strong>
                <p>Admin Vmora đang nhận yêu cầu hỗ trợ từ bạn</p>
              </div>
            </div>
            <span className="contact-chat-status">● Online</span>
          </header>

          <div className="contact-chat-body">
            {contactMessages.length === 0 ? (
              <div className="contact-chat-empty">
                <strong>Chưa có tin nhắn nào</strong>
                <p>Hãy gửi lời nhắn đầu tiên cho admin. Phản hồi sẽ được lưu lại tại đây và trong hộp thư.</p>
              </div>
            ) : null}
            {contactMessages.map((message) => (
              <article className={`contact-chat-bubble contact-chat-bubble-${message.role}`} key={message.key}>
                <div className="contact-chat-bubble-meta">
                  <span>{message.role === "admin" ? "Admin Vmora" : "Bạn"}</span>
                  <small>{message.time ? formatDateTime(message.time) : message.status}</small>
                </div>
                {message.title ? <strong>{message.title}</strong> : null}
                <p>{message.content}</p>
              </article>
            ))}
          </div>

          <form className="contact-chat-composer" onSubmit={app.createContactTicket}>
            <input
              onChange={(event) => app.setContactForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Chủ đề ngắn..."
              value={app.contactForm.title}
            />
            <div className="contact-chat-input-row">
              <textarea
                onChange={(event) => app.setContactForm((current) => ({ ...current, content: event.target.value }))}
                placeholder="Nhập tin nhắn cho admin..."
                value={app.contactForm.content}
              />
              <button type="submit">Gửi</button>
            </div>
          </form>
        </section>
      </section>
    </SimplePage>
  );
}

function SettingsPage({ app }) {
  return (
    <SimplePage eyebrow="Cài đặt" title="Cài đặt">
      <form className="settings-form" onSubmit={app.saveUserSettings}>
        <div className="course-grid">
          <Card eyebrow="Cài đặt" title={SETTINGS_NODES[0]}>
            <label className="field">
              <span>Sáng/tối</span>
              <select onChange={(event) => app.setSettingsForm((current) => ({ ...current, themeMode: event.target.value }))} value={app.settingsForm.themeMode}>
                <option value="light">Sáng</option>
                <option value="dark">Tối</option>
              </select>
            </label>
          </Card>

          <Card eyebrow="Cài đặt" title={SETTINGS_NODES[1]}>
            <label className="field">
              <span>Background</span>
              <select onChange={(event) => app.setSettingsForm((current) => ({ ...current, backgroundCode: event.target.value }))} value={app.settingsForm.backgroundCode}>
                <option value="default">Mặc định</option>
                <option value="forest">Rừng</option>
                <option value="sand">Cát</option>
                <option value="sky">Trời</option>
              </select>
            </label>
          </Card>
        </div>

        <div className="settings-save-row">
          <button className="primary-button complete-button" type="submit">
            Lưu cài đặt
          </button>
          {app.userSettings?.updated_at ? <p>Cập nhật: {formatDateTime(app.userSettings.updated_at)}</p> : null}
        </div>
      </form>
    </SimplePage>
  );
}

function RankingPage({ app }) {
  const leaderboard = [...(app.leaderboard ?? [])]
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
    .slice(0, 50)
    .map((item, index) => ({ ...item, rank: index + 1 }));
  const spotlight = [2, 1, 3]
    .map((rank) => {
      const player = leaderboard.find((item) => item.rank === rank);
      const visual = RANKING_SPOTLIGHT_IMAGES.find((item) => item.rank === rank);
      if (!player || !visual) return null;
      return { ...player, ...visual };
    })
    .filter(Boolean);

  return (
    <SimplePage>
      <section className="ranking-board-shell">
        <div className="ranking-board-hero">
          <div>
            <p className="eyebrow">Bảng xếp hạng</p>
            <h2>Top 50 người học dẫn đầu</h2>
          </div>
          <p className="ranking-board-hero-copy">
            Lấy theo tổng điểm hiện tại trên hệ thống. Top 1, 2, 3 được làm nổi bật bằng ảnh riêng, phía dưới là danh sách đầy đủ 50 người có điểm cao nhất.
          </p>
        </div>

        <div className="ranking-spotlight-grid">
          {spotlight.map((item) => (
            <article className={`ranking-spotlight-card ranking-spotlight-card-rank-${item.rank}`} key={`${item.user_id}-${item.rank}`}>
              <div className="ranking-spotlight-image-wrap">
                <img alt={item.label} className="ranking-spotlight-image" src={item.image} />
              </div>
              <p className="ranking-spotlight-rank">Hạng {item.rank}</p>
              <h3>{item.user_name ?? "Người chơi ẩn danh"}</h3>
              <strong>{item.score ?? 0} điểm</strong>
            </article>
          ))}
        </div>

        <div className="ranking-top50-card">
          <div className="ranking-top50-head">
            <div>
              <h3>50 người có điểm cao nhất</h3>
            </div>
            <p className="ranking-top50-note">Điểm = bài hoàn thành + thi x10 + giải đấu x10</p>
          </div>

          <div className="ranking-top50-table">
            <div className="ranking-top50-table-row ranking-top50-table-head">
              <span>Hạng</span>
              <span>Thành viên</span>
              <span>Cờ</span>
              <span>Điểm</span>
              <span>Hoàn thành</span>
              <span>Thi</span>
              <span>Giải đấu</span>
            </div>
            {leaderboard.map((item) => (
              <div className={`ranking-top50-table-row ${item.rank <= 6 ? "ranking-top50-table-row-highlight" : ""}`} key={`${item.user_id}-${item.rank}`}>
                <span>#{item.rank}</span>
                <span>{item.user_name ?? "Người chơi ẩn danh"}</span>
                <span className="leaderboard-language-flag" title={getLanguageDisplayName(item.language_code)}>
                  {getLanguageFlag(item.language_code)}
                </span>
                <span>{item.score ?? 0}</span>
                <span>{item.completed_lessons ?? 0}</span>
                <span>{item.exam_attempts ?? 0}</span>
                <span>{item.tournament_attempts ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SimplePage>
  );
}

function GoldenBoardPage({ app }) {
  const leaderboard = [...(app.leaderboard ?? [])]
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
    .slice(0, 50)
    .map((item, index) => ({ ...item, rank: index + 1 }));
  const spotlight = leaderboard.slice(0, 6);
  const podium = [spotlight[1], spotlight[0], spotlight[2]].filter(Boolean);
  const honored = spotlight.slice(3, 6);

  return (
    <SimplePage>
      <section className="golden-board-shell">
        <div className="golden-board-hero">
          <div>
            <p className="eyebrow">Vinh danh 50 học viên dẫn đầu</p>
          </div>
        </div>

        <div className="golden-podium-grid">
          {podium.map((item) => {
            const badge = GOLDEN_BOARD_BADGES[item.rank - 1];

            return (
              <article className={`golden-podium-card golden-podium-card-rank-${item.rank}`} key={`${item.user_id}-${item.rank}`}>
                <div className={`golden-podium-badge golden-podium-badge-${badge.tone}`}>
                  <img alt={badge.label} src={badge.image} />
                </div>
                <p className="golden-podium-rank">{badge.label}</p>
                <h3>{item.user_name ?? "Người chơi ẩn danh"}</h3>
                <strong>{item.score ?? 0} điểm</strong>
                <div className="golden-podium-stats">
                  <span>Hoàn thành {item.completed_lessons ?? 0} bài</span>
                  <span>Thi {item.exam_attempts ?? 0} lượt</span>
                  <span>Giải đấu {item.tournament_attempts ?? 0} lượt</span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="golden-honored-grid">
          {honored.map((item) => {
            const badge = GOLDEN_BOARD_BADGES[item.rank - 1];

            return (
              <article className="golden-honored-card" key={`${item.user_id}-${item.rank}`}>
                <img alt={badge.label} className="golden-honored-image" src={badge.image} />
                <div className="golden-honored-copy">
                  <p className="golden-honored-rank">{badge.label}</p>
                  <h4>{item.user_name ?? "Người chơi ẩn danh"}</h4>
                  <p>
                    {item.score ?? 0} điểm · {item.completed_lessons ?? 0} bài hoàn thành · {item.exam_attempts ?? 0} lượt thi
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="golden-board-list-card">
          <div className="golden-board-list-head">
            <div>
              <p className="eyebrow">Danh sách vinh danh</p>
              <h3>50 người có điểm cao nhất</h3>
            </div>
            <p className="golden-board-list-note">Điểm = bài hoàn thành + thi x10 + giải đấu x10</p>
          </div>

          <div className="golden-board-table">
            <div className="golden-board-row golden-board-row-head">
              <span>Hạng</span>
              <span>Thành viên</span>
              <span>Cờ</span>
              <span>Điểm</span>
              <span>Hoàn thành</span>
              <span>Thi</span>
              <span>Giải đấu</span>
            </div>
            {leaderboard.map((item, index) => (
              <div className={`golden-board-row ${index < 6 ? "golden-board-row-highlight" : ""}`} key={`${item.user_id}-${index}`}>
                <span>#{index + 1}</span>
                <span>{item.user_name ?? "Người chơi ẩn danh"}</span>
                <span className="leaderboard-language-flag" title={getLanguageDisplayName(item.language_code)}>
                  {getLanguageFlag(item.language_code)}
                </span>
                <span>{item.score ?? 0}</span>
                <span>{item.completed_lessons ?? 0}</span>
                <span>{item.exam_attempts ?? 0}</span>
                <span>{item.tournament_attempts ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SimplePage>
  );
}

function TournamentPage({ app }) {
  const navigate = useNavigate();
  const selectedTournament =
    app.tournamentDetail?.id === app.tournamentId
      ? app.tournamentDetail
      : app.tournaments.find((item) => item.id === app.tournamentId) ?? app.tournamentDetail;
  const [countdown, setCountdown] = useState(() => getTournamentCountdown(selectedTournament?.ends_at));
  const [waitingTimer, setWaitingTimer] = useState(() => getElapsedDuration(selectedTournament?.waiting_room_opened_at));
  const [examTimer, setExamTimer] = useState(() => getTournamentExamRemaining(selectedTournament?.room_started_at, selectedTournament?.duration_minutes));
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const tournamentLeaderboard = app.tournamentLeaderboard.slice(0, 5);
  const tournamentQuestionCount =
    selectedTournament?.question_count ?? app.tournamentDetail?.questions?.length ?? selectedTournament?.questions?.length ?? 0;
  const tournamentQuestions = app.tournamentDetail?.questions ?? [];
  const selectedQuestion = tournamentQuestions[selectedQuestionIndex] ?? tournamentQuestions[0] ?? null;
  const isTournamentWaiting = Boolean(selectedTournament?.is_registered && selectedTournament?.room_status !== "in_progress");
  const isTournamentInProgress = Boolean(selectedTournament?.is_registered && selectedTournament?.room_status === "in_progress");
  const tournamentSkills = [
    { label: "Từ vựng", tone: "violet" },
    { label: "Ngữ pháp", tone: "green" },
    { label: "Đọc hiểu", tone: "gold" },
    { label: "Nghe", tone: "blue" },
  ];

  useEffect(() => {
    setCountdown(getTournamentCountdown(selectedTournament?.ends_at));
    setWaitingTimer(getElapsedDuration(selectedTournament?.waiting_room_opened_at));
    setExamTimer(getTournamentExamRemaining(selectedTournament?.room_started_at, selectedTournament?.duration_minutes));
    if (!selectedTournament?.ends_at) return undefined;

    const timer = window.setInterval(() => {
      setCountdown(getTournamentCountdown(selectedTournament?.ends_at));
      setWaitingTimer(getElapsedDuration(selectedTournament?.waiting_room_opened_at));
      setExamTimer(getTournamentExamRemaining(selectedTournament?.room_started_at, selectedTournament?.duration_minutes));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [
    selectedTournament?.duration_minutes,
    selectedTournament?.ends_at,
    selectedTournament?.room_started_at,
    selectedTournament?.waiting_room_opened_at,
  ]);

  useEffect(() => {
    setSelectedQuestionIndex(0);
  }, [selectedTournament?.id, selectedTournament?.room_status]);

  return (
    <SimplePage>
      <section className="tournament-shell">
        <div className="tournament-hero">
          <div>
            <p className="eyebrow">Giải đấu tuần</p>
            <h2>{selectedTournament?.title ?? "Giải đấu tuần"}</h2>
          </div>
          <div className="tournament-hero-chips">
            <span>{selectedTournament?.duration_minutes ?? 0} phút</span>
            <span>Mốc qua vòng {selectedTournament?.passing_score ?? 0}%</span>
            <span>{tournamentQuestionCount} câu hỏi</span>
          </div>
        </div>

        <div className="tournament-overview-grid">
          <article className="tournament-info-card">
            <p className="eyebrow">Giải đấu</p>
            <h3>{TOURNAMENT_NODES[0]}</h3>
            <span className="tournament-live-chip">● Đang diễn ra</span>
            <div className="tournament-selector-list">
              {app.tournaments.map((item) => (
                <button
                  className={item.id === selectedTournament?.id ? "tournament-selector-button tournament-selector-button-active" : "tournament-selector-button"}
                  key={item.id}
                  onClick={() => app.openTournament(item.id)}
                  type="button"
                >
                  <span>◌</span>
                  {item.title}
                </button>
              ))}
            </div>
            <p className="tournament-countdown-label">Kết thúc sau:</p>
            <div className="tournament-countdown-grid">
              <div className="tournament-countdown-box">
                <strong>{countdown.days}</strong>
                <span>Ngày</span>
              </div>
              <div className="tournament-countdown-box">
                <strong>{countdown.hours}</strong>
                <span>Giờ</span>
              </div>
              <div className="tournament-countdown-box">
                <strong>{countdown.minutes}</strong>
                <span>Phút</span>
              </div>
            </div>
          </article>

          <article className="tournament-register-card">
            <p className="eyebrow">Giải đấu</p>
            <h3>{TOURNAMENT_NODES[1]}</h3>
            <p className="tournament-register-copy">
              {selectedTournament?.is_registered
                ? selectedTournament?.room_status === "in_progress"
                  ? "Phòng thi đã mở."
                  : "Bạn đang ở phòng chờ."
                : "Đăng ký để tham gia."}
            </p>
            <span className={selectedTournament?.is_registered ? "completion-badge done" : "completion-badge"}>
              {selectedTournament?.is_registered
                ? selectedTournament?.room_status === "in_progress"
                  ? "Đang thi"
                  : "Đang chờ"
                : "Chưa đăng ký"}
            </span>
            {selectedTournament ? (
              selectedTournament.is_registered ? (
                <button className="tournament-primary-button" onClick={() => navigate(selectedTournament.room_status === "in_progress" ? "/giai-dau/phong-thi" : "/giai-dau/phong-cho")} type="button">
                  {selectedTournament.room_status === "in_progress" ? "Vào thi ngay ↗" : "Vào phòng chờ"}
                </button>
              ) : (
                <button
                  className="tournament-primary-button"
                  onClick={async () => {
                    await app.joinTournament(selectedTournament);
                    navigate("/giai-dau/phong-cho");
                  }}
                  type="button"
                >
                  Đăng ký tham gia
                </button>
              )
            ) : null}
          </article>

          <article className="tournament-ranking-card">
            <p className="eyebrow">Giải đấu</p>
            <h3>{TOURNAMENT_NODES[2]}</h3>
            <div className="tournament-ranking-list">
              {tournamentLeaderboard.length === 0 ? <p>Chưa có người chơi nào lên bảng xếp hạng.</p> : null}
              {tournamentLeaderboard.map((item, index) => (
                <div className="tournament-ranking-row" key={`${item.user_id}-${index}`}>
                  <span className={`tournament-ranking-badge tournament-ranking-badge-${index + 1}`}>{index + 1}</span>
                  <strong>{item.user_name ?? "Người chơi ẩn danh"}</strong>
                  <span>{item.score_percent}%</span>
                </div>
              ))}
            </div>
          </article>

          <article className="tournament-reward-card">
            <p className="eyebrow">Giải đấu</p>
            <h3>{TOURNAMENT_NODES[3]}</h3>
            <div className="tournament-reward-chips">
              <span>🏅 Huy hiệu top</span>
              <span>⭐ Điểm thưởng</span>
            </div>
            <p>{selectedTournament?.reward_title ?? "Huy hiệu tuần + điểm thưởng"}</p>
            <p>{selectedTournament?.reward_description ?? "Top cao sẽ nhận huy hiệu đặc biệt và điểm cộng dồn cho tuần tiếp theo."}</p>
          </article>
        </div>

        <article className="tournament-skill-card">
          <p className="eyebrow">Phân loại kỹ năng</p>
          <h3>Bài thi hỗn hợp gồm 4 kỹ năng</h3>
          <div className="tournament-skill-row">
            {tournamentSkills.map((skill) => (
              <span className={`tournament-skill-chip tournament-skill-chip-${skill.tone}`} key={skill.label}>
                {skill.label}
              </span>
            ))}
          </div>
        </article>
      </section>

      {false && isTournamentWaiting ? (
        <section className="tournament-waiting-room" id="tournament-waiting-room">
          <div className="tournament-waiting-room-head">
            <div>
              <p className="eyebrow">Phòng chờ</p>
              <h2>{selectedTournament.title}</h2>
              <p>Thí sinh đã vào phòng và đang chờ admin mở bài thi. Khi phòng bắt đầu, toàn bộ thí sinh sẽ vào khu làm bài.</p>
            </div>
            {app.user?.is_admin ? (
              <button className="tournament-primary-button" onClick={() => app.openTournamentRoom(selectedTournament)} type="button">
                Admin bắt đầu làm bài
              </button>
            ) : null}
          </div>

          <div className="tournament-waiting-room-grid">
            <article className="tournament-waiting-stat">
              <strong>{selectedTournament.participant_count ?? 0}</strong>
              <span>Thí sinh đang tham gia</span>
            </article>
            <article className="tournament-waiting-stat">
              <strong>{waitingTimer.hours}:{waitingTimer.minutes}:{waitingTimer.seconds}</strong>
              <span>Thời gian chờ bắt đầu</span>
            </article>
            <article className="tournament-waiting-stat">
              <strong>{selectedTournament.duration_minutes ?? 0} phút</strong>
              <span>Thời lượng phòng thi</span>
            </article>
          </div>

          <div className="tournament-waiting-note">
            <span>Phòng hiện tại: {selectedTournament.room_status === "in_progress" ? "Đang thi" : "Đang chờ"}</span>
            <span>Danh sách câu hỏi sẽ mở ngay khi admin bấm bắt đầu.</span>
          </div>
        </section>
      ) : null}

      {false && isTournamentInProgress ? (
        <section className="tournament-exam-room" id="tournament-arena">
          <header className="tournament-exam-topbar">
            <div className="tournament-exam-timer">⏱ {examTimer.minutes}:{examTimer.seconds}</div>
            <div className="tournament-exam-user">Thí sinh: {app.user?.full_name || app.user?.email || "Người chơi"}</div>
            <div className="tournament-exam-actions">
              <button className="ghost-button" onClick={app.finishTournament} type="button">Nộp bài</button>
            </div>
          </header>

          <div className="tournament-exam-layout">
            <div className="tournament-exam-main">
              {selectedQuestion ? (
                <article className="tournament-exam-question">
                  <div className="tournament-exam-question-head">
                    <span>Câu {selectedQuestionIndex + 1}</span>
                    <span>{selectedTournament.title}</span>
                  </div>
                  <h3>{selectedQuestion.prompt}</h3>

                  {selectedQuestion.options?.length ? (
                    <div className="tournament-exam-options">
                      {selectedQuestion.options.map((option, optionIndex) => {
                        const optionLabel = String.fromCharCode(65 + optionIndex);
                        const isActive = app.tournamentAnswers[String(selectedQuestion.id)] === option.id;
                        return (
                          <button
                            className={isActive ? "tournament-exam-option tournament-exam-option-active" : "tournament-exam-option"}
                            key={option.id}
                            onClick={() => app.setTournamentAnswers((current) => ({ ...current, [String(selectedQuestion.id)]: option.id }))}
                            type="button"
                          >
                            <span>{optionLabel}</span>
                            <strong>{option.text}</strong>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea
                      className="tournament-exam-textarea"
                      onChange={(event) =>
                        app.setTournamentAnswers((current) => ({ ...current, [String(selectedQuestion.id)]: event.target.value }))
                      }
                      placeholder="Nhập câu trả lời của bạn..."
                      value={app.tournamentAnswers[String(selectedQuestion.id)] ?? ""}
                    />
                  )}
                </article>
              ) : (
                <div className="tournament-exam-empty">Phòng thi chưa có câu hỏi để hiển thị.</div>
              )}
            </div>

            <aside className="tournament-exam-sidebar">
              <div className="tournament-exam-sidebar-head">
                <strong>Danh sách câu hỏi</strong>
                <span>{tournamentQuestionCount} câu</span>
              </div>
              <div className="tournament-exam-palette">
                {tournamentQuestions.map((question, index) => {
                  const hasAnswer = Boolean(app.tournamentAnswers[String(question.id)]);
                  const isActive = index === selectedQuestionIndex;
                  return (
                    <button
                      className={
                        isActive
                          ? "tournament-exam-palette-item tournament-exam-palette-item-active"
                          : hasAnswer
                            ? "tournament-exam-palette-item tournament-exam-palette-item-done"
                            : "tournament-exam-palette-item"
                      }
                      key={question.id}
                      onClick={() => setSelectedQuestionIndex(index)}
                      type="button"
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>

          {app.tournamentResult ? (
            <div className={app.tournamentResult.passed ? "tournament-result-card tournament-result-card-pass" : "tournament-result-card"}>
              <strong>{app.tournamentResult.passed ? "Đạt yêu cầu" : "Chưa đạt yêu cầu"}</strong>
              <p>{app.tournamentResult.feedback}</p>
              <span>{app.tournamentResult.score_percent}% · {app.tournamentResult.correct_count}/{app.tournamentResult.total_questions} câu đúng</span>
            </div>
          ) : null}
        </section>
      ) : null}
    </SimplePage>
  );
}

function TournamentWaitingRoomPage({ app }) {
  const navigate = useNavigate();
  const selectedTournament =
    app.tournamentDetail?.id === app.tournamentId
      ? app.tournamentDetail
      : app.tournaments.find((item) => item.id === app.tournamentId) ?? app.tournamentDetail ?? app.tournaments[0] ?? null;
  const [waitingTimer, setWaitingTimer] = useState(() => getElapsedDuration(selectedTournament?.waiting_room_opened_at));

  useEffect(() => {
    setWaitingTimer(getElapsedDuration(selectedTournament?.waiting_room_opened_at));
    const timer = window.setInterval(() => {
      setWaitingTimer(getElapsedDuration(selectedTournament?.waiting_room_opened_at));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [selectedTournament?.waiting_room_opened_at]);

  useEffect(() => {
    if (selectedTournament?.is_registered && selectedTournament?.room_status === "in_progress") {
      navigate("/giai-dau/phong-thi", { replace: true });
    }
  }, [navigate, selectedTournament?.is_registered, selectedTournament?.room_status]);

  if (!selectedTournament) {
    return (
      <SimplePage eyebrow="Giải đấu" title="Phòng chờ">
        <p>Đang tải thông tin giải đấu.</p>
      </SimplePage>
    );
  }

  if (!selectedTournament.is_registered) {
    return (
      <SimplePage eyebrow="Giải đấu" title="Phòng chờ">
        <div className="tournament-room-empty">
          <strong>Bạn chưa đăng ký giải đấu này.</strong>
          <p>Đăng ký trước để hệ thống đưa bạn vào phòng chờ và đồng bộ trạng thái phòng thi.</p>
          <div className="inline-actions">
            <button
              className="tournament-primary-button"
              onClick={async () => {
                await app.joinTournament(selectedTournament);
              }}
              type="button"
            >
              Đăng ký ngay
            </button>
            <button className="ghost-button" onClick={() => navigate("/giai-dau")} type="button">
              Quay lại giải đấu
            </button>
          </div>
        </div>
      </SimplePage>
    );
  }

  return (
    <SimplePage eyebrow="Giải đấu" title="Phòng chờ">
      <section className="tournament-waiting-room">
        <div className="tournament-waiting-room-head">
          <div>
            <p className="eyebrow">Phòng chờ</p>
            <h2>{selectedTournament.title}</h2>
            <p>Thí sinh đã vào phòng và đang chờ admin mở bài thi. Khi phòng bắt đầu, tất cả người chơi sẽ được chuyển sang trang làm bài riêng.</p>
          </div>
          <div className="tournament-room-head-actions">
            {app.user?.is_admin ? (
              <button
                className="tournament-primary-button"
                onClick={async () => {
                  await app.openTournamentRoom(selectedTournament);
                  navigate("/giai-dau/phong-thi");
                }}
                type="button"
              >
                Admin bắt đầu làm bài
              </button>
            ) : null}
            <button className="ghost-button" onClick={() => navigate("/giai-dau")} type="button">
              Về trang giải đấu
            </button>
          </div>
        </div>

        <div className="tournament-waiting-room-grid">
          <article className="tournament-waiting-stat">
            <strong>{selectedTournament.participant_count ?? 0}</strong>
            <span>Thí sinh đang tham gia</span>
          </article>
          <article className="tournament-waiting-stat">
            <strong>{waitingTimer.hours}:{waitingTimer.minutes}:{waitingTimer.seconds}</strong>
            <span>Thời gian chờ hiện tại</span>
          </article>
          <article className="tournament-waiting-stat">
            <strong>{selectedTournament.duration_minutes ?? 0} phút</strong>
            <span>Thời lượng phòng thi</span>
          </article>
        </div>

        <div className="tournament-waiting-note">
          <span>Trạng thái phòng: {selectedTournament.room_status === "in_progress" ? "Đang thi" : "Đang chờ"}</span>
          <span>Khi admin bấm bắt đầu, hệ thống sẽ tự cập nhật để bạn vào phòng thi mới.</span>
        </div>
      </section>
    </SimplePage>
  );
}

function TournamentExamRoomPage({ app }) {
  const navigate = useNavigate();
  const selectedTournament =
    app.tournamentDetail?.id === app.tournamentId
      ? app.tournamentDetail
      : app.tournaments.find((item) => item.id === app.tournamentId) ?? app.tournamentDetail ?? app.tournaments[0] ?? null;
  const tournamentQuestions = app.tournamentDetail?.questions ?? [];
  const [examTimer, setExamTimer] = useState(() => getTournamentExamRemaining(selectedTournament?.room_started_at, selectedTournament?.duration_minutes));
  const [audioStatus, setAudioStatus] = useState({});
  const [audioError, setAudioError] = useState("");
  const [readingSplitMode, setReadingSplitMode] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState(() => tournamentQuestions[0]?.id ?? null);
  const [submitState, setSubmitState] = useState({ submitting: false, error: "" });
  const audioSessionRef = useRef(0);
  const answeredCount = tournamentQuestions.filter((question) => Boolean(app.tournamentAnswers[String(question.id)])).length;
  const activeAudioQuestionId = Object.entries(audioStatus).find(([, status]) => status?.playing)?.[0] ?? null;
  const sectionStats = tournamentQuestions.reduce(
    (stats, question) => {
      const section = question.section ?? "other";
      stats[section] = (stats[section] ?? 0) + 1;
      return stats;
    },
    {}
  );

  useEffect(() => {
    setExamTimer(getTournamentExamRemaining(selectedTournament?.room_started_at, selectedTournament?.duration_minutes));
    const timer = window.setInterval(() => {
      setExamTimer(getTournamentExamRemaining(selectedTournament?.room_started_at, selectedTournament?.duration_minutes));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [selectedTournament?.duration_minutes, selectedTournament?.room_started_at]);

  useEffect(() => {
    setAudioStatus({});
    setAudioError("");
    setReadingSplitMode(false);
    setActiveQuestionId(tournamentQuestions[0]?.id ?? null);
    setSubmitState({ submitting: false, error: "" });
  }, [selectedTournament?.id, selectedTournament?.room_started_at]);

  useEffect(() => {
    if (tournamentQuestions.length === 0) return undefined;

    const syncActiveQuestion = () => {
      const thresholdTop = 180;
      let currentQuestionId = tournamentQuestions[0]?.id ?? null;
      let fallbackQuestionId = tournamentQuestions[0]?.id ?? null;
      let fallbackDistance = Number.POSITIVE_INFINITY;

      for (const question of tournamentQuestions) {
        const element = document.getElementById(`tournament-question-${question.id}`);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (rect.top <= thresholdTop && rect.bottom > thresholdTop) {
          currentQuestionId = question.id;
          break;
        }
        const distance = Math.abs(rect.top - thresholdTop);
        if (distance < fallbackDistance) {
          fallbackDistance = distance;
          fallbackQuestionId = question.id;
        }
      }

      setActiveQuestionId(currentQuestionId ?? fallbackQuestionId);
    };

    syncActiveQuestion();
    window.addEventListener("scroll", syncActiveQuestion, { passive: true });
    window.addEventListener("resize", syncActiveQuestion);
    return () => {
      window.removeEventListener("scroll", syncActiveQuestion);
      window.removeEventListener("resize", syncActiveQuestion);
    };
  }, [tournamentQuestions]);

  useEffect(() => () => {
    audioSessionRef.current += 1;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    if (selectedTournament?.is_registered && selectedTournament?.room_status !== "in_progress" && !app.tournamentResult) {
      navigate("/giai-dau/phong-cho", { replace: true });
    }
  }, [app.tournamentResult, navigate, selectedTournament?.is_registered, selectedTournament?.room_status]);

  useEffect(() => {
    if (app.tournamentResult) {
      navigate("/giai-dau/ket-qua", { replace: true });
    }
  }, [app.tournamentResult, navigate]);

  useEffect(() => {
    if (!examTimer.isOver || app.tournamentResult || tournamentQuestions.length === 0) return;
    void app.finishTournament(selectedTournament?.id);
  }, [app.finishTournament, app.tournamentResult, examTimer.isOver, selectedTournament?.id, tournamentQuestions.length]);

  async function handleTournamentSubmit() {
    if (!selectedTournament?.id || submitState.submitting) return;
    setSubmitState({ submitting: true, error: "" });
    const result = await app.finishTournament(selectedTournament.id);
    if (!result) {
      setSubmitState({
        submitting: false,
        error: app.message || "Không nộp được bài. Bạn thử lại giúp mình.",
      });
      return;
    }
    setSubmitState({ submitting: false, error: "" });
  }

  function getSectionLabel(question) {
    const labels = {
      grammar: "Ngữ pháp",
      vocabulary: "Từ vựng",
      listening: "Nghe hiểu",
      reading: "Đọc hiểu",
    };
    return labels[question?.section] ?? "Câu hỏi";
  }

  function shouldShowPassage(question, index) {
    if (!question?.passage_id || !question?.passage_text) return false;
    const previousQuestion = tournamentQuestions[index - 1];
    return previousQuestion?.passage_id !== question.passage_id;
  }

  function getListeningBlockSize(startIndex) {
    let count = 0;
    for (let index = startIndex; index < tournamentQuestions.length; index += 1) {
      if (tournamentQuestions[index]?.section !== "listening") break;
      count += 1;
    }
    return count;
  }

  function scrollToTournamentQuestion(questionId) {
    const element = document.getElementById(`tournament-question-${questionId}`);
    if (element) {
      setActiveQuestionId(questionId);
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function getPassageQuestions(passageId) {
    return tournamentQuestions.filter((question) => question.passage_id === passageId);
  }

  function renderQuestionOptions(question) {
    return (
      <div className="tournament-exam-options">
        {(question.options ?? []).map((option, optionIndex) => {
          const optionLabel = String.fromCharCode(65 + optionIndex);
          const isActive = app.tournamentAnswers[String(question.id)] === option.id;
          return (
            <button
              className={isActive ? "tournament-exam-option tournament-exam-option-active" : "tournament-exam-option"}
              key={option.id}
              onClick={() => app.setTournamentAnswers((current) => ({ ...current, [String(question.id)]: option.id }))}
              type="button"
            >
              <span>{optionLabel}</span>
              <strong>{option.text}</strong>
            </button>
          );
        })}
      </div>
    );
  }

  function renderQuestionCard(question, index, options = {}) {
    const { compact = false, hidePassage = false } = options;
    const showReadingIntro = !hidePassage && shouldShowPassage(question, index);
    return (
      <article
        className={
          compact
            ? "tournament-exam-question tournament-exam-question-card tournament-reading-question-card"
            : "tournament-exam-question tournament-exam-question-card"
        }
        id={`tournament-question-${question.id}`}
        key={question.id}
      >
        <div className="tournament-exam-question-head">
          <span>{getSectionLabel(question)} · Câu {index + 1}</span>
          <span>{app.user?.full_name || app.user?.email || "Thí sinh"}</span>
        </div>

        {showReadingIntro ? (
          <div className="tournament-reading-panel">
            <div className="tournament-reading-panel-head">
              <p className="eyebrow">{question.passage_title || "Reading"}</p>
              <button className="ghost-button tournament-reading-toggle" onClick={() => setReadingSplitMode(true)} type="button">
                Bật chia đôi
              </button>
            </div>
            {question.passage_text.split("\n\n").map((paragraph, paragraphIndex) => (
              <p key={`${question.passage_id}-${paragraphIndex}`}>{paragraph}</p>
            ))}
          </div>
        ) : null}

        {question.question_type === "listening" && question.audio_text ? (
          <div className="tournament-audio-card">
            <div>
              <strong>Audio nghe hiểu</strong>
              <p>
                Audio này dùng chung cho {getListeningBlockSize(index)} câu nghe bên dưới. Mỗi thí sinh chỉ được phát tối đa 3 lượt liên tiếp,
                phát xong sẽ tự dừng và không thể bấm dừng giữa chừng.
              </p>
            </div>
            <button
              className="tournament-primary-button tournament-audio-button"
              disabled={Boolean(activeAudioQuestionId) || audioStatus[question.id]?.completed}
              onClick={() => playTournamentAudio(question)}
              type="button"
            >
              {activeAudioQuestionId && String(activeAudioQuestionId) !== String(question.id)
                ? "Đang phát audio khác"
                : audioStatus[question.id]?.playing
                  ? `Đang phát ${Math.min((audioStatus[question.id]?.playedCount ?? 0) + 1, question.audio_replay_limit ?? 3)}/${question.audio_replay_limit ?? 3}`
                  : audioStatus[question.id]?.completed
                    ? `Đã phát đủ ${question.audio_replay_limit ?? 3} lượt`
                    : "Phát audio"}
            </button>
          </div>
        ) : null}

        {audioError && activeAudioQuestionId && String(activeAudioQuestionId) === String(question.id) ? (
          <p className="tournament-audio-error">{audioError}</p>
        ) : null}

        <h3>{question.prompt}</h3>
        {renderQuestionOptions(question)}
      </article>
    );
  }

  function renderReadingSplitSection(question, index) {
    const passageQuestions = getPassageQuestions(question.passage_id);
    return (
      <section className="tournament-reading-split" key={question.passage_id}>
        <div className="tournament-reading-split-head">
          <div>
            <p className="eyebrow">Reading Split</p>
            <h3>{question.passage_title || "Đọc hiểu"}</h3>
          </div>
          <button className="ghost-button tournament-reading-toggle" onClick={() => setReadingSplitMode(false)} type="button">
            Thoát chia đôi
          </button>
        </div>
        <div className="tournament-reading-split-layout">
          <div className="tournament-reading-split-passages">
            <div className="tournament-reading-panel tournament-reading-panel-split">
              <p className="eyebrow">{question.passage_title || "Reading"}</p>
              {question.passage_text.split("\n\n").map((paragraph, paragraphIndex) => (
                <p key={`${question.passage_id}-${paragraphIndex}`}>{paragraph}</p>
              ))}
            </div>
          </div>
          <div className="tournament-reading-split-questions">
            {passageQuestions.map((passageQuestion) => {
              const passageQuestionIndex = tournamentQuestions.findIndex((item) => item.id === passageQuestion.id);
              return renderQuestionCard(passageQuestion, passageQuestionIndex, { compact: true, hidePassage: true });
            })}
          </div>
        </div>
      </section>
    );
  }

  function playTournamentAudio(question) {
    if (!question?.audio_text) return;
    if (!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance === "undefined") {
      setAudioError("Trình duyệt hiện tại chưa hỗ trợ phát audio tự động.");
      return;
    }
    const replayLimit = question.audio_replay_limit ?? 3;
    const currentStatus = audioStatus[question.id];
    const hasAudioPlaying = Object.values(audioStatus).some((status) => status?.playing);
    if (hasAudioPlaying) return;
    if (currentStatus?.playing || currentStatus?.completed) return;

    setAudioError("");
    audioSessionRef.current += 1;
    const sessionId = audioSessionRef.current;
    window.speechSynthesis.cancel();
    setAudioStatus((current) => ({
      ...current,
      [question.id]: { playing: true, completed: false, playedCount: 0, replayLimit },
    }));

    const speakRound = (round) => {
      const utterance = new window.SpeechSynthesisUtterance(question.audio_text);
      const langMap = {
        zh: "zh-CN",
        en: "en-US",
        ja: "ja-JP",
        ko: "ko-KR",
        de: "de-DE",
      };
      utterance.lang = langMap[selectedTournament?.language_code] ?? "en-US";
      utterance.rate = 0.94;
      utterance.pitch = 1;
      utterance.onend = () => {
        if (audioSessionRef.current !== sessionId) return;
        if (round >= replayLimit) {
          setAudioStatus((current) => ({
            ...current,
            [question.id]: { playing: false, completed: true, playedCount: replayLimit, replayLimit },
          }));
          return;
        }
        setAudioStatus((current) => ({
          ...current,
          [question.id]: { playing: true, completed: false, playedCount: round, replayLimit },
        }));
        window.setTimeout(() => speakRound(round + 1), 320);
      };
      utterance.onerror = () => {
        if (audioSessionRef.current !== sessionId) return;
        setAudioStatus((current) => ({
          ...current,
          [question.id]: { playing: false, completed: true, playedCount: Math.max(round - 1, 0), replayLimit },
        }));
        setAudioError("Không phát được audio trên trình duyệt này.");
      };
      window.speechSynthesis.speak(utterance);
    };

    speakRound(1);
  }

  if (!selectedTournament) {
    return (
      <SimplePage eyebrow="Giải đấu" title="Phòng thi">
        <p>Đang tải phòng thi.</p>
      </SimplePage>
    );
  }

  if (!selectedTournament.is_registered) {
    return (
      <SimplePage eyebrow="Giải đấu" title="Phòng thi">
        <div className="tournament-room-empty">
          <strong>Bạn chưa được thêm vào phòng thi.</strong>
          <p>Hãy đăng ký giải đấu trước rồi vào phòng chờ để hệ thống cấp quyền làm bài.</p>
          <div className="inline-actions">
            <button className="tournament-primary-button" onClick={() => navigate("/giai-dau")} type="button">
              Về giải đấu
            </button>
          </div>
        </div>
      </SimplePage>
    );
  }

  return (
    <SimplePage eyebrow="Giải đấu" title="Phòng thi">
      <section className="tournament-exam-room tournament-exam-room-page">
        <header className="tournament-exam-topbar">
          <div className="tournament-exam-timer">⏱ {examTimer.minutes}:{examTimer.seconds}</div>
          <div className="tournament-exam-user">
            {selectedTournament.title} · {answeredCount}/{tournamentQuestions.length} câu đã làm
          </div>
          <div className="tournament-exam-actions">
            <button className="ghost-button" disabled={Boolean(app.tournamentResult) || submitState.submitting} onClick={handleTournamentSubmit} type="button">
              {submitState.submitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          </div>
        </header>

        {audioError ? <div className="tournament-audio-global-error">{audioError}</div> : null}
        {submitState.error ? <div className="tournament-audio-global-error">{submitState.error}</div> : null}

        <div className={readingSplitMode ? "tournament-exam-layout tournament-exam-layout-reading-split" : "tournament-exam-layout"}>
          <div className="tournament-exam-main">
            {tournamentQuestions.length > 0 ? (
              <div className="tournament-exam-stack">
                {tournamentQuestions.map((question, index) => {
                  if (readingSplitMode && question.section === "reading" && question.passage_id) {
                    return shouldShowPassage(question, index) ? renderReadingSplitSection(question, index) : null;
                  }
                  return renderQuestionCard(question, index);
                })}
              </div>
            ) : (
              <div className="tournament-exam-empty">Phòng thi đang đồng bộ đề. Chờ một chút để hệ thống tải đủ 50 câu.</div>
            )}
          </div>

          {!readingSplitMode ? (
            <aside className="tournament-exam-sidebar">
              <div className="tournament-exam-sidebar-head">
                <strong>Tổng quan đề thi</strong>
                <span>{answeredCount}/{tournamentQuestions.length} câu</span>
              </div>
              <div className="tournament-exam-summary">
                <span>Ngữ pháp: {sectionStats.grammar ?? 0}</span>
                <span>Từ vựng: {sectionStats.vocabulary ?? 0}</span>
                <span>Nghe: {sectionStats.listening ?? 0}</span>
                <span>Đọc hiểu: {sectionStats.reading ?? 0}</span>
              </div>
              <div className="tournament-exam-palette">
                {tournamentQuestions.map((question, index) => {
                  const hasAnswer = Boolean(app.tournamentAnswers[String(question.id)]);
                  const isActive = activeQuestionId === question.id;
                  const itemClassName = [
                    "tournament-exam-palette-item",
                    hasAnswer ? "tournament-exam-palette-item-done" : "",
                    isActive ? "tournament-exam-palette-item-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <button
                      className={itemClassName}
                      key={question.id}
                      onClick={() => scrollToTournamentQuestion(question.id)}
                      type="button"
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </aside>
          ) : null}
        </div>

      </section>
    </SimplePage>
  );
}

function TournamentResultPage({ app }) {
  const navigate = useNavigate();
  const selectedTournament =
    app.tournamentDetail?.id === app.tournamentId
      ? app.tournamentDetail
      : app.tournaments.find((item) => item.id === app.tournamentId) ?? app.tournamentDetail ?? app.tournaments[0] ?? null;
  const result = app.tournamentResult;

  if (!result) {
    return (
      <SimplePage eyebrow="Giải đấu" title="Kết quả phòng thi">
        <div className="tournament-room-empty tournament-result-empty">
          <strong>Chưa có kết quả để hiển thị.</strong>
          <p>Hãy hoàn thành bài thi hoặc quay về trang giải đấu để tham gia phòng thi.</p>
          <div className="inline-actions">
            <button className="tournament-primary-button" onClick={() => navigate("/giai-dau/phong-thi")} type="button">
              Về phòng thi
            </button>
            <button className="ghost-button" onClick={() => navigate("/giai-dau")} type="button">
              Về giải đấu
            </button>
          </div>
        </div>
      </SimplePage>
    );
  }

  return (
    <SimplePage eyebrow="Giải đấu" title="Kết quả phòng thi">
      <section className="tournament-result-page">
        <div className={result.passed ? "tournament-result-card tournament-result-card-pass tournament-result-card-page" : "tournament-result-card tournament-result-card-page"}>
          <p className="eyebrow">Kết quả bài thi</p>
          <h2>{selectedTournament?.title || "Giải đấu"}</h2>
          <strong>{result.passed ? "Đạt yêu cầu" : "Chưa đạt yêu cầu"}</strong>
          <p>{result.feedback}</p>

          <div className="tournament-result-metrics">
            <article className="tournament-result-metric">
              <span>Điểm số</span>
              <strong>{result.score_percent}%</strong>
            </article>
            <article className="tournament-result-metric">
              <span>Số câu đúng</span>
              <strong>
                {result.correct_count}/{result.total_questions}
              </strong>
            </article>
            <article className="tournament-result-metric">
              <span>Xếp hạng</span>
              <strong>
                #{result.rank ?? "-"} / {result.leaderboard_size ?? 0}
              </strong>
            </article>
          </div>

          <div className="inline-actions tournament-result-actions">
            <button className="tournament-primary-button tournament-result-button" onClick={() => navigate("/giai-dau")} type="button">
              Về trang giải đấu
            </button>
            <button className="ghost-button" onClick={() => navigate("/bang-xep-hang")} type="button">
              Xem bảng xếp hạng
            </button>
          </div>
        </div>
      </section>
    </SimplePage>
  );
}

function ConnectedGroupPage({ app }) {
  const navigate = useNavigate();
  const selectedRoom = app.groupRooms.find((item) => item.id === app.selectedGroupId);
  const [showPrivateGroupForm, setShowPrivateGroupForm] = useState(false);
  const [communityView, setCommunityView] = useState("global");
  const [communitySection, setCommunitySection] = useState("global");
  const [discoverTag, setDiscoverTag] = useState("Tất cả");
  const [friendGoal, setFriendGoal] = useState("Tất cả");
  const globalFeedRef = useRef(null);
  const communityFeedRef = useRef(null);
  const groupsRailRef = useRef(null);
  const friendsRailRef = useRef(null);
  const currentName = app.user?.full_name || app.user?.email || "Vmora User";
  const globalChatCount = app.globalChatMessages.length;
  const isGlobalCommunityView = communityView === "global" && !showPrivateGroupForm;
  const isCommunityPostsView = communityView === "community" && !showPrivateGroupForm;
  const isDiscoverGroupsView = communityView === "community" && communitySection === "discover" && !showPrivateGroupForm;
  const isFriendDiscoveryView = communityView === "community" && communitySection === "friends" && !showPrivateGroupForm;
  const currentLanguageCode = app.user?.learning_language_code ?? app.selectedLanguage ?? "en";
  const currentLanguageName = getLanguageDisplayName(currentLanguageCode);
  const postReactionOptions = [
    { value: "like", label: "Like" },
    { value: "tym", label: "Tym" },
    { value: "haha", label: "Haha" },
  ];
  const realGroupCards = app.groupRooms.slice(0, 4).map((room, index) => ({
    key: `room-${room.id}`,
    name: room.name,
    description: index % 2 === 0 ? "Nhóm riêng bạn đang tham gia, có thể mở ngay để chat cùng mọi người." : "Không gian học nhóm riêng với ID và mật khẩu đã được bảo vệ.",
    tags: index % 2 === 0 ? ["Giao tiếp", currentLanguageName] : ["Ngữ pháp", "Học đều"],
    activity: room.member_count > 5 ? "Đang hoạt động" : "Mới tạo",
    members: room.member_count,
    accent: index % 2 === 0 ? "blue" : "green",
    room,
  }));
  const discoverGroupCards = [...realGroupCards, ...getCommunityGroupShowcase(currentLanguageCode)]
    .filter((group) => discoverTag === "Tất cả" || group.tags.includes(discoverTag))
    .slice(0, 6);
  const existingFriendIds = new Set(app.friends.map((friend) => friend.friend_user_id));
  const searchedFriendCards = app.friendSearchResults.slice(0, 4).map((profile, index) => ({
    key: `profile-${profile.id}`,
    name: profile.full_name || profile.email,
    publicId: profile.public_user_id,
    goal: index % 2 === 0 ? "Giao tiếp" : "Học đều",
    status: existingFriendIds.has(profile.id) ? "Đã kết nối" : "Có thể kết bạn",
    headline: `Cùng học ${currentLanguageName}, mở kết nối từ kết quả tìm kiếm của bạn.`,
    badges: [currentLanguageName, index % 2 === 0 ? "Giao tiếp" : "Học đều"],
    avatarUrl: profile.avatar_url,
    email: profile.email,
    profile,
    accent: index % 2 === 0 ? "blue" : "green",
  }));
  const friendSuggestionCards = [...searchedFriendCards, ...getCommunityFriendShowcase(currentLanguageCode)]
    .filter((profile) => friendGoal === "Tất cả" || profile.goal === friendGoal || profile.badges.includes(friendGoal))
    .slice(0, 6);
  useEffect(() => {
    if (communityView === "room" && !selectedRoom) {
      setCommunityView("community");
      setCommunitySection("rooms");
    }
  }, [communityView, selectedRoom]);
  function scrollToSection(ref) {
    window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  function openGlobalCommunityView() {
    setShowPrivateGroupForm(false);
    setCommunityView("global");
    setCommunitySection("global");
    scrollToSection(globalFeedRef);
  }
  function openCommunityPostsView() {
    setShowPrivateGroupForm(false);
    setCommunityView("community");
    setCommunitySection("community");
    scrollToSection(communityFeedRef);
  }
  function openDiscoverGroupsView() {
    setShowPrivateGroupForm(false);
    setCommunityView("community");
    setCommunitySection("discover");
    scrollToSection(groupsRailRef);
  }
  function openFriendsView() {
    setShowPrivateGroupForm(false);
    setCommunityView("community");
    setCommunitySection("friends");
    scrollToSection(friendsRailRef);
  }
  function openMyGroupsView() {
    setShowPrivateGroupForm(false);
    setCommunitySection("rooms");
    if (!selectedRoom && app.groupRooms[0]) {
      app.setSelectedGroupId(app.groupRooms[0].id);
      setCommunityView("room");
      return;
    }
    if (selectedRoom) {
      setCommunityView("room");
      return;
    }
    setCommunityView("community");
    scrollToSection(groupsRailRef);
  }
  function togglePrivateGroupForm() {
    const nextValue = !showPrivateGroupForm;
    setShowPrivateGroupForm(nextValue);
    if (nextValue) {
      setCommunityView("community");
      setCommunitySection("private");
      scrollToSection(communityFeedRef);
      return;
    }
    setCommunityView("community");
    setCommunitySection("community");
  }
  function openPrivateRoom(roomId) {
    app.setSelectedGroupId(roomId);
    setShowPrivateGroupForm(false);
    setCommunityView("room");
    setCommunitySection("rooms");
  }

  function prefillPrivateGroupIdea(group) {
    setShowPrivateGroupForm(true);
    setCommunityView("community");
    setCommunitySection("private");
    app.setGroupForm((current) => ({
      ...current,
      name: group.name,
      roomCode: current.roomCode,
    }));
    scrollToSection(communityFeedRef);
  }

  function openDirectFriend(friendUserId) {
    app.setSelectedFriendId(friendUserId);
    navigate("/tin-nhan");
  }
  function renderCommunityAvatar({ name, email, avatarUrl, size = "medium" }) {
    const initials = getContactInitials({ full_name: name, email });
    return avatarUrl ? (
      <img alt={name || email || "avatar"} className={`community-avatar community-avatar-${size}`} src={avatarUrl} />
    ) : (
      <span className={`community-avatar community-avatar-${size} community-avatar-fallback`}>{initials}</span>
    );
  }
  return (
    <SimplePage eyebrow="Nhóm chat" title="Nhóm chat">
      <section className={isGlobalCommunityView ? "community-hub-shell community-hub-shell-global community-chat-ui" : "community-hub-shell community-chat-ui"}>
        <aside className="community-hub-sidebar">
          <section className="community-panel community-panel-profile">
            <div className="community-profile-head">
              {renderCommunityAvatar({
                name: currentName,
                email: app.user?.email,
                avatarUrl: app.user?.avatar_url,
                size: "large",
              })}
              <div className="community-chat-profile-meta">
                <strong>
                  {currentName}
                  <span className="community-online-dot community-online-dot-inline" />
                </strong>
                <span>Đang hoạt động</span>
              </div>
            </div>
          </section>
          <nav className="community-nav-panel community-panel">
            <button className={communityView === "global" && !showPrivateGroupForm ? "community-nav-button community-nav-button-active" : "community-nav-button"} onClick={openGlobalCommunityView} type="button">
              <span>💬</span>
              <span>Chat tổng</span>
            </button>
            <button className={showPrivateGroupForm ? "community-nav-button community-nav-button-active-soft" : "community-nav-button"} onClick={togglePrivateGroupForm} type="button">
              <span>+</span>
              <span>Nhóm riêng</span>
            </button>
            <button
              className={!showPrivateGroupForm && (communityView === "room" || communitySection === "rooms") ? "community-nav-button community-nav-button-active-soft" : "community-nav-button"}
              onClick={openMyGroupsView}
              type="button"
            >
              <span>🏠</span>
              <span>Nhóm của tôi</span>
            </button>
            <button
              className={!showPrivateGroupForm && communitySection === "discover" ? "community-nav-button community-nav-button-active-soft" : "community-nav-button"}
              onClick={() => {
                app.setSelectedGroupId(null);
                openDiscoverGroupsView();
              }}
              type="button"
            >
              <span>🧭</span>
              <span>Khám phá nhóm</span>
            </button>
            <button className={!showPrivateGroupForm && communitySection === "friends" ? "community-nav-button community-nav-button-active-soft" : "community-nav-button"} onClick={openFriendsView} type="button">
              <span>👥</span>
              <span>Kết bạn</span>
            </button>
            <button
              className={!showPrivateGroupForm && isCommunityPostsView && communitySection === "community" ? "community-nav-button community-nav-button-active-soft community-nav-button-bottom" : "community-nav-button community-nav-button-bottom"}
              onClick={openCommunityPostsView}
              type="button"
            >
              <span>📰</span>
              <span>Cộng đồng</span>
            </button>
          </nav>
          {showPrivateGroupForm ? (
            <section className="community-panel community-create-panel">
              <div className="community-panel-head">
                <div>
                  <p className="eyebrow">Nhóm riêng</p>
                  <h3>Tạo hoặc vào nhóm bằng ID</h3>
                </div>
              </div>
              <div className="community-create-form">
                <label className="field">
                  <span>Tên nhóm</span>
                  <input onChange={(event) => app.setGroupForm((current) => ({ ...current, name: event.target.value }))} value={app.groupForm.name} />
                </label>
                <label className="field">
                  <span>ID nhóm</span>
                  <input
                    onChange={(event) => app.setGroupForm((current) => ({ ...current, roomCode: event.target.value }))}
                    placeholder="Nhập khi tham gia nhóm"
                    value={app.groupForm.roomCode}
                  />
                </label>
                <label className="field">
                  <span>Mật khẩu</span>
                  <input onChange={(event) => app.setGroupForm((current) => ({ ...current, passcode: event.target.value }))} type="password" value={app.groupForm.passcode} />
                </label>
                <div className="community-create-actions">
                  <button className="primary-button complete-button" onClick={app.createPrivateGroup} type="button">
                    Tạo nhóm
                  </button>
                  <button className="ghost-button complete-button" onClick={app.joinPrivateGroup} type="button">
                    Vào nhóm
                  </button>
                </div>
              </div>
            </section>
          ) : null}
        </aside>
        <main className={isGlobalCommunityView ? "community-hub-main community-hub-main-global" : "community-hub-main"}>
          {communityView === "room" && selectedRoom ? (
            <section className="community-panel community-room-panel community-chat-room-panel">
              <div className="community-panel-head community-chat-panel-head">
                <div>
                  <p className="eyebrow">Nhóm riêng</p>
                  <h3>{selectedRoom.name}</h3>
                </div>
                <span className="community-status-pill community-chat-badge">
                  {selectedRoom.member_count} thành viên - ID {selectedRoom.room_code}
                </span>
              </div>
              <div className="community-room-messages">
                {app.groupMessages.length === 0 ? <p className="community-empty-copy">Chưa có tin nhắn trong nhóm này.</p> : null}
                {app.groupMessages.slice(-10).map((message) => {
                  const isMine = message.user_id === app.user?.id;
                  return (
                    <article className={isMine ? "community-message-row community-message-row-mine" : "community-message-row"} key={message.id}>
                      {!isMine ? (
                        renderCommunityAvatar({
                          name: message.user_name,
                          avatarUrl: message.user_avatar_url,
                          size: "small",
                        })
                      ) : (
                        <span className="community-message-spacer" />
                      )}
                      <div className={isMine ? "community-message-bubble community-message-bubble-mine" : "community-message-bubble community-message-bubble-global"}>
                        <strong>
                          {isMine ? "Bạn" : message.user_name} <span>ID {message.user_public_user_id}</span>
                        </strong>
                        {message.content ? <p>{message.content}</p> : null}
                        {message.image_url ? <img alt="Tin nhắn ảnh nhóm" className="community-message-media" src={message.image_url} /> : null}
                        {message.audio_url ? (
                          <div className="community-message-audio">
                            <audio controls src={message.audio_url} />
                            {message.audio_name ? <span>{message.audio_name}</span> : null}
                          </div>
                        ) : null}
                        <small>{message.created_at ? formatDateTime(message.created_at) : ""}</small>
                      </div>
                      {isMine
                        ? renderCommunityAvatar({
                          name: currentName,
                          email: app.user?.email,
                          avatarUrl: app.user?.avatar_url,
                          size: "small",
                        })
                        : null}
                    </article>
                  );
                })}
              </div>
              {app.groupMessageAttachment.imageUrl || app.groupMessageAttachment.audioUrl ? (
                <div className="community-chat-attachment-preview">
                  {app.groupMessageAttachment.imageUrl ? <img alt="Preview nhóm riêng" className="community-message-media" src={app.groupMessageAttachment.imageUrl} /> : null}
                  {app.groupMessageAttachment.audioUrl ? (
                    <div className="community-message-audio">
                      <audio controls src={app.groupMessageAttachment.audioUrl} />
                      {app.groupMessageAttachment.audioName ? <span>{app.groupMessageAttachment.audioName}</span> : null}
                    </div>
                  ) : null}
                  <button className="ghost-button mini-button" onClick={() => app.uploadGroupChatAttachment(null)} type="button">
                    Gỡ file
                  </button>
                </div>
              ) : null}
              <div className="community-room-composer community-chat-composer">
                <label className="community-chat-attach-button">+<input accept="image/*,audio/*" onChange={(event) => app.uploadGroupChatAttachment(event.target.files?.[0] ?? null)} type="file" /></label>
                <input onChange={(event) => app.setGroupMessage(event.target.value)} placeholder="Nhập tin nhắn cho nhóm riêng..." value={app.groupMessage} />
                <button aria-label="Gửi nhóm" className="primary-button complete-button community-chat-send" onClick={app.sendPrivateGroupMessage} type="button">
                  Gửi nhóm
                </button>
              </div>
            </section>
          ) : null}
          {isDiscoverGroupsView ? (
            <section className="community-panel community-discovery-panel" ref={communityFeedRef}>
              <div className="community-panel-head">
                <div>
                  <p className="eyebrow">Khám phá nhóm</p>
                  <h3>Tìm phòng học đúng nhịp của bạn</h3>
                </div>
                <span className="community-status-pill">{discoverGroupCards.length} gợi ý</span>
              </div>

              <div className="community-discovery-hero">
                <div>
                  <strong>Nhóm nổi bật hôm nay</strong>
                  <p>{`Ưu tiên các nhóm cùng mục tiêu ${currentLanguageName}, có nhịp học rõ và đang hoạt động tốt.`}</p>
                </div>
                <div className="community-filter-row">
                  {COMMUNITY_DISCOVER_FILTERS.map((filter) => (
                    <button
                      className={discoverTag === filter ? "community-filter-chip community-filter-chip-active" : "community-filter-chip"}
                      key={filter}
                      onClick={() => setDiscoverTag(filter)}
                      type="button"
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="community-discovery-grid">
                {discoverGroupCards.length === 0 ? (
                  <div className="community-feed-empty">
                    <strong>Chưa có nhóm theo bộ lọc này</strong>
                    <p>Thử đổi chủ đề hoặc tạo một nhóm riêng mới để mở phiên học đầu tiên.</p>
                  </div>
                ) : null}
                {discoverGroupCards.map((group) => (
                  <article className={`community-discovery-card community-discovery-card-${group.accent}`} key={group.key}>
                    <div className="community-discovery-card-head">
                      <div>
                        <strong>{group.name}</strong>
                        <span>{group.activity}</span>
                      </div>
                      <span className="community-card-metric">{group.members} thành viên</span>
                    </div>
                    <p>{group.description}</p>
                    <div className="community-tag-row">
                      {group.tags.map((tag) => (
                        <span className="community-tag-pill" key={`${group.key}-${tag}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="community-discovery-actions">
                      {group.room ? (
                        <>
                          <button className="primary-button mini-button" onClick={() => openPrivateRoom(group.room.id)} type="button">
                            Mở nhóm
                          </button>
                          <button className="ghost-button mini-button" onClick={openMyGroupsView} type="button">
                            Xem nhóm của tôi
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="primary-button mini-button" onClick={() => prefillPrivateGroupIdea(group)} type="button">
                            Tạo phòng tương tự
                          </button>
                          <button className="ghost-button mini-button" onClick={togglePrivateGroupForm} type="button">
                            + Nhóm riêng
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          {isFriendDiscoveryView ? (
            <section className="community-panel community-discovery-panel" ref={communityFeedRef}>
              <div className="community-panel-head">
                <div>
                  <p className="eyebrow">Kết bạn</p>
                  <h3>Ghép người học cùng mục tiêu</h3>
                </div>
                <span className="community-status-pill">{friendSuggestionCards.length} hồ sơ gợi ý</span>
              </div>

              <div className="community-discovery-hero community-discovery-hero-friends">
                <div>
                  <strong>Gợi ý theo mục tiêu học</strong>
                  <p>{`Tập trung tìm partner cùng học ${currentLanguageName}, cùng nhịp học và dễ mở chat ngay.`}</p>
                </div>
                <div className="community-filter-row">
                  {COMMUNITY_FRIEND_GOALS.map((goal) => (
                    <button
                      className={friendGoal === goal ? "community-filter-chip community-filter-chip-active" : "community-filter-chip"}
                      key={goal}
                      onClick={() => setFriendGoal(goal)}
                      type="button"
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>

              <div className="community-discovery-grid community-friend-grid">
                {friendSuggestionCards.length === 0 ? (
                  <div className="community-feed-empty">
                    <strong>Chưa có hồ sơ phù hợp</strong>
                    <p>Thử đổi mục tiêu hoặc dùng ô tìm kiếm ở cột phải để tìm đúng người học bạn muốn kết nối.</p>
                  </div>
                ) : null}
                {friendSuggestionCards.map((profile) => {
                  const isRealProfile = Boolean(profile.profile);
                  const isExistingFriend = isRealProfile && existingFriendIds.has(profile.profile.id);
                  return (
                    <article className={`community-discovery-card community-discovery-card-${profile.accent}`} key={profile.key}>
                      <div className="community-post-author community-discovery-card-head">
                        {renderCommunityAvatar({
                          name: profile.name,
                          email: profile.email,
                          avatarUrl: profile.avatarUrl,
                          size: "medium",
                        })}
                        <div>
                          <strong>{profile.name}</strong>
                          <span>{`ID ${profile.publicId} • ${profile.status}`}</span>
                        </div>
                      </div>
                      <p>{profile.headline}</p>
                      <div className="community-tag-row">
                        {profile.badges.map((badge) => (
                          <span className="community-tag-pill" key={`${profile.key}-${badge}`}>
                            {badge}
                          </span>
                        ))}
                      </div>
                      <div className="community-discovery-actions">
                        {isRealProfile && !isExistingFriend ? (
                          <button className="primary-button mini-button" onClick={() => app.addFriendProfile(profile.profile)} type="button">
                            Kết bạn
                          </button>
                        ) : isRealProfile && isExistingFriend ? (
                          <button className="primary-button mini-button" onClick={() => openDirectFriend(profile.profile.id)} type="button">
                            Nhắn tin
                          </button>
                        ) : (
                          <button className="primary-button mini-button" onClick={() => app.setFriendSearchQuery(profile.publicId)} type="button">
                            Tìm theo ID
                          </button>
                        )}
                        <button className="ghost-button mini-button" onClick={openFriendsView} type="button">
                          Xem khu kết bạn
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}
          {isCommunityPostsView ? (
            <section className="community-panel community-feed-panel" ref={communityFeedRef}>
              <div className="community-panel-head">
                <div>
                  <p className="eyebrow">Cộng đồng</p>
                  <h3>Bảng tin bài viết và chia sẻ</h3>
                </div>
                <span className="community-status-pill">{app.posts.length} bài viết</span>
              </div>
              <form className="community-global-composer community-post-form" onSubmit={app.submitCommunityPost}>
                <input
                  className="community-post-title-input"
                  onChange={(event) => app.setCommunityPostForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Tiêu đề bài viết"
                  value={app.communityPostForm.title}
                />
                <textarea
                  className="community-post-textarea"
                  onChange={(event) => app.setCommunityPostForm((current) => ({ ...current, content: event.target.value }))}
                  placeholder="Chia sẻ kinh nghiệm, ghi chú hoặc câu hỏi của bạn với cộng đồng..."
                  value={app.communityPostForm.content}
                />
                {app.communityPostForm.imageUrl ? (
                  <div className="community-post-preview">
                    <img alt="Community preview" src={app.communityPostForm.imageUrl} />
                    <button onClick={() => app.uploadCommunityPostImage(null)} type="button">
                      Gỡ ảnh
                    </button>
                  </div>
                ) : null}
                <div className="community-post-form-actions">
                  <label className="community-upload-button">
                    Tải ảnh
                    <input accept="image/*" onChange={(event) => app.uploadCommunityPostImage(event.target.files?.[0] ?? null)} type="file" />
                  </label>
                  <button className="primary-button complete-button" type="submit">
                    Đăng bài
                  </button>
                </div>
              </form>
              <div className="community-feed-list">
                {app.posts.length === 0 ? (
                  <div className="community-feed-empty">
                    <strong>Chưa có bài viết cộng đồng</strong>
                    <p>Hãy đăng bài đầu tiên để mở luồng chia sẻ cho mọi người.</p>
                  </div>
                ) : null}
                {app.posts.map((post) => {
                  const isOwner = post.user_id === app.user?.id;
                  const isEditing = app.editingCommunityPostId === post.id;
                  return (
                    <article className="community-post-card" key={post.id}>
                      <div className="community-post-head">
                        <div className="community-post-author">
                          {renderCommunityAvatar({
                            name: post.user_name,
                            avatarUrl: post.user_avatar_url,
                            size: "small",
                          })}
                          <div>
                            <strong>{post.user_name || "Thành viên Vmora"}</strong>
                            <span>ID {post.user_public_user_id} - {formatDateTime(post.created_at)}</span>
                          </div>
                        </div>
                        {isOwner ? (
                          <div className="community-post-owner-actions">
                            <button className="ghost-button mini-button" onClick={() => app.fillCommunityEditForm(post)} type="button">
                              Sửa
                            </button>
                            <button className="ghost-button mini-button community-delete-button" onClick={() => app.removeCommunityPost(post.id)} type="button">
                              Xóa
                            </button>
                          </div>
                        ) : (
                          <button className="ghost-button mini-button" onClick={() => app.reportPost(post.id)} type="button">
                            Báo cáo
                          </button>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="community-post-edit-panel">
                          <input
                            className="community-post-title-input"
                            onChange={(event) => app.setCommunityPostEditForm((current) => ({ ...current, title: event.target.value }))}
                            placeholder="Tiêu đề bài viết"
                            value={app.communityPostEditForm.title}
                          />
                          <textarea
                            className="community-post-textarea"
                            onChange={(event) => app.setCommunityPostEditForm((current) => ({ ...current, content: event.target.value }))}
                            placeholder="Cập nhật nội dung bài viết..."
                            value={app.communityPostEditForm.content}
                          />
                          {app.communityPostEditForm.imageUrl ? (
                            <div className="community-post-preview">
                              <img alt="Community edit preview" src={app.communityPostEditForm.imageUrl} />
                              <button onClick={() => app.uploadCommunityPostEditImage(null)} type="button">
                                Gỡ ảnh
                              </button>
                            </div>
                          ) : null}
                          <div className="community-post-form-actions community-post-edit-actions">
                            <label className="community-upload-button">
                              Đổi ảnh
                              <input accept="image/*" onChange={(event) => app.uploadCommunityPostEditImage(event.target.files?.[0] ?? null)} type="file" />
                            </label>
                            <button className="primary-button complete-button" onClick={() => app.saveCommunityPostEdit(post.id)} type="button">
                              Lưu bài viết
                            </button>
                            <button className="ghost-button mini-button" onClick={app.cancelCommunityPostEdit} type="button">
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="community-post-copy">
                            <h4>{post.title}</h4>
                            <p style={{ whiteSpace: "pre-wrap" }}>{post.content}</p>
                          </div>
                          {post.image_url ? <img alt={post.title} className="community-post-image" src={post.image_url} /> : null}
                          <div className="community-post-stats">
                            <span>{post.reactions.like ?? 0} like</span>
                            <span>{post.reactions.tym ?? 0} tym</span>
                            <span>{post.reactions.haha ?? 0} haha</span>
                            <span>{post.comments?.length ?? 0} bình luận</span>
                            <span>{post.share_count ?? 0} chia sẻ</span>
                          </div>
                          <div className="community-post-actions">
                            {postReactionOptions.map((reaction) => (
                              <button
                                className={post.my_reaction === reaction.value ? "community-reaction-button community-reaction-button-active" : "community-reaction-button"}
                                key={reaction.value}
                                onClick={() => app.reactPost(post.id, reaction.value)}
                                type="button"
                              >
                                {reaction.label} {post.reactions[reaction.value] ? "(" + post.reactions[reaction.value] + ")" : ""}
                              </button>
                            ))}
                            <button className="community-inline-button" onClick={() => app.sharePost(post.id)} type="button">
                              Chia sẻ
                            </button>
                            {!isOwner ? (
                              <button className="ghost-button mini-button" onClick={() => app.reportPost(post.id)} type="button">
                                Báo cáo
                              </button>
                            ) : null}
                          </div>
                          <div className="community-comments">
                            {(post.comments ?? []).map((comment) => (
                              <article className="community-comment-row" key={comment.id}>
                                {renderCommunityAvatar({
                                  name: comment.user_name,
                                  avatarUrl: comment.user_avatar_url,
                                  size: "small",
                                })}
                                <div>
                                  <strong>
                                    {comment.user_name || "Thành viên"} <span>ID {comment.user_public_user_id}</span>
                                  </strong>
                                  <p>{comment.content}</p>
                                </div>
                              </article>
                            ))}
                            <div className="community-comment-composer">
                              <input
                                onChange={(event) => app.setCommunityCommentDraft(post.id, event.target.value)}
                                placeholder="Viết bình luận..."
                                value={app.communityCommentForms[post.id] || ""}
                              />
                              <button onClick={() => app.submitCommunityComment(post.id)} type="button">
                                Gửi
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}
          {isGlobalCommunityView ? (
            <section className="community-panel community-feed-panel community-feed-panel-focus community-chat-room-panel" ref={globalFeedRef}>
              <div className="community-panel-head community-chat-panel-head">
                <div>
                  <p className="eyebrow">Chat tổng</p>
                  <h3>Khung chat tổng Vmora</h3>
                </div>
                <span className="community-status-pill">{globalChatCount} tin nhắn</span>
              </div>
              <div className="community-global-chat-thread">
                {app.globalChatMessages.length === 0 ? (
                  <div className="community-feed-empty">
                    <strong>Chưa có tin nhắn chat tổng</strong>
                    <p>Hãy gửi tin nhắn đầu tiên để mở phòng chat tổng cho mọi người.</p>
                  </div>
                ) : null}
                {app.globalChatMessages.map((message) => {
                  const isMine = message.user_id === app.user?.id;
                  return (
                    <article className={isMine ? "community-message-row community-message-row-mine" : "community-message-row"} key={message.id}>
                      {!isMine ? (
                        renderCommunityAvatar({
                          name: message.user_name,
                          avatarUrl: message.user_avatar_url,
                          size: "small",
                        })
                      ) : (
                        <span className="community-message-spacer" />
                      )}
                      <div className={isMine ? "community-message-bubble community-message-bubble-mine" : "community-message-bubble community-message-bubble-global"}>
                        <strong>
                          {isMine ? "Bạn" : message.user_name} <span>ID {message.user_public_user_id}</span>
                        </strong>
                        {message.content ? <p>{message.content}</p> : null}
                        {message.image_url ? <img alt="Tin nhắn ảnh chat tổng" className="community-message-media" src={message.image_url} /> : null}
                        {message.audio_url ? (
                          <div className="community-message-audio">
                            <audio controls src={message.audio_url} />
                            {message.audio_name ? <span>{message.audio_name}</span> : null}
                          </div>
                        ) : null}
                        <small>{formatDateTime(message.created_at)}</small>
                      </div>
                      {isMine
                        ? renderCommunityAvatar({
                          name: currentName,
                          email: app.user?.email,
                          avatarUrl: app.user?.avatar_url,
                          size: "small",
                        })
                        : null}
                    </article>
                  );
                })}
              </div>
              {app.globalChatAttachment.imageUrl || app.globalChatAttachment.audioUrl ? (
                <div className="community-chat-attachment-preview">
                  {app.globalChatAttachment.imageUrl ? <img alt="Preview chat tổng" className="community-message-media" src={app.globalChatAttachment.imageUrl} /> : null}
                  {app.globalChatAttachment.audioUrl ? (
                    <div className="community-message-audio">
                      <audio controls src={app.globalChatAttachment.audioUrl} />
                      {app.globalChatAttachment.audioName ? <span>{app.globalChatAttachment.audioName}</span> : null}
                    </div>
                  ) : null}
                  <button className="ghost-button mini-button" onClick={() => app.uploadGlobalChatAttachment(null)} type="button">
                    Gỡ file
                  </button>
                </div>
              ) : null}
              <div className="community-room-composer community-global-chat-composer community-chat-composer">
                <label className="community-chat-attach-button">+<input accept="image/*,audio/*" onChange={(event) => app.uploadGlobalChatAttachment(event.target.files?.[0] ?? null)} type="file" /></label>
                <input onChange={(event) => app.setGlobalChatText(event.target.value)} placeholder="Nhập tin nhắn cho chat tổng..." value={app.globalChatText} />
                <button className="primary-button complete-button community-chat-send" onClick={app.sendGlobalMessage} type="button">
                  Gửi chat tổng
                </button>
              </div>
            </section>
          ) : null}
        </main>
        {!isGlobalCommunityView ? (
          <aside className="community-hub-rail">
            <section className="community-panel community-search-panel" ref={friendsRailRef}>
              <div className="community-panel-head">
                <div>
                  <p className="eyebrow">Kết bạn</p>
                  <h3>Tìm theo profile</h3>
                </div>
              </div>
              <form className="community-search-form" onSubmit={app.searchFriendProfiles}>
                <input onChange={(event) => app.setFriendSearchQuery(event.target.value)} placeholder="ID công khai hoặc email" value={app.friendSearchQuery} />
                <button className="ghost-button complete-button" type="submit">
                  Tìm
                </button>
              </form>
              <div className="community-compact-list">
                {app.friendSearchResults.length === 0 ? (
                  <p className="community-empty-copy">
                    {app.friends.length > 0 ? "Bạn đang có " + app.friends.length + " bạn đã kết nối." : "Chưa có kết quả tìm kiếm."}
                  </p>
                ) : null}
                {app.friendSearchResults.map((profile) => (
                  <article className="community-contact-row" key={profile.id}>
                    {renderCommunityAvatar({
                      name: profile.full_name,
                      email: profile.email,
                      avatarUrl: profile.avatar_url,
                      size: "small",
                    })}
                    <div>
                      <strong>{profile.full_name || profile.email}</strong>
                      <span>ID {profile.public_user_id}</span>
                    </div>
                    <button className="community-inline-button" onClick={() => app.addFriendProfile(profile)} type="button">
                      +
                    </button>
                  </article>
                ))}
              </div>
            </section>
            <section className="community-panel">
              <div className="community-panel-head">
                <div>
                  <p className="eyebrow">Bạn bè</p>
                  <h3>Đang kết nối</h3>
                </div>
              </div>
              <div className="community-compact-list">
                {app.friends.length === 0 ? <p className="community-empty-copy">Chưa có bạn bè để hiển thị.</p> : null}
                {app.friends.slice(0, 8).map((friend) => (
                  <article className="community-contact-row" key={friend.id}>
                    {renderCommunityAvatar({
                      name: friend.friend_name,
                      email: friend.friend_email,
                      avatarUrl: friend.friend_avatar_url,
                      size: "small",
                    })}
                    <div>
                      <strong>{friend.friend_name || friend.friend_email}</strong>
                      <span>ID {friend.friend_public_user_id}</span>
                    </div>
                    <span className="community-online-dot" />
                  </article>
                ))}
              </div>
            </section>
            <section className="community-panel" ref={groupsRailRef}>
              <div className="community-panel-head">
                <div>
                  <p className="eyebrow">Khám phá nhóm</p>
                  <h3>Phòng chat của bạn</h3>
                </div>
              </div>
              <div className="community-compact-list">
                {app.groupRooms.length === 0 ? <p className="community-empty-copy">Bạn chưa tham gia nhóm riêng nào.</p> : null}
                {app.groupRooms.slice(0, 8).map((room) => (
                  <button
                    className={selectedRoom?.id === room.id && communityView === "room" ? "community-room-link community-room-link-active" : "community-room-link"}
                    key={room.id}
                    onClick={() => openPrivateRoom(room.id)}
                    type="button"
                  >
                    <strong>{room.name}</strong>
                    <span>ID {room.room_code}</span>
                    <small>{room.member_count} thành viên</small>
                  </button>
                ))}
              </div>
            </section>
            <section className="community-panel community-panel-profile-compact">
              <div className="community-profile-mini">
                {renderCommunityAvatar({
                  name: currentName,
                  email: app.user?.email,
                  avatarUrl: app.user?.avatar_url,
                })}
                <div>
                  <strong>{currentName}</strong>
                  <span>{app.user?.email}</span>
                </div>
              </div>
            </section>
          </aside>
        ) : null}
      </section>
    </SimplePage>
  );
}
function GroupPage({ app }) {
  const selectedRoom = app.groupRooms.find((item) => item.id === app.selectedGroupId);

  return (
    <SimplePage eyebrow="Nhóm chat" title="Nhóm chat">
      <div className="course-grid">
        <Card
          action={
            <button className="primary-button complete-button" onClick={app.addQuickFriend} type="button">
              Kết bạn nhanh
            </button>
          }
          eyebrow="Nhóm chat"
          title={GROUP_NODES[0]}
        >
          <p>{app.friends.length} bạn đã kết nối.</p>
        </Card>

        <Card eyebrow="Nhóm chat" title={GROUP_NODES[1]}>
          <label className="field">
            <span>Tên nhóm</span>
            <input
              onChange={(event) => app.setGroupForm((current) => ({ ...current, name: event.target.value }))}
              value={app.groupForm.name}
            />
          </label>
          <label className="field">
            <span>ID nhóm</span>
            <input
              onChange={(event) => app.setGroupForm((current) => ({ ...current, roomCode: event.target.value }))}
              placeholder="Nhập khi tham gia nhóm"
              value={app.groupForm.roomCode}
            />
          </label>
          <label className="field">
            <span>Pass</span>
            <input
              onChange={(event) => app.setGroupForm((current) => ({ ...current, passcode: event.target.value }))}
              type="password"
              value={app.groupForm.passcode}
            />
          </label>
          <div className="inline-actions">
            <button className="primary-button complete-button" onClick={app.createPrivateGroup} type="button">
              Tạo nhóm
            </button>
            <button className="ghost-button complete-button" onClick={app.joinPrivateGroup} type="button">
              Vào nhóm
            </button>
          </div>
        </Card>

        <Card eyebrow="Nhóm chat" title={GROUP_NODES[2]}>
          <div className="mini-list">
            {app.groupRooms.length === 0 ? <p>Chưa có nhóm riêng.</p> : null}
            {app.groupRooms.map((room) => (
              <button className="plain-list-button" key={room.id} onClick={() => app.setSelectedGroupId(room.id)} type="button">
                {room.name} - ID {room.room_code} - {room.member_count} thành viên
              </button>
            ))}
          </div>
        </Card>

        <Card eyebrow="Nhóm chat" title={GROUP_NODES[3]}>
          <p>{app.friends.length > 0 ? `Có ${app.friends.length} bạn để chat.` : "Chưa có bạn bè để chat."}</p>
          {selectedRoom ? (
            <div className="mini-list">
              <strong>{selectedRoom.name}</strong>
              {app.groupMessages.slice(-4).map((message) => (
                <p key={message.id}>
                  {message.user_name}: {message.content}
                </p>
              ))}
              <label className="field">
                <span>Tin nhắn</span>
                <input onChange={(event) => app.setGroupMessage(event.target.value)} value={app.groupMessage} />
              </label>
              <button className="primary-button complete-button" onClick={app.sendPrivateGroupMessage} type="button">
                Gửi nhóm riêng
              </button>
            </div>
          ) : null}
        </Card>

        <Card
          action={
            <button className="ghost-button complete-button" onClick={() => app.quickCreate("post")} type="button">
              Gửi khung tổng
            </button>
          }
          eyebrow="Nhóm chat"
          title={GROUP_NODES[4]}
        >
          <p>{app.posts.length} bài trong khung chat tổng.</p>
          <div className="mini-list">
            {app.posts.length === 0 ? <p>Chưa có bài đăng cộng đồng.</p> : null}
            {app.posts.slice(0, 6).map((post) => (
              <article className="stack-row" key={post.id}>
                <div>
                  <strong>{post.title}</strong>
                  <p>{post.content}</p>
                  <small>{post.user_name}</small>
                </div>
                <button className="ghost-button mini-button" onClick={() => app.reportPost(post.id)} type="button">
                  Báo cáo vi phạm
                </button>
              </article>
            ))}
          </div>
        </Card>
      </div>
    </SimplePage>
  );
}

function PetPage({ app }) {
  return (
    <SimplePage eyebrow="Pet" title="Pet">
      <div className="course-grid">
        <Card
          action={
            <button className="ghost-button complete-button" onClick={app.renamePet} type="button">
              Lưu tên
            </button>
          }
          eyebrow="Pet"
          title={PET_NODES[0]}
        >
          <label className="field">
            <span>Tên pet</span>
            <input onChange={(event) => app.setPetForm((current) => ({ ...current, name: event.target.value }))} value={app.petForm.name} />
          </label>
        </Card>

        <Card
          action={
            <button className="primary-button complete-button" onClick={app.savePetConfig} type="button">
              Lưu cấu hình
            </button>
          }
          eyebrow="Pet"
          title={PET_NODES[1]}
        >
          <label className="field">
            <span>Dạng pet</span>
            <select onChange={(event) => app.setPetForm((current) => ({ ...current, petType: event.target.value }))} value={app.petForm.petType}>
              <option value="owl">Owl</option>
              <option value="fox">Fox</option>
              <option value="cat">Cat</option>
            </select>
          </label>
          <label className="field">
            <span>Màu</span>
            <select onChange={(event) => app.setPetForm((current) => ({ ...current, colorTheme: event.target.value }))} value={app.petForm.colorTheme}>
              <option value="forest">Forest</option>
              <option value="sun">Sun</option>
              <option value="sky">Sky</option>
            </select>
          </label>
          <label className="field">
            <span>Voice</span>
            <select onChange={(event) => app.setPetForm((current) => ({ ...current, voiceCode: event.target.value }))} value={app.petForm.voiceCode}>
              <option value="warm">Warm</option>
              <option value="calm">Calm</option>
              <option value="fast">Fast</option>
            </select>
          </label>
        </Card>

        <Card
          action={
            <button className="primary-button complete-button" onClick={app.sendVoiceToPet} type="button">
              Gửi
            </button>
          }
          eyebrow="Pet"
          title={PET_NODES[2]}
        >
          <label className="field">
            <span>Nói với pet</span>
            <input
              onChange={(event) => app.setPetForm((current) => ({ ...current, message: event.target.value }))}
              value={app.petForm.message}
            />
          </label>
          <div className="mini-list">
            {app.petVoice.slice(-4).map((item) => (
              <p key={item.id}>
                {item.role === "pet" ? "Pet" : "Bạn"}: {item.content}
              </p>
            ))}
          </div>
        </Card>

        <Card eyebrow="Pet" title={PET_NODES[3]}>
          <p>Level {app.pet?.level ?? 1}</p>
          <p>{app.pet?.experience ?? 0} exp</p>
          <p>Tâm trạng: {app.pet?.mood ?? "happy"}</p>
        </Card>
      </div>
    </SimplePage>
  );
}

function NotePage({ app }) {
  return (
    <SimplePage eyebrow="Sổ tay" title="Sổ tay">
      <div className="course-grid">
        <Card
          action={
            <button className="primary-button complete-button" onClick={() => app.quickCreate("note")} type="button">
              Lưu nhanh
            </button>
          }
          eyebrow="Sổ tay"
          title={NOTE_NODES[0]}
        >
          <p>{app.notebook.length} mục đã lưu từ hệ thống.</p>
          <div className="mini-list">
            {app.notebook.slice(0, 3).map((item) => (
              <p key={item.id}>
                {item.title} - {item.tag ?? "không nhãn"}
              </p>
            ))}
          </div>
        </Card>

        <Card
          action={
            <button className="ghost-button complete-button" onClick={app.addReminderQuick} type="button">
              Tạo nhắc nhở
            </button>
          }
          eyebrow="Sổ tay"
          title={NOTE_NODES[1]}
        >
          <div className="mini-list">
            {app.notebookReminders.length === 0 ? <p>Chưa có nhắc nhở.</p> : null}
            {app.notebookReminders.slice(0, 4).map((item) => (
              <div className="stack-row" key={item.id}>
                <p>
                  {item.title} - {formatDateTime(item.remind_at)}
                </p>
                {item.is_active ? (
                  <button className="plain-list-button" onClick={() => app.completeReminder(item.id)} type="button">
                    Đã xong
                  </button>
                ) : (
                  <span className="completion-badge done">Đã hoàn thành</span>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card
          action={
            <button className="primary-button complete-button" onClick={app.keepStudyStreak} type="button">
              Duy trì
            </button>
          }
          eyebrow="Sổ tay"
          title={NOTE_NODES[2]}
        >
          <p>Chuỗi hiện tại: {app.streak?.current_streak ?? 0} ngày</p>
          <p>Dài nhất: {app.streak?.longest_streak ?? 0} ngày</p>
          <p>Lần gần nhất: {app.streak?.last_check_in_at ? formatDateTime(app.streak.last_check_in_at) : "chưa có"}</p>
        </Card>
      </div>
    </SimplePage>
  );
}

function VocabularyBankPage({ app }) {
  const levelCounts = app.vocabularyBank.reduce((counts, item) => {
    const level = item.level_code ?? "basic";
    counts[level] = (counts[level] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <SimplePage eyebrow="Kho từ vựng" title="Kho từ vựng">
      <div className="course-grid">
        <Card eyebrow="Kho từ vựng" title={BANK_NODES[0]}>
          <div className="mini-list">
            {Object.entries(levelCounts).length === 0 ? <p>Chưa có từ trong kho.</p> : null}
            {Object.entries(levelCounts).map(([level, count]) => (
              <p key={level}>
                {level}: {count} từ
              </p>
            ))}
          </div>
        </Card>

        <Card
          action={
            <button className="primary-button complete-button" onClick={() => app.quickCreate("bank")} type="button">
              Upload nhanh
            </button>
          }
          eyebrow="Kho từ vựng"
          title={BANK_NODES[1]}
        >
          <p>User tự thêm từ vào kho cá nhân.</p>
        </Card>

        <Card eyebrow="Kho từ vựng" title={BANK_NODES[2]}>
          <p>{app.vocabularyPracticeFeed.length} từ đang được lấy vào ôn luyện.</p>
          <div className="mini-list">
            {app.vocabularyBank.slice(0, 5).map((item) => (
              <button className="plain-list-button" key={item.id} onClick={() => app.pushVocabularyToPractice(item)} type="button">
                {item.is_in_practice ? "Bỏ khỏi ôn luyện" : "Lấy vào ôn luyện"} - {item.word}
              </button>
            ))}
          </div>
        </Card>

        <Card eyebrow="Kho từ vựng" title={BANK_NODES[3]}>
          <div className="mini-list">
            {app.vocabularyBank.length === 0 ? <p>Chưa có kho để chọn.</p> : null}
            {app.vocabularyBank.slice(0, 5).map((item) => (
              <button className="plain-list-button" key={item.id} onClick={() => app.toggleVocabularySelection(item)} type="button">
                {item.is_selected ? "Đã chọn" : "Chọn"} - {item.word} ({item.level_code})
              </button>
            ))}
          </div>
        </Card>
      </div>
    </SimplePage>
  );
}

function VocabularyPracticeDemo({ app, branch }) {
  const themeMode = safeClassPart(app.settingsForm?.themeMode || app.userSettings?.theme_mode, "light");
  const isDarkTheme = themeMode === "dark";
  const languageCode = app.user?.learning_language_code ?? app.selectedLanguage ?? "en";
  const demoTopics = getVocabularyPracticeDemo(languageCode);
  const [selectedTopicKey, setSelectedTopicKey] = useState(demoTopics[0].key);
  const [activeMode, setActiveMode] = useState("view");
  const branchLabel = branch === "paid" ? "ÔN LUYỆN MUA" : "ÔN LUYỆN FREE";
  const selectedTopic = demoTopics.find((item) => item.key === selectedTopicKey) ?? demoTopics[0];
  const progressPercent = Math.round((selectedTopic.progressCurrent / selectedTopic.progressTotal) * 100);
  const modeTabs = [
    { key: "view", label: "Xem" },
    { key: "flash", label: "Lật thẻ" },
    { key: "quiz", label: "Trắc nghiệm" },
  ];

  useEffect(() => {
    setSelectedTopicKey(demoTopics[0].key);
    setActiveMode("view");
  }, [languageCode]);

  function handleNextTopic() {
    const currentIndex = demoTopics.findIndex((item) => item.key === selectedTopic.key);
    const nextTopic = demoTopics[(currentIndex + 1) % demoTopics.length];
    setSelectedTopicKey(nextTopic.key);
  }

  return (
    <section
      className="vmora-vocab-demo"
      style={{
        "--vmora-vocab-surface": isDarkTheme ? "#12101e" : "#ffffff",
        "--vmora-vocab-surface-alt": isDarkTheme ? "#171426" : "#ffffff",
        "--vmora-vocab-surface-soft": isDarkTheme ? "#1d1830" : "#faf7ff",
        "--vmora-vocab-border": isDarkTheme ? "rgba(255, 255, 255, 0.12)" : "rgba(15, 23, 42, 0.1)",
        "--vmora-vocab-border-strong": isDarkTheme ? "rgba(255, 255, 255, 0.18)" : "rgba(15, 23, 42, 0.14)",
        "--vmora-vocab-text": isDarkTheme ? "#faf5ff" : "#18181b",
        "--vmora-vocab-text-strong": isDarkTheme ? "#fcfcff" : "#111827",
        "--vmora-vocab-muted": isDarkTheme ? "rgba(255, 255, 255, 0.72)" : "rgba(39, 39, 42, 0.72)",
        "--vmora-vocab-progress-track": isDarkTheme ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.08)",
        "--vmora-vocab-highlight": "rgba(124, 58, 237, 0.12)",
      }}
    >
      <style>{`
        .vmora-vocab-demo {
          padding: 0 0 8px;
        }

        .vmora-vocab-shell {
          display: grid;
          gap: 22px;
        }

        .vmora-vocab-topic-block,
        .vmora-vocab-content-panel {
          background: var(--vmora-vocab-surface);
          border: 0.5px solid var(--vmora-vocab-border);
          border-radius: 12px;
        }

        .vmora-vocab-topic-block {
          padding: 24px;
        }

        .vmora-vocab-kicker,
        .vmora-vocab-section-kicker {
          margin: 0 0 10px;
          color: #a78bfa;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .vmora-vocab-topic-title,
        .vmora-vocab-section-title {
          margin: 0;
          color: var(--vmora-vocab-text-strong);
          font-size: clamp(1.9rem, 2.8vw, 2.45rem);
          font-weight: 800;
          line-height: 1.08;
        }

        .vmora-vocab-topic-subtitle {
          margin: 12px 0 0;
          color: var(--vmora-vocab-muted);
          font-size: 0.98rem;
        }

        .vmora-vocab-topic-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          margin-top: 20px;
        }

        .vmora-vocab-topic-card {
          position: relative;
          border: 0.5px solid var(--vmora-vocab-border);
          border-radius: 12px;
          background: var(--vmora-vocab-surface-alt);
          color: var(--vmora-vocab-text);
          cursor: pointer;
          display: grid;
          gap: 12px;
          min-height: 172px;
          padding: 18px 16px 16px;
          text-align: left;
          transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
        }

        .vmora-vocab-topic-card:hover {
          border-color: rgba(124, 58, 237, 0.65);
          transform: translateY(-1px);
        }

        .vmora-vocab-topic-card-active {
          background: var(--vmora-vocab-highlight);
          border-color: #7c3aed;
        }

        .vmora-vocab-topic-card-badge {
          position: absolute;
          right: 14px;
          top: 14px;
          border-radius: 999px;
          background: rgba(124, 58, 237, 0.14);
          color: #c4b5fd;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 5px 10px;
        }

        .vmora-vocab-topic-card-label {
          color: #a78bfa;
          font-size: 0.77rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          margin-top: 2px;
          text-transform: uppercase;
        }

        .vmora-vocab-topic-card-title {
          color: var(--vmora-vocab-text-strong);
          font-size: 1.05rem;
          font-weight: 800;
          line-height: 1.25;
          margin: 0;
          max-width: 82%;
        }

        .vmora-vocab-topic-card-copy {
          color: var(--vmora-vocab-muted);
          font-size: 0.95rem;
          line-height: 1.55;
          margin: 0;
        }

        .vmora-vocab-content-block {
          display: grid;
          gap: 14px;
        }

        .vmora-vocab-content-head {
          display: grid;
          gap: 8px;
          padding: 0 4px;
        }

        .vmora-vocab-content-panel {
          overflow: hidden;
        }

        .vmora-vocab-panel-head {
          align-items: center;
          border-bottom: 0.5px solid var(--vmora-vocab-border);
          display: flex;
          gap: 14px;
          justify-content: space-between;
          padding: 18px 20px 16px;
        }

        .vmora-vocab-lesson-title {
          color: var(--vmora-vocab-text-strong);
          font-size: 1.12rem;
          font-weight: 800;
          margin: 0;
        }

        .vmora-vocab-mode-tabs {
          display: inline-flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .vmora-vocab-mode-tab {
          align-items: center;
          background: transparent;
          border: 0.5px solid var(--vmora-vocab-border-strong);
          border-radius: 10px;
          color: var(--vmora-vocab-muted);
          cursor: pointer;
          display: inline-flex;
          font-size: 0.92rem;
          font-weight: 700;
          justify-content: center;
          min-width: 74px;
          padding: 10px 14px;
        }

        .vmora-vocab-mode-tab-active {
          background: #7c3aed;
          border-color: #7c3aed;
          color: #ffffff;
        }

        .vmora-vocab-progress {
          display: grid;
          gap: 10px;
          padding: 14px 20px 16px;
        }

        .vmora-vocab-progress-copy {
          align-items: center;
          color: var(--vmora-vocab-muted);
          display: flex;
          font-size: 0.95rem;
          justify-content: space-between;
        }

        .vmora-vocab-progress-track {
          background: var(--vmora-vocab-progress-track);
          border-radius: 999px;
          height: 4px;
          overflow: hidden;
        }

        .vmora-vocab-progress-bar {
          background: #7c3aed;
          border-radius: 999px;
          height: 100%;
          width: 0;
        }

        .vmora-vocab-word-grid {
          border-top: 0.5px solid var(--vmora-vocab-border);
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .vmora-vocab-word-card {
          border-right: 0.5px solid var(--vmora-vocab-border);
          border-top: 0.5px solid var(--vmora-vocab-border);
          display: grid;
          gap: 4px;
          min-height: 96px;
          padding: 18px 20px;
        }

        .vmora-vocab-word-card:nth-child(2n) {
          border-right: none;
        }

        .vmora-vocab-word {
          color: var(--vmora-vocab-text-strong);
          font-size: 1.05rem;
          font-weight: 800;
        }

        .vmora-vocab-ipa {
          color: #c4b5fd;
          font-size: 0.92rem;
          font-weight: 600;
        }

        .vmora-vocab-meaning {
          color: var(--vmora-vocab-muted);
          font-size: 0.96rem;
          line-height: 1.45;
        }

        .vmora-vocab-actions {
          display: grid;
          gap: 12px;
          grid-template-columns: minmax(0, 1fr) 148px;
          padding: 16px 20px 20px;
        }

        .vmora-vocab-primary,
        .vmora-vocab-secondary {
          border-radius: 12px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 800;
          min-height: 46px;
          padding: 0 18px;
        }

        .vmora-vocab-primary {
          background: #7c3aed;
          border: 1px solid #7c3aed;
          color: #ffffff;
        }

        .vmora-vocab-secondary {
          background: transparent;
          border: 0.5px solid var(--vmora-vocab-border-strong);
          color: var(--vmora-vocab-text-strong);
        }

        @media (max-width: 720px) {
          .vmora-vocab-panel-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .vmora-vocab-actions {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .vmora-vocab-topic-block,
          .vmora-vocab-content-panel {
            padding-left: 16px;
            padding-right: 16px;
          }

          .vmora-vocab-topic-block {
            padding-top: 20px;
            padding-bottom: 20px;
          }

          .vmora-vocab-topic-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .vmora-vocab-word-grid {
            grid-template-columns: 1fr;
          }

          .vmora-vocab-word-card {
            border-right: none;
          }
        }
      `}</style>

      <div className="vmora-vocab-shell">
        <div className="vmora-vocab-topic-block">
          <p className="vmora-vocab-kicker">{branchLabel}</p>
          <h2 className="vmora-vocab-topic-title">Chọn chủ đề từ vựng</h2>
          <p className="vmora-vocab-topic-subtitle">Chọn một chủ đề để bắt đầu ôn luyện ngay bên dưới</p>

          <div className="vmora-vocab-topic-grid">
            {demoTopics.map((topic) => (
              <button
                className={selectedTopic.key === topic.key ? "vmora-vocab-topic-card vmora-vocab-topic-card-active" : "vmora-vocab-topic-card"}
                key={topic.key}
                onClick={() => setSelectedTopicKey(topic.key)}
                type="button"
              >
                <span className="vmora-vocab-topic-card-badge">{topic.lessonCount} bài</span>
                <span className="vmora-vocab-topic-card-label">{topic.category}</span>
                <h3 className="vmora-vocab-topic-card-title">{topic.title}</h3>
                <p className="vmora-vocab-topic-card-copy">{topic.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="vmora-vocab-content-block">
          <div className="vmora-vocab-content-head">
            <p className="vmora-vocab-section-kicker">Từ vựng</p>
            <h2 className="vmora-vocab-section-title">{selectedTopic.title}</h2>
          </div>

          <div className="vmora-vocab-content-panel">
            <div className="vmora-vocab-panel-head">
              <h3 className="vmora-vocab-lesson-title">{selectedTopic.lessonTitle}</h3>

              <div className="vmora-vocab-mode-tabs">
                {modeTabs.map((tab) => (
                  <button
                    className={activeMode === tab.key ? "vmora-vocab-mode-tab vmora-vocab-mode-tab-active" : "vmora-vocab-mode-tab"}
                    key={tab.key}
                    onClick={() => setActiveMode(tab.key)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="vmora-vocab-progress">
              <div className="vmora-vocab-progress-copy">
                <span>Tiến độ</span>
                <strong>{selectedTopic.progressCurrent} / {selectedTopic.progressTotal} từ</strong>
              </div>

              <div className="vmora-vocab-progress-track">
                <div className="vmora-vocab-progress-bar" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="vmora-vocab-word-grid">
              {selectedTopic.words.map((item) => (
                <article className="vmora-vocab-word-card" key={`${selectedTopic.key}-${item.word}`}>
                  <strong className="vmora-vocab-word">{item.word}</strong>
                  <span className="vmora-vocab-ipa">{item.ipa}</span>
                  <span className="vmora-vocab-meaning">{item.meaning}</span>
                </article>
              ))}
            </div>

            <div className="vmora-vocab-actions">
              <button className="vmora-vocab-primary" type="button">
                Luyện tập ngay
              </button>
              <button className="vmora-vocab-secondary" onClick={handleNextTopic} type="button">
                Bài tiếp theo
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PracticePage({ app }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeSkill = PRACTICE_SKILLS.find((item) => item.path === location.pathname) ?? PRACTICE_SKILLS[0];
  const activeBranch = normalizePracticeBranch(searchParams.get("branch"), app.hasPaidPracticeAccess);
  const isVocabularyPractice = activeSkill.key === "vocabulary";
  const isWritingPractice = activeSkill.key === "writing";
  const isListeningPractice = activeSkill.key === "listening";
  const isSpeakingPractice = activeSkill.key === "speaking";
  const isGrammarPractice = activeSkill.key === "grammar";

  if (isVocabularyPractice) {
    return <Navigate replace to={`/luyen-tu-vung${location.search}`} />;
  }

  if (isWritingPractice) {
    return <Navigate replace to={`/luyen-viet${location.search}`} />;
  }

  if (isListeningPractice) {
    return <Navigate replace to={`/luyen-nghe${location.search}`} />;
  }

  if (isSpeakingPractice) {
    return <Navigate replace to={`/luyen-noi${location.search}`} />;
  }

  if (isGrammarPractice) {
    return <Navigate replace to={`/ngu-phap${location.search}`} />;
  }

  const practiceActivities = filterPracticeActivitiesByBranch(
    app.practiceActivities.filter((item) => item.practice_skill === activeSkill.key),
    activeBranch,
  );
  const vocabularyActivities = isVocabularyPractice
    ? practiceActivities.filter((item) => getPracticeTopic(item))
    : practiceActivities;
  const practiceTopics = isVocabularyPractice
    ? Array.from(
        vocabularyActivities.reduce((map, item) => {
          const topic = getPracticeTopic(item);
          if (!topic) {
            return map;
          }
          if (!map.has(topic)) {
            map.set(topic, {
              key: topic,
              label: topic,
              count: 0,
              description: item.description ?? item.prompt ?? "Chọn chủ đề này để bắt đầu ôn luyện.",
            });
          }
          map.get(topic).count += 1;
          return map;
        }, new Map()).values(),
      )
    : [];
  const [selectedTopic, setSelectedTopic] = useState(null);
  const topicActivities =
    isVocabularyPractice && selectedTopic
      ? vocabularyActivities.filter((item) => getPracticeTopic(item) === selectedTopic)
      : isVocabularyPractice
        ? []
        : practiceActivities;
  const selectedPractice = topicActivities.find((item) => item.id === app.practiceId) ?? topicActivities[0] ?? null;
  const practiceId = selectedPractice?.id ?? null;
  const branchLabel = activeBranch === "paid" ? "Ôn luyện mua" : "Ôn luyện free";
  const hasVisibleActivities = isVocabularyPractice ? vocabularyActivities.length > 0 : practiceActivities.length > 0;

  useEffect(() => {
    if (!isVocabularyPractice) {
      setSelectedTopic(null);
      return;
    }
    setSelectedTopic((current) => (practiceTopics.some((item) => item.key === current) ? current : null));
  }, [isVocabularyPractice, activeBranch, practiceTopics]);

  if (!hasVisibleActivities) {
    return (
      <SimplePage eyebrow="Ôn luyện" title={activeSkill.label}>
        <div className="lesson-detail-panel">
          <p className="eyebrow">{branchLabel}</p>
          <h2>Chưa có dữ liệu cho mục này</h2>
          <p>
            {activeBranch === "paid" && !app.hasPaidPracticeAccess
              ? "Bạn chưa mở nhánh ôn luyện mua."
              : isVocabularyPractice
                ? "Hiện chưa có bài từ vựng được chia theo chủ đề trong nhánh này."
                : "Hiện chưa có bài ôn luyện cho kỹ năng này trong nhánh hiện tại."}
          </p>
          <div className="lesson-detail-actions">
            <button className="ghost-button complete-button" onClick={() => navigate(`/on-luyen?branch=${activeBranch}`)} type="button">
              Quay về ôn luyện
            </button>
          </div>
        </div>
      </SimplePage>
    );
  }

  return (
    <>
      {isVocabularyPractice ? (
        <section className="flow-card">
          <div className="section-heading compact-heading">
            <p className="eyebrow">{branchLabel}</p>
            <h2>Chọn chủ đề từ vựng</h2>
          </div>
          <div className="course-grid">
            {practiceTopics.map((topic) => (
              <button
                className={selectedTopic === topic.key ? "course-card diagram-button-card course-card-active" : "course-card diagram-button-card"}
                key={`${activeBranch}-${topic.key}`}
                onClick={() => {
                  setSelectedTopic(topic.key);
                  app.setPracticeId(null);
                  app.setPracticeAnswers({});
                  app.setPracticeResult(null);
                }}
                type="button"
              >
                <p className="eyebrow">{topic.count} bài</p>
                <h3>{topic.label}</h3>
                <p>{topic.description}</p>
              </button>
            ))}
          </div>
          {!selectedTopic ? (
            <div className="lesson-detail-panel">
              <p className="eyebrow">Từ vựng</p>
              <h2>Hãy chọn một chủ đề trước</h2>
            </div>
          ) : null}
        </section>
      ) : null}

      {app.vocabularyPracticeFeed.length > 0 ? (
        <section className="flow-card">
          <div className="section-heading compact-heading">
            <p className="eyebrow">Kho từ vựng</p>
            <h2>Đang lấy vào ôn luyện</h2>
          </div>
          <div className="mini-list">
            {app.vocabularyPracticeFeed.slice(0, 6).map((item) => (
              <p key={item.id}>
                {item.word} - {item.meaning ?? "chưa có nghĩa"}
              </p>
            ))}
          </div>
        </section>
      ) : null}
      {!isVocabularyPractice || selectedTopic ? (
        <PracticeSection
          onAnswerChange={app.setPracticeAnswers}
          onSelectPractice={(id) => {
            app.setPracticeId(id);
            app.setPracticeAnswers({});
            app.setPracticeResult(null);
          }}
          onSubmitPractice={() => app.submitPractice(selectedPractice)}
          practiceActivities={topicActivities}
          practiceAnswers={app.practiceAnswers}
          practiceId={practiceId}
          practiceResult={app.practiceResult}
          selectedPractice={selectedPractice}
          skillLabel={`${activeSkill.label} - ${branchLabel}${selectedTopic ? ` - ${selectedTopic}` : ""}`}
        />
      ) : null}
    </>
  );
}

function PracticeAccessGate({ app, children }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (!app.user) {
    return <Navigate replace to="/dang-nhap" />;
  }

  if (!app.user.learning_language_code) {
    return <Navigate replace to="/chon-ngon-ngu" />;
  }

  if (!app.entitlementsLoaded) {
    return (
      <SimplePage eyebrow="Ôn luyện" title="Đang kiểm tra quyền học">
        <p>Hệ thống đang đồng bộ quyền học của bạn.</p>
      </SimplePage>
    );
  }

  if (!app.canOpenPractice) {
    return <Navigate replace to="/khoa-hoc" />;
  }

  if (searchParams.get("branch") === "paid" && !app.hasPaidPracticeAccess) {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("branch", "free");
    return <Navigate replace to={`${location.pathname}?${nextSearchParams.toString()}`} />;
  }

  return children;
}

function ExamPage({ app }) {
  return (
    <ExamSection
      examCertificate={app.examCertificate}
      examAnswers={app.examAnswers}
      examDetail={app.examDetail}
      examResult={app.examResult}
      exams={app.exams}
      onCertificateChange={app.setExamCertificate}
      onExamAnswerChange={(questionId, value) => app.setExamAnswers((current) => ({ ...current, [questionId]: value }))}
      onOpenExam={app.openExam}
      onSubmitExam={app.finishExam}
    />
  );
}

function AdminPage({ app }) {
  if (!app.user?.is_admin) {
    return <Navigate replace to="/dang-nhap" />;
  }

  return (
    <AdminSection
      adminArea={app.adminArea}
      adminDashboard={app.adminDashboard}
      adminEditingItem={app.adminEditingItem}
      adminItems={app.adminItems}
      adminJson={app.adminJson}
      adminLessonPreview={app.adminLessonPreview}
      adminSelectedUserId={app.adminSelectedUserId}
      adminSubmitting={app.adminSubmitting}
      adminTab={app.adminTab}
      adminTickets={app.adminTickets}
      adminUserDetail={app.adminUserDetail}
      adminUsers={app.adminUsers}
      adminWorkspace={app.adminWorkspace}
      onAnswerTicket={app.answerTicket}
      onCancelEdit={app.cancelAdminEdit}
      onCancelPayment={app.cancelPaymentAdmin}
      onConfirmPayment={app.confirmPaymentAdmin}
      onCreateEntitlement={app.createAdminEntitlement}
      onCreateItem={app.createAdminItem}
      onCreateQuestion={app.createAdminQuestion}
      onDeleteItem={app.removeAdminItem}
      onDeleteQuestion={app.deleteAdminQuestion}
      onEditItem={app.startAdminEdit}
      onExtendEntitlement={app.extendUserEntitlement}
      onGrantAdmin={app.makeAdmin}
      onLockUser={app.lockAdminUser}
      onModerateCommunityPost={app.moderateCommunityPost}
      onPreviewLesson={app.previewLearningLesson}
      onPublishLearningContent={app.publishLearningContent}
      onRefundPayment={app.refundPaymentAdmin}
      onResetUserPassword={app.resetAdminUserPassword}
      onResolveCommunityReport={app.resolveCommunityReport}
      onSavePackageCourses={app.saveAdminPackageCourses}
      onSaveSystemSetting={app.saveAdminSystemSetting}
      onSelectUser={app.selectAdminUser}
      onSendBroadcast={app.sendBroadcast}
      onSendNotification={app.sendTargetedNotification}
      onToggleFeature={app.toggleAdminFeature}
      onUnlockUser={app.unlockAdminUser}
      onUpdateQuestion={app.updateAdminQuestion}
      onUpdateTicketWorkflow={app.updateSupportWorkflow}
      onVerifyUser={app.verifyAdminUser}
      onBuildExamFromBank={app.buildExamFromBank}
      onBuildPracticeFromBank={app.buildPracticeFromBank}
      setAdminArea={app.setAdminArea}
      setAdminJson={app.setAdminJson}
      setAdminTab={app.setAdminTab}
    />
  );
}

function AppRoutes({ app }) {
  const hasUser = Boolean(app.user);
  const hasLanguage = Boolean(app.user?.learning_language_code);
  const practiceRoute = (element) => <PracticeAccessGate app={app}>{element}</PracticeAccessGate>;

  return (
    <Routes>
      <Route element={<HomePage app={app} />} path="/" />
      <Route element={<HomePage app={app} />} path="/trang-chu" />
      <Route element={<AccountPage app={app} />} path="/dang-nhap" />
      <Route element={<AccountPage app={app} />} path="/chinh-profile" />
      <Route element={hasUser ? <LanguagePage app={app} /> : <Navigate replace to="/dang-nhap" />} path="/chon-ngon-ngu" />

      <Route element={hasLanguage ? <GoldenBoardPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/bang-vang-server" />
      <Route element={hasLanguage ? <CoursePage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/khoa-hoc" />
      <Route element={hasLanguage ? <ContactPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/lien-he" />
      <Route element={hasLanguage ? <MailPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/hop-thu" />
      <Route element={hasLanguage ? <MessagesPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/tin-nhan" />
      <Route element={hasUser ? <AccountPage app={app} /> : <Navigate replace to="/dang-nhap" />} path="/profile" />
      <Route element={hasLanguage ? <SettingsPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/cai-dat" />

      <Route element={hasLanguage ? <RankingPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/bang-xep-hang" />
      <Route element={hasLanguage ? <StudyPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/hoc-tap" />
      <Route element={hasLanguage ? <TournamentPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/giai-dau" />
      <Route element={hasLanguage ? <TournamentWaitingRoomPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/giai-dau/phong-cho" />
      <Route element={hasLanguage ? <TournamentExamRoomPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/giai-dau/phong-thi" />
      <Route element={hasLanguage ? <TournamentResultPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/giai-dau/ket-qua" />
      <Route element={hasLanguage ? <ProgressPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/tien-do" />
      <Route element={hasLanguage ? <ConnectedGroupPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/nhom-chat" />
      <Route element={hasLanguage ? <RoadmapPageCinematic app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/lo-trinh" />

      <Route element={hasLanguage ? <PetPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/pet" />
      <Route element={hasLanguage ? <ExamPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/thi" />
      <Route element={hasLanguage ? <NotePage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/so-tay" />
      <Route element={practiceRoute(<VocabularyTopicsPage app={app} />)} path="/luyen-tu-vung" />
      <Route element={practiceRoute(<WritingPracticePage app={app} />)} path="/luyen-viet" />
      <Route element={practiceRoute(<SpeakingPlaceholderPage />)} path="/luyen-noi" />
      <Route element={practiceRoute(<GrammarTopicsPage app={app} />)} path="/ngu-phap" />
      <Route element={practiceRoute(<GrammarPracticePage app={app} />)} path="/ngu-phap/:lessonId" />
      <Route element={practiceRoute(<ListeningActivitiesPage app={app} />)} path="/luyen-nghe" />
      <Route element={practiceRoute(<ListeningLessonsPage activityType="audio_choice" app={app} />)} path="/luyen-nghe/audio-choice" />
      <Route element={practiceRoute(<ListeningLessonsPage activityType="audio_write" app={app} />)} path="/luyen-nghe/audio-write" />
      <Route element={practiceRoute(<ListeningLessonsPage activityType="video_choice" app={app} />)} path="/luyen-nghe/video-choice" />
      <Route element={practiceRoute(<ListeningPracticePage activityType="audio_choice" app={app} />)} path="/luyen-nghe/audio-choice/:lessonId" />
      <Route element={practiceRoute(<ListeningPracticePage activityType="audio_write" app={app} />)} path="/luyen-nghe/audio-write/:lessonId" />
      <Route element={practiceRoute(<ListeningPracticePage activityType="video_choice" app={app} />)} path="/luyen-nghe/video-choice/:lessonId" />
      <Route element={practiceRoute(<VocabularyLessonViewPage app={app} />)} path="/luyen-tu-vung/:lessonId/xem" />
      <Route element={practiceRoute(<VocabularyFlashcardPage app={app} />)} path="/luyen-tu-vung/:lessonId/lat-the" />
      <Route element={practiceRoute(<VocabularyQuizPage app={app} />)} path="/luyen-tu-vung/:lessonId/trac-nghiem" />
      <Route element={hasLanguage ? <VocabularyBankPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/kho-tu-vung" />
      <Route element={practiceRoute(<PracticeHubPage app={app} />)} path="/on-luyen" />
      {PRACTICE_PATHS.map((path) => (
        <Route element={practiceRoute(<PracticePage app={app} />)} key={path} path={path} />
      ))}

      <Route element={<AdminPage app={app} />} path="/admin" />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}

export default function App() {
  const app = useVmoraApp();
  const location = useLocation();
  const themeMode = safeClassPart(app.settingsForm?.themeMode || app.userSettings?.theme_mode, "light");
  const backgroundCode = safeClassPart(app.settingsForm?.backgroundCode || app.userSettings?.background_code, "default");
  const isLandingRoute = location.pathname === "/" || location.pathname === "/trang-chu";

  return (
    <main className={`app-shell app-theme-${themeMode} app-bg-${backgroundCode}`}>
      <TopNav app={app} />
      <div className={isLandingRoute ? "page-body page-body-landing" : "page-body"}>
        <AppRoutes app={app} />
      </div>
      <Footer app={app} />
    </main>
  );
}
