import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { countPracticeLessons, countPracticeTopics, getSkillPracticeActivities } from "../practiceAdmin";
import { getAdminVocabularyTopics } from "./adminAdapter";
import { useVocabularyStore } from "./store";
import "./vocabulary.css";

const LESSONS_PER_PAGE = 8;

function getWordStatusMeta(status) {
  if (status === "mastered") {
    return { label: "Đã thuộc", className: "vmora-vocab-status vmora-vocab-status-mastered" };
  }

  if (status === "learning") {
    return { label: "Đang học", className: "vmora-vocab-status vmora-vocab-status-learning" };
  }

  return { label: "Từ mới", className: "vmora-vocab-status vmora-vocab-status-new" };
}

function VocabularyLessonRow({ lesson, progress }) {
  const lessonWords = lesson.words;
  const completedWords = lessonWords.filter((word) => (progress[word.id]?.status ?? word.status) !== "new").length;
  const masteredWords = lessonWords.filter((word) => (progress[word.id]?.status ?? word.status) === "mastered").length;
  const totalWords = lessonWords.length;
  const progressPercent = totalWords ? Math.round((completedWords / totalWords) * 100) : 0;
  const previewWords = lessonWords.slice(0, 4);
  const navigate = useNavigate();

  return (
    <article className="vmora-vocab-lesson-row">
      <div className="vmora-vocab-lesson-row-main">
        <div className="vmora-vocab-lesson-row-copy">
          <h3 className="vmora-vocab-lesson-title">{lesson.title}</h3>
          <div className="vmora-vocab-lesson-row-preview">
            {previewWords.map((word) => {
              const statusMeta = getWordStatusMeta(progress[word.id]?.status ?? word.status);

              return (
                <span className="vmora-vocab-lesson-chip" key={word.id}>
                  <strong>{word.hanzi}</strong>
                  <small>{statusMeta.label}</small>
                </span>
              );
            })}
          </div>
        </div>

        <div className="vmora-vocab-lesson-row-meta">
          <span>{totalWords} từ</span>
          <span>{completedWords}/{totalWords} đang học</span>
          <span>{masteredWords} đã thuộc</span>
        </div>
      </div>

      <div className="vmora-vocab-lesson-row-side">
        <div className="vmora-vocab-progress-block vmora-vocab-progress-block-compact">
          <div className="vmora-vocab-progress-track">
            <div className="vmora-vocab-progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="vmora-vocab-lesson-actions">
          <button className="vmora-vocab-button vmora-vocab-button-primary" onClick={() => navigate(`/luyen-tu-vung/${lesson.id}/xem`)} type="button">
            Xem
          </button>
          <button className="vmora-vocab-button vmora-vocab-button-muted" onClick={() => navigate(`/luyen-tu-vung/${lesson.id}/lat-the`)} type="button">
            Lật thẻ
          </button>
          <button className="vmora-vocab-button vmora-vocab-button-muted" onClick={() => navigate(`/luyen-tu-vung/${lesson.id}/trac-nghiem`)} type="button">
            Trắc nghiệm
          </button>
        </div>
      </div>
    </article>
  );
}

export default function VocabularyTopicsPage({ app }) {
  const location = useLocation();
  const topics = useVocabularyStore((state) => state.topics);
  const progress = useVocabularyStore((state) => state.progress);
  const setLanguage = useVocabularyStore((state) => state.setLanguage);
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("title_asc");
  const [page, setPage] = useState(1);
  const adminVocabularyActivities = useMemo(() => getSkillPracticeActivities(app, location.search, "vocabulary"), [app, location.search]);
  const adminTopics = useMemo(() => getAdminVocabularyTopics(adminVocabularyActivities), [adminVocabularyActivities]);

  useEffect(() => {
    setLanguage(app.user?.learning_language_code ?? app.selectedLanguage ?? "zh", adminVocabularyActivities.length ? adminTopics : undefined);
  }, [adminTopics, adminVocabularyActivities.length, app.selectedLanguage, app.user?.learning_language_code, setLanguage]);

  useEffect(() => {
    if (!topics.length) return;

    setSelectedTopicId((current) => {
      if (topics.some((topic) => topic.id === current)) {
        return current;
      }

      return topics[0].id;
    });
  }, [topics]);

  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) ?? topics[0] ?? null;

  const filteredLessons = useMemo(() => {
    if (!selectedTopic) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const nextLessons = selectedTopic.lessons.filter((lesson) => {
      const lessonText = `${lesson.title} ${lesson.words.map((word) => `${word.hanzi} ${word.meaning}`).join(" ")}`.toLowerCase();
      const learnedWords = lesson.words.filter((word) => (progress[word.id]?.status ?? word.status) !== "new").length;
      const masteredWords = lesson.words.filter((word) => (progress[word.id]?.status ?? word.status) === "mastered").length;
      const queryMatch = !normalizedQuery || lessonText.includes(normalizedQuery);
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "new" && learnedWords === 0) ||
        (statusFilter === "learning" && learnedWords > 0 && masteredWords < lesson.words.length) ||
        (statusFilter === "mastered" && masteredWords === lesson.words.length);

      return queryMatch && statusMatch;
    });

    return [...nextLessons].sort((left, right) => {
      if (sortBy === "progress_desc") {
        const leftLearned = left.words.filter((word) => (progress[word.id]?.status ?? word.status) !== "new").length;
        const rightLearned = right.words.filter((word) => (progress[word.id]?.status ?? word.status) !== "new").length;
        return rightLearned - leftLearned;
      }

      if (sortBy === "words_desc") {
        return right.words.length - left.words.length;
      }

      return left.title.localeCompare(right.title);
    });
  }, [progress, query, selectedTopic, sortBy, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, selectedTopicId, sortBy, statusFilter]);

  const totalLessons = topics.reduce((count, topic) => count + topic.lessons.length, 0);
  const totalWords = topics.reduce((count, topic) => count + topic.lessons.reduce((sum, lesson) => sum + lesson.words.length, 0), 0);
  const learnedWords = topics.reduce(
    (count, topic) =>
      count +
      topic.lessons.reduce(
        (sum, lesson) => sum + lesson.words.filter((word) => (progress[word.id]?.status ?? word.status) !== "new").length,
        0,
      ),
    0,
  );
  const topicWords = selectedTopic?.lessons.reduce((count, lesson) => count + lesson.words.length, 0) ?? 0;
  const pageCount = Math.max(1, Math.ceil(filteredLessons.length / LESSONS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pagedLessons = filteredLessons.slice((currentPage - 1) * LESSONS_PER_PAGE, currentPage * LESSONS_PER_PAGE);
  const hasFilter = query.trim() || statusFilter !== "all" || sortBy !== "title_asc";
  const adminTopicCount = countPracticeTopics(adminVocabularyActivities);
  const adminLessonCount = countPracticeLessons(adminVocabularyActivities);
  const hasAdminVocabulary = adminVocabularyActivities.length > 0;

  if (!hasAdminVocabulary) {
    return (
      <section className="vmora-vocab-page">
        <div className="vmora-vocab-empty">
          <p className="vmora-vocab-eyebrow">Luyện từ vựng</p>
          <h1>Admin chưa mở bài luyện từ vựng cho nhánh này</h1>
          <p>Cần tạo dữ liệu trong mục ôn luyện của admin để người học thấy bài học đúng theo hệ thống hiện tại.</p>
        </div>
      </section>
    );
  }

  if (!selectedTopic) {
    return (
      <section className="vmora-vocab-page">
        <div className="vmora-vocab-empty">
          <p className="vmora-vocab-eyebrow">Luyện từ vựng</p>
          <h1>{hasAdminVocabulary ? "Payload bài từ vựng chưa đúng format" : "Chưa có dữ liệu chủ đề"}</h1>
        </div>
      </section>
    );
  }

  return (
    <section className="vmora-vocab-page">
      <div className="vmora-vocab-wrap">
        <header className="vmora-vocab-hero">
          <h1 className="vmora-vocab-hero-title">Luyện từ vựng</h1>
          <div className="vmora-vocab-browser-stats vmora-vocab-browser-stats-hero">
            <span>{adminTopicCount} chủ đề admin</span>
            <span>{adminLessonCount} bài học admin</span>
            <span>{learnedWords}/{totalWords} từ đang học</span>
          </div>
        </header>

        <section className="vmora-vocab-browser">
          <div className="vmora-vocab-browser-toolbar">
            <div className="vmora-vocab-topic-pills" role="tablist">
              {topics.map((topic) => {
                const topicLearned = topic.lessons.reduce(
                  (count, lesson) =>
                    count + lesson.words.filter((word) => (progress[word.id]?.status ?? word.status) !== "new").length,
                  0,
                );

                return (
                  <button
                    className={selectedTopic.id === topic.id ? "vmora-vocab-topic-pill is-active" : "vmora-vocab-topic-pill"}
                    key={topic.id}
                    onClick={() => setSelectedTopicId(topic.id)}
                    type="button"
                  >
                    <strong>{topic.label}</strong>
                    <span>{topicLearned}/{topic.lessons.reduce((sum, lesson) => sum + lesson.words.length, 0)} từ</span>
                  </button>
                );
              })}
            </div>

            <label className="vmora-vocab-browser-search">
              <span>Tìm bài học</span>
              <input onChange={(event) => setQuery(event.target.value)} placeholder="Nhập tên bài hoặc từ vựng..." type="search" value={query} />
            </label>
          </div>

          <div className="vmora-vocab-browser-filters">
            <label className="vmora-vocab-browser-filter">
              <span>Trạng thái</span>
              <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                <option value="all">Tất cả</option>
                <option value="new">Chưa học</option>
                <option value="learning">Đang học</option>
                <option value="mastered">Đã thuộc</option>
              </select>
            </label>

            <label className="vmora-vocab-browser-filter">
              <span>Sắp xếp</span>
              <select onChange={(event) => setSortBy(event.target.value)} value={sortBy}>
                <option value="title_asc">Tên bài học</option>
                <option value="progress_desc">Tiến độ giảm dần</option>
                <option value="words_desc">Nhiều từ trước</option>
              </select>
            </label>

            {hasFilter ? (
              <button
                className="vmora-vocab-button vmora-vocab-button-muted"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                  setSortBy("title_asc");
                }}
                type="button"
              >
                Xóa lọc
              </button>
            ) : null}
          </div>

          <div className="vmora-vocab-browser-head">
            <div>
              <span className="vmora-vocab-topic-label">{selectedTopic.label}</span>
              <h2 className="vmora-vocab-topic-detail-title">{selectedTopic.title}</h2>
            </div>

            <div className="vmora-vocab-browser-stats">
              <span>{selectedTopic.lessons.length} bài học</span>
              <span>{topicWords} từ</span>
              <span>{filteredLessons.length} kết quả hiển thị</span>
            </div>
          </div>

          <div className="vmora-vocab-lesson-list">
            {pagedLessons.length ? (
              pagedLessons.map((lesson) => <VocabularyLessonRow key={lesson.id} lesson={lesson} progress={progress} />)
            ) : (
              <div className="vmora-vocab-empty vmora-vocab-empty-inline">
                <h1>Không tìm thấy bài học phù hợp</h1>
              </div>
            )}
          </div>

          {filteredLessons.length > LESSONS_PER_PAGE ? (
            <div className="vmora-vocab-browser-pagination">
              <button className="vmora-vocab-button vmora-vocab-button-muted" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">
                Trang trước
              </button>
              <span>
                Trang {currentPage}/{pageCount}
              </span>
              <button className="vmora-vocab-button vmora-vocab-button-muted" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button">
                Trang sau
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
