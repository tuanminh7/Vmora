export function normalizeWritingAnswer(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function diffChars(userInput: string, answer: string) {
  return answer.split("").map((char, index) => ({
    char,
    correct: userInput[index] === char,
  }));
}

export function speakText(text: string, languageCode: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) {
    return;
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
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}

export function getExerciseTypeLabel(type: string) {
  return type === "write_sentence" ? "Viết câu" : "Gõ lại câu";
}

export function getDifficultyTone(difficulty: string) {
  if (difficulty === "Nâng cao") {
    return "vmora-writing-badge vmora-writing-badge-hard";
  }

  if (difficulty === "Trung cấp") {
    return "vmora-writing-badge vmora-writing-badge-mid";
  }

  return "vmora-writing-badge vmora-writing-badge-basic";
}
