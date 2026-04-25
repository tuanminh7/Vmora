import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { countPracticeLessons, countPracticeTopics, getActivityTypePracticeActivities } from "../practiceAdmin";
import { getAdminListeningTopicsByType } from "./adminAdapter";
import { getListeningActivityMeta } from "./helpers";
import { useListeningStore } from "./store";
import "./listening.css";

const LESSONS_PER_PAGE = 8;
const DIFFICULTY_ORDER = { "Cơ bản": 1, "Trung cấp": 2, "Nâng cao": 3 };

function getLessonDifficulty(lesson) {
  const ranked = lesson.exercises.reduce(
    (current, exercise) => (DIFFICULTY_ORDER[exercise.difficulty] > DIFFICULTY_ORDER[current] ? exercise.difficulty : current),
    lesson.exercises[0]?.difficulty ?? "Cơ bản",
  );

  return ranked;
}

function getLessonProgressMeta(lesson, progress) {
  const totalExercises = lesson.exercises.length;
  const completedExercises = lesson.exercises.filter((exercise) => (progress[exercise.id]?.status ?? "pending") !== "pending").length;
  const correctExercises = lesson.exercises.filter((exercise) => progress[exercise.id]?.status === "correct").length;
  const progressPercent = totalExercises ? Math.round((completedExercises / totalExercises) * 100) : 0;
  const status =
    completedExercises === 0 ? "not_started" : completedExercises < totalExercises ? "in_progress" : "completed";

  return {
    totalExercises,
    completedExercises,
    correctExercises,
    progressPercent,
    status,
  };
}

function ListeningLessonRow({ activityPath, lesson, location, progress }) {
  const navigate = useNavigate();
  const { totalExercises, completedExercises, correctExercises, progressPercent } = getLessonProgressMeta(lesson, progress);
  const difficulty = getLessonDifficulty(lesson);

  return (
    <article className="vmora-listening-lesson-row">
      <div className="vmora-listening-lesson-row-main">
        <div className="vmora-listening-lesson-row-copy">
          <h3>{lesson.title}</h3>
        </div>

        <div className="vmora-listening-lesson-row-meta">
          <span>{difficulty}</span>
          <span>{totalExercises} câu</span>
          <span>{correctExercises} đúng</span>
          <span>{completedExercises}/{totalExercises} đã làm</span>
        </div>
      </div>

      <div className="vmora-listening-lesson-row-actions">
        <div className="vmora-listening-lesson-progress vmora-listening-lesson-progress-compact">
          <div className="vmora-listening-progress-track">
            <div className="vmora-listening-progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <button className="vmora-listening-primary" onClick={() => navigate(`${activityPath}/${lesson.id}${location.search}`)} type="button">Vào bài học</button>
      </div>
    </article>
  );
}

export default function ListeningLessonsPage({ activityType, app }) {
  const location = useLocation();
  const progress = useListeningStore((state) => state.progress);
  const setLanguage = useListeningStore((state) => state.setLanguage);
  const languageCode = app.user?.learning_language_code ?? app.selectedLanguage ?? "zh";
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [query, setQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("title_asc");
  const [page, setPage] = useState(1);
  const meta = getListeningActivityMeta(activityType);
  const adminListeningActivities = useMemo(
    () => getActivityTypePracticeActivities(app, location.search, "listening", activityType),
    [activityType, app, location.search],
  );
  const adminTopics = useMemo(() => getAdminListeningTopicsByType(adminListeningActivities, activityType, languageCode), [activityType, adminListeningActivities, languageCode]);
  const topics = useMemo(() => adminTopics, [adminTopics]);
  const adminTopicCount = countPracticeTopics(adminListeningActivities);
  const adminLessonCount = countPracticeLessons(adminListeningActivities);

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
  const totalLessons = topics.reduce((count, topic) => count + topic.lessons.length, 0);
  const totalExercises = topics.reduce(
    (count, topic) => count + topic.lessons.reduce((lessonCount, lesson) => lessonCount + lesson.exercises.length, 0),
    0,
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredLessons = useMemo(() => {
    if (!selectedTopic) {
      return [];
    }

    const nextLessons = selectedTopic.lessons.filter((lesson) => {
      const lessonText = `${lesson.title} ${lesson.description}`.toLowerCase();
      const lessonDifficulty = getLessonDifficulty(lesson);
      const lessonProgress = getLessonProgressMeta(lesson, progress);
      const queryMatch = !normalizedQuery || lessonText.includes(normalizedQuery);
      const difficultyMatch = difficultyFilter === "all" || lessonDifficulty === difficultyFilter;
      const statusMatch = statusFilter === "all" || lessonProgress.status === statusFilter;

      return queryMatch && difficultyMatch && statusMatch;
    });

    return [...nextLessons].sort((left, right) => {
      if (sortBy === "difficulty_desc") {
        return DIFFICULTY_ORDER[getLessonDifficulty(right)] - DIFFICULTY_ORDER[getLessonDifficulty(left)];
      }

      if (sortBy === "progress_desc") {
        return getLessonProgressMeta(right, progress).progressPercent - getLessonProgressMeta(left, progress).progressPercent;
      }

      return left.title.localeCompare(right.title);
    });
  }, [difficultyFilter, normalizedQuery, progress, selectedTopic, sortBy, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [difficultyFilter, normalizedQuery, selectedTopicId, sortBy, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredLessons.length / LESSONS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pagedLessons = filteredLessons.slice((currentPage - 1) * LESSONS_PER_PAGE, currentPage * LESSONS_PER_PAGE);
  const topicExercises = selectedTopic?.lessons.flatMap((lesson) => lesson.exercises) ?? [];
  const topicCompleted = topicExercises.filter((exercise) => (progress[exercise.id]?.status ?? "pending") !== "pending").length;
  const filterActive = normalizedQuery || difficultyFilter !== "all" || statusFilter !== "all" || sortBy !== "title_asc";

  if (!adminListeningActivities.length) {
    return (
      <section className="vmora-listening-page">
        <div className="vmora-listening-wrap">
          <div className="vmora-listening-empty">
            <p className="vmora-listening-kicker">Luyện nghe</p>
            <h1>Admin chưa mở bài cho hoạt động này</h1>
          </div>
        </div>
      </section>
    );
  }

  if (!topics.length) {
    return (
      <section className="vmora-listening-page">
        <div className="vmora-listening-wrap">
          <div className="vmora-listening-empty">
            <p className="vmora-listening-kicker">Luyện nghe</p>
            <h1>Payload bài nghe chưa đúng format</h1>
          </div>
        </div>
      </section>
    );
  }

  if (!selectedTopic) {
    return (
      <section className="vmora-listening-page">
        <div className="vmora-listening-wrap">
          <div className="vmora-listening-empty">
            <p className="vmora-listening-kicker">Luyện nghe</p>
            <h1>Chưa có chủ đề cho hoạt động này</h1>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="vmora-listening-page">
      <div className="vmora-listening-wrap">
        <header className="vmora-listening-hero">
          <p className="vmora-listening-kicker">Luyện nghe</p>
          <h1>{meta.title}</h1>
          <div className="vmora-listening-hero-meta">
            <span>{adminTopicCount} chủ đề admin</span>
            <span>{adminLessonCount} bài học admin</span>
            <span>{totalExercises} câu luyện</span>
          </div>
        </header>

        <section className="vmora-listening-browser">
          <div className="vmora-listening-browser-toolbar">
            <div className="vmora-listening-topic-tabs" role="tablist">
              {topics.map((topic) => (
                <button
                  aria-selected={selectedTopic.id === topic.id}
                  className={selectedTopic.id === topic.id ? "vmora-listening-topic-pill is-active" : "vmora-listening-topic-pill"}
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  type="button"
                >
                  <strong>{topic.label}</strong>
                  <span>{topic.lessons.length} bài</span>
                </button>
              ))}
            </div>

            <label className="vmora-listening-search">
              <span>Tìm bài học</span>
              <input onChange={(event) => setQuery(event.target.value)} placeholder="Nhập tên bài học..." type="search" value={query} />
            </label>
          </div>

          <div className="vmora-listening-filters">
            <label className="vmora-listening-filter">
              <span>Cấp độ</span>
              <select onChange={(event) => setDifficultyFilter(event.target.value)} value={difficultyFilter}>
                <option value="all">Tất cả</option>
                <option value="Cơ bản">Cơ bản</option>
                <option value="Trung cấp">Trung cấp</option>
                <option value="Nâng cao">Nâng cao</option>
              </select>
            </label>

            <label className="vmora-listening-filter">
              <span>Trạng thái</span>
              <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                <option value="all">Tất cả</option>
                <option value="not_started">Chưa học</option>
                <option value="in_progress">Đang học</option>
                <option value="completed">Đã xong</option>
              </select>
            </label>

            <label className="vmora-listening-filter">
              <span>Sắp xếp</span>
              <select onChange={(event) => setSortBy(event.target.value)} value={sortBy}>
                <option value="title_asc">Tên bài học</option>
                <option value="difficulty_desc">Cấp độ giảm dần</option>
                <option value="progress_desc">Tiến độ giảm dần</option>
              </select>
            </label>

            {filterActive ? (
              <button
                className="vmora-listening-ghost"
                onClick={() => {
                  setQuery("");
                  setDifficultyFilter("all");
                  setStatusFilter("all");
                  setSortBy("title_asc");
                }}
                type="button"
              >
                Xóa lọc
              </button>
            ) : null}
          </div>

          <div className="vmora-listening-browser-head">
            <div>
              <span className="vmora-listening-topic-label">{selectedTopic.label}</span>
              <h2>{selectedTopic.title}</h2>
            </div>
            <div className="vmora-listening-browser-stats">
              <span>{selectedTopic.lessons.length} bài học</span>
              <span>{topicCompleted}/{topicExercises.length} câu đã làm</span>
              <span>{filteredLessons.length} kết quả hiển thị</span>
            </div>
          </div>

          <div className="vmora-listening-lesson-list">
            {pagedLessons.length ? (
              pagedLessons.map((lesson) => (
                <ListeningLessonRow activityPath={meta.path} key={lesson.id} lesson={lesson} location={location} progress={progress} />
              ))
            ) : (
              <div className="vmora-listening-empty vmora-listening-empty-inline">
                <h1>Không tìm thấy bài học phù hợp</h1>
              </div>
            )}
          </div>

          {filteredLessons.length > LESSONS_PER_PAGE ? (
            <div className="vmora-listening-pagination">
              <button className="vmora-listening-ghost" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">
                Trang trước
              </button>
              <span>
                Trang {currentPage}/{pageCount}
              </span>
              <button
                className="vmora-listening-ghost"
                disabled={currentPage === pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                type="button"
              >
                Trang sau
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
