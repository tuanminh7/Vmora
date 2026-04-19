import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AccountSection from "./components/AccountSection";
import AdminSection from "./components/AdminSection";
import ExamSection from "./components/ExamSection";
import PracticeSection from "./components/PracticeSection";
import useVmoraApp from "./hooks/useVmoraApp";

const PRACTICE_SKILLS = [
  { key: "vocabulary", label: "Luyện từ vựng", path: "/on-luyen/luyen-tu-vung" },
  { key: "writing", label: "Luyện viết", path: "/on-luyen/luyen-viet" },
  { key: "listening", label: "Luyện nghe", path: "/on-luyen/luyen-nghe" },
  { key: "speaking", label: "Luyện nói", path: "/on-luyen/luyen-noi" },
  { key: "grammar", label: "Ngữ pháp", path: "/on-luyen/ngu-phap" },
];
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
    icon: "📊",
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
    icon: "📈",
    title: "Tiến độ",
    description: "Theo dõi phần trăm hoàn thành của từng khóa học.",
    tone: "green",
  },
  {
    path: "/nhom-chat",
    icon: "💬",
    title: "Nhóm chat",
    description: "Kết nối bạn bè, nhóm riêng và cộng đồng học tập.",
    tone: "cyan",
  },
  {
    path: "/lo-trinh",
    icon: "🚦",
    title: "Lộ trình",
    description: "Chọn chặng, mở bài học và đi tiếp từng bước rõ ràng.",
    tone: "pink",
  },
  {
    path: "/hoc-tap",
    icon: "⚡",
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
    path: "/on-luyen/luyen-tu-vung",
    icon: "🔠",
    title: "Luyện từ vựng",
    description: "Ôn flashcard, chọn đáp án và ghi nhớ từ theo cấp độ.",
    tone: "blue",
  },
  {
    path: "/on-luyen/luyen-viet",
    icon: "✍️",
    title: "Luyện viết",
    description: "Rèn câu trả lời, đoạn văn và phản xạ viết.",
    tone: "pink",
  },
  {
    path: "/on-luyen/luyen-nghe",
    icon: "🎧",
    title: "Luyện nghe",
    description: "Nghe nội dung, chọn đáp án và kiểm tra khả năng hiểu.",
    tone: "cyan",
  },
  {
    path: "/on-luyen/luyen-noi",
    icon: "🎙️",
    title: "Luyện nói",
    description: "Luyện phản xạ nói và phát âm qua bài thực hành.",
    tone: "gold",
  },
  {
    path: "/on-luyen/ngu-phap",
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
const SETTINGS_NODES = ["Chỉnh cấu hình sáng/tối", "Tùy chỉnh background", "API key Gemini"];
const TOURNAMENT_NODES = ["Bài thi hỗn hợp", "Form đăng kí", "Bảng xếp hạng", "Giải thưởng"];
const GROUP_NODES = ["Kết nối / kết bạn", "ID nhóm pass", "Nhóm riêng", "Chat với bạn bè", "Khung chat tổng"];
const PET_NODES = ["Tự đặt tên", "Tự cấu hình", "Voice với pet", "Level pet"];
const NOTE_NODES = ["Lưu từ vựng hay bài làm", "Lịch / nhắc nhở", "Duy trì chuỗi"];
const BANK_NODES = ["Phân loại theo cấp độ", "User tự upload", "Lấy vào ôn luyện", "Chọn kho từ vựng"];

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
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const courseMenuRef = useRef(null);
  const courseMenuTriggerRef = useRef(null);
  const courseMenuPanelRef = useRef(null);
  const [courseMenuPosition, setCourseMenuPosition] = useState({ left: 0, top: 64 });

  const hasUser = Boolean(app.user);
  const hasLanguage = Boolean(app.user?.learning_language_code);

  const mainLinks = hasUser && hasLanguage
    ? [
        ["/bang-vang-server", "🏆", "Bảng Vàng"],
        ["/khoa-hoc", "📚", "Khóa học"],
        ["/lien-he", "📩", "Liên hệ"],
        ["/hop-thu", "📧", "Hộp thư"],
        ["/profile", "👤", "Profile"],
        ["/cai-dat", "✨", "Cài đặt"],
      ]
    : hasUser
    ? [["/chon-ngon-ngu", "🌍", "Chọn ngôn ngữ"], ["/profile", "👤", "Profile"]]
    : [["/dang-nhap", "🔑", "Đăng nhập"]];

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

  return (
    <>
      <header className={`topnav${scrolled ? " topnav-scrolled" : ""}`}>
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
                    <span className="topnav-link-icon">{icon}</span>
                    <span className="topnav-link-label">{label}</span>
                    <span className="topnav-dropdown-caret">▾</span>
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
                              <span className="topnav-dropdown-item-icon">{item.icon}</span>
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
                  <span className="topnav-link-icon">{icon}</span>
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
                <span>{icon}</span> {label}
              </NavLink>
            ))}
          </div>
        ) : null}
      </header>
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

function SimplePage({ title, eyebrow, children }) {
  return (
    <section className="flow-card">
      {eyebrow || title ? (
        <div className="section-heading">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          {title ? <h2>{title}</h2> : null}
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

async function handlePackageSelection(app, navigate, packageItem) {
  const result = await app.packageAction(packageItem);
  if (result?.externalUrl) {
    window.open(result.externalUrl, "_blank", "noopener,noreferrer");
    return;
  }
  if (result?.redirectToPractice) {
    navigate(DEFAULT_PRACTICE_PATH);
  }
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN");
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
      return { icon: "🛎️", label: "Hệ thống", tone: "system" };
    case "friend":
      return { icon: "💬", label: "Bạn bè", tone: "friend" };
    case "achievement":
      return { icon: "🏅", label: "Thành tích", tone: "achievement" };
    case "reward":
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

function HomePage({ app }) {
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
  const languages = [
    { code: "en", label: "Tiếng Anh", sub: "English", image: "/images/anh.svg" },
    { code: "zh", label: "Tiếng Trung", sub: "中文", image: "/images/trung.webp" },
    { code: "ja", label: "Tiếng Nhật", sub: "日本語", image: "/images/nhat.jpg" },
    { code: "ko", label: "Tiếng Hàn", sub: "한국어", image: "/images/han.svg" },
    { code: "de", label: "Tiếng Đức", sub: "Deutsch", image: "/images/duc.png" },
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

function LanguagePage({ app }) {
  const navigate = useNavigate();

  return (
    <SimplePage eyebrow="Ngôn ngữ" title="Chọn ngôn ngữ">
      <div className="course-grid">
        {app.languages.map((language) => (
          <button
            className="course-card diagram-button-card"
            key={language.code}
            onClick={async () => {
              await app.changeLanguage({ target: { value: language.code } });
              navigate("/khoa-hoc");
            }}
            type="button"
          >
            <p className="eyebrow">{LANGUAGE_LABELS[language.code] ?? language.code.toUpperCase()}</p>
            <h3>{language.name}</h3>
          </button>
        ))}
      </div>
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
  const navigate = useNavigate();
  const hasLearningAccess = app.currentLanguageEntitlements.length > 0;

  if (!hasLearningAccess) {
    return (
      <SimplePage eyebrow="Học tập" title="Học tập">
        <div className="lesson-detail-panel">
          <p className="eyebrow">Cần quyền học</p>
          <h2>Tính năng chưa được mở</h2>
          <p>Bạn cần kích hoạt khóa học hoặc đăng ký gói để truy cập khu vực này.</p>
          <div className="lesson-detail-actions">
            <button className="primary-button complete-button" onClick={() => navigate("/lo-trinh")} type="button">
              Vào lộ trình
            </button>
          </div>
        </div>
      </SimplePage>
    );
  }

  return (
    <MenuHubPage
      eyebrow="Học tập"
      items={LEARNING_HUB_ITEMS}
      summary="Khu học tập gom các công cụ học sâu: pet đồng hành, thi, sổ tay, kho từ vựng và ôn luyện theo kỹ năng."
      title="Chọn công cụ học tập"
    />
  );
}

function PracticeHubPage() {
  return (
    <MenuHubPage
      eyebrow="Ôn luyện"
      items={PRACTICE_HUB_ITEMS}
      summary="Chọn đúng kỹ năng bạn muốn luyện trước khi vào bài tập chi tiết."
      title="Chọn kỹ năng ôn luyện"
    />
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
              <button className="primary-button complete-button" onClick={() => handlePackageSelection(app, navigate, freePackage)} type="button">
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
              <button className="primary-button complete-button" onClick={() => handlePackageSelection(app, navigate, freePackage)} type="button">
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

function ProgressPage({ app }) {
  return (
    <SimplePage eyebrow="Tiến độ" title="Tiến độ">
      <div className="course-grid">
        {app.overview?.courses?.map((course) => (
          <Card eyebrow="Tiến độ" key={course.id} title={course.title}>
            <p>
              {course.completed_lessons}/{course.total_lessons} bài
            </p>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${course.progress_percent}%` }} />
            </div>
          </Card>
        ))}
      </div>
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

  useEffect(() => {
    if (!selectedMail && selectedMailId) {
      setSelectedMailId("");
      return;
    }
    if (selectedMail && selectedMail.id !== selectedMailId) {
      setSelectedMailId(selectedMail.id);
    }
  }, [selectedMail, selectedMailId]);

  async function handlePrimaryAction() {
    if (!selectedMail) return;
    if (selectedMail.source === "notification" && !selectedMail.isRead) {
      await app.markRead(selectedMail.sourceId);
    }
  }

  async function handleClaimAll() {
    const unreadNotifications = activeItems.filter((item) => item.source === "notification" && !item.isRead);
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
            {mailTabs.map((tab) => (
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
              {activeItems.length === 0 ? <p className="mail-game-empty">Chưa có thư trong mục này.</p> : null}
              {activeItems.map((item) => (
                <button
                  className={selectedMail?.id === item.id ? "mail-game-list-item mail-game-list-item-active" : "mail-game-list-item"}
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
            <div className="mail-game-sidebar-footer">Thư: {activeItems.length}/50</div>
          </aside>

          <section className="mail-game-detail">
            {selectedMail ? (
              <>
                <div className="mail-game-detail-head">
                  <div>
                    <p className="eyebrow">{selectedMail.typeLabel}</p>
                    <h3>{selectedMail.title}</h3>
                  </div>
                  <span className={`mail-game-status mail-game-status-${selectedMail.tone}`}>{selectedMail.statusLabel}</span>
                </div>

                <div className={`mail-game-poster mail-game-poster-${selectedMail.tone}`}>
                  <div className="mail-game-poster-badge">{selectedMail.bannerTitle}</div>
                  <div className="mail-game-poster-main">
                    <div className="mail-game-poster-icon">{selectedMail.icon}</div>
                    <div>
                      <strong>{selectedMail.title}</strong>
                      <span>{selectedMail.bannerCaption}</span>
                    </div>
                  </div>
                  <div className="mail-game-poster-footer">{selectedMail.footerLabel}</div>
                </div>

                <div className="mail-game-message">
                  <div className="mail-game-message-meta">
                    <span>{selectedMail.timeLabel}</span>
                    <span>{selectedMail.typeLabel}</span>
                  </div>
                  <p>{selectedMail.content}</p>
                </div>

                <div className="mail-game-detail-actions">
                  <button className="mail-game-cta" onClick={handlePrimaryAction} type="button">
                    {selectedMail.actionLabel}
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
            <button className="mail-game-bottom-button" onClick={() => dismissItems(activeItems.map((item) => item.id))} type="button">
              Xóa tất cả
            </button>
            <button className="mail-game-bottom-button mail-game-bottom-button-primary" disabled={!canClaimAll} onClick={handleClaimAll} type="button">
              Nhận tất cả
            </button>
          </div>
          <button
            className="mail-game-bottom-button"
            disabled={!selectedMail}
            onClick={() => dismissItems(selectedMail ? [selectedMail.id] : [])}
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
  return (
    <SimplePage eyebrow="Liên hệ" title="Liên hệ">
      <div className="feature-grid">
        <Card eyebrow="Liên hệ" title={CONTACT_NODES[0]}>
          <form className="mini-list" onSubmit={app.createContactTicket}>
            <label className="field">
              <span>Tiêu đề</span>
              <input onChange={(event) => app.setContactForm((current) => ({ ...current, title: event.target.value }))} value={app.contactForm.title} />
            </label>
            <label className="field">
              <span>Nội dung</span>
              <textarea onChange={(event) => app.setContactForm((current) => ({ ...current, content: event.target.value }))} value={app.contactForm.content} />
            </label>
            <button className="primary-button complete-button" type="submit">
              Gửi admin
            </button>
          </form>
          <div className="mini-list">
            {app.tickets.length === 0 ? <p>Chưa có lịch sử liên hệ.</p> : null}
            {app.tickets.slice(0, 4).map((ticket) => (
              <article className="stack-row" key={ticket.id}>
                <div>
                  <strong>{ticket.title}</strong>
                  <p>{ticket.content}</p>
                  {ticket.admin_reply ? <p>Admin: {ticket.admin_reply}</p> : <p>Đang chờ admin trả lời.</p>}
                </div>
                <span className={ticket.status === "answered" ? "completion-badge done" : "completion-badge"}>{ticket.status}</span>
              </article>
            ))}
          </div>
        </Card>

        <Card eyebrow="Liên hệ" title={CONTACT_NODES[1]}>
          <p>Kênh liên hệ chính trong hệ thống là chat/ticket với admin.</p>
          <p>Mọi phản hồi của admin sẽ quay lại hộp thư và lịch sử liên hệ.</p>
        </Card>

        <Card eyebrow="Liên hệ" title={CONTACT_NODES[2]}>
          <p>Chưa cấu hình liên kết mạng xã hội.</p>
          <p>Phần này chờ admin thêm link chính thức của dự án.</p>
        </Card>
      </div>
    </SimplePage>
  );
}

function SettingsPage({ app }) {
  return (
    <SimplePage eyebrow="Cài đặt" title="Cài đặt">
      <form className="course-grid" onSubmit={app.saveUserSettings}>
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

        <Card eyebrow="Cài đặt" title={SETTINGS_NODES[2]}>
          <label className="field">
            <span>API key Gemini</span>
            <input
              onChange={(event) => app.setSettingsForm((current) => ({ ...current, geminiApiKey: event.target.value }))}
              placeholder="Nhập API key Gemini"
              type="password"
              value={app.settingsForm.geminiApiKey}
            />
          </label>
          <button className="primary-button complete-button" type="submit">
            Lưu cài đặt
          </button>
          {app.userSettings?.updated_at ? <p>Cập nhật: {formatDateTime(app.userSettings.updated_at)}</p> : null}
        </Card>
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
              <span>Điểm</span>
              <span>Hoàn thành</span>
              <span>Thi</span>
              <span>Giải đấu</span>
            </div>
            {leaderboard.map((item) => (
              <div className={`ranking-top50-table-row ${item.rank <= 6 ? "ranking-top50-table-row-highlight" : ""}`} key={`${item.user_id}-${item.rank}`}>
                <span>#{item.rank}</span>
                <span>{item.user_name ?? "Người chơi ẩn danh"}</span>
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
              <span>Điểm</span>
              <span>Hoàn thành</span>
              <span>Thi</span>
              <span>Giải đấu</span>
            </div>
            {leaderboard.map((item, index) => (
              <div className={`golden-board-row ${index < 6 ? "golden-board-row-highlight" : ""}`} key={`${item.user_id}-${index}`}>
                <span>#{index + 1}</span>
                <span>{item.user_name ?? "Người chơi ẩn danh"}</span>
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
  const selectedTournament = app.tournaments.find((item) => item.id === app.tournamentId) ?? app.tournamentDetail;

  return (
    <SimplePage eyebrow="Giải đấu" title="Giải đấu">
      <div className="course-grid">
        <Card eyebrow="Giải đấu" title={TOURNAMENT_NODES[0]}>
          <div className="mini-list">
            {app.tournaments.map((item) => (
              <button className="plain-list-button" key={item.id} onClick={() => app.openTournament(item.id)} type="button">
                {item.title}
              </button>
            ))}
          </div>
        </Card>
        <Card
          action={
            selectedTournament ? (
              <button className="primary-button complete-button" onClick={() => app.joinTournament(selectedTournament)} type="button">
                Đăng ký
              </button>
            ) : null
          }
          eyebrow="Giải đấu"
          title={TOURNAMENT_NODES[1]}
        >
          <p>{selectedTournament?.is_registered ? "Đã đăng ký" : "Chưa đăng ký"} giải đấu.</p>
        </Card>
        <Card eyebrow="Giải đấu" title={TOURNAMENT_NODES[2]}>
          <div className="mini-list">
            {app.tournamentLeaderboard.slice(0, 5).map((item, index) => (
              <p key={`${item.user_id}-${index}`}>
                {index + 1}. {item.user_name} - {item.score_percent}%
              </p>
            ))}
          </div>
        </Card>
        <Card eyebrow="Giải đấu" title={TOURNAMENT_NODES[3]}>
          <p>{selectedTournament?.reward_title ?? "Chưa có giải thưởng"}</p>
          <p>{selectedTournament?.reward_description ?? ""}</p>
        </Card>
      </div>

      {selectedTournament?.is_registered ? (
        <div className="lesson-detail-panel">
          <h2>{selectedTournament.title}</h2>
          <p className="empty-copy">
            {selectedTournament.duration_minutes} phút • Đạt {selectedTournament.passing_score}%
          </p>
          <div className="mixed-stack">
            {(app.tournamentDetail?.questions ?? []).map((question) => (
              <article className="mixed-question" key={question.id}>
                <strong>{question.prompt}</strong>
                {question.options?.length ? (
                  question.options.map((option) => (
                    <button
                      className={app.tournamentAnswers[String(question.id)] === option.id ? "practice-option practice-option-active" : "practice-option"}
                      key={option.id}
                      onClick={() => app.setTournamentAnswers((current) => ({ ...current, [String(question.id)]: option.id }))}
                      type="button"
                    >
                      {option.text}
                    </button>
                  ))
                ) : (
                  <input
                    onChange={(event) =>
                      app.setTournamentAnswers((current) => ({ ...current, [String(question.id)]: event.target.value }))
                    }
                    value={app.tournamentAnswers[String(question.id)] ?? ""}
                  />
                )}
              </article>
            ))}
          </div>
          <button className="primary-button complete-button" onClick={app.finishTournament} type="button">
            Nộp bài giải đấu
          </button>
          {app.tournamentResult ? (
            <p className="practice-answer">
              {app.tournamentResult.feedback} - {app.tournamentResult.score_percent}%
            </p>
          ) : null}
        </div>
      ) : null}
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

function PracticePage({ app }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSkill = PRACTICE_SKILLS.find((item) => item.path === location.pathname) ?? PRACTICE_SKILLS[0];
  const practiceActivities = app.practiceActivities.filter((item) => item.practice_skill === activeSkill.key);
  const selectedPractice = practiceActivities.find((item) => item.id === app.practiceId) ?? practiceActivities[0] ?? null;
  const practiceId = selectedPractice?.id ?? null;

  if (!app.canOpenPractice) {
    return (
      <SimplePage eyebrow="Ôn luyện" title="Ôn luyện">
        <p>Bạn cần chọn khóa học free hoặc mua gói trước khi vào ôn luyện.</p>
        <button className="primary-button complete-button" onClick={() => navigate("/khoa-hoc")} type="button">
          Đi tới Khóa học
        </button>
      </SimplePage>
    );
  }

  if (practiceActivities.length === 0) {
    return (
      <SimplePage eyebrow="Ôn luyện" title={activeSkill.label}>
        <p>Chưa có bài ôn luyện cho mục này.</p>
      </SimplePage>
    );
  }

  return (
    <>
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
      <PracticeSection
        onAnswerChange={app.setPracticeAnswers}
        onSelectPractice={(id) => {
          app.setPracticeId(id);
          app.setPracticeAnswers({});
          app.setPracticeResult(null);
        }}
        onSubmitPractice={() => app.submitPractice(selectedPractice)}
        practiceActivities={practiceActivities}
        practiceAnswers={app.practiceAnswers}
        practiceId={practiceId}
        practiceResult={app.practiceResult}
        selectedPractice={selectedPractice}
        skillLabel={activeSkill.label}
      />
    </>
  );
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
      <Route element={hasUser ? <AccountPage app={app} /> : <Navigate replace to="/dang-nhap" />} path="/profile" />
      <Route element={hasLanguage ? <SettingsPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/cai-dat" />

      <Route element={hasLanguage ? <RankingPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/bang-xep-hang" />
      <Route element={hasLanguage ? <StudyPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/hoc-tap" />
      <Route element={hasLanguage ? <TournamentPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/giai-dau" />
      <Route element={hasLanguage ? <ProgressPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/tien-do" />
      <Route element={hasLanguage ? <GroupPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/nhom-chat" />
      <Route element={hasLanguage ? <RoadmapPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/lo-trinh" />

      <Route element={hasLanguage ? <PetPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/pet" />
      <Route element={hasLanguage ? <ExamPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/thi" />
      <Route element={hasLanguage ? <NotePage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/so-tay" />
      <Route element={hasLanguage ? <VocabularyBankPage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/kho-tu-vung" />
      <Route element={hasLanguage ? <PracticeHubPage /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/on-luyen" />
      {PRACTICE_PATHS.map((path) => (
        <Route element={hasLanguage ? <PracticePage app={app} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} key={path} path={path} />
      ))}

      <Route element={<AdminPage app={app} />} path="/admin" />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}

export default function App() {
  const app = useVmoraApp();
  const themeMode = safeClassPart(app.userSettings?.theme_mode, "light");
  const backgroundCode = safeClassPart(app.userSettings?.background_code, "default");

  return (
    <main className={`app-shell app-theme-${themeMode} app-bg-${backgroundCode}`}>
      <TopNav app={app} />
      <div className="page-body">
        <AppRoutes app={app} />
      </div>
      <Footer app={app} />
    </main>
  );
}
