import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { getSkillPracticeActivities } from "../practiceAdmin";
import { getAdminVocabularyTopics } from "./adminAdapter";
import { useVocabularyStore } from "./store";
import { buildQuizQuestion, getLessonContext } from "./helpers";
import "./vocabulary.css";

export default function VocabularyQuizPage({ app }) {
  const { lessonId } = useParams();
  const location = useLocation();
  const topics = useVocabularyStore((state) => state.topics);
  const setLanguage = useVocabularyStore((state) => state.setLanguage);
  const currentSession = useVocabularyStore((state) => state.currentSession);
  const startSession = useVocabularyStore((state) => state.startSession);
  const setSessionIndex = useVocabularyStore((state) => state.setSessionIndex);
  const recordQuizAnswer = useVocabularyStore((state) => state.recordQuizAnswer);
  const finishSession = useVocabularyStore((state) => state.finishSession);
  const resetSession = useVocabularyStore((state) => state.resetSession);
  const [questionState, setQuestionState] = useState(null);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const nextTimerRef = useRef(null);
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
      mode: "quiz",
      shuffle: true,
    });

    return () => {
      if (nextTimerRef.current) {
        window.clearTimeout(nextTimerRef.current);
      }
      resetSession();
    };
  }, [lessonContext, resetSession, startSession]);

  const { lesson, topic } = lessonContext ?? {};
  const currentWordId = currentSession.wordOrder[currentSession.currentIndex];
  const currentWord = lesson?.words.find((word) => word.id === currentWordId) ?? null;
  const totalQuestions = lesson?.words.length ?? 0;

  useEffect(() => {
    if (!lesson || !currentWord || currentSession.result.completed) {
      return;
    }

    const nextType = currentSession.currentIndex % 2 === 0 ? "hanzi-to-meaning" : "meaning-to-hanzi";

    setQuestionState(buildQuizQuestion(currentWord, lesson.words, nextType));
    setSelectedOptionId("");
    setShowAnswer(false);
  }, [currentSession.currentIndex, currentSession.result.completed, currentWord, lesson]);

  function handleSelectOption(option) {
    if (!currentWord || showAnswer) {
      return;
    }

    setSelectedOptionId(option.id);
    setShowAnswer(true);
    recordQuizAnswer(currentWord.id, option.isCorrect);

    nextTimerRef.current = window.setTimeout(() => {
      if (currentSession.currentIndex >= totalQuestions - 1) {
        finishSession();
        return;
      }

      setSessionIndex(currentSession.currentIndex + 1);
    }, 1500);
  }

  if (!lessonId) {
    return <Navigate replace to={`/luyen-tu-vung${location.search}`} />;
  }

  if (!hasAdminVocabulary) {
    return <Navigate replace to={`/luyen-tu-vung${location.search}`} />;
  }

  if (!lessonContext || !lesson || !topic) {
    return (
      <section className="vmora-vocab-page">
        <div className="vmora-vocab-wrap">
          <div className="vmora-vocab-empty">
            <p className="vmora-vocab-eyebrow">Trắc nghiệm</p>
            <h1>Không tìm thấy bài học</h1>
            <Link className="vmora-vocab-link-button" to={`/luyen-tu-vung${location.search}`}>
              Quay lại danh sách chủ đề
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (currentSession.result.completed) {
    return (
      <section className="vmora-vocab-page">
        <div className="vmora-vocab-wrap">
          <div className="vmora-vocab-session-shell">
            <p className="vmora-vocab-eyebrow">{topic.label}</p>
            <h1 className="vmora-vocab-detail-title">Kết thúc trắc nghiệm</h1>
            <div className="vmora-vocab-summary-grid">
              <article className="vmora-vocab-summary-card">
                <span>Điểm</span>
                <strong>
                  {currentSession.result.score}/{totalQuestions}
                </strong>
              </article>
              <article className="vmora-vocab-summary-card">
                <span>Từ sai</span>
                <strong>{currentSession.result.wrongWordIds.length}</strong>
              </article>
            </div>

            <div className="vmora-vocab-list-card">
              <h2 className="vmora-vocab-list-title">Danh sách từ sai</h2>
              {currentSession.result.wrongWordIds.length ? (
                <div className="vmora-vocab-summary-list">
                  {currentSession.result.wrongWordIds.map((wordId) => {
                    const wrongWord = lesson.words.find((entry) => entry.id === wordId);

                    if (!wrongWord) {
                      return null;
                    }

                    return (
                      <p key={wordId}>
                        {wrongWord.hanzi} - {wrongWord.pinyin} - {wrongWord.meaning}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p className="vmora-vocab-detail-copy">Bạn đã trả lời đúng toàn bộ câu hỏi trong bài này.</p>
              )}
            </div>

            <div className="vmora-vocab-detail-actions">
              <Link className="vmora-vocab-link-button vmora-vocab-link-button-muted" to={`/luyen-tu-vung${location.search}`}>
                Về danh sách chủ đề
              </Link>
              <Link className="vmora-vocab-link-button" to={`/luyen-tu-vung/${lesson.id}/lat-the${location.search}`}>
                Luyện lại flashcard
              </Link>
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
                {Math.min(currentSession.currentIndex + 1, totalQuestions)}/{totalQuestions} câu
              </span>
              <strong>Điểm hiện tại: {currentSession.result.score}</strong>
            </div>
            <div className="vmora-vocab-progress-track">
              <div
                className="vmora-vocab-progress-bar"
                style={{ width: `${((currentSession.currentIndex + (showAnswer ? 1 : 0)) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          {questionState ? (
            <div className="vmora-vocab-quiz-card">
              <p className="vmora-vocab-quiz-type">
                {questionState.type === "hanzi-to-meaning" ? "Dạng A: Chọn nghĩa đúng" : "Dạng B: Chọn Hán tự đúng"}
              </p>
              <h2 className="vmora-vocab-quiz-prompt">{questionState.prompt}</h2>
              <p className="vmora-vocab-quiz-subline">{questionState.promptSubline}</p>

              <div className="vmora-vocab-quiz-options">
                {questionState.options.map((option) => {
                  const isSelected = selectedOptionId === option.id;
                  const isCorrect = option.isCorrect;
                  const classNames = [
                    "vmora-vocab-quiz-option",
                    showAnswer && isCorrect ? "is-correct" : "",
                    showAnswer && isSelected && !isCorrect ? "is-wrong" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <button
                      className={classNames}
                      disabled={showAnswer}
                      key={option.id}
                      onClick={() => handleSelectOption(option)}
                      type="button"
                    >
                      <span>{option.label}</span>
                      <small>{option.subline}</small>
                    </button>
                  );
                })}
              </div>

              {showAnswer ? (
                <p className="vmora-vocab-quiz-feedback">
                  Đáp án đúng: <strong>{questionState.correctLabel}</strong>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
