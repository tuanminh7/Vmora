import { PRACTICE_LABELS } from "../adminTemplates";
import { Title, toYouTubeEmbedUrl } from "./ui";

export default function PracticeSection({
  onAnswerChange,
  onSelectPractice,
  onSubmitPractice,
  practiceActivities,
  practiceAnswers,
  practiceId,
  practiceResult,
  selectedPractice,
  skillLabel,
}) {
  return (
    <section className="flow-card">
      <Title eyebrow="Ôn luyện" title={skillLabel ?? "Ôn luyện"} />

      <div className="practice-nav">
        {practiceActivities.map((item) => (
          <button
            className={item.id === practiceId ? "practice-tab practice-tab-active" : "practice-tab"}
            key={item.id}
            onClick={() => onSelectPractice(item.id)}
            type="button"
          >
            <span>{item.order_index}</span>
            <strong>{item.title}</strong>
            <small>{PRACTICE_LABELS[item.activity_type]}</small>
          </button>
        ))}
      </div>

      {selectedPractice ? (
        <div className="practice-panel">
          <div className="practice-panel-head">
            <div>
              <p className="eyebrow">{skillLabel ?? PRACTICE_LABELS[selectedPractice.activity_type]}</p>
              <h3>{selectedPractice.title}</h3>
            </div>
            <span className="badge-free">{selectedPractice.is_free ? "Cơ bản" : "Theo gói"}</span>
          </div>

          <p className="practice-prompt">{selectedPractice.prompt}</p>

          {selectedPractice.activity_type === "flashcard" ? (
            <div className="practice-card-stack">
              <article className="flashcard-face">
                <span>Mặt trước</span>
                <strong>{selectedPractice.payload.front_word}</strong>
              </article>
              <article className="flashcard-face flashcard-back">
                <span>Mặt sau</span>
                <strong>{selectedPractice.payload.back_meaning}</strong>
              </article>
            </div>
          ) : null}

          {["quiz", "image"].includes(selectedPractice.activity_type) ? (
            <div className={selectedPractice.activity_type === "image" ? "practice-media-layout" : "practice-option-list"}>
              {selectedPractice.activity_type === "image" ? (
                <img alt="" className="practice-image" src={selectedPractice.payload.image_url} />
              ) : null}
              <div className="practice-option-list">
                {selectedPractice.payload.options?.map((option) => (
                  <button
                    className={practiceAnswers.option_id === option.id ? "practice-option practice-option-active" : "practice-option"}
                    key={option.id}
                    onClick={() => onAnswerChange({ option_id: option.id })}
                    type="button"
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {selectedPractice.activity_type === "matching" ? (
            <div className="matching-grid">
              {selectedPractice.payload.left_items?.map((left) => (
                <div className="matching-row" key={left.id}>
                  <strong>{left.text}</strong>
                  <select
                    onChange={(event) =>
                      onAnswerChange({
                        ...practiceAnswers,
                        pairs: { ...(practiceAnswers.pairs ?? {}), [left.id]: event.target.value },
                      })
                    }
                    value={practiceAnswers.pairs?.[left.id] ?? ""}
                  >
                    <option value="">Chọn</option>
                    {selectedPractice.payload.right_items?.map((right) => (
                      <option key={right.id} value={right.id}>
                        {right.text}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ) : null}

          {selectedPractice.activity_type === "video" ? (
            <div className="practice-video-wrap">
              <iframe allowFullScreen src={toYouTubeEmbedUrl(selectedPractice.payload.video_url)} title={selectedPractice.title} />
            </div>
          ) : null}

          {["typing", "audio", "voice"].includes(selectedPractice.activity_type) ? (
            <div className="practice-audio-box">
              {selectedPractice.activity_type === "audio" ? <audio controls src={selectedPractice.payload.audio_url} /> : null}
              <label className="field">
                <span>Trả lời</span>
                <input onChange={(event) => onAnswerChange({ text: event.target.value })} value={practiceAnswers.text ?? ""} />
              </label>
            </div>
          ) : null}

          {selectedPractice.activity_type === "mixed" ? (
            <div className="mixed-stack">
              {selectedPractice.payload.questions?.map((question) => (
                <article className="mixed-question" key={question.id}>
                  <strong>{question.prompt}</strong>
                  {question.options ? (
                    question.options.map((option) => (
                      <button
                        className={practiceAnswers.mixed?.[question.id] === option.id ? "practice-option practice-option-active" : "practice-option"}
                        key={option.id}
                        onClick={() =>
                          onAnswerChange({
                            ...practiceAnswers,
                            mixed: { ...(practiceAnswers.mixed ?? {}), [question.id]: option.id },
                          })
                        }
                        type="button"
                      >
                        {option.text}
                      </button>
                    ))
                  ) : (
                    <input
                      onChange={(event) =>
                        onAnswerChange({
                          ...practiceAnswers,
                          mixed: { ...(practiceAnswers.mixed ?? {}), [question.id]: event.target.value },
                        })
                      }
                    />
                  )}
                </article>
              ))}
            </div>
          ) : null}

          <div className="lesson-detail-actions">
            <button className="primary-button complete-button" onClick={onSubmitPractice} type="button">
              Nộp bài
            </button>
            {practiceResult ? (
              <span className={practiceResult.is_correct ? "completion-badge done" : "completion-badge"}>
                {practiceResult.feedback} ({practiceResult.score_percent}%)
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
