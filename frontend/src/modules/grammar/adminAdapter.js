function normalizeDifficulty(value) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (raw.includes("nang")) return "Nâng cao";
  if (raw.includes("trung")) return "Trung cấp";
  return "Cơ bản";
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getTopicSeed(activity, topicKey) {
  const payload = activity.payload ?? {};
  return {
    id: normalizeText(payload.topic_id, `grammar-topic-${topicKey}`),
    label: normalizeText(payload.topic_label, topicKey.toUpperCase()),
    title: normalizeText(payload.topic_title, topicKey),
    description: normalizeText(payload.topic_description, activity.description ?? "Chủ đề ngữ pháp do admin cấu hình."),
    lessons: [],
  };
}

function getLessonSeed(activity, lessonKey) {
  const payload = activity.payload ?? {};
  return {
    id: lessonKey,
    title: normalizeText(payload.lesson_title, activity.title ?? "Bài ngữ pháp"),
    description: normalizeText(payload.lesson_description, activity.description ?? activity.prompt ?? "Bài ngữ pháp do admin cấu hình."),
    difficulty: normalizeDifficulty(payload.difficulty),
    rule: normalizeText(payload.rule, activity.description ?? "Làm bài và xem giải thích sau mỗi câu."),
    questions: [],
    _orderIndex: Number(activity.order_index ?? 0),
  };
}

function toQuestion(activity) {
  const payload = activity.payload ?? {};
  const rawOptions = Array.isArray(payload.options) ? payload.options : [];
  const optionDetails = rawOptions
    .map((option, index) => {
      const id = normalizeText(option?.id, `option-${index + 1}`);
      const text = normalizeText(option?.text ?? option?.label ?? option?.value, "");
      if (!text) return null;
      return { id, text };
    })
    .filter(Boolean);

  if (!optionDetails.length) {
    return null;
  }

  const correctAnswer =
    optionDetails.find((option) => option.id === payload.correct_option_id)?.text ??
    normalizeText(payload.display_answer, optionDetails[0]?.text ?? "");

  return {
    id: String(activity.id),
    prompt: normalizeText(activity.prompt, activity.title ?? "Câu hỏi ngữ pháp"),
    sentence: normalizeText(payload.sentence, ""),
    explanation: normalizeText(payload.explanation, activity.description ?? "Xem lại quy tắc và thử lại."),
    options: optionDetails.map((option) => option.text),
    optionDetails,
    correctAnswer,
    practiceActivity: activity,
    _orderIndex: Number(activity.order_index ?? 0),
  };
}

export function getAdminGrammarTopics(activities) {
  const topicMap = new Map();

  activities.forEach((activity) => {
    if (activity.practice_skill !== "grammar") {
      return;
    }

    const question = toQuestion(activity);
    if (!question) {
      return;
    }

    const payload = activity.payload ?? {};
    const topicKey = normalizeText(activity.topic ?? payload.topic, "Ngữ pháp");
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

    lesson.questions.push(question);
    lesson._orderIndex = Math.min(lesson._orderIndex ?? question._orderIndex, question._orderIndex);
  });

  return Array.from(topicMap.values())
    .map((topic) => ({
      ...topic,
      lessons: topic.lessons
        .map((lesson) => ({
          ...lesson,
          questions: lesson.questions
            .sort((left, right) => (left._orderIndex ?? 0) - (right._orderIndex ?? 0))
            .map(({ _orderIndex: _questionOrderIndex, ...question }) => question),
        }))
        .sort((left, right) => (left._orderIndex ?? 0) - (right._orderIndex ?? 0))
        .map(({ _orderIndex: _lessonOrderIndex, ...lesson }) => lesson),
    }))
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function getAdminGrammarLessonById(activities, lessonId) {
  if (!lessonId) {
    return null;
  }

  const topics = getAdminGrammarTopics(activities);
  for (const topic of topics) {
    const lesson = topic.lessons.find((item) => item.id === lessonId);
    if (lesson) {
      return lesson;
    }
  }

  return null;
}
