export function getLessonContext(topics, lessonId) {
  for (const topic of topics) {
    const lesson = topic.lessons.find((entry) => entry.id === lessonId);

    if (lesson) {
      return {
        topic,
        lesson,
      };
    }
  }

  return null;
}

export function shuffleArray(items) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

export function speakVocabularyText(text, languageCode = "zh") {
  if (typeof window === "undefined" || !text || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const langMap = {
    zh: "zh-CN",
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
    de: "de-DE",
  };
  utterance.lang = langMap[languageCode] ?? "zh-CN";
  utterance.rate = 0.9;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

export function buildQuizQuestion(word, lessonWords, type) {
  const distractors = shuffleArray(lessonWords.filter((entry) => entry.id !== word.id)).slice(0, 3);
  const optionsSource = shuffleArray([word, ...distractors]);

  if (type === "hanzi-to-meaning") {
    return {
      type,
      prompt: word.hanzi,
      promptSubline: word.pinyin,
      correctLabel: word.meaning,
      options: optionsSource.map((entry) => ({
        id: entry.id,
        label: entry.meaning,
        subline: entry.pinyin,
        isCorrect: entry.id === word.id,
      })),
    };
  }

  return {
    type,
    prompt: word.meaning,
    promptSubline: "Chọn Hán tự đúng",
    correctLabel: word.hanzi,
    options: optionsSource.map((entry) => ({
      id: entry.id,
      label: entry.hanzi,
      subline: entry.pinyin,
      isCorrect: entry.id === word.id,
    })),
  };
}
