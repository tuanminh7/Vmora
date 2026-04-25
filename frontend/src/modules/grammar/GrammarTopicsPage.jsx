import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { countPracticeLessons, countPracticeTopics, getSkillPracticeActivities } from "../practiceAdmin";
import { getAdminGrammarTopics } from "./adminAdapter";
import { getGrammarDifficultyClass } from "./helpers";
import { useGrammarStore } from "./store";
import "./grammar.css";

const LESSONS_PER_PAGE = 8;

function GrammarLessonRow({ lesson, progress }) {
  const navigate = useNavigate();
  const location = useLocation();
  const lessonProgress = progress[lesson.id];
  const completedCopy = lessonProgress?.completed
    ? `${lessonProgress.correctCount}/${lesson.questions.length} đúng`
    : `0/${lesson.questions.length} đúng`;

  return (
    <article className="vmora-grammar-lesson-row">
      <div className="vmora-grammar-lesson-row-copy">
        <div className="vmora-grammar-lesson-row-top">
          <span className={getGrammarDifficultyClass(lesson.difficulty)}>{lesson.difficulty}</span>
          <strong>{lesson.title}</strong>
        </div>
        <div className="vmora-grammar-lesson-row-meta">
          <span>{lesson.questions.length} câu hỏi</span>
          <span>{completedCopy}</span>
        </div>
      </div>

      <button className="vmora-grammar-primary" onClick={() => navigate(`/ngu-phap/${lesson.id}${location.search}`)} type="button">
        Vào bài học
      </button>
    </article>
  );
}

export default function GrammarTopicsPage({ app }) {
  const location = useLocation();
  const progress = useGrammarStore((state) => state.progress);
  const setLanguage = useGrammarStore((state) => state.setLanguage);
  const languageCode = app.user?.learning_language_code ?? app.selectedLanguage ?? "zh";
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const adminGrammarActivities = useMemo(() => getSkillPracticeActivities(app, location.search, "grammar"), [app, location.search]);
  const adminTopics = useMemo(() => getAdminGrammarTopics(adminGrammarActivities), [adminGrammarActivities]);
  const topics = useMemo(() => adminTopics, [adminTopics]);

  useEffect(() => {
    setLanguage(languageCode);
  }, [languageCode, setLanguage]);

  useEffect(() => {
    if (!topics.length) {
      setSelectedTopicId("");
      return;
    }

    setSelectedTopicId((current) => (topics.some((topic) => topic.id === current) ? current : topics[0].id));
  }, [topics]);

  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) ?? topics[0] ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredLessons = useMemo(() => {
    if (!selectedTopic) {
      return [];
    }

    if (!normalizedQuery) {
      return selectedTopic.lessons;
    }

    return selectedTopic.lessons.filter((lesson) => `${lesson.title} ${lesson.description}`.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, selectedTopic]);

  useEffect(() => {
    setPage(1);
  }, [normalizedQuery, selectedTopicId]);

  const pageCount = Math.max(1, Math.ceil(filteredLessons.length / LESSONS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pagedLessons = filteredLessons.slice((currentPage - 1) * LESSONS_PER_PAGE, currentPage * LESSONS_PER_PAGE);
  const totalLessons = topics.reduce((count, topic) => count + topic.lessons.length, 0);
  const totalQuestions = topics.reduce((count, topic) => count + topic.lessons.reduce((sum, lesson) => sum + lesson.questions.length, 0), 0);
  const adminTopicCount = countPracticeTopics(adminGrammarActivities);
  const adminLessonCount = countPracticeLessons(adminGrammarActivities);
  const hasAdminGrammar = adminGrammarActivities.length > 0;

  if (!hasAdminGrammar) {
    return (
      <section className="vmora-grammar-page">
        <div className="vmora-grammar-wrap">
          <div className="vmora-grammar-empty">
            <p className="vmora-grammar-kicker">Ngữ pháp</p>
            <h1>Admin chưa mở bài ngữ pháp cho nhánh này</h1>
          </div>
        </div>
      </section>
    );
  }

  if (!selectedTopic) {
    return (
      <section className="vmora-grammar-page">
        <div className="vmora-grammar-wrap">
          <div className="vmora-grammar-empty">
            <p>{hasAdminGrammar ? "Bài ngữ pháp admin chưa đúng format" : "Chưa có chủ đề ngữ pháp"}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="vmora-grammar-page">
      <div className="vmora-grammar-wrap">
        <header className="vmora-grammar-hero">
          <p className="vmora-grammar-kicker">Ngữ pháp</p>
          <h1>Ngữ pháp</h1>
          <div className="vmora-grammar-hero-meta">
            <span>{adminTopicCount} chủ đề admin</span>
            <span>{adminLessonCount} bài học admin</span>
            <span>{totalQuestions} câu hỏi</span>
          </div>
        </header>

        <section className="vmora-grammar-browser">
          <div className="vmora-grammar-browser-toolbar">
            <div className="vmora-grammar-topic-pills">
              {topics.map((topic) => (
                <button
                  className={selectedTopic.id === topic.id ? "vmora-grammar-topic-pill is-active" : "vmora-grammar-topic-pill"}
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  type="button"
                >
                  <strong>{topic.label}</strong>
                  <span>{topic.lessons.length} bài</span>
                </button>
              ))}
            </div>

            <label className="vmora-grammar-search">
              <span>Tìm bài học</span>
              <input onChange={(event) => setQuery(event.target.value)} placeholder="Nhập tên bài..." type="search" value={query} />
            </label>
          </div>

          <div className="vmora-grammar-browser-head">
            <div>
              <span className="vmora-grammar-topic-label">{selectedTopic.label}</span>
              <h2>{selectedTopic.title}</h2>
            </div>
            <div className="vmora-grammar-browser-stats">
              <span>{selectedTopic.lessons.length} bài học</span>
              <span>{filteredLessons.length} kết quả</span>
            </div>
          </div>

          <div className="vmora-grammar-lesson-list">
            {pagedLessons.map((lesson) => (
              <GrammarLessonRow key={lesson.id} lesson={lesson} progress={progress} />
            ))}
          </div>

          {filteredLessons.length > LESSONS_PER_PAGE ? (
            <div className="vmora-grammar-pagination">
              <button className="vmora-grammar-ghost" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">
                Trang trước
              </button>
              <span>
                Trang {currentPage}/{pageCount}
              </span>
              <button className="vmora-grammar-ghost" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button">
                Trang sau
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
