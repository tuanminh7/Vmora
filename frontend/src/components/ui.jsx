export function ProgressBar({ value }) {
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Title({ eyebrow, title }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  );
}

export function toYouTubeEmbedUrl(url) {
  try {
    const target = new URL(url);
    const videoId = target.hostname.includes("youtu.be")
      ? target.pathname.slice(1)
      : target.searchParams.get("v");
    const start = target.searchParams.get("t")?.replace("s", "") ?? "0";
    return videoId ? `https://www.youtube.com/embed/${videoId}?start=${start}` : url;
  } catch {
    return url;
  }
}
