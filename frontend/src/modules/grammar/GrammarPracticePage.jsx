import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { getSkillPracticeActivities } from "../practiceAdmin";
import { getAdminGrammarLessonById } from "./adminAdapter";
import { getGrammarDifficultyClass } from "./helpers";
import { useGrammarStore } from "./store";
import "./grammar.css";

export default function GrammarPracticePage({ app }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { lessonId } = useParams();
  const languageCode = app.user?.learning_language_code ?? app.selectedLanguage ?? "zh";
  const setLanguage = useGrammarStore((state) => state.setLanguage);
  const submitLessonResult = useGrammarStore((state) => state.submitLessonResult);
  const resetLessonProgress = useGrammarStore((state) => state.resetLessonProgress);
  const adminGrammarActivities = useMemo(() => getSkillPracticeActivities(app, location.search, "grammar"), [app, location.search]);
  const adminLesson = useMemo(() => getAdminGrammarLessonById(adminGrammarActivities, lessonId), [adminGrammarActivities, lessonId]);
  const lesson = useMemo(() => adminLesson, [adminLesson]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [answerResults, setAnswerResults] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLanguage(languageCode);
  }, [languageCode, setLanguage]);

  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setAnswerResults({});
    setShowResult(false);
  }, [lessonId]);

  if (!app.user) {
    return <Navigate replace to="/dang-nhap" />;
  }

  if (!app.user?.learning_language_code && !app.selectedLanguage) {
    return <Navigate replace to="/chon-ngon-ngu" />;
  }

  if (!adminGrammarActivities.length) {
    return <Navigate replace to={`/ngu-phap${location.search}`} />;
  }

  if (!lessonId || !lesson) {
    return <Navigate replace to={`/ngu-phap${location.search}`} />;
  }

  const currentQuestion = lesson.questions[currentIndex];
  const selectedAnswer = answers[currentQuestion?.id ?? ""];
  const progressPercent = Math.round(((currentIndex + 1) / lesson.questions.length) * 100);
  const correctCount = lesson.questions.filter((question) => answerResults[question.id]?.isCorrect).length;

  function getOptionText(question, optionId) {
    return question.optionDetails?.find((option) => option.id === optionId)?.text ?? optionId ?? "Chưa trả lời";
  }

  async function handleNext() {
    if (!currentQuestion || !selectedAnswer) {
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedText = getOptionText(currentQuestion, selectedAnswer);
      const isCorrect = selectedText === currentQuestion.correctAnswer;
      const nextResult = currentQuestion.practiceActivity
        ? await app.submitPracticeAnswers(currentQuestion.practiceActivity, { option_id: selectedAnswer })
        : {
            is_correct: isCorrect,
            score_percent: isCorrect ? 100 : 0,
            feedback: isCorrect ? "Chính xác." : "Chưa đúng.",
            expected_answer: currentQuestion.correctAnswer,
          };
      const normalizedResult = {
        isCorrect: Boolean(nextResult?.is_correct),
        feedback: nextResult?.feedback ?? (isCorrect ? "Chính xác." : "Chưa đúng."),
        expectedAnswer: nextResult?.expected_answer ?? currentQuestion.correctAnswer,
        selectedAnswer: selectedText,
      };
      const nextAnswerResults = {
        ...answerResults,
        [currentQuestion.id]: normalizedResult,
      };

      setAnswerResults(nextAnswerResults);

      if (currentIndex < lesson.questions.length - 1) {
        setCurrentIndex((value) => value + 1);
        return;
      }

      const nextCorrectCount = Object.values(nextAnswerResults).filter((item) => item.isCorrect).length;
      submitLessonResult(lesson.id, {
        completed: true,
        score: nextCorrectCount,
        totalQuestions: lesson.questions.length,
        correctCount: nextCorrectCount,
        wrongQuestionIds: lesson.questions.filter((question) => nextAnswerResults[question.id]?.isCorrect === false).map((question) => question.id),
      });
      setShowResult(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRestart() {
    resetLessonProgress(lesson.id);
    setCurrentIndex(0);
    setAnswers({});
    setAnswerResults({});
    setShowResult(false);
  }

  if (showResult) {
    return (
      <section className="vmora-grammar-page">
        <div className="vmora-grammar-wrap">
          <div className="vmora-grammar-result-card">
            <p className="vmora-grammar-kicker">Ket qua bai hoc</p>
            <h1>{lesson.title}</h1>
            <div className="vmora-grammar-result-score">
              <strong>
                {correctCount}/{lesson.questions.length}
              </strong>
              <span>câu đúng</span>
            </div>

            <div className="vmora-grammar-result-list">
              {lesson.questions.map((question) => {
                const questionResult = answerResults[question.id];
                const isCorrect = questionResult?.isCorrect ?? false;
                return (
                  <article className={isCorrect ? "vmora-grammar-result-item is-correct" : "vmora-grammar-result-item is-wrong"} key={question.id}>
                    <strong>{question.prompt}</strong>
                    {question.sentence ? <p>{question.sentence}</p> : null}
                    <span>Bạn chọn: {questionResult?.selectedAnswer ?? getOptionText(question, answers[question.id])}</span>
                    <span>Đáp án đúng: {question.correctAnswer}</span>
                    <small>{questionResult?.feedback ?? question.explanation}</small>
                  </article>
                );
              })}
            </div>

            <div className="vmora-grammar-actions">
              <button className="vmora-grammar-ghost" onClick={handleRestart} type="button">
                Làm lại
              </button>
              <button className="vmora-grammar-primary" onClick={() => navigate(`/ngu-phap${location.search}`)} type="button">
                Về chủ đề
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="vmora-grammar-page">
      <div className="vmora-grammar-wrap">
        <div className="vmora-grammar-practice-shell">
          <div className="vmora-grammar-practice-head">
            <div className="vmora-grammar-progress">
              <div className="vmora-grammar-progress-copy">
                <span>
                  Câu {currentIndex + 1}/{lesson.questions.length}
                </span>
                <strong>{lesson.title}</strong>
              </div>
              <div className="vmora-grammar-progress-track">
                <div className="vmora-grammar-progress-bar" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            <span className={getGrammarDifficultyClass(lesson.difficulty)}>{lesson.difficulty}</span>
          </div>

          <article className="vmora-grammar-rule-card">
            <p className="vmora-grammar-kicker">Quy tắc</p>
            <h1>{lesson.rule}</h1>
          </article>

          <article className="vmora-grammar-question-card">
            <p className="vmora-grammar-kicker">Câu hỏi</p>
            <h2>{currentQuestion.prompt}</h2>
            {currentQuestion.sentence ? <p>{currentQuestion.sentence}</p> : null}
          </article>

          <div className="vmora-grammar-options">
            {currentQuestion.options.map((option) => (
              <button
                className={selectedAnswer === currentQuestion.optionDetails?.find((item) => item.text === option)?.id ? "vmora-grammar-option is-selected" : "vmora-grammar-option"}
                key={option}
                onClick={() =>
                  setAnswers((current) => ({
                    ...current,
                    [currentQuestion.id]: currentQuestion.optionDetails?.find((item) => item.text === option)?.id ?? option,
                  }))
                }
                type="button"
              >
                {option}
              </button>
            ))}
          </div>

          <div className="vmora-grammar-actions">
            <Link className="vmora-grammar-link" to={`/ngu-phap${location.search}`}>
              Quay lại danh sách bài học
            </Link>
            <button className="vmora-grammar-primary" disabled={!selectedAnswer || isSubmitting} onClick={handleNext} type="button">
              {currentIndex === lesson.questions.length - 1 ? "Nộp bài" : "Câu tiếp theo"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
