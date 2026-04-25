export const ADMIN_TABS = [
  "languages",
  "levels",
  "roadmaps",
  "stages",
  "courses",
  "sections",
  "lessons",
  "vocabulary",
  "practice",
  "packages",
  "exams",
];

export const PRACTICE_LABELS = {
  flashcard: "Flashcard",
  quiz: "Quizz 4 đáp án",
  matching: "Ghép nối",
  image: "Qua hình ảnh",
  video: "Qua video ngắn",
  typing: "Nghĩa gõ từ",
  audio: "Audio",
  voice: "Voice với AI",
  mixed: "Hỗn hợp",
};

export const PRACTICE_ADMIN_PRESETS = [
  {
    key: "vocabulary_flashcard",
    skillKey: "vocabulary",
    activityType: "flashcard",
    label: "Từ vựng · Flashcard",
    description: "Nguồn chuẩn cho module luyện từ vựng: xem, lật thẻ, trắc nghiệm.",
  },
  {
    key: "writing_typing",
    skillKey: "writing",
    activityType: "typing",
    label: "Luyện viết · Gõ đáp án",
    description: "Dùng cho bài luyện viết với accepted_answers và display_answer.",
  },
  {
    key: "listening_audio_choice",
    skillKey: "listening",
    activityType: "quiz",
    label: "Luyện nghe · Audio chọn đáp án",
    description: "Audio + 4 lựa chọn, nộp theo option_id.",
  },
  {
    key: "listening_audio_write",
    skillKey: "listening",
    activityType: "audio",
    label: "Luyện nghe · Audio viết lại",
    description: "Audio + transcript + accepted_answers cho dạng nghe chép lại.",
  },
  {
    key: "listening_video_choice",
    skillKey: "listening",
    activityType: "quiz",
    label: "Luyện nghe · Video chọn đáp án",
    description: "Video + 4 lựa chọn, module nghe sẽ nhận ra qua video_url.",
  },
  {
    key: "grammar_quiz",
    skillKey: "grammar",
    activityType: "quiz",
    label: "Ngữ pháp · Trắc nghiệm",
    description: "Một câu hỏi ngữ pháp trong lesson, group theo topic và lesson_id.",
  },
  {
    key: "speaking_voice",
    skillKey: "speaking",
    activityType: "voice",
    label: "Luyện nói · Voice",
    description: "Preset giữ chỗ cho module luyện nói hiện tại.",
  },
];

function createPracticePayloadPreset(presetKey, languageCode = "en") {
  if (presetKey === "writing_typing") {
    return {
      practice_skill: "writing",
      topic: "Luyện viết",
      topic_id: `${languageCode}-writing-topic-basic`,
      topic_label: "LUYỆN VIẾT",
      topic_title: "Luyện viết cơ bản",
      topic_description: "Nhập câu trả lời theo nghĩa, gợi ý và đáp án chuẩn.",
      lesson_id: `${languageCode}-writing-lesson-1`,
      lesson_title: "Bài 1 - Viết câu cơ bản",
      lesson_description: "Luyện viết câu ngắn và đối chiếu đáp án.",
      exercise_type: "type_by_meaning",
      hanzi: languageCode === "zh" ? "请根据意思输入汉字" : "Type the sentence",
      pinyin: languageCode === "zh" ? "qǐng gēnjù yìsi shūrù hànzì" : "",
      meaning: "Tôi học ngôn ngữ này mỗi tối.",
      display_answer: "I study this language every evening.",
      accepted_answers: ["I study this language every evening."],
      hints: ["I study", "this language", "every evening"],
      difficulty: "Cơ bản",
      explanation: "Dùng mẫu câu chủ ngữ + động từ + bổ ngữ thời gian.",
    };
  }

  if (presetKey === "listening_audio_choice") {
    return {
      practice_skill: "listening",
      listening_type: "audio_choice",
      topic: "Luyện nghe cơ bản",
      topic_id: `${languageCode}-listening-topic-audio-choice`,
      topic_label: "AUDIO",
      topic_title: "Nghe và chọn đáp án",
      topic_description: "Nghe audio ngắn và chọn đáp án đúng.",
      lesson_id: `${languageCode}-listening-lesson-audio-choice-1`,
      lesson_title: "Bài 1 - Nghe địa điểm",
      lesson_description: "Nghe audio và chọn nội dung đúng.",
      audio_url: "/audio/sample.mp3",
      transcript: languageCode === "zh" ? "我今天要去图书馆看书。" : "I am going to the library after class.",
      options: [
        { id: "a", text: "A. Tôi đi trường" },
        { id: "b", text: "B. Tôi đi thư viện" },
        { id: "c", text: "C. Tôi đi công ty" },
        { id: "d", text: "D. Tôi đi bệnh viện" },
      ],
      correct_option_id: "b",
      difficulty: "Cơ bản",
      explanation: "Đáp án đúng được xác định bằng correct_option_id.",
    };
  }

  if (presetKey === "listening_audio_write") {
    return {
      practice_skill: "listening",
      listening_type: "audio_write",
      topic: "Luyện nghe cơ bản",
      topic_id: `${languageCode}-listening-topic-audio-write`,
      topic_label: "DICTATION",
      topic_title: "Nghe và viết lại",
      topic_description: "Nghe audio và gõ lại câu vừa nghe.",
      lesson_id: `${languageCode}-listening-lesson-audio-write-1`,
      lesson_title: "Bài 1 - Nghe chép lại",
      lesson_description: "Ghi lại đúng nội dung sau khi nghe.",
      audio_url: "/audio/sample-write.mp3",
      transcript: languageCode === "zh" ? "今天天气很好，我想出去散步。" : "The weather is nice today, so I want to take a walk.",
      display_answer: languageCode === "zh" ? "今天天气很好，我想出去散步。" : "The weather is nice today, so I want to take a walk.",
      accepted_answers: [
        languageCode === "zh" ? "今天天气很好，我想出去散步。" : "The weather is nice today, so I want to take a walk.",
      ],
      hints: languageCode === "zh" ? ["今天", "天气", "很好", "散步"] : ["The weather", "is nice", "today", "take a walk"],
      difficulty: "Trung cấp",
      explanation: "Transcript nên trùng với display_answer để dễ đối chiếu.",
    };
  }

  if (presetKey === "listening_video_choice") {
    return {
      practice_skill: "listening",
      listening_type: "video_choice",
      topic: "Luyện nghe video",
      topic_id: `${languageCode}-listening-topic-video-choice`,
      topic_label: "VIDEO",
      topic_title: "Xem video và chọn đáp án",
      topic_description: "Xem video ngắn và trả lời câu hỏi.",
      lesson_id: `${languageCode}-listening-lesson-video-choice-1`,
      lesson_title: "Bài 1 - Video chủ đề cơ bản",
      lesson_description: "Xem video và chọn đáp án phù hợp.",
      video_url: "/video/sample.mp4",
      transcript: languageCode === "zh" ? "大家好，今天我来介绍我的家庭。" : "Hello everyone, today I want to introduce my family.",
      options: [
        { id: "a", text: "A. Thời tiết" },
        { id: "b", text: "B. Gia đình" },
        { id: "c", text: "C. Công việc" },
        { id: "d", text: "D. Du lịch" },
      ],
      correct_option_id: "b",
      difficulty: "Cơ bản",
      explanation: "Nếu có video_url và options, module nghe sẽ render dạng video_choice.",
    };
  }

  if (presetKey === "grammar_quiz") {
    return {
      practice_skill: "grammar",
      topic: "Ngữ pháp nền tảng",
      topic_id: `${languageCode}-grammar-topic-basic`,
      topic_label: "GRAMMAR",
      topic_title: "Ngữ pháp cơ bản",
      topic_description: "Group bài học ngữ pháp theo topic và lesson_id.",
      lesson_id: `${languageCode}-grammar-lesson-1`,
      lesson_title: "Bài 1 - Câu hỏi cơ bản",
      lesson_description: "Một lesson gồm nhiều câu hỏi quiz.",
      rule: "Thêm trợ từ hoặc cấu trúc phù hợp theo ngữ pháp của ngôn ngữ.",
      sentence: languageCode === "zh" ? "Bạn có phải học sinh không?" : "Choose the correct question form.",
      options: [
        { id: "a", text: languageCode === "zh" ? "你是学生。" : "She am a student." },
        { id: "b", text: languageCode === "zh" ? "你是学生吗？" : "She is a student." },
        { id: "c", text: languageCode === "zh" ? "吗你是学生？" : "She are a student." },
        { id: "d", text: languageCode === "zh" ? "你吗是学生？" : "She be a student." },
      ],
      correct_option_id: "b",
      difficulty: "Cơ bản",
      explanation: "Mỗi activity grammar nên là một quiz đơn để module group vào bài học.",
    };
  }

  if (presetKey === "speaking_voice") {
    return {
      practice_skill: "speaking",
      topic: "Luyện nói",
      topic_id: `${languageCode}-speaking-topic-basic`,
      topic_label: "SPEAK",
      topic_title: "Luyện nói đang phát triển",
      topic_description: "Preset giữ chỗ cho voice practice.",
      lesson_id: `${languageCode}-speaking-lesson-1`,
      lesson_title: "Bài 1 - Luyện nói",
      lesson_description: "Dùng cho module luyện nói trong tương lai.",
      display_answer: "Hello, nice to meet you.",
      accepted_answers: ["Hello, nice to meet you."],
      difficulty: "Cơ bản",
      explanation: "Module luyện nói hiện đang để giao diện placeholder.",
    };
  }

  return {
    practice_skill: "vocabulary",
    topic: "Từ vựng cơ bản",
    topic_id: `${languageCode}-vocab-topic-basic`,
    topic_label: "VOCAB",
    topic_title: "Nền tảng từ vựng",
    topic_description: "Nguồn dữ liệu cho xem danh sách, lật thẻ và trắc nghiệm từ vựng.",
    lesson_id: `${languageCode}-vocab-lesson-1`,
    lesson_title: "Bài 1 - Từ vựng mở đầu",
    lesson_description: "Mỗi activity là 1 flashcard trong cùng lesson.",
    front_word: languageCode === "zh" ? "你好" : "Hello",
    back_meaning: "Xin chào",
    pinyin: languageCode === "zh" ? "nǐ hǎo" : "/həˈloʊ/",
    example: languageCode === "zh" ? "你好！很高兴认识你。" : "Hello, nice to meet you.",
  };
}

export function buildPracticeAdminPreset(presetKey = "vocabulary_flashcard", overrides = {}) {
  const preset = PRACTICE_ADMIN_PRESETS.find((item) => item.key === presetKey) ?? PRACTICE_ADMIN_PRESETS[0];
  const languageCode = overrides.language_code || "en";

  return {
    language_code: languageCode,
    lesson_id: overrides.lesson_id ?? 1,
    code: overrides.code || `${preset.key}-${languageCode}`,
    activity_type: preset.activityType,
    title: overrides.title || preset.label,
    description: overrides.description || preset.description,
    prompt: overrides.prompt || "Chinh sua prompt phu hop voi bai hoc nay.",
    payload: {
      ...createPracticePayloadPreset(preset.key, languageCode),
      ...(overrides.payload ?? {}),
    },
    order_index: overrides.order_index ?? 1,
    is_free: overrides.is_free ?? true,
    is_active: overrides.is_active ?? true,
  };
}

function hasNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function pickString(currentValue, fallbackValue) {
  return hasNonEmptyString(currentValue) ? currentValue : fallbackValue;
}

function normalizeLanguageCode(value) {
  return hasNonEmptyString(value) ? value.trim() : "en";
}

const PRACTICE_SHARED_PAYLOAD_KEYS = [
  "topic",
  "topic_label",
  "topic_title",
  "topic_description",
  "lesson_title",
  "lesson_description",
  "difficulty",
  "explanation",
];

function hasOptionList(value) {
  return Array.isArray(value) && value.length >= 2 && value.every((item) => hasNonEmptyString(item?.id) && hasNonEmptyString(item?.text ?? item?.label ?? item?.value));
}

export function detectPracticePresetKey(item = {}) {
  const payload = item.payload ?? {};
  const skill = payload.practice_skill;
  const activityType = item.activity_type;
  const listeningType = payload.listening_type;

  if (skill === "vocabulary" && activityType === "flashcard") return "vocabulary_flashcard";
  if (skill === "writing" && activityType === "typing") return "writing_typing";
  if (skill === "listening" && listeningType === "audio_choice") return "listening_audio_choice";
  if (skill === "listening" && listeningType === "audio_write") return "listening_audio_write";
  if (skill === "listening" && listeningType === "video_choice") return "listening_video_choice";
  if (skill === "grammar" && activityType === "quiz") return "grammar_quiz";
  if (skill === "speaking" && activityType === "voice") return "speaking_voice";
  return null;
}

function buildSyncedPracticePayload(currentPayload, presetPayload, preserveAllPayload = false) {
  if (preserveAllPayload) {
    return {
      ...presetPayload,
      ...currentPayload,
      practice_skill: presetPayload.practice_skill,
      topic_id: presetPayload.topic_id,
      lesson_id: presetPayload.lesson_id,
      topic: pickString(currentPayload.topic, presetPayload.topic),
      topic_label: pickString(currentPayload.topic_label, presetPayload.topic_label),
      topic_title: pickString(currentPayload.topic_title, presetPayload.topic_title),
      topic_description: pickString(currentPayload.topic_description, presetPayload.topic_description),
      lesson_title: pickString(currentPayload.lesson_title, presetPayload.lesson_title),
      lesson_description: pickString(currentPayload.lesson_description, presetPayload.lesson_description),
    };
  }

  const nextPayload = { ...presetPayload };

  PRACTICE_SHARED_PAYLOAD_KEYS.forEach((key) => {
    nextPayload[key] = pickString(currentPayload[key], presetPayload[key]);
  });

  Object.keys(presetPayload).forEach((key) => {
    if (key in currentPayload && !PRACTICE_SHARED_PAYLOAD_KEYS.includes(key)) {
      nextPayload[key] = currentPayload[key];
    }
  });

  nextPayload.practice_skill = presetPayload.practice_skill;
  nextPayload.topic_id = presetPayload.topic_id;
  nextPayload.lesson_id = presetPayload.lesson_id;

  return nextPayload;
}

function buildSyncedPracticeAdminItem(item = {}, presetKey = PRACTICE_ADMIN_PRESETS[0].key, options = {}) {
  const normalizedLanguageCode = normalizeLanguageCode(options.languageCode ?? item.language_code);
  const currentPayload = item.payload ?? {};
  const preset = PRACTICE_ADMIN_PRESETS.find((entry) => entry.key === presetKey) ?? PRACTICE_ADMIN_PRESETS[0];
  const presetItem = buildPracticeAdminPreset(preset.key, {
    language_code: normalizedLanguageCode,
    lesson_id: item.lesson_id ?? 1,
    order_index: item.order_index ?? 1,
    is_free: item.is_free ?? true,
    is_active: item.is_active ?? true,
  });
  const presetPayload = presetItem.payload ?? {};
  const nextPayload = buildSyncedPracticePayload(currentPayload, presetPayload, options.preserveAllPayload === true);

  if ("listening_type" in presetPayload) {
    nextPayload.listening_type = presetPayload.listening_type;
  } else {
    delete nextPayload.listening_type;
  }

  return {
    ...item,
    ...presetItem,
    language_code: normalizedLanguageCode,
    lesson_id: item.lesson_id ?? presetItem.lesson_id,
    code: presetItem.code,
    activity_type: presetItem.activity_type,
    title: pickString(item.title, presetItem.title),
    description: pickString(item.description, presetItem.description),
    prompt: pickString(item.prompt, presetItem.prompt),
    order_index: item.order_index ?? presetItem.order_index,
    is_free: item.is_free ?? presetItem.is_free,
    is_active: item.is_active ?? presetItem.is_active,
    payload: nextPayload,
  };
}

export function syncPracticeAdminLanguage(item = {}, nextLanguageCode = "en") {
  return buildSyncedPracticeAdminItem(item, detectPracticePresetKey(item) ?? PRACTICE_ADMIN_PRESETS[0].key, {
    languageCode: nextLanguageCode,
    preserveAllPayload: true,
  });
}

export function syncPracticeAdminPreset(item = {}, nextPresetKey = PRACTICE_ADMIN_PRESETS[0].key) {
  return buildSyncedPracticeAdminItem(item, nextPresetKey, {
    languageCode: item.language_code,
    preserveAllPayload: false,
  });
}

export function resolvePracticePresetByActivityType(item = {}, nextActivityType = "") {
  const activityType = hasNonEmptyString(nextActivityType) ? nextActivityType.trim() : "";
  const payload = item.payload ?? {};
  const practiceSkill = payload.practice_skill;

  if (!activityType || !practiceSkill) return null;

  if (practiceSkill === "listening") {
    if (activityType === "audio") return "listening_audio_write";
    if (activityType === "quiz") {
      return payload.listening_type === "video_choice" ? "listening_video_choice" : "listening_audio_choice";
    }
  }

  const matchedPreset = PRACTICE_ADMIN_PRESETS.find((preset) => preset.skillKey === practiceSkill && preset.activityType === activityType);
  return matchedPreset?.key ?? null;
}

export function validatePracticeAdminPayload(item = {}) {
  const payload = item.payload ?? {};
  const errors = [];
  const warnings = [];
  const presetKey = detectPracticePresetKey(item);

  const requireField = (condition, label) => {
    if (!condition) {
      errors.push(`Thiếu ${label}.`);
    }
  };

  requireField(hasNonEmptyString(item.language_code), "language_code");
  requireField(hasNonEmptyString(item.code), "code");
  requireField(hasNonEmptyString(item.activity_type), "activity_type");
  requireField(hasNonEmptyString(item.title), "title");
  requireField(hasNonEmptyString(payload.practice_skill), "payload.practice_skill");
  requireField(hasNonEmptyString(payload.topic), "payload.topic");
  requireField(hasNonEmptyString(payload.topic_id), "payload.topic_id");
  requireField(hasNonEmptyString(payload.topic_label), "payload.topic_label");
  requireField(hasNonEmptyString(payload.topic_title), "payload.topic_title");
  requireField(hasNonEmptyString(payload.lesson_id), "payload.lesson_id");
  requireField(hasNonEmptyString(payload.lesson_title), "payload.lesson_title");

  if (!presetKey) {
    warnings.push("Cấu hình hiện tại chưa khớp preset practice nào. App có thể không render đúng module.");
  }

  if (presetKey === "vocabulary_flashcard") {
    requireField(hasNonEmptyString(payload.front_word), "payload.front_word");
    requireField(hasNonEmptyString(payload.back_meaning), "payload.back_meaning");
  }

  if (presetKey === "writing_typing") {
    requireField(hasNonEmptyString(payload.meaning), "payload.meaning");
    requireField(hasNonEmptyString(payload.display_answer), "payload.display_answer");
    requireField(Array.isArray(payload.accepted_answers) && payload.accepted_answers.length > 0, "payload.accepted_answers");
  }

  if (presetKey === "listening_audio_choice") {
    requireField(hasNonEmptyString(payload.audio_url), "payload.audio_url");
    requireField(hasNonEmptyString(payload.transcript), "payload.transcript");
    requireField(hasOptionList(payload.options), "payload.options (ít nhất 2 đáp án)");
    requireField(hasNonEmptyString(payload.correct_option_id), "payload.correct_option_id");
  }

  if (presetKey === "listening_audio_write") {
    requireField(hasNonEmptyString(payload.audio_url), "payload.audio_url");
    requireField(hasNonEmptyString(payload.transcript), "payload.transcript");
    requireField(hasNonEmptyString(payload.display_answer), "payload.display_answer");
    requireField(Array.isArray(payload.accepted_answers) && payload.accepted_answers.length > 0, "payload.accepted_answers");
  }

  if (presetKey === "listening_video_choice") {
    requireField(hasNonEmptyString(payload.video_url), "payload.video_url");
    requireField(hasNonEmptyString(payload.transcript), "payload.transcript");
    requireField(hasOptionList(payload.options), "payload.options (ít nhất 2 đáp án)");
    requireField(hasNonEmptyString(payload.correct_option_id), "payload.correct_option_id");
  }

  if (presetKey === "grammar_quiz") {
    requireField(hasNonEmptyString(payload.rule), "payload.rule");
    requireField(hasNonEmptyString(payload.sentence), "payload.sentence");
    requireField(hasOptionList(payload.options), "payload.options (ít nhất 2 đáp án)");
    requireField(hasNonEmptyString(payload.correct_option_id), "payload.correct_option_id");
  }

  if (presetKey === "speaking_voice") {
    requireField(hasNonEmptyString(payload.display_answer), "payload.display_answer");
    requireField(Array.isArray(payload.accepted_answers) && payload.accepted_answers.length > 0, "payload.accepted_answers");
  }

  if (payload.practice_skill === "listening" && !hasNonEmptyString(payload.transcript)) {
    warnings.push("Listening nên có payload.transcript để app phát TTS và hiện transcript.");
  }

  if (payload.practice_skill === "vocabulary" && item.activity_type !== "flashcard") {
    warnings.push("Vocabulary module hiện chỉ lấy nguồn chính từ activity_type = flashcard.");
  }

  if (payload.practice_skill === "grammar" && item.activity_type !== "quiz") {
    warnings.push("Grammar module hiện mong đợi activity_type = quiz.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    presetKey,
  };
}

export const ADMIN_TEMPLATES = {
  languages: {
    label: "Ngôn ngữ",
    hint: "Ngôn ngữ",
    fields: [
      { key: "code", label: "Mã ngôn ngữ", defaultValue: "fr" },
      { key: "name", label: "Tên hiển thị", defaultValue: "French" },
    ],
  },
  levels: {
    label: "Cấp độ",
    hint: "Cấp độ",
    fields: [
      { key: "language_code", label: "Ngôn ngữ", defaultValue: "en" },
      { key: "code", label: "Mã cấp độ", defaultValue: "Core" },
      { key: "title", label: "Tên cấp độ", defaultValue: "Nền tảng giao tiếp" },
      { key: "description", label: "Mô tả", defaultValue: "Cấp độ dành cho người mới bắt đầu.", type: "textarea" },
      { key: "order_index", label: "Thứ tự", defaultValue: 1, type: "number" },
    ],
  },
  roadmaps: {
    label: "Lộ trình",
    hint: "Lộ trình",
    fields: [
      { key: "language_code", label: "Ngôn ngữ", defaultValue: "en" },
      { key: "level_id", label: "ID cấp độ", defaultValue: 1, type: "number" },
      { key: "title", label: "Tên lộ trình", defaultValue: "Lộ trình giao tiếp cơ bản" },
      { key: "description", label: "Mô tả", defaultValue: "Lộ trình học theo từng bước rõ ràng.", type: "textarea" },
    ],
  },
  stages: {
    label: "Chặng học",
    hint: "Chặng học",
    fields: [
      { key: "roadmap_id", label: "ID lộ trình", defaultValue: 1, type: "number" },
      { key: "title", label: "Tên chặng", defaultValue: "Chào hỏi và giới thiệu" },
      { key: "description", label: "Mô tả", defaultValue: "Người học làm quen với các mẫu câu mở đầu.", type: "textarea" },
      { key: "order_index", label: "Thứ tự", defaultValue: 1, type: "number" },
    ],
  },
  courses: {
    label: "Khóa học",
    hint: "Khóa học",
    fields: [
      { key: "language_code", label: "Ngôn ngữ", defaultValue: "en" },
      { key: "level_id", label: "ID cấp độ", defaultValue: 1, type: "number" },
      { key: "roadmap_id", label: "ID lộ trình", defaultValue: 1, type: "number" },
      { key: "title", label: "Tên khóa học", defaultValue: "Khóa giao tiếp cơ bản" },
      { key: "description", label: "Mô tả", defaultValue: "Khóa học mẫu cho admin.", type: "textarea" },
      { key: "is_free", label: "Khóa miễn phí", defaultValue: true, type: "checkbox" },
      { key: "is_published", label: "Đã xuất bản", defaultValue: true, type: "checkbox" },
      { key: "order_index", label: "Thứ tự", defaultValue: 1, type: "number" },
    ],
  },
  sections: {
    label: "Chương",
    hint: "Chương",
    fields: [
      { key: "course_id", label: "ID khóa học", defaultValue: 1, type: "number" },
      { key: "title", label: "Tên chương", defaultValue: "Bắt đầu giao tiếp" },
      { key: "description", label: "Mô tả", defaultValue: "Các bài học nền tảng trong chương.", type: "textarea" },
      { key: "is_published", label: "Đã xuất bản", defaultValue: true, type: "checkbox" },
      { key: "order_index", label: "Thứ tự", defaultValue: 1, type: "number" },
    ],
  },
  lessons: {
    label: "Bài học",
    hint: "Bài học",
    fields: [
      { key: "section_id", label: "ID chương", defaultValue: 1, type: "number" },
      { key: "stage_id", label: "ID chặng", defaultValue: 1, type: "number" },
      { key: "title", label: "Tên bài học", defaultValue: "Bài học mới" },
      { key: "summary", label: "Tóm tắt", defaultValue: "Mô tả ngắn cho bài học.", type: "textarea" },
      { key: "content", label: "Nội dung", defaultValue: "Nội dung mẫu để test admin.", type: "textarea" },
      { key: "order_index", label: "Thứ tự", defaultValue: 1, type: "number" },
      { key: "estimated_minutes", label: "Số phút", defaultValue: 10, type: "number" },
      { key: "is_free_preview", label: "Cho xem trước", defaultValue: true, type: "checkbox" },
      { key: "is_published", label: "Đã xuất bản", defaultValue: true, type: "checkbox" },
    ],
  },
  vocabulary: {
    label: "Học liệu",
    hint: "Học liệu",
    fields: [
      { key: "language_code", label: "Ngôn ngữ", defaultValue: "en" },
      { key: "word", label: "Từ", defaultValue: "hello" },
      { key: "reading", label: "Phiên âm", defaultValue: "hello" },
      { key: "part_of_speech", label: "Loại từ", defaultValue: "noun" },
      { key: "meaning_en", label: "Nghĩa EN", defaultValue: "A greeting.", type: "textarea" },
      { key: "meaning_vi", label: "Nghĩa VI", defaultValue: "Xin chào.", type: "textarea" },
      { key: "example", label: "Ví dụ", defaultValue: "Hello, how are you?", type: "textarea" },
      { key: "example_meaning_vi", label: "Dịch ví dụ", defaultValue: "Xin chào, bạn khỏe không?", type: "textarea" },
      { key: "source_name", label: "Nguồn", defaultValue: "Admin" },
      { key: "source_url", label: "URL nguồn", defaultValue: "https://example.com" },
      { key: "is_active", label: "Đang hoạt động", defaultValue: true, type: "checkbox" },
    ],
  },
  practice: {
    label: "Ôn luyện",
    hint: "Ôn luyện",
    fields: [
      { key: "language_code", label: "Ngôn ngữ", defaultValue: "en" },
      { key: "lesson_id", label: "ID bài học", defaultValue: 1, type: "number" },
      { key: "code", label: "Mã bài luyện", defaultValue: "admin-practice-1" },
      {
        key: "activity_type",
        label: "Loại bài luyện",
        defaultValue: "quiz",
        type: "select",
        options: [
          { value: "flashcard", label: PRACTICE_LABELS.flashcard },
          { value: "typing", label: PRACTICE_LABELS.typing },
          { value: "quiz", label: PRACTICE_LABELS.quiz },
          { value: "audio", label: PRACTICE_LABELS.audio },
          { value: "voice", label: PRACTICE_LABELS.voice },
        ],
      },
      { key: "title", label: "Tên bài luyện", defaultValue: "Quiz mới" },
      { key: "description", label: "Mô tả", defaultValue: "Activity tạo từ admin.", type: "textarea" },
      { key: "prompt", label: "Câu hỏi", defaultValue: "Chọn đáp án đúng.", type: "textarea" },
      {
        key: "payload",
        label: "Payload JSON",
        defaultValue: buildPracticeAdminPreset("vocabulary_flashcard").payload,
        type: "json",
      },
      { key: "order_index", label: "Thứ tự", defaultValue: 1, type: "number" },
      { key: "is_free", label: "Miễn phí", defaultValue: true, type: "checkbox" },
      { key: "is_active", label: "Đang hoạt động", defaultValue: true, type: "checkbox" },
    ],
  },
  packages: {
    label: "Gói mua",
    hint: "Gói mua",
    fields: [
      { key: "language_code", label: "Ngôn ngữ", defaultValue: "en" },
      { key: "code", label: "Mã gói", defaultValue: "en-special" },
      { key: "name", label: "Tên gói", defaultValue: "Gói nâng cao" },
      { key: "description", label: "Mô tả", defaultValue: "Gói học mẫu từ admin.", type: "textarea" },
      { key: "price_vnd", label: "Giá", defaultValue: 199000, type: "number" },
      { key: "duration_days", label: "Số ngày", defaultValue: 90, type: "number" },
      { key: "is_free", label: "Gói miễn phí", defaultValue: false, type: "checkbox" },
      { key: "is_active", label: "Đang hoạt động", defaultValue: true, type: "checkbox" },
    ],
  },
  exams: {
    label: "Bài thi",
    hint: "Bài thi",
    fields: [
      { key: "language_code", label: "Ngôn ngữ", defaultValue: "en" },
      { key: "title", label: "Tên đề thi", defaultValue: "Đề thi admin tạo" },
      { key: "description", label: "Mô tả", defaultValue: "Đề thi mẫu có thể làm ngay.", type: "textarea" },
      { key: "level_code", label: "Cấp độ", defaultValue: "Core" },
      { key: "duration_minutes", label: "Thời lượng", defaultValue: 20, type: "number" },
      { key: "passing_score", label: "Điểm đạt", defaultValue: 60, type: "number" },
      { key: "is_active", label: "Đang hoạt động", defaultValue: true, type: "checkbox" },
      {
        key: "questions",
        label: "Câu hỏi JSON",
        type: "json",
        defaultValue: [
          {
            question_type: "quiz",
            prompt: "Câu hỏi mẫu",
            payload: {
              options: [
                { id: "a", text: "Đáp án đúng" },
                { id: "b", text: "Đáp án sai" },
              ],
            },
            correct_answer: "a",
            points: 1,
            order_index: 1,
          },
        ],
      },
    ],
  },
};

export function buildTemplatePayload(collection) {
  const template = ADMIN_TEMPLATES[collection];
  if (!template) {
    return {};
  }

  if (collection === "practice") {
    return buildPracticeAdminPreset();
  }

  return Object.fromEntries(template.fields.map((field) => [field.key, field.defaultValue]));
}
