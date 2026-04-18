import { Title } from "./ui";

export default function ExamSection({
  examCertificate,
  examAnswers,
  examDetail,
  examResult,
  exams,
  onCertificateChange,
  onExamAnswerChange,
  onOpenExam,
  onSubmitExam,
}) {
  const certificates = [...new Set(exams.map((item) => item.certificate_code || item.level_code || "Chung"))];

  return (
    <section className="flow-card">
      <Title eyebrow="THI" title="THI" />

      <div className="course-grid">
        <article className="course-card">
          <p className="eyebrow">Thi</p>
          <h3>Kho đề thi</h3>
          <p>{exams.length} đề hiện có.</p>
        </article>
        <article className="course-card">
          <p className="eyebrow">Thi</p>
          <h3>Phân theo chứng chỉ</h3>
          <div className="mini-list">
            {certificates.map((certificate) => (
              <button
                className="plain-list-button"
                key={certificate}
                onClick={() => onCertificateChange(certificate === examCertificate ? "" : certificate)}
                type="button"
              >
                {certificate === examCertificate ? "Đang chọn" : "Chọn"} - {certificate}
              </button>
            ))}
          </div>
        </article>
      </div>

      <div className="course-grid">
        {exams.map((item) => (
          <article className="course-card" key={item.id}>
            <p className="eyebrow">{item.certificate_code || item.level_code || "THI"}</p>
            <h3>{item.title}</h3>
            {item.description ? <p>{item.description}</p> : null}
            <button className="primary-button complete-button" onClick={() => onOpenExam(item)} type="button">
              Mở đề
            </button>
          </article>
        ))}
      </div>

      {examDetail ? (
        <div className="lesson-detail-panel">
          <h2>{examDetail.title}</h2>
          <p className="empty-copy">
            {examDetail.duration_minutes} phút • Đạt {examDetail.passing_score}%
          </p>

          <div className="mixed-stack">
            {examDetail.questions.map((question) => (
              <article className="mixed-question" key={question.id}>
                <strong>{question.prompt}</strong>
                {question.payload.options ? (
                  question.payload.options.map((option) => (
                    <button
                      className={examAnswers[question.id] === option.id ? "practice-option practice-option-active" : "practice-option"}
                      key={option.id}
                      onClick={() => onExamAnswerChange(question.id, option.id)}
                      type="button"
                    >
                      {option.text}
                    </button>
                  ))
                ) : (
                  <input onChange={(event) => onExamAnswerChange(question.id, event.target.value)} value={examAnswers[question.id] ?? ""} />
                )}
              </article>
            ))}
          </div>

          <button className="primary-button complete-button" onClick={onSubmitExam} type="button">
            Nộp bài thi
          </button>

          {examResult ? <p className="practice-answer">{examResult.feedback} - {examResult.score_percent}%</p> : null}
        </div>
      ) : null}
    </section>
  );
}
