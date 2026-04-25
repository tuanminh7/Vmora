export type WordStatus = "new" | "learning" | "mastered";

export type SupportedVocabularyLanguageCode = "zh" | "en" | "ja" | "ko" | "de";

export type Word = {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  example?: string;
  status: WordStatus;
  nextReview?: Date;
  correctCount: number;
  wrongCount: number;
};

export type Lesson = {
  id: string;
  title: string;
  words: Word[];
};

export type Topic = {
  id: string;
  label: string;
  title: string;
  description: string;
  lessons: Lesson[];
};
