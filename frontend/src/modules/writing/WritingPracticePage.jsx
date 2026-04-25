import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, useLocation } from "react-router-dom";
import { countPracticeLessons, getSkillPracticeActivities } from "../practiceAdmin";
import { getAdminWritingExercises } from "./adminAdapter";
import { diffChars, getDifficultyTone, getExerciseTypeLabel, normalizeWritingAnswer, speakText } from "./helpers";
import { useWritingStore } from "./store";
import "./writing.css";

function SidebarCard({ exercise, index, isActive, progress, onSelect }) {
  const status = progress?.status ?? "pending";

  return (
    <button
      className={isActive ? "vmora-writing-sidebar-card is-active" : "vmora-writing-sidebar-card"}
      onClick={() => onSelect(exercise.id)}
      type="button"
    >
      <div className="vmora-writing-sidebar-top">
        <span className="vmora-writing-order">{String(index + 1).padStart(2, "0")}</span>
        {status === "correct" ? <span className="vmora-writing-state-ok">OK</span> : null}
        {status === "wrong" || status === "skipped" ? <span className="vmora-writing-state-bad">ERR</span> : null}
      </div>
      <strong>{exercise.hanzi}</strong>
      <small>{getExerciseTypeLabel(exercise.type)}</small>
    </button>
  );
}

function DiffLine({ label, text, tone }) {
  return (
    <div className="vmora-writing-diff-line">
      <span className="vmora-writing-diff-label">{label}</span>
      <div className="vmora-writing-diff-text">
        {text.map((item, index) => (
          <span
            className={
              tone === "user"
                ? item.correct
                  ? "vmora-writing-char vmora-writing-char-ok"
                  : "vmora-writing-char vmora-writing-char-bad"
                : item.correct
                  ? "vmora-writing-char vmora-writing-char-answer-ok"
                  : "vmora-writing-char"
            }
            key={`${label}-${index}`}
          >
            {item.char === " " ? "\u00A0" : item.char}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function WritingPracticePage({ app }) {
  const location = useLocation();
  const languageCode = app.user?.learning_language_code ?? app.selectedLanguage ?? "zh";
  const adminWritingActivities = useMemo(() => getSkillPracticeActivities(app, location.search, "writing"), [app, location.search]);
  const adminExercises = useMemo(() => getAdminWritingExercises(adminWritingActivities, languageCode), [adminWritingActivities, languageCode]);
  const exercises = useMemo(() => adminExercises, [adminExercises]);
  const progress = useWritingStore((state) => state.progress);
  const totalScore = useWritingStore((state) => state.totalScore);
  const scorePulse = useWritingStore((state) => state.scorePulse);
  const activeExerciseId = useWritingStore((state) => state.activeExerciseId);
  const toasts = useWritingStore((state) => state.toasts);
  const setLanguage = useWritingStore((state) => state.setLanguage);
  const setActiveExercise = useWritingStore((state) => state.setActiveExercise);
  const markHintUsed = useWritingStore((state) => state.markHintUsed);
  const submitResult = useWritingStore((state) => state.submitResult);
  const skipExercise = useWritingStore((state) => state.skipExercise);
  const resetLanguageProgress = useWritingStore((state) => state.resetLanguageProgress);
  const dismissToast = useWritingStore((state) => state.dismissToast);
  const [activeType, setActiveType] = useState("all");
  const [draft, setDraft] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    setLanguage(languageCode, exercises);
  }, [exercises, languageCode, setLanguage]);

  useEffect(() => {
    if (!exercises.length) {
      return;
    }

    if (!activeExerciseId || !exercises.some((exercise) => exercise.id === activeExerciseId)) {
      setActiveExercise(exercises[0].id);
    }
  }, [activeExerciseId, exercises, setActiveExercise]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 152)}px`;
  }, [draft, activeExerciseId]);

  useEffect(() => {
    if (!toasts.length) {
      return undefined;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        dismissToast(toast.id);
      }, 2200),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismissToast, toasts]);

  const filteredExercises = useMemo(() => {
    if (activeType === "all") {
      return exercises;
    }

    return exercises.filter((exercise) => exercise.type === activeType);
  }, [activeType, exercises]);

  const activeExercise = exercises.find((exercise) => exercise.id === activeExerciseId) ?? exercises[0];
  const activeProgress = activeExercise ? progress[activeExercise.id] : undefined;
  const exerciseIndex = activeExercise ? exercises.findIndex((exercise) => exercise.id === activeExercise.id) : 0;
  const completedCount = exercises.filter((exercise) => progress[exercise.id]?.completed).length;
  const progressPercent = exercises.length ? Math.round((completedCount / exercises.length) * 100) : 0;
  const resolvedCount = exercises.filter((exercise) => (progress[exercise.id]?.status ?? "pending") !== "pending").length;
  const allDone = exercises.length > 0 && resolvedCount === exercises.length;
  const correctCount = exercises.filter((exercise) => progress[exercise.id]?.status === "correct").length;
  const skippedCount = exercises.filter((exercise) => progress[exercise.id]?.status === "skipped").length;
  const wrongCount = exercises.filter((exercise) => progress[exercise.id]?.status === "wrong").length;
  const languageScore = exercises.reduce((total, exercise) => total + (progress[exercise.id]?.pointsEarned ?? 0), 0);
  const branchLabel = location.search.includes("branch=paid") ? "LUYỆN VIẾT - NHÁNH MUA" : "LUYỆN VIẾT - NHÁNH FREE";
  const adminLessonCount = countPracticeLessons(adminWritingActivities);

  useEffect(() => {
    setDraft(activeProgress?.lastAnswer ?? "");
    setShowHint(false);
    setFeedback(null);
  }, [activeExerciseId]);

  if (!app.user) {
    return <Navigate replace to="/dang-nhap" />;
  }

  if (!app.user?.learning_language_code && !app.selectedLanguage) {
    return <Navigate replace to="/chon-ngon-ngu" />;
  }

  if (!adminWritingActivities.length) {
    return (
      <section className="vmora-writing-page">
        <div className="vmora-writing-wrap">
          <div className="vmora-writing-empty">
            <p className="vmora-writing-kicker">Luyện viết</p>
            <h1>Admin chưa mở bài luyện viết cho nhánh này</h1>
            <p>Cần tạo bài ôn luyện viết trong admin trước khi mở giao diện làm bài cho người học.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!exercises.length) {
    return (
      <section className="vmora-writing-page">
        <div className="vmora-writing-wrap">
          <div className="vmora-writing-empty">
            <p className="vmora-writing-kicker">Luyện viết</p>
            <h1>Payload bài viết từ admin chưa đúng format</h1>
            <p>Cần có `display_answer` hoặc `accepted_answers`, kèm thông tin `meaning` và `exercise_type` nếu muốn hiện đúng giao diện này.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!activeExercise) {
    return null;
  }

  function moveToNextExercise() {
    const nextExercise = exercises[exerciseIndex + 1];

    if (nextExercise) {
      setActiveExercise(nextExercise.id);
      return;
    }

    setFeedback((current) =>
      current
        ? {
            ...current,
            finished: true,
          }
        : current,
    );
  }

  async function handleSubmit() {
    const userAnswer = normalizeWritingAnswer(draft);
    const answer = normalizeWritingAnswer(activeExercise.answer);
    setIsSubmitting(true);

    try {
      const result = activeExercise.practiceActivity
        ? await app.submitPracticeAnswers(activeExercise.practiceActivity, { text: draft })
        : {
            is_correct: userAnswer === answer,
            score_percent: userAnswer === answer ? 100 : 0,
            feedback: userAnswer === answer ? "Đúng rồi." : "Chưa đúng, bạn có thể thử lại.",
          };
      const isCorrect = Boolean(result?.is_correct);
      const wasRetry = (activeProgress?.attempts ?? 0) > 0;
      const points = submitResult({
        exerciseId: activeExercise.id,
        answer: draft,
        isCorrect,
        wasRetry,
        usedHint: Boolean(activeProgress?.usedHint),
      });

      setFeedback({
        status: isCorrect ? "correct" : "wrong",
        points,
        diff: diffChars(userAnswer, answer),
        userAnswer,
        answer,
        finished: false,
        backendFeedback: result?.feedback ?? "",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleShowHint() {
    if (!activeProgress?.usedHint) {
      markHintUsed(activeExercise.id);
    }

    setShowHint((current) => !current);
  }

  function handleRetry() {
    setFeedback(null);
  }

  function handleRevealAndNext() {
    skipExercise(activeExercise.id, draft);
    setFeedback({
      status: "wrong",
      points: 0,
      diff: diffChars(normalizeWritingAnswer(draft), normalizeWritingAnswer(activeExercise.answer)),
      userAnswer: normalizeWritingAnswer(draft),
      answer: normalizeWritingAnswer(activeExercise.answer),
      finished: false,
      skipped: true,
    });
    moveToNextExercise();
  }

  const inputStateClass =
    feedback?.status === "correct"
      ? "vmora-writing-input is-correct"
      : feedback?.status === "wrong"
        ? "vmora-writing-input is-wrong"
        : "vmora-writing-input";

  function handleRestartLanguage() {
    resetLanguageProgress(languageCode, exercises);
    setActiveType("all");
    setDraft("");
    setShowHint(false);
    setFeedback(null);
  }

  return (
    <section className="vmora-writing-page">
      <div className="vmora-writing-wrap">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="vmora-writing-toast"
              exit={{ opacity: 0, y: -12 }}
              initial={{ opacity: 0, y: -16 }}
              key={toast.id}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="vmora-writing-layout">
          <aside className="vmora-writing-sidebar">
            <div className="vmora-writing-sidebar-head">
              <h2>Luyện viết</h2>
              <span className="vmora-writing-sidebar-caption">{adminLessonCount} bài học admin</span>
              <div className="vmora-writing-type-tabs">
                <button
                  className={activeType === "all" ? "vmora-writing-tab is-active" : "vmora-writing-tab"}
                  onClick={() => setActiveType("all")}
                  type="button"
                >
                  Tất cả
                </button>
                <button
                  className={activeType === "write_sentence" ? "vmora-writing-tab is-active" : "vmora-writing-tab"}
                  onClick={() => setActiveType("write_sentence")}
                  type="button"
                >
                  Viết câu
                </button>
                <button
                  className={activeType === "type_by_meaning" ? "vmora-writing-tab is-active" : "vmora-writing-tab"}
                  onClick={() => setActiveType("type_by_meaning")}
                  type="button"
                >
                  Gõ lại
                </button>
              </div>
            </div>

            <div className="vmora-writing-sidebar-list">
              {filteredExercises.map((exercise, index) => (
                <SidebarCard
                  exercise={exercise}
                  index={index}
                  isActive={exercise.id === activeExercise.id}
                  key={exercise.id}
                  onSelect={(exerciseId) => setActiveExercise(exerciseId)}
                  progress={progress[exercise.id]}
                />
              ))}
            </div>
          </aside>

          <div className="vmora-writing-main">
            {allDone ? (
              <div className="vmora-writing-summary-card">
                <p className="vmora-writing-kicker">{branchLabel}</p>
                <h1 className="vmora-writing-summary-title">Hoàn tất luyện viết</h1>

                <div className="vmora-writing-summary-grid">
                  <article>
                    <span>Điểm ngôn ngữ này</span>
                    <strong>{languageScore}</strong>
                  </article>
                  <article>
                    <span>Làm đúng</span>
                    <strong>{correctCount}</strong>
                  </article>
                  <article>
                    <span>Đã bỏ qua</span>
                    <strong>{skippedCount}</strong>
                  </article>
                  <article>
                    <span>Sai chưa sửa</span>
                    <strong>{wrongCount}</strong>
                  </article>
                </div>

                <div className="vmora-writing-summary-actions">
                  <button className="vmora-writing-button vmora-writing-button-outline" onClick={handleRestartLanguage} type="button">
                    Làm lại ngôn ngữ này
                  </button>
                  <button
                    className="vmora-writing-button vmora-writing-button-primary"
                    onClick={() => setActiveExercise(exercises[0].id)}
                    type="button"
                  >
                    Xem lại bài đầu
                  </button>
                </div>
              </div>
            ) : null}

            <div className="vmora-writing-header">
              <div className="vmora-writing-progress-head">
                <div className="vmora-writing-progress-copy">
                  <span>
                    Bài {exerciseIndex + 1}/{exercises.length}
                  </span>
                  <strong>{progressPercent}% hoàn thành</strong>
                </div>
                <div className="vmora-writing-progress-track">
                  <div className="vmora-writing-progress-bar" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              <div className="vmora-writing-header-right">
                <motion.div animate={{ scale: scorePulse ? [1, 1.08, 1] : 1 }} className="vmora-writing-score-card">
                  <span>Tổng điểm</span>
                  <strong>{totalScore}</strong>
                </motion.div>
                <span className={getDifficultyTone(activeExercise.difficulty)}>{activeExercise.difficulty}</span>
              </div>
            </div>

            <article className="vmora-writing-question-card">
              <p className="vmora-writing-kicker">{branchLabel}</p>
              <h1 className="vmora-writing-prompt">{activeExercise.hanzi}</h1>
              {activeExercise.pinyin ? <p className="vmora-writing-pinyin">{activeExercise.pinyin}</p> : null}
              <p className="vmora-writing-meaning">{activeExercise.meaning}</p>
            </article>

            <AnimatePresence>
              {showHint ? (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="vmora-writing-hint-box"
                  exit={{ opacity: 0, y: -8 }}
                  initial={{ opacity: 0, y: -10 }}
                >
                  {activeExercise.hints.map((hint) => (
                    <span className="vmora-writing-hint-chip" key={hint}>
                      {hint}
                    </span>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>

            {activeExercise.type === "type_by_meaning" ? (
              <div className="vmora-writing-origin-box">
                <span>Gõ câu:</span>
                <strong>{activeExercise.meaning}</strong>
              </div>
            ) : null}

            <div className="vmora-writing-input-card">
              <textarea
                className={inputStateClass}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Gõ câu của bạn ở đây..."
                ref={textareaRef}
                rows={1}
                value={draft}
              />

              <AnimatePresence mode="wait">
                {feedback?.status === "correct" ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="vmora-writing-banner is-correct"
                    exit={{ opacity: 0, y: -6 }}
                    initial={{ opacity: 0, y: -10 }}
                    key="correct"
                  >
                    Chính xác! +{feedback.points} điểm
                  </motion.div>
                ) : null}
                {feedback?.status === "wrong" ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="vmora-writing-banner is-wrong"
                    exit={{ opacity: 0, y: -6 }}
                    initial={{ opacity: 0, y: -10 }}
                    key="wrong"
                  >
                    Chưa chính xác
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {feedback?.status === "correct" ? (
                <div className="vmora-writing-result-box">
                  <p className="vmora-writing-result-line is-correct">
                    <span>Bạn viết:</span> {feedback.userAnswer}
                  </p>
                  <button
                    className="vmora-writing-speak"
                    onClick={() => speakText(activeExercise.answer, languageCode)}
                    type="button"
                  >
                    Phát âm câu đúng
                  </button>
                </div>
              ) : null}

              {feedback?.status === "wrong" ? (
                <div className="vmora-writing-result-box">
                  <DiffLine label="Bạn viết:" text={feedback.diff.map((item, index) => ({ ...item, char: feedback.userAnswer[index] ?? " " }))} tone="user" />
                  <DiffLine label="Đáp án đúng:" text={feedback.diff} tone="answer" />
                  {feedback.backendFeedback ? <p className="vmora-writing-explanation">{feedback.backendFeedback}</p> : null}
                  {activeExercise.explanation ? <p className="vmora-writing-explanation">{activeExercise.explanation}</p> : null}
                </div>
              ) : null}
            </div>

            <div className="vmora-writing-actions">
              {!feedback ? (
                <>
                  <button className="vmora-writing-button vmora-writing-button-outline" onClick={handleShowHint} type="button">
                    Gợi ý
                  </button>
                  <button className="vmora-writing-button vmora-writing-button-primary" disabled={isSubmitting} onClick={handleSubmit} type="button">
                    Nộp bài
                  </button>
                </>
              ) : feedback.status === "correct" ? (
                <button className="vmora-writing-button vmora-writing-button-primary vmora-writing-button-next" onClick={moveToNextExercise} type="button">
                  Câu tiếp theo
                </button>
              ) : (
                <>
                  <button className="vmora-writing-button vmora-writing-button-outline" onClick={handleRetry} type="button">
                    Thử lại
                  </button>
                  <button className="vmora-writing-button vmora-writing-button-primary" onClick={handleRevealAndNext} type="button">
                    Xem đáp án và tiếp
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
