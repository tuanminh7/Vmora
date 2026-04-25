function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getTopicSeed(activity, topicKey) {
  const payload = activity.payload ?? {};
  return {
    id: normalizeText(payload.topic_id, `vocab-topic-${topicKey}`),
    label: normalizeText(payload.topic_label, topicKey.toUpperCase()),
    title: normalizeText(payload.topic_title, topicKey),
    description: normalizeText(payload.topic_description, activity.description ?? "Chủ đề từ vựng do admin cấu hình."),
    lessons: [],
  };
}

function getLessonSeed(activity, lessonKey) {
  const payload = activity.payload ?? {};
  return {
    id: lessonKey,
    title: normalizeText(payload.lesson_title, activity.title ?? "Bài từ vựng"),
    words: [],
    _orderIndex: Number(activity.order_index ?? 0),
  };
}

function toWord(activity) {
  const payload = activity.payload ?? {};
  const hanzi = normalizeText(payload.front_word || payload.word || payload.hanzi, activity.title ?? "");
  const meaning = normalizeText(payload.back_meaning || payload.meaning, activity.description ?? "");

  if (!hanzi || !meaning) {
    return null;
  }

  return {
    id: String(activity.id),
    hanzi,
    pinyin: normalizeText(payload.pinyin, ""),
    meaning,
    example: normalizeText(payload.example, ""),
    status: "new",
    correctCount: 0,
    wrongCount: 0,
    _orderIndex: Number(activity.order_index ?? 0),
  };
}

export function getAdminVocabularyTopics(activities) {
  const topicMap = new Map();

  activities.forEach((activity) => {
    if (activity.practice_skill !== "vocabulary" || activity.activity_type !== "flashcard") {
      return;
    }

    const word = toWord(activity);
    if (!word) {
      return;
    }

    const payload = activity.payload ?? {};
    const topicKey = normalizeText(activity.topic ?? payload.topic, "Từ vựng");
    const lessonKey = String(activity.lesson_id ?? payload.lesson_id ?? activity.code ?? activity.id);

    if (!topicMap.has(topicKey)) {
      topicMap.set(topicKey, getTopicSeed(activity, topicKey));
    }

    const topic = topicMap.get(topicKey);
    let lesson = topic.lessons.find((item) => item.id === lessonKey);

    if (!lesson) {
      lesson = getLessonSeed(activity, lessonKey);
      topic.lessons.push(lesson);
    }

    lesson.words.push(word);
    lesson._orderIndex = Math.min(lesson._orderIndex ?? word._orderIndex, word._orderIndex);
  });

  return Array.from(topicMap.values())
    .map((topic) => ({
      ...topic,
      lessons: topic.lessons
        .map((lesson) => ({
          ...lesson,
          words: lesson.words
            .sort((left, right) => (left._orderIndex ?? 0) - (right._orderIndex ?? 0))
            .map(({ _orderIndex: _wordOrderIndex, ...word }) => word),
        }))
        .sort((left, right) => (left._orderIndex ?? 0) - (right._orderIndex ?? 0))
        .map(({ _orderIndex: _lessonOrderIndex, ...lesson }) => lesson),
    }))
    .sort((left, right) => left.title.localeCompare(right.title));
}
