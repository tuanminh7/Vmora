import type { ListeningDifficulty, ListeningExerciseType } from "./types";

export function normalizeListeningAnswer(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function diffChars(input: string, answer: string) {
  return answer.split("").map((char, index) => ({
    char,
    correct: input[index] === char,
  }));
}

export function speakListeningText(text: string, languageCode: string, rate = 1) {
  if (typeof window === "undefined" || !text || !("speechSynthesis" in window)) {
    return null;
  }

  const langMap: Record<string, string> = {
    zh: "zh-CN",
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
    de: "de-DE",
  };

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langMap[languageCode] ?? "zh-CN";
  utterance.rate = rate;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopListeningSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
}

export function getListeningDifficultyClass(difficulty: ListeningDifficulty) {
  if (difficulty === "Nâng cao") {
    return "vmora-listening-badge vmora-listening-badge-hard";
  }

  if (difficulty === "Trung cấp") {
    return "vmora-listening-badge vmora-listening-badge-mid";
  }

  return "vmora-listening-badge vmora-listening-badge-basic";
}

export function getListeningActivityMeta(type: ListeningExerciseType) {
  if (type === "audio_write") {
    return {
      icon: "✍️",
      title: "Nghe và viết lại",
      description: "Nghe audio và gõ lại câu vừa nghe",
      path: "/luyen-nghe/audio-write",
    };
  }

  if (type === "video_choice") {
    return {
      icon: "🎬",
      title: "Xem video & chọn đáp án",
      description: "Xem video ngắn và trả lời câu hỏi",
      path: "/luyen-nghe/video-choice",
    };
  }

  return {
    icon: "🎧",
    title: "Nghe & chọn đáp án",
    description: "Nghe audio và chọn đáp án đúng trong 4 lựa chọn",
    path: "/luyen-nghe/audio-choice",
  };
}

export function formatPlayerTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function estimateSpeechDuration(text: string, rate: number) {
  return Math.max(6, Math.round((text.length * 0.36) / Math.max(rate, 0.75)));
}

export function buildHintPreview(hints: string[] | undefined, usedHints: number) {
  if (!hints?.length) {
    return [];
  }

  return hints.map((token, index) => (index < usedHints ? token : "_"));
}

export function createVideoPosterDataUrl(label: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <rect width="1280" height="720" rx="28" fill="#d4d4d8" />
      <circle cx="640" cy="320" r="84" fill="#ffffff" opacity="0.88" />
      <polygon points="620,276 620,364 694,320" fill="#7c3aed" />
      <text x="640" y="470" font-size="42" text-anchor="middle" fill="#3f3f46" font-family="Arial, sans-serif">${label}</text>
      <text x="640" y="528" font-size="24" text-anchor="middle" fill="#71717a" font-family="Arial, sans-serif">Placeholder video preview</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
