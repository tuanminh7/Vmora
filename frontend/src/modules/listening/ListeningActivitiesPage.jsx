import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { countPracticeLessons, countPracticeTopics, getActivityTypePracticeActivities, getSkillPracticeActivities } from "../practiceAdmin";
import { getListeningActivityMeta } from "./helpers";
import { useListeningStore } from "./store";
import "./listening.css";

const LISTENING_ACTIVITY_TYPES = ["audio_choice", "audio_write", "video_choice"];

export default function ListeningActivitiesPage({ app }) {
  const navigate = useNavigate();
  const location = useLocation();
  const setLanguage = useListeningStore((state) => state.setLanguage);
  const languageCode = app.user?.learning_language_code ?? app.selectedLanguage ?? "zh";

  useEffect(() => {
    setLanguage(languageCode);
  }, [languageCode, setLanguage]);

  const adminListeningActivities = getSkillPracticeActivities(app, location.search, "listening");

  if (!adminListeningActivities.length) {
    return (
      <section className="vmora-listening-page">
        <div className="vmora-listening-wrap">
          <div className="vmora-listening-empty">
            <p className="vmora-listening-kicker">Luyện nghe</p>
            <h1>Admin chưa mở bài luyện nghe cho nhánh này</h1>
            <p>Cần thêm bài ôn luyện trong admin để mở danh sách nghe đúng theo nhánh free hoặc paid.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="vmora-listening-page">
      <div className="vmora-listening-wrap">
        <header className="vmora-listening-hero">
          <h1>Luyện nghe</h1>
        </header>

        <div className="vmora-listening-activity-grid">
          {LISTENING_ACTIVITY_TYPES.map((type) => {
            const meta = getListeningActivityMeta(type);
            const adminTypeActivities = getActivityTypePracticeActivities(app, location.search, "listening", type);
            const topicCount = countPracticeTopics(adminTypeActivities);
            const lessonCount = countPracticeLessons(adminTypeActivities);

            return (
              <article className="vmora-listening-activity-card" key={type}>
                <div className="vmora-listening-activity-icon">{meta.icon}</div>
                <h2>{meta.title}</h2>
                <span>{topicCount} chủ đề - {lessonCount} bài học</span>
                <button
                  className="vmora-listening-primary"
                  onClick={() => navigate(`${meta.path}${location.search}`)}
                  type="button"
                >
                  Xem chủ đề
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
