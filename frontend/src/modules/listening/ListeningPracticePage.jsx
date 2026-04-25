import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { getActivityTypePracticeActivities } from "../practiceAdmin";
import { getAdminListeningExercisesByLesson, getAdminListeningLessonById } from "./adminAdapter";
import {
  buildHintPreview,
  createVideoPosterDataUrl,
  diffChars,
  estimateSpeechDuration,
  formatPlayerTime,
  getListeningActivityMeta,
  getListeningDifficultyClass,
  normalizeListeningAnswer,
  speakListeningText,
  stopListeningSpeech,
} from "./helpers";
import { useListeningStore } from "./store";
import "./listening.css";

function AudioShell({ exercise, languageCode, onInteract }) {
  const speeds = [0.75, 1, 1.25];
  const [speedIndex, setSpeedIndex] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const duration = useMemo(() => estimateSpeechDuration(exercise.transcript, speeds[speedIndex]), [exercise.transcript, speedIndex]);

  useEffect(() => {
    setIsPlaying(false);
    setElapsed(0);
    stopListeningSpeech();

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      stopListeningSpeech();
    };
  }, [exercise.id]);

  function stopPlayback(reset = false) {
    stopListeningSpeech();
    setIsPlaying(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    if (reset) {
      setElapsed(0);
    }
  }

  function startPlayback() {
    stopPlayback();
    speakListeningText(exercise.transcript, languageCode, speeds[speedIndex]);
    setIsPlaying(true);
    timerRef.current = window.setInterval(() => {
      setElapsed((current) => {
        const next = current + 0.25;
        if (next >= duration) {
          stopPlayback();
          return duration;
        }
        return next;
      });
    }, 250);
  }

  return (
    <div className="vmora-listening-player-card">
      <div className="vmora-listening-player-top">
        <span className="vmora-listening-player-icon">🎵</span>
        <div className="vmora-listening-player-track">
          <div className="vmora-listening-player-progress" style={{ width: `${(elapsed / duration) * 100}%` }} />
        </div>
        <span className="vmora-listening-player-time">{formatPlayerTime(duration)}</span>
      </div>
      <div className="vmora-listening-player-controls">
        <button
          className="vmora-listening-ghost"
          onClick={() => {
            onInteract?.();
            setElapsed((current) => Math.max(0, current - 10));
          }}
          type="button"
        >
          -10s
        </button>
        <button
          className="vmora-listening-primary"
          onClick={() => {
            onInteract?.();
            if (isPlaying) {
              stopPlayback();
              return;
            }
            startPlayback();
          }}
          type="button"
        >
          {isPlaying ? "Dừng" : "Nghe"}
        </button>
        <button
          className="vmora-listening-ghost"
          onClick={() => {
            onInteract?.();
            setElapsed((current) => Math.min(duration, current + 10));
          }}
          type="button"
        >
          +10s
        </button>
        <button
          className="vmora-listening-ghost"
          onClick={() => {
            const nextIndex = (speedIndex + 1) % speeds.length;
            setSpeedIndex(nextIndex);
            stopPlayback();
          }}
          type="button"
        >
          {speeds[speedIndex]}x
        </button>
      </div>
    </div>
  );
}

function VideoShell({ exercise, languageCode, isSubtitleVisible, onToggleSubtitle, onInteract }) {
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const poster = useMemo(() => createVideoPosterDataUrl("Video listening"), []);

  useEffect(() => {
    setIsPreviewPlaying(false);
    stopListeningSpeech();

    return () => {
      stopListeningSpeech();
    };
  }, [exercise.id]);

  return (
    <div className="vmora-listening-video-shell">
      <div className="vmora-listening-video-wrap">
        <video className="vmora-listening-video" controls poster={poster} src="">
          <track default kind="captions" label="CC" src="" srcLang={languageCode} />
        </video>
        {isSubtitleVisible ? <div className="vmora-listening-subtitle">{exercise.transcript}</div> : null}
      </div>
      <div className="vmora-listening-player-controls">
        <button
          className="vmora-listening-primary"
          onClick={() => {
            onInteract?.();
            if (isPreviewPlaying) {
              stopListeningSpeech();
              setIsPreviewPlaying(false);
              return;
            }
            speakListeningText(exercise.transcript, languageCode, 1);
            setIsPreviewPlaying(true);
          }}
          type="button"
        >
          {isPreviewPlaying ? "Dừng xem trước" : "Phát nội dung"}
        </button>
        <button className="vmora-listening-ghost" onClick={onToggleSubtitle} type="button">
          {isSubtitleVisible ? "Tắt CC" : "Bật CC"}
        </button>
      </div>
    </div>
  );
}

function ChoiceGrid({ exercise, feedback, selectedOption, setSelectedOption }) {
  return (
    <div className="vmora-listening-options-grid">
      {(exercise.options ?? []).map((option, index) => {
        const isSelected = selectedOption === option;
        const isCorrect = option === exercise.answer;
        const className = [
          "vmora-listening-option",
          isSelected ? "is-selected" : "",
          feedback?.status && isCorrect ? "is-correct" : "",
          feedback?.status === "wrong" && isSelected && !isCorrect ? "is-wrong" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            className={className}
            disabled={Boolean(feedback)}
            key={option}
            onClick={() => setSelectedOption(option)}
            type="button"
          >
            <span className="vmora-listening-option-index">{String.fromCharCode(65 + index)}</span>
            <strong>{option}</strong>
          </button>
        );
      })}
    </div>
  );
}

function DiffPreview({ answer, input }) {
  const diff = diffChars(input, answer);
  const inputChars = answer.split("").map((_, index) => ({
    char: input[index] ?? " ",
    correct: input[index] === answer[index],
  }));

  return (
    <div className="vmora-listening-diff-stack">
      <div className="vmora-listening-diff-card">
        <span>Bạn viết:</span>
        <div className="vmora-listening-diff-line">
          {inputChars.map((item, index) => (
            <span className={item.correct ? "vmora-listening-char-ok" : "vmora-listening-char-bad"} key={`user-${index}`}>
              {item.char === " " ? "\u00A0" : item.char}
            </span>
          ))}
        </div>
      </div>
      <div className="vmora-listening-diff-card">
        <span>Đáp án đúng:</span>
        <div className="vmora-listening-diff-line">
          {diff.map((item, index) => (
            <span className={item.correct ? "vmora-listening-char-answer" : ""} key={`answer-${index}`}>
              {item.char}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultSummary({ exercises, progress, onRestart, onBackHome, score }) {
  const correctCount = exercises.filter((exercise) => progress[exercise.id]?.status === "correct").length;
  const wrongExercises = exercises.filter((exercise) => progress[exercise.id]?.status === "wrong");

  return (
    <div className="vmora-listening-finish-card">
      <h1>{score}</h1>
      <p className="vmora-listening-finish-copy">
        Bạn đúng {correctCount}/{exercises.length} câu trong hoạt động này.
      </p>

      <div className="vmora-listening-finish-list">
        {wrongExercises.length ? (
          wrongExercises.map((exercise) => (
            <article className="vmora-listening-finish-item" key={exercise.id}>
              <strong>{exercise.question}</strong>
              <span>Đáp án: {exercise.answer}</span>
            </article>
          ))
        ) : (
          <p className="vmora-listening-finish-copy">Không có câu nào sai trong lượt này.</p>
        )}
      </div>

      <div className="vmora-listening-actions">
        <button className="vmora-listening-ghost" onClick={onRestart} type="button">
          Làm lại
        </button>
        <button className="vmora-listening-primary" onClick={onBackHome} type="button">
          Về trang chủ
        </button>
      </div>
    </div>
  );
}

export default function ListeningPracticePage({ activityType, app }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { lessonId } = useParams();
  const languageCode = app.user?.learning_language_code ?? app.selectedLanguage ?? "zh";
  const progress = useListeningStore((state) => state.progress);
  const totalScore = useListeningStore((state) => state.totalScore);
  const scorePulse = useListeningStore((state) => state.scorePulse);
  const toasts = useListeningStore((state) => state.toasts);
  const setLanguage = useListeningStore((state) => state.setLanguage);
  const markHintUsed = useListeningStore((state) => state.markHintUsed);
  const submitResult = useListeningStore((state) => state.submitResult);
  const resetExercisesProgress = useListeningStore((state) => state.resetExercisesProgress);
  const dismissToast = useListeningStore((state) => state.dismissToast);
  const adminListeningActivities = useMemo(
    () => getActivityTypePracticeActivities(app, location.search, "listening", activityType),
    [activityType, app, location.search],
  );
  const adminLesson = useMemo(
    () => getAdminListeningLessonById(adminListeningActivities, activityType, lessonId, languageCode),
    [activityType, adminListeningActivities, languageCode, lessonId],
  );
  const adminExercises = useMemo(
    () => getAdminListeningExercisesByLesson(adminListeningActivities, activityType, lessonId, languageCode),
    [activityType, adminListeningActivities, languageCode, lessonId],
  );
  const lesson = useMemo(() => adminLesson, [adminLesson]);
  const exercises = useMemo(() => adminExercises, [adminExercises]);
  const meta = getListeningActivityMeta(activityType);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    setLanguage(languageCode, exercises);
  }, [exercises, languageCode, setLanguage]);

  useEffect(() => {
    const nextIndex = exercises.findIndex((exercise) => (progress[exercise.id]?.status ?? "pending") === "pending");
    if (nextIndex === -1 && exercises.length > 0) {
      setCurrentIndex(0);
      setSessionFinished(true);
      return;
    }

    setCurrentIndex(Math.max(0, nextIndex));
    setSessionFinished(false);
  }, [activityType, exercises, progress]);

  useEffect(() => {
    setSelectedOption("");
    setFeedback(null);
    setShowTranscript(false);
    setShowSubtitle(false);
    setDraft(activeExercise ? progress[activeExercise.id]?.lastAnswer ?? "" : "");
  }, [currentIndex, activityType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 152)}px`;
  }, [draft, currentIndex]);

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

  if (!app.user) {
    return <Navigate replace to="/dang-nhap" />;
  }

  if (!app.user?.learning_language_code && !app.selectedLanguage) {
    return <Navigate replace to="/chon-ngon-ngu" />;
  }

  if (!adminListeningActivities.length) {
    return <Navigate replace to={`${meta.path}${location.search}`} />;
  }

  if (!lesson) {
    return <Navigate replace to={`${meta.path}${location.search}`} />;
  }

  if (!lessonId || !lesson) {
    return <Navigate replace to={`${meta.path}${location.search}`} />;
  }

  const activeExercise = exercises[currentIndex];
  const activeProgress = activeExercise ? progress[activeExercise.id] : undefined;
  const usedHints = activeProgress?.usedHints ?? 0;
  const activityScore = exercises.reduce((sum, exercise) => sum + (progress[exercise.id]?.pointsEarned ?? 0), 0);
  const isVideoChoice = activityType === "video_choice";

  if (!activeExercise && !sessionFinished) {
    return null;
  }

  function moveNext() {
    stopListeningSpeech();
    const next = currentIndex + 1;
    if (next < exercises.length) {
      setCurrentIndex(next);
      return;
    }

    setSessionFinished(true);
  }

  function getChoiceValue(optionText) {
    return activeExercise.optionDetails?.find((option) => option.text === optionText)?.id ?? optionText;
  }

  async function handleConfirmChoice() {
    if (!selectedOption) {
      return;
    }

    stopListeningSpeech();
    setIsSubmitting(true);

    try {
      const submittedValue = getChoiceValue(selectedOption);
      const localCorrect = selectedOption === activeExercise.answer;
      const result = activeExercise.practiceActivity
        ? await app.submitPracticeAnswers(activeExercise.practiceActivity, { option_id: submittedValue })
        : {
            is_correct: localCorrect,
            score_percent: localCorrect ? 100 : 0,
            feedback: localCorrect ? "Chính xác." : "Chưa đúng.",
          };
      const points = submitResult({
        exerciseId: activeExercise.id,
        answer: selectedOption,
        isCorrect: Boolean(result?.is_correct),
        wasRetry: (activeProgress?.attempts ?? 0) > 0,
      });

      setFeedback({
        status: result?.is_correct ? "correct" : "wrong",
        points,
        backendFeedback: result?.feedback ?? "",
      });
      setShowTranscript(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitWrite() {
    const input = normalizeListeningAnswer(draft);
    const answer = normalizeListeningAnswer(activeExercise.answer);
    setIsSubmitting(true);

    try {
      const localCorrect = input === answer;
      const result = activeExercise.practiceActivity
        ? await app.submitPracticeAnswers(activeExercise.practiceActivity, { text: draft })
        : {
            is_correct: localCorrect,
            score_percent: localCorrect ? 100 : 0,
            feedback: localCorrect ? "Đúng rồi." : "Chưa đúng, bạn có thể thử lại.",
          };
      const points = submitResult({
        exerciseId: activeExercise.id,
        answer: draft,
        isCorrect: Boolean(result?.is_correct),
        wasRetry: (activeProgress?.attempts ?? 0) > 0,
      });

      setFeedback({
        status: result?.is_correct ? "correct" : "wrong",
        points,
        input,
        answer,
        backendFeedback: result?.feedback ?? "",
      });
      setShowTranscript(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRestartActivity() {
    resetExercisesProgress(exercises.map((exercise) => exercise.id));
    setCurrentIndex(0);
    setSessionFinished(false);
    setSelectedOption("");
    setDraft("");
    setFeedback(null);
    setShowTranscript(false);
  }

  if (sessionFinished) {
    return (
      <section className="vmora-listening-page">
        <div className="vmora-listening-wrap">
          <ResultSummary
            exercises={exercises}
            onBackHome={() => navigate(`${meta.path}${location.search}`)}
            onRestart={handleRestartActivity}
            progress={progress}
            score={activityScore}
          />
        </div>
      </section>
    );
  }

  const transcriptVisible = showTranscript || feedback?.status === "wrong" || feedback?.status === "correct";
  const progressPercent = exercises.length ? Math.round(((currentIndex + 1) / exercises.length) * 100) : 0;
  const hintPreview = buildHintPreview(activeExercise.hints, usedHints);
  const branchLabel = location.search.includes("branch=paid") ? "LUYEN NGHE - ON LUYEN MUA" : "LUYEN NGHE - ON LUYEN FREE";
  const answerBlock =
    activityType === "audio_choice" || activityType === "video_choice" ? (
      <ChoiceGrid
        exercise={activeExercise}
        feedback={feedback}
        selectedOption={selectedOption}
        setSelectedOption={(option) => {
          stopListeningSpeech();
          setSelectedOption(option);
        }}
      />
    ) : (
      <div className="vmora-listening-write-card">
        <textarea
          className={
            feedback?.status === "correct"
              ? "vmora-listening-input is-correct"
              : feedback?.status === "wrong"
                ? "vmora-listening-input is-wrong"
                : "vmora-listening-input"
          }
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Gõ câu bạn vừa nghe..."
          ref={textareaRef}
          rows={1}
          value={draft}
        />
      </div>
    );
  const feedbackBlock = feedback ? (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={feedback.status === "correct" ? "vmora-listening-banner is-correct" : "vmora-listening-banner is-wrong"}
      initial={{ opacity: 0, y: -10 }}
    >
      {feedback.status === "correct" ? `Chính xác! +${feedback.points} điểm` : feedback.backendFeedback || "Chưa đúng"}
    </motion.div>
  ) : null;
  const transcriptBlock = transcriptVisible ? (
    <details className="vmora-listening-transcript" open>
      <summary>Transcript đầy đủ</summary>
      <p>{activeExercise.transcript}</p>
      {activeExercise.explanation ? <span>{activeExercise.explanation}</span> : null}
    </details>
  ) : null;
  const actionsBlock = (
    <div className="vmora-listening-actions">
      {!feedback ? (
        <>
          {activityType === "audio_write" ? (
            <button
              className="vmora-listening-ghost"
              onClick={() => {
                if ((activeExercise.hints?.length ?? 0) > usedHints) {
                  markHintUsed(activeExercise.id);
                }
              }}
              type="button"
            >
              Gợi ý
            </button>
          ) : (
            <button
              className="vmora-listening-ghost"
              onClick={() => {
                stopListeningSpeech();
                speakListeningText(activeExercise.transcript, languageCode, 1);
              }}
              type="button"
            >
              {activityType === "video_choice" ? "Xem lại" : "Nghe lại"}
            </button>
          )}

          <button
            className="vmora-listening-primary"
            disabled={isSubmitting}
            onClick={activityType === "audio_write" ? handleSubmitWrite : handleConfirmChoice}
            type="button"
          >
            {activityType === "audio_write" ? "Nộp bài" : "Xác nhận"}
          </button>
        </>
      ) : feedback.status === "wrong" && activityType === "audio_write" ? (
        <>
          <button
            className="vmora-listening-ghost"
            onClick={() => {
              setFeedback(null);
              setShowTranscript(false);
            }}
            type="button"
          >
            Thử lại
          </button>
          <button className="vmora-listening-primary" onClick={moveNext} type="button">
            Câu tiếp theo
          </button>
        </>
      ) : (
        <button className="vmora-listening-primary vmora-listening-primary-next" onClick={moveNext} type="button">
          Câu tiếp theo
        </button>
      )}
    </div>
  );

  return (
    <section className="vmora-listening-page">
      <div className="vmora-listening-wrap">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="vmora-listening-toast"
              exit={{ opacity: 0, y: -12 }}
              initial={{ opacity: 0, y: -16 }}
              key={toast.id}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="vmora-listening-practice-shell">
          <div className="vmora-listening-header">
            <div className="vmora-listening-progress-head">
              <div className="vmora-listening-progress-copy">
                <span>
                  Cau {currentIndex + 1}/{exercises.length}
                </span>
                <strong>{lesson.title}</strong>
              </div>
              <div className="vmora-listening-progress-track">
                <div className="vmora-listening-progress-bar" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="vmora-listening-header-right">
              <motion.div animate={{ scale: scorePulse ? [1, 1.08, 1] : 1 }} className="vmora-listening-score-card">
                <span>Điểm</span>
                <strong>{totalScore}</strong>
              </motion.div>
              <span className={getListeningDifficultyClass(activeExercise.difficulty)}>{activeExercise.difficulty}</span>
            </div>
          </div>

          {isVideoChoice ? (
            <div className="vmora-listening-stage vmora-listening-stage-video">
              <div className="vmora-listening-stage-media">
                <VideoShell
                  exercise={activeExercise}
                  isSubtitleVisible={showSubtitle}
                  languageCode={languageCode}
                  onInteract={() => stopListeningSpeech()}
                  onToggleSubtitle={() => setShowSubtitle((current) => !current)}
                />
              </div>
              <div className="vmora-listening-stage-content">
                <article className="vmora-listening-question-card">
                  <p className="vmora-listening-kicker">{branchLabel}</p>
                  <p className="vmora-listening-question">{activeExercise.question}</p>
                </article>
                {answerBlock}
                {feedbackBlock}
                {actionsBlock}
              </div>
            </div>
          ) : (
            <>
              <AudioShell exercise={activeExercise} languageCode={languageCode} onInteract={() => stopListeningSpeech()} />

              <article className="vmora-listening-question-card">
                <p className="vmora-listening-kicker">{branchLabel}</p>
                <p className="vmora-listening-question">{activeExercise.question}</p>
              </article>

              {activityType === "audio_write" && usedHints > 0 ? (
                <div className="vmora-listening-hint-box">
                  {hintPreview.map((token, index) => (
                    <span className="vmora-listening-hint-chip" key={`${activeExercise.id}-hint-${index}`}>
                      {token}
                    </span>
                  ))}
                </div>
              ) : null}

              {answerBlock}
              {feedbackBlock}
              {actionsBlock}
            </>
          )}

          {activityType === "audio_write" && feedback ? (
            <DiffPreview answer={feedback.answer} input={feedback.input} />
          ) : null}

          {transcriptBlock}

          <div className="vmora-listening-back-row">
            <Link className="vmora-listening-back-link" to={`${meta.path}${location.search}`}>
              Quay lại danh sách bài học
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
