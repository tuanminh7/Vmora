import { useEffect, useMemo } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { getSkillPracticeActivities } from "../practiceAdmin";
import { getAdminVocabularyTopics } from "./adminAdapter";
import { useVocabularyStore } from "./store";
import { getLessonContext, speakVocabularyText } from "./helpers";
import "./vocabulary.css";

function LessonWordCard({ languageCode, word }) {
  return (
    <article className="vmora-vocab-detail-card">
      <div className="vmora-vocab-detail-main">
        <p className="vmora-vocab-detail-hanzi">{word.hanzi}</p>
        <div>
          <p className="vmora-vocab-detail-pinyin">{word.pinyin}</p>
          <p className="vmora-vocab-detail-meaning">{word.meaning}</p>
          {word.example ? <p className="vmora-vocab-detail-example">{word.example}</p> : null}
        </div>
      </div>

      <button className="vmora-vocab-pill-button" onClick={() => speakVocabularyText(word.hanzi, languageCode)} type="button">
        Phát âm
      </button>
    </article>
  );
}

export default function VocabularyLessonViewPage({ app }) {
  const { lessonId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const topics = useVocabularyStore((state) => state.topics);
  const currentLanguage = useVocabularyStore((state) => state.currentLanguage);
  const setLanguage = useVocabularyStore((state) => state.setLanguage);
  const adminVocabularyActivities = useMemo(() => getSkillPracticeActivities(app, location.search, "vocabulary"), [app, location.search]);
  const adminTopics = useMemo(() => getAdminVocabularyTopics(adminVocabularyActivities), [adminVocabularyActivities]);
  const hasAdminVocabulary = adminVocabularyActivities.length > 0;
  const lessonContext = useMemo(() => getLessonContext(topics, lessonId ?? ""), [lessonId, topics]);

  useEffect(() => {
    if (!hasAdminVocabulary) {
      return;
    }

    setLanguage(app.user?.learning_language_code ?? app.selectedLanguage ?? "zh", adminTopics);
  }, [adminTopics, app.selectedLanguage, app.user?.learning_language_code, hasAdminVocabulary, setLanguage]);

  if (!lessonId) {
    return <Navigate replace to={`/luyen-tu-vung${location.search}`} />;
  }

  if (!hasAdminVocabulary) {
    return <Navigate replace to={`/luyen-tu-vung${location.search}`} />;
  }

  if (!lessonContext) {
    return (
      <section className="vmora-vocab-page">
        <div className="vmora-vocab-wrap">
          <div className="vmora-vocab-empty">
            <p className="vmora-vocab-eyebrow">Luyện từ vựng</p>
            <h1>Không tìm thấy bài học</h1>
            <Link className="vmora-vocab-link-button" to={`/luyen-tu-vung${location.search}`}>
              Quay lại danh sách chủ đề
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const { topic, lesson } = lessonContext;

  return (
    <section className="vmora-vocab-page">
      <div className="vmora-vocab-wrap">
        <div className="vmora-vocab-detail-shell">
          <div className="vmora-vocab-detail-head">
            <div>
              <p className="vmora-vocab-eyebrow">{topic.label}</p>
              <h1 className="vmora-vocab-detail-title">{lesson.title}</h1>
            </div>

            <div className="vmora-vocab-detail-actions">
              <Link className="vmora-vocab-link-button vmora-vocab-link-button-muted" to={`/luyen-tu-vung${location.search}`}>
                Quay lại
              </Link>
              <button
                className="vmora-vocab-link-button"
                onClick={() => navigate(`/luyen-tu-vung/${lesson.id}/lat-the${location.search}`)}
                type="button"
              >
                Bắt đầu luyện tập
              </button>
            </div>
          </div>

          <div className="vmora-vocab-detail-grid">
            {lesson.words.map((word) => (
              <LessonWordCard key={word.id} languageCode={currentLanguage} word={word} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
