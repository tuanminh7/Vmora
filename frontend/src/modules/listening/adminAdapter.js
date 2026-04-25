function normalizeDifficulty(value) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (raw.includes("nang")) return "Nâng cao";
  if (raw.includes("trung")) return "Trung cấp";
  return "Cơ bản";
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeListeningType(activity) {
  const payload = activity.payload ?? {};
  const routeType = normalizeText(payload.listening_type || payload.exercise_type || payload.route_type, "");
  const activityType = normalizeText(activity.activity_type, "");
  const mediaType = normalizeText(payload.media_type, "");
  const hasVideo = Boolean(payload.video_url) || mediaType === "video";
  const hasAudio = Boolean(payload.audio_url) || mediaType === "audio";

  if (routeType === "audio_choice" || routeType === "audio_write" || routeType === "video_choice") {
    return routeType;
  }

  if (activityType === "audio" || activityType === "voice") {
    return "audio_write";
  }

  if (hasVideo && (activityType === "quiz" || activityType === "image" || activityType === "video")) {
    return "video_choice";
  }

  if ((hasAudio || activityType === "quiz" || activityType === "image") && Array.isArray(payload.options)) {
    return "audio_choice";
  }

  return null;
}

function getTopicSeed(activity, topicKey) {
  const payload = activity.payload ?? {};
  return {
    id: normalizeText(payload.topic_id, `listening-topic-${topicKey}`),
    label: normalizeText(payload.topic_label, topicKey.toUpperCase()),
    title: normalizeText(payload.topic_title, topicKey),
    description: normalizeText(payload.topic_description, activity.description ?? "Chủ đề luyện nghe do admin cấu hình."),
    lessons: [],
  };
}

function getLessonSeed(activity, lessonKey) {
  const payload = activity.payload ?? {};
  return {
    id: lessonKey,
    title: normalizeText(payload.lesson_title, activity.title ?? "Bài luyện nghe"),
    description: normalizeText(payload.lesson_description, activity.description ?? activity.prompt ?? "Bài luyện nghe do admin cấu hình."),
    exercises: [],
    _orderIndex: Number(activity.order_index ?? 0),
  };
}

function buildOptionDetails(payload) {
  return (Array.isArray(payload.options) ? payload.options : [])
    .map((option, index) => {
      const id = normalizeText(option?.id, `option-${index + 1}`);
      const text = normalizeText(option?.text ?? option?.label ?? option?.value, "");
      if (!text) return null;
      return { id, text };
    })
    .filter(Boolean);
}

function toExercise(activity, languageCode) {
  const payload = activity.payload ?? {};
  const listeningType = normalizeListeningType(activity);

  if (!listeningType) {
    return null;
  }

  const optionDetails = buildOptionDetails(payload);
  const correctOptionText =
    optionDetails.find((option) => option.id === payload.correct_option_id)?.text ??
    normalizeText(payload.display_answer, optionDetails[0]?.text ?? "");
  const answerText =
    listeningType === "audio_write"
      ? normalizeText(payload.display_answer, Array.isArray(payload.accepted_answers) ? payload.accepted_answers[0] ?? "" : "")
      : correctOptionText;

  if (!answerText) {
    return null;
  }

  return {
    id: String(activity.id),
    languageCode,
    type: listeningType,
    question: normalizeText(activity.prompt, activity.title ?? "Câu hỏi luyện nghe"),
    mediaUrl: normalizeText(payload.audio_url || payload.video_url, ""),
    transcript: normalizeText(payload.transcript, answerText),
    answer: answerText,
    options: optionDetails.length ? optionDetails.map((option) => option.text) : undefined,
    optionDetails: optionDetails.length ? optionDetails : undefined,
    hints: Array.isArray(payload.hints) ? payload.hints.filter((item) => typeof item === "string" && item.trim()) : undefined,
    difficulty: normalizeDifficulty(payload.difficulty),
    explanation: normalizeText(payload.explanation, activity.description ?? ""),
    practiceActivity: activity,
    _orderIndex: Number(activity.order_index ?? 0),
  };
}

export function getAdminListeningTopicsByType(activities, type, languageCode = "zh") {
  const topicMap = new Map();

  activities.forEach((activity) => {
    const exercise = toExercise(activity, languageCode);
    if (!exercise || exercise.type !== type) {
      return;
    }

    const payload = activity.payload ?? {};
    const topicKey = normalizeText(activity.topic ?? payload.topic, "Luyện nghe");
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

    lesson.exercises.push(exercise);
    lesson._orderIndex = Math.min(lesson._orderIndex ?? exercise._orderIndex, exercise._orderIndex);
  });

  return Array.from(topicMap.values())
    .map((topic) => ({
      ...topic,
      lessons: topic.lessons
        .map((lesson) => ({
          ...lesson,
          exercises: lesson.exercises
            .sort((left, right) => (left._orderIndex ?? 0) - (right._orderIndex ?? 0))
            .map(({ _orderIndex: _exerciseOrderIndex, ...exercise }) => exercise),
        }))
        .sort((left, right) => (left._orderIndex ?? 0) - (right._orderIndex ?? 0))
        .map(({ _orderIndex: _lessonOrderIndex, ...lesson }) => lesson),
    }))
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function getAdminListeningLessonById(activities, type, lessonId, languageCode = "zh") {
  if (!lessonId) {
    return null;
  }

  const topics = getAdminListeningTopicsByType(activities, type, languageCode);
  for (const topic of topics) {
    const lesson = topic.lessons.find((item) => item.id === lessonId);
    if (lesson) {
      return lesson;
    }
  }

  return null;
}

export function getAdminListeningExercisesByLesson(activities, type, lessonId, languageCode = "zh") {
  return getAdminListeningLessonById(activities, type, lessonId, languageCode)?.exercises ?? [];
}
