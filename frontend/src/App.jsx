import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AccountSection from "./components/AccountSection";
import AdminSection from "./components/AdminSection";
import ExamSection from "./components/ExamSection";
import PracticeSection from "./components/PracticeSection";
import useVmoraApp from "./hooks/useVmoraApp";

const ROOT_MENU = [
  ["/bang-vang-server", "Bảng Vàng server"],
  ["/khoa-hoc", "Khóa học"],
  ["/lien-he", "Liên hệ"],
  ["/hop-thu", "Hộp thư"],
  ["/profile", "Profile"],
  ["/cai-dat", "Cài đặt"],
];

const COURSE_MENU = [
  ["/bang-xep-hang", "Bảng xếp hạng"],
  ["/hoc-tap", "Học tập"],
  ["/giai-dau", "Giải đấu"],
  ["/tien-do", "Tiến độ"],
  ["/nhom-chat", "Nhóm chat"],
  ["/lo-trinh", "Lộ trình"],
];

const LEARNING_MENU = [
  ["/pet", "Pet"],
  ["/thi", "THI"],
  ["/so-tay", "Sổ tay"],
  ["/kho-tu-vung", "Kho từ vựng"],
  ["/on-luyen", "Ôn luyện"],
];
const STUDY_HUB_ITEMS = [
  ["/lo-trinh", "Lộ trình", "Chọn chặng, chọn bài, học bài và mở bài tiếp theo."],
  ["/tien-do", "Tiến độ", "Theo dõi phần trăm hoàn thành của từng khóa học."],
  ["/giai-dau", "Giải đấu", "Đăng ký, làm bài thi hỗn hợp và xem xếp hạng."],
  ["/nhom-chat", "Nhóm chat", "Kết nối bạn bè, vào nhóm riêng và chat tổng."],
  ["/bang-xep-hang", "Bảng xếp hạng", "Xem vị trí học tập của mình trong hệ thống."],
  ["/pet", "Pet", "Đặt tên, cấu hình và tương tác với pet."],
  ["/thi", "THI", "Vào kho đề thi theo chứng chỉ."],
  ["/so-tay", "Sổ tay", "Lưu bài, tạo nhắc nhở và duy trì chuỗi học."],
  ["/kho-tu-vung", "Kho từ vựng", "Chọn kho từ và đẩy vào ôn luyện."],
  ["/on-luyen", "Ôn luyện", "Luyện từ vựng, viết, nghe, nói và ngữ pháp."],
];

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
const PRACTICE_MENU = PRACTICE_SKILLS.map((item) => [item.path, item.label]);
const PRACTICE_PATHS = PRACTICE_SKILLS.map((item) => item.path);
const DEFAULT_PRACTICE_PATH = PRACTICE_SKILLS[0].path;
const LANGUAGE_LABELS = {
  de: "T.Đức",
  en: "T.ANH",
  ja: "T.Nhật",
  zh: "T.Trung",
  ko: "T.HÀN",
};

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

const HOME_IMPORTANT_ITEMS = [
  ["Khóa học", "Điểm vào chính của người dùng sau khi đăng nhập."],
  ["Lộ trình", "Chứa khóa free, khóa mua và các bài test tư vấn."],
  ["Học tập", "Có quyền học rồi mới vào chọn chặng, chọn bài và cập nhật tiến độ."],
  ["Ôn luyện", "Luyện từ vựng, viết, nghe, nói và ngữ pháp theo quyền học hiện có."],
];
const HOME_ACCESS_RULES = [
  "Người dùng vào web lần đầu sẽ ở trang chủ.",
  "Muốn dùng tính năng phải đăng nhập trước.",
  "Đăng nhập xong mới chọn ngôn ngữ học.",
  "Có thể chọn gói free để bắt đầu hoặc làm test tư vấn gói mua phù hợp.",
];
const HOME_FLOW_ITEMS = ["Trang chủ", "Đăng nhập", "Chọn ngôn ngữ", "Khóa học", "Lộ trình", "Học tập"];

function Header({ apiStatus, user }) {
  return (
    <section className="hero-card app-header">
      <p className="eyebrow">Vmora</p>
      <h1>Vmora</h1>
      <div className="hero-meta">
        <div className="status-pill">{apiStatus}</div>
        {user?.learning_language_code ? (
          <div className="status-pill status-pill-secondary">{LANGUAGE_LABELS[user.learning_language_code] ?? user.learning_language_code}</div>
        ) : null}
      </div>
    </section>
  );
}

function MenuBar({ title, items, extraItems = [] }) {
  return (
    <section className="flow-card menu-section">
      <div className="section-heading compact-heading">
        <p className="eyebrow">Menu</p>
        <h2>{title}</h2>
      </div>
      <nav className="app-nav">
        {[...items, ...extraItems].map(([to, label]) => (
          <NavLink className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")} key={to} to={to}>
            {label}
          </NavLink>
        ))}
      </nav>
    </section>
  );
}

function DynamicMenus({ app }) {
  const location = useLocation();

  if (!app.user) {
    return null;
  }

  if (!app.user.learning_language_code) {
    return null;
  }

  const extraItems = app.user.is_admin ? [["/admin", "Admin"]] : [];
  const menus = [<MenuBar extraItems={extraItems} items={ROOT_MENU} key="root" title="Cấp 1" />];
  const isPracticeRoute = location.pathname === "/on-luyen" || PRACTICE_PATHS.includes(location.pathname);

  if (
    ["/khoa-hoc", "/bang-xep-hang", "/hoc-tap", "/giai-dau", "/tien-do", "/nhom-chat", "/lo-trinh", "/pet", "/thi", "/so-tay", "/kho-tu-vung"].includes(
      location.pathname,
    ) || isPracticeRoute
  ) {
    menus.push(<MenuBar items={COURSE_MENU} key="course" title="Khóa học" />);
  }

  if (["/hoc-tap", "/pet", "/thi", "/so-tay", "/kho-tu-vung"].includes(location.pathname) || isPracticeRoute) {
    menus.push(<MenuBar items={LEARNING_MENU} key="learning" title="Học tập" />);
  }

  if (isPracticeRoute) {
    menus.push(<MenuBar items={PRACTICE_MENU} key="practice" title="Ôn luyện" />);
  }

  return menus;
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
      <div className="section-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
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

  return (
    <>
      <section className="flow-card landing-index">
        <div className="landing-index-copy">
          <p className="eyebrow">Trang chủ</p>
          <h2>Nền tảng học ngôn ngữ theo lộ trình</h2>
          <p>
            Đây là trang đầu tiên người dùng nhìn thấy khi vào web. Các chức năng như khóa học, học tập, ôn luyện,
            hộp thư, cài đặt và cộng đồng chỉ mở sau khi đăng nhập.
          </p>
          <div className="inline-actions">
            <button className="primary-button complete-button" onClick={() => navigate(startPath)} type="button">
              {hasUser ? "Tiếp tục học" : "Đăng nhập để bắt đầu"}
            </button>
            {!hasUser ? (
              <button className="ghost-button complete-button" onClick={() => navigate("/dang-nhap")} type="button">
                Tạo tài khoản
              </button>
            ) : null}
          </div>
        </div>
        <div className="landing-index-panel">
          <p className="eyebrow">Luồng chính</p>
          <div className="flow-line-text landing-flow-line">
            {HOME_FLOW_ITEMS.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="flow-card">
        <div className="section-heading">
          <p className="eyebrow">Thông tin quan trọng</p>
          <h2>Người dùng cần biết gì trước khi vào hệ thống</h2>
        </div>
        <div className="route-flow-grid">
          {HOME_IMPORTANT_ITEMS.map(([title, description]) => (
            <Card eyebrow="Vmora" key={title} title={title}>
              <p>{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="flow-card">
        <div className="section-heading compact-heading">
          <p className="eyebrow">Quy tắc truy cập</p>
          <h2>Chưa đăng nhập thì chỉ xem trang chủ</h2>
        </div>
        <div className="course-grid">
          {HOME_ACCESS_RULES.map((item, index) => (
            <Card eyebrow={`Bước ${index + 1}`} key={item} title={item}>
              <p>{index === 0 ? "Trang chủ là nơi giới thiệu thông tin chính." : "Các tính năng phía trong sẽ yêu cầu tài khoản."}</p>
            </Card>
          ))}
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
  const navigate = useNavigate();

  return (
    <SimplePage eyebrow="Khóa học" title="Khóa học">
      <div className="route-flow-grid">
        <Card
          action={
            <button className="primary-button complete-button" onClick={() => navigate("/lo-trinh")} type="button">
              Vào lộ trình
            </button>
          }
          eyebrow="Khóa học"
          title="Điểm vào lộ trình"
        >
          <p>Khóa học là điểm vào. Người dùng sẽ đi tiếp sang lộ trình để chọn khóa free, khóa mua hoặc làm test tư vấn.</p>
        </Card>

        <Card
          action={
            <button className="ghost-button complete-button" onClick={() => navigate("/lo-trinh")} type="button">
              Xem khóa free
            </button>
          }
          eyebrow="Lộ trình"
          title="Khóa free"
        >
          <p>Trong lộ trình có 1 khóa free được cập nhật liên tục để người dùng bắt đầu.</p>
        </Card>

        <Card
          action={
            <button className="ghost-button complete-button" onClick={() => navigate("/lo-trinh")} type="button">
              Làm test tư vấn
            </button>
          }
          eyebrow="Lộ trình"
          title="Khóa mua và test"
        >
          <p>Khóa mua và nhiều bài test tư vấn đều nằm trong lộ trình, hệ thống chỉ gợi ý và không ép mua.</p>
        </Card>
      </div>

      <div className="flow-line-text">
        <span>Khóa học</span>
        <span>Lộ trình</span>
        <span>Khóa free</span>
        <span>Khóa mua</span>
        <span>Test tư vấn</span>
      </div>
    </SimplePage>
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
          <h2>Học tập mở sau khi có quyền học</h2>
          <p>Vào lộ trình để chọn khóa free, khóa mua hoặc làm test tư vấn trước khi vào khu học tập.</p>
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
    <SimplePage eyebrow="Học tập" title="Học tập">
      <div className="course-grid">
        {STUDY_HUB_ITEMS.map(([path, title, description]) => (
          <button className="course-card diagram-button-card" key={path} onClick={() => navigate(path)} type="button">
            <p className="eyebrow">Học tập</p>
            <h3>{title}</h3>
            <p>{description}</p>
          </button>
        ))}
      </div>
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

      <div className="flow-line-text">
        <span>Đăng nhập</span>
        <span>Khóa học</span>
        <span>Lộ trình</span>
        <span>Khóa free</span>
        <span>Khóa mua</span>
        <span>Test tư vấn</span>
        <span>Có quyền học</span>
        <span>Học tập</span>
        <span>Chọn chặng</span>
        <span>Chọn bài</span>
        <span>Học bài</span>
        <span>Cập nhật tiến độ</span>
        <span>Mở bài tiếp theo</span>
      </div>

      {!hasLearningAccess ? (
        <div className="lesson-detail-panel">
          <p className="eyebrow">Lộ trình</p>
          <h2>Chưa có quyền học</h2>
          <p>Chọn khóa free, mua khóa phù hợp hoặc làm bài test tư vấn. Sau khi có quyền học, bạn sẽ vào Học tập để học thật.</p>
          <div className="lesson-detail-actions">
            {freePackage ? (
              <button className="primary-button complete-button" onClick={() => handlePackageSelection(app, navigate, freePackage)} type="button">
                Kích hoạt khóa free
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

  return (
    <SimplePage eyebrow="Hộp thư" title="Hộp thư">
      <div className="course-grid">
        <Card eyebrow="Hộp thư" title={MAIL_NODES[0]}>
          <div className="mini-list">
            {app.notifications.length === 0 ? <p>Chưa có thông báo.</p> : null}
            {app.notifications.slice(0, 6).map((item) => (
              <article className="stack-row" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.content}</p>
                  <small>
                    {item.notification_type} - {formatDateTime(item.created_at)}
                  </small>
                </div>
                {item.is_read ? (
                  <span className="completion-badge done">Đã đọc</span>
                ) : (
                  <button className="plain-list-button" onClick={() => app.markRead(item.id)} type="button">
                    Đánh dấu đọc
                  </button>
                )}
              </article>
            ))}
          </div>
        </Card>

        <Card eyebrow="Hộp thư" title={MAIL_NODES[1]}>
          <div className="mini-list">
            {badges.length === 0 ? <p>Chưa có thành tích.</p> : null}
            {badges.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </Card>

        <Card eyebrow="Hộp thư" title={MAIL_NODES[2]}>
          <div className="mini-list">
            {gifts.length === 0 ? <p>Chưa có quà/gói được kích hoạt.</p> : null}
            {gifts.map((item) => (
              <p key={item.id}>
                <strong>{item.title}</strong> - {item.content}
              </p>
            ))}
          </div>
        </Card>

        <Card eyebrow="Hộp thư" title={MAIL_NODES[3]}>
          <div className="mini-list">
            <p>Điểm hiện tại: {app.stats?.estimated_points ?? 0}</p>
            {courses.length === 0 ? <p>Chưa có tiến độ khóa học.</p> : null}
            {courses.slice(0, 4).map((course) => (
              <div className="stack-row" key={course.id}>
                <p>
                  {course.title}: {course.completed_lessons}/{course.total_lessons} bài
                </p>
                <span className="completion-badge">{course.progress_percent}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
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
  return (
    <SimplePage eyebrow="Bảng xếp hạng" title="Bảng xếp hạng">
      <div className="mini-list">
        {app.leaderboard.slice(0, 12).map((item, index) => (
          <p key={item.user_id}>
            {index + 1}. {item.user_name} - {item.score}
          </p>
        ))}
      </div>
    </SimplePage>
  );
}

function GoldenBoardPage({ app }) {
  return (
    <SimplePage eyebrow="Bảng Vàng server" title="Bảng Vàng server">
      <div className="course-grid">
        {app.leaderboard.slice(0, 6).map((item, index) => (
          <Card eyebrow={`Hạng ${index + 1}`} key={item.user_id} title={item.user_name ?? "User"}>
            <p>{item.score} điểm</p>
            <p>Xong bài: {item.completed_lessons} (+1)</p>
            <p>Thi: {item.exam_attempts} (+10)</p>
            <p>Giải đấu: {item.tournament_attempts ?? 0} (+10)</p>
          </Card>
        ))}
      </div>
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
      <Route element={hasLanguage ? <Navigate replace to={DEFAULT_PRACTICE_PATH} /> : <Navigate replace to={hasUser ? "/chon-ngon-ngu" : "/dang-nhap"} />} path="/on-luyen" />
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
      <Header apiStatus={app.apiStatus} user={app.user} />
      <DynamicMenus app={app} />
      <AppRoutes app={app} />
    </main>
  );
}
