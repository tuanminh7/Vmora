function normalizeDifficulty(value) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (raw.includes("nang")) return "Nâng cao";
  if (raw.includes("trung")) return "Trung cấp";
  return "Cơ bản";
}

function normalizeExerciseType(activity) {
  const payload = activity.payload ?? {};
  const rawType = typeof payload.exercise_type === "string" ? payload.exercise_type.trim() : "";

  if (rawType === "write_sentence" || rawType === "type_by_meaning") {
    return rawType;
  }

  return rawType === "free_write" ? "write_sentence" : "type_by_meaning";
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function getAdminWritingExercises(activities, languageCode = "zh") {
  return activities
    .filter((activity) => activity.practice_skill === "writing" && ["typing", "audio", "voice"].includes(activity.activity_type))
    .map((activity) => {
      const payload = activity.payload ?? {};
      const answer = normalizeText(payload.display_answer, Array.isArray(payload.accepted_answers) ? payload.accepted_answers[0] ?? "" : "");

      if (!answer) {
        return null;
      }

      return {
        id: String(activity.id),
        languageCode,
        type: normalizeExerciseType(activity),
        hanzi: normalizeText(payload.hanzi, activity.title ?? "Luyện viết"),
        pinyin: normalizeText(payload.pinyin, ""),
        meaning: normalizeText(payload.meaning, activity.prompt ?? activity.description ?? "Nhập câu trả lời."),
        answer,
        hints: Array.isArray(payload.hints) ? payload.hints.filter((item) => typeof item === "string" && item.trim()) : [],
        difficulty: normalizeDifficulty(payload.difficulty),
        explanation: normalizeText(payload.explanation, activity.description ?? ""),
        practiceActivity: activity,
        _orderIndex: Number(activity.order_index ?? 0),
      };
    })
    .filter(Boolean)
    .sort((left, right) => (left._orderIndex ?? 0) - (right._orderIndex ?? 0))
    .map(({ _orderIndex, ...exercise }) => exercise);
}
