import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useScroll,
  useTransform,
} from "framer-motion";
import { useNavigate } from "react-router-dom";

const HERO_WORDS = ["Chinh", "phục", "ngôn", "ngữ", "theo", "cách", "của", "bạn"];

const FEATURE_TIMELINE = [
  {
    key: "roadmap",
    icon: "✦",
    title: "Lộ trình thông minh",
    desc: "Chọn mục tiêu, nhận đường học rõ ràng và mở bài theo nhịp cá nhân.",
    accent: "violet",
  },
  {
    key: "ai",
    icon: "AI",
    title: "AI ôn luyện",
    desc: "Luyện nghe, nói, đọc, viết và được phản hồi ngay sau từng lượt học.",
    accent: "pink",
  },
  {
    key: "community",
    icon: "◎",
    title: "Cộng đồng realtime",
    desc: "Chat tổng, nhóm riêng, kết bạn và giữ động lực học cùng người khác.",
    accent: "sky",
  },
  {
    key: "rank",
    icon: "★",
    title: "Thi đấu & tiến độ",
    desc: "Theo dõi thành tích, tham gia bảng xếp hạng và nhìn thấy mình tiến bộ.",
    accent: "gold",
  },
];

const TESTIMONIALS = [
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

const STATS = [
  { value: 5, suffix: "", label: "ngôn ngữ đang mở" },
  { value: 10000, suffix: "+", label: "lượt luyện tập mục tiêu" },
  { value: 24, suffix: "/7", label: "AI đồng hành" },
];

const ROADMAP_PREVIEW = [
  ["Ngày 1", "Khởi động đúng trình độ", "Chọn mục tiêu, test nhanh và nhận lộ trình phù hợp."],
  ["Ngày 3", "Ôn luyện với AI", "Luyện đúng kỹ năng còn yếu và nhận phản hồi tức thì."],
  ["Ngày 7", "Vào nhịp cộng đồng", "Tham gia nhóm, chat tổng và giữ động lực quay lại mỗi ngày."],
];

const FAQS = [
  ["Vmora phù hợp cho người mới bắt đầu không?", "Có. Bạn có thể bắt đầu từ mức cơ bản, chọn ngôn ngữ muốn học và đi theo lộ trình được gợi ý sẵn."],
  ["AI trong Vmora hỗ trợ những gì?", "AI hỗ trợ luyện tập, gợi ý bước học tiếp theo, phản hồi câu trả lời và giúp bạn ôn lại phần còn yếu."],
  ["Mình có thể vừa học vừa tham gia cộng đồng không?", "Có. Bạn có thể vào chat tổng, nhóm riêng, kết bạn và theo dõi tiến độ học trong cùng một hệ thống."],
];

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

function getStartPath(app) {
  const hasUser = Boolean(app.user);
  const hasLanguage = Boolean(app.user?.learning_language_code);
  if (!hasUser) return "/dang-nhap";
  return hasLanguage ? "/khoa-hoc" : "/chon-ngon-ngu";
}

function SectionHead({ eyebrow, title, copy }) {
  return (
    <div className="cinematic-section-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {copy ? <p>{copy}</p> : null}
    </div>
  );
}

function CountUp({ end, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, end, {
      duration: 1.3,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => setDisplay(Math.round(value)),
    });
    return () => controls.stop();
  }, [end, inView]);

  return (
    <span ref={ref}>
      {display.toLocaleString("vi-VN")}
      {suffix}
    </span>
  );
}

export function HeroSection({ app, languages }) {
  const navigate = useNavigate();
  const startPath = getStartPath(app);

  return (
    <section className="cinematic-hero">
      <div aria-hidden="true" className="cinematic-blob cinematic-blob-a" />
      <div aria-hidden="true" className="cinematic-blob cinematic-blob-b" />
      <div aria-hidden="true" className="cinematic-blob cinematic-blob-c" />

      <div className="cinematic-hero-inner">
      <div className="cinematic-hero-copy">
        <motion.div
          className="hero-badge"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <span>✦</span> Nền tảng học ngôn ngữ thế hệ mới
        </motion.div>

        <h1 className="cinematic-title" aria-label="Chinh phục ngôn ngữ theo cách của bạn">
          {HERO_WORDS.map((word, index) => (
            <motion.span
              className={index >= 4 ? "cinematic-title-word cinematic-title-gradient" : "cinematic-title-word"}
              initial={{ opacity: 0, y: 42 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.08 + index * 0.065,
                duration: 0.58,
                ease: [0.16, 1, 0.3, 1],
              }}
              key={`${word}-${index}`}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          className="cinematic-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.68, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          Vmora kết hợp lộ trình thông minh, AI ôn luyện và cộng đồng sôi nổi, giúp bạn tiến bộ rõ rệt mỗi ngày.
        </motion.p>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.78, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="hero-primary-cluster">
            <motion.button
              className="hero-cta-primary"
              whileHover={{ scale: 1.05, boxShadow: "0 18px 42px rgba(99, 102, 241, 0.38)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(startPath)}
              type="button"
            >
              {app.user ? "Vào học ngay" : "Bắt đầu miễn phí"}
            </motion.button>
            <span className="hero-actions-note">5 ngôn ngữ đang mở</span>
          </div>
          {!app.user ? (
            <motion.button
              className="hero-cta-secondary"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/dang-nhap")}
              type="button"
            >
              Đăng nhập
            </motion.button>
          ) : null}
        </motion.div>
      </div>

      <LanguageCards languages={languages} />
      </div>
    </section>
  );
}

export function LanguageCards({ languages }) {
  return (
    <section className="cinematic-language-section">
      <motion.div
        className="language-showcase-grid"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      >
        {languages.map((item) => (
          <motion.article
            className="language-showcase-card cinematic-flag-card"
            key={item.code}
            variants={{
              hidden: { opacity: 0, y: 38 },
              show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
            }}
            whileHover={{ y: -6, scale: 1.03 }}
          >
            <div className="language-showcase-flag-wrap">
              <img alt={item.label} className="language-showcase-flag" src={item.image} />
            </div>
            <div className="language-showcase-meta">
              <strong>{item.label}</strong>
              <span>{item.sub}</span>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}

export function StatsSection() {
  return (
    <section className="cinematic-stats-section">
      <SectionHead eyebrow="Học thật, tiến bộ thật" title="Vmora giúp người học bám được nhịp mỗi ngày" />
      <div className="cinematic-testimonial-grid">
        {TESTIMONIALS.map((item) => (
          <motion.article
            className="home-proof-card cinematic-proof-card"
            key={item.name}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <p>{item.quote}</p>
            <strong>{item.name}</strong>
            <span>{item.role}</span>
          </motion.article>
        ))}
      </div>
      <div className="cinematic-stat-grid">
        {STATS.map((item) => (
          <article className="home-impact-card cinematic-impact-card" key={item.label}>
            <strong><CountUp end={item.value} suffix={item.suffix} /></strong>
            <span>{item.label}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export function RoadmapPreviewSection({ app }) {
  const navigate = useNavigate();
  return (
    <section className="cinematic-roadmap-section">
      <SectionHead eyebrow="Demo lộ trình mẫu" title="Xem trước 7 ngày đầu học trên Vmora" />
      <div className="home-roadmap-layout">
        <div className="home-roadmap-list">
          {ROADMAP_PREVIEW.map(([day, title, detail]) => (
            <motion.article
              className="home-roadmap-step"
              key={day}
              initial={{ opacity: 0, x: -36 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="home-roadmap-day">{day}</span>
              <div>
                <h3>{title}</h3>
                <p>{detail}</p>
              </div>
            </motion.article>
          ))}
        </div>
        <motion.aside
          className="home-roadmap-highlight"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="eyebrow">Điểm khác biệt</p>
          <h3>Không chỉ học bài, mà còn giữ được đà học</h3>
          <p>Lộ trình, AI, cộng đồng và bảng xếp hạng được nối chung trong một flow.</p>
          <motion.button
            className="hero-cta-primary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(getStartPath(app))}
            type="button"
          >
            {app.user ? "Vào học ngay" : "Bắt đầu miễn phí"}
          </motion.button>
        </motion.aside>
      </div>
    </section>
  );
}

export function TimelineSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 70%", "end 70%"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section className="features-section cinematic-timeline-section" ref={ref}>
      <SectionHead eyebrow="Bản đồ tính năng" title="Khám phá Vmora" />
      <div className="features-timeline cinematic-timeline">
        <motion.span className="cinematic-timeline-line" style={{ scaleY: lineScale }} />
        {FEATURE_TIMELINE.map((feat, index) => {
          const isLeft = index % 2 === 0;
          return (
            <motion.div
              className={isLeft ? "timeline-row timeline-row-left" : "timeline-row timeline-row-right"}
              initial={{ opacity: 0, x: isLeft ? -60 : 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-90px" }}
              transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
              key={feat.key}
            >
              {isLeft ? <FeatureCard feat={feat} /> : <div aria-hidden="true" className="timeline-side timeline-side-empty" />}
              <div className="timeline-center">
                <motion.span
                  className="timeline-dot"
                  initial={{ scale: 0.55, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              {!isLeft ? <FeatureCard feat={feat} /> : <div aria-hidden="true" className="timeline-side timeline-side-empty" />}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function FeatureCard({ feat }) {
  return (
    <div className="timeline-side">
      <article className={`timeline-card timeline-card-${feat.accent}`}>
        <div className="timeline-card-trigger">
          <div className="timeline-card-topline">
            <span className="timeline-icon">{feat.icon}</span>
          </div>
          <h3 className="timeline-title">{feat.title}</h3>
          <p className="timeline-desc">{feat.desc}</p>
        </div>
      </article>
    </div>
  );
}

export function FaqSection() {
  return (
    <section className="home-faq-section">
      <SectionHead eyebrow="FAQ" title="Những điều người mới thường hỏi trước khi bắt đầu" />
      <div className="home-faq-list">
        {FAQS.map(([question, answer]) => (
          <details className="home-faq-item" key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function VmoraLanding({ app, languages }) {
  return (
    <motion.div
      className="cinematic-page"
      initial="hidden"
      animate="show"
      variants={pageVariants}
    >
      <HeroSection app={app} languages={languages} />
      <StatsSection />
      <RoadmapPreviewSection app={app} />
      <FaqSection />
      <TimelineSection />
    </motion.div>
  );
}
