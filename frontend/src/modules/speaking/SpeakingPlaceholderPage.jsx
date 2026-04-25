import { Link } from "react-router-dom";
import "./speaking.css";

export default function SpeakingPlaceholderPage() {
  return (
    <section className="vmora-speaking-page">
      <div className="vmora-speaking-wrap">
        <div className="vmora-speaking-card">
          <p className="vmora-speaking-kicker">Luyện nói</p>
          <h1>Chức năng đang phát triển</h1>
          <div className="vmora-speaking-actions">
            <Link className="vmora-speaking-primary" to="/on-luyen">
              Về ôn luyện
            </Link>
            <Link className="vmora-speaking-ghost" to="/hoc-tap">
              Về học tập
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
