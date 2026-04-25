export type SupportedLanguageCode = "zh" | "en" | "ja" | "ko" | "de";

export type WritingExerciseType = "write_sentence" | "type_by_meaning";

export type WritingDifficulty = "Cơ bản" | "Trung cấp" | "Nâng cao";

export type WritingExercise = {
  id: string;
  languageCode: SupportedLanguageCode;
  type: WritingExerciseType;
  hanzi: string;
  pinyin?: string;
  meaning: string;
  answer: string;
  hints: string[];
  difficulty: WritingDifficulty;
  explanation?: string;
  practiceActivity?: {
    id: number | string;
    language_code?: string;
    activity_type?: string;
  };
};

export type WritingExerciseMap = Record<SupportedLanguageCode, WritingExercise[]>;

export type WritingExerciseProgress = {
  completed: boolean;
  status: "correct" | "wrong" | "skipped" | "pending";
  usedHint: boolean;
  attempts: number;
  pointsEarned: number;
  lastAnswer?: string;
};

export type WritingProgressMap = Record<string, WritingExerciseProgress>;
