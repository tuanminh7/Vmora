import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { getSkillPracticeActivities } from "../practiceAdmin";
import { getAdminVocabularyTopics } from "./adminAdapter";
import { useVocabularyStore } from "./store";
import { getLessonContext, speakVocabularyText } from "./helpers";
import "./vocabulary.css";

export default function VocabularyFlashcardPage({ app }) {
  const { lessonId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const topics = useVocabularyStore((state) => state.topics);
  const currentLanguage = useVocabularyStore((state) => state.currentLanguage);
  const currentSession = useVocabularyStore((state) => state.currentSession);
  const setLanguage = useVocabularyStore((state) => state.setLanguage);
  const startSession = useVocabularyStore((state) => state.startSession);
  const setSessionIndex = useVocabularyStore((state) => state.setSessionIndex);
  const recordFlashcardResult = useVocabularyStore((state) => state.recordFlashcardResult);
  const finishSession = useVocabularyStore((state) => state.finishSession);
  const resetSession = useVocabularyStore((state) => state.resetSession);
  const [isFlipped, setIsFlipped] = useState(false);
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

  useEffect(() => {
    if (!lessonContext) {
      return undefined;
    }

    startSession({
      topicId: lessonContext.topic.id,
      lessonId: lessonContext.lesson.id,
      mode: "flashcard",
    });
    setIsFlipped(false);

    return () => {
      resetSession();
    };
  }, [lessonContext, resetSession, startSession]);

  useEffect(() => {
    setIsFlipped(false);
  }, [currentSession.currentIndex]);

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
            <p className="vmora-vocab-eyebrow">Flashcard</p>
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
  const currentWordId = currentSession.wordOrder[currentSession.currentIndex];
  const currentWord = lesson.words.find((word) => word.id === currentWordId) ?? lesson.words[0];
  const totalCards = lesson.words.length;
  const completed = currentSession.result.completed;
  const learnedCount = currentSession.result.correctWordIds.length;
  const unlearnedCount = currentSession.result.wrongWordIds.length;

  function handleFlip() {
    setIsFlipped((current) => !current);
  }

  function handleMark(remembered) {
    if (!currentWord || completed) {
      return;
    }

    recordFlashcardResult(currentWord.id, remembered);

    if (currentSession.currentIndex >= totalCards - 1) {
      finishSession();
      return;
    }

    setSessionIndex(currentSession.currentIndex + 1);
  }

  if (completed) {
    return (
      <section className="vmora-vocab-page">
        <div className="vmora-vocab-wrap">
          <div className="vmora-vocab-session-shell">
            <p className="vmora-vocab-eyebrow">{topic.label}</p>
            <h1 className="vmora-vocab-detail-title">Hoàn tất flashcard</h1>
            <div className="vmora-vocab-summary-grid">
              <article className="vmora-vocab-summary-card">
                <span>Đã thuộc</span>
                <strong>{learnedCount}</strong>
              </article>
              <article className="vmora-vocab-summary-card">
                <span>Chưa thuộc</span>
                <strong>{unlearnedCount}</strong>
              </article>
            </div>

            <div className="vmora-vocab-list-card">
              <h2 className="vmora-vocab-list-title">Từ cần ôn lại</h2>
              {currentSession.result.wrongWordIds.length ? (
                <div className="vmora-vocab-summary-list">
                  {currentSession.result.wrongWordIds.map((wordId) => {
                    const word = lesson.words.find((entry) => entry.id === wordId);

                    if (!word) {
                      return null;
                    }

                    return (
                      <p key={wordId}>
                        {word.hanzi} - {word.pinyin} - {word.meaning}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p className="vmora-vocab-detail-copy">Không có từ nào bị đánh dấu là chưa thuộc.</p>
              )}
            </div>

            <div className="vmora-vocab-detail-actions">
              <Link className="vmora-vocab-link-button vmora-vocab-link-button-muted" to={`/luyen-tu-vung${location.search}`}>
                Về danh sách chủ đề
              </Link>
              <button
                className="vmora-vocab-link-button"
                onClick={() => navigate(`/luyen-tu-vung/${lesson.id}/trac-nghiem${location.search}`)}
                type="button"
              >
                Sang trắc nghiệm
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="vmora-vocab-page">
      <div className="vmora-vocab-wrap">
        <div className="vmora-vocab-session-shell">
          <div className="vmora-vocab-session-head">
            <div>
              <p className="vmora-vocab-eyebrow">{topic.label}</p>
              <h1 className="vmora-vocab-detail-title">{lesson.title}</h1>
            </div>
            <Link className="vmora-vocab-link-button vmora-vocab-link-button-muted" to={`/luyen-tu-vung/${lesson.id}/xem${location.search}`}>
              Xem danh sách
            </Link>
          </div>

          <div className="vmora-vocab-progress-block">
            <div className="vmora-vocab-progress-copy">
              <span>
                {Math.min(currentSession.currentIndex + 1, totalCards)}/{totalCards} thẻ
              </span>
              <strong>Chạm để lật, kéo ngang trên mobile</strong>
            </div>
            <div className="vmora-vocab-progress-track">
              <div
                className="vmora-vocab-progress-bar"
                style={{ width: `${((currentSession.currentIndex + 1) / totalCards) * 100}%` }}
              />
            </div>
          </div>

          <div className="vmora-vocab-flip-stage">
            <motion.div
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              className="vmora-vocab-flip-card"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onClick={handleFlip}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 60) {
                  setIsFlipped((current) => !current);
                }
              }}
              style={{ transformStyle: "preserve-3d" }}
              transition={{ duration: 0.55, ease: "easeInOut" }}
            >
              <div className="vmora-vocab-flip-face vmora-vocab-flip-front">
                <p className="vmora-vocab-flip-hanzi">{currentWord?.hanzi}</p>
                <p className="vmora-vocab-flip-pinyin">{currentWord?.pinyin}</p>
                <button
                  className="vmora-vocab-pill-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    speakVocabularyText(currentWord?.hanzi ?? "", currentLanguage);
                  }}
                  type="button"
                >
                  Phát âm
                </button>
              </div>

              <div className="vmora-vocab-flip-face vmora-vocab-flip-back">
                <p className="vmora-vocab-flip-meaning">{currentWord?.meaning}</p>
                {currentWord?.example ? <p className="vmora-vocab-flip-example">{currentWord.example}</p> : null}
                <button
                  className="vmora-vocab-pill-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    speakVocabularyText(currentWord?.hanzi ?? "", currentLanguage);
                  }}
                  type="button"
                >
                  Nghe lại
                </button>
              </div>
            </motion.div>
          </div>

          {isFlipped ? (
            <div className="vmora-vocab-answer-actions">
                <button className="vmora-vocab-answer-button vmora-vocab-answer-button-wrong" onClick={() => handleMark(false)} type="button">
                Chưa thuộc
              </button>
              <button className="vmora-vocab-answer-button vmora-vocab-answer-button-right" onClick={() => handleMark(true)} type="button">
                Đã thuộc
              </button>
            </div>
          ) : (
            <p className="vmora-vocab-session-tip">Lật thẻ để xem nghĩa và ví dụ trước khi chấm kết quả.</p>
          )}
        </div>
      </div>
    </section>
  );
}
