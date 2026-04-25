export type SupportedGrammarLanguageCode = "zh" | "en" | "ja" | "ko" | "de";

export type GrammarDifficulty = "Cơ bản" | "Trung cấp" | "Nâng cao";

export type GrammarQuestion = {
  id: string;
  prompt: string;
  sentence?: string;
  explanation: string;
  options: string[];
  correctAnswer: string;
  optionDetails?: { id: string; text: string }[];
  practiceActivity?: {
    id: number | string;
    language_code?: string;
    activity_type?: string;
  };
};

export type GrammarLesson = {
  id: string;
  title: string;
  description: string;
  difficulty: GrammarDifficulty;
  rule: string;
  questions: GrammarQuestion[];
};

export type GrammarTopic = {
  id: string;
  label: string;
  title: string;
  description: string;
  lessons: GrammarLesson[];
};

export type GrammarLessonProgress = {
  completed: boolean;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongQuestionIds: string[];
  lastCompletedAt?: string;
};

export type GrammarProgressMap = Record<string, GrammarLessonProgress>;
