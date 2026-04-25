export type ListeningDifficulty = "Cơ bản" | "Trung cấp" | "Nâng cao";

export type ListeningExerciseType = "audio_choice" | "audio_write" | "video_choice";

export type SupportedListeningLanguageCode = "zh" | "en" | "ja" | "ko" | "de";

export type ListeningExercise = {
  id: string;
  languageCode: SupportedListeningLanguageCode;
  type: ListeningExerciseType;
  question: string;
  mediaUrl: string;
  transcript: string;
  answer: string;
  options?: string[];
  optionDetails?: { id: string; text: string }[];
  hints?: string[];
  difficulty: ListeningDifficulty;
  explanation?: string;
  practiceActivity?: {
    id: number | string;
    language_code?: string;
    activity_type?: string;
  };
};

export type ListeningExerciseMap = Record<SupportedListeningLanguageCode, ListeningExercise[]>;

export type ListeningLesson = {
  id: string;
  title: string;
  description: string;
  exercises: ListeningExercise[];
};

export type ListeningTopic = {
  id: string;
  label: string;
  title: string;
  description: string;
  lessons: ListeningLesson[];
};

export type ListeningExerciseProgress = {
  completed: boolean;
  status: "correct" | "wrong" | "skipped" | "pending";
  attempts: number;
  usedHints: number;
  pointsEarned: number;
  lastAnswer?: string;
};

export type ListeningProgressMap = Record<string, ListeningExerciseProgress>;
