import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getVocabularyTopicsByLanguage, vocabularyTopicsByLanguage } from "./mockData";
import type { Lesson, SupportedVocabularyLanguageCode, Topic, Word, WordStatus } from "./types";

export type VocabularyProgressItem = {
  status: WordStatus;
  correctCount: number;
  wrongCount: number;
  nextReview?: Date;
  lastReviewedAt?: Date;
};

export type VocabularyProgressMap = Record<string, VocabularyProgressItem>;

export type VocabularySessionMode = "view" | "flashcard" | "quiz";

export type VocabularySessionResult = {
  correctWordIds: string[];
  wrongWordIds: string[];
  answers: Record<string, boolean>;
  score: number;
  completed: boolean;
};

export type VocabularyCurrentSession = {
  topicId: string | null;
  lessonId: string | null;
  mode: VocabularySessionMode | null;
  currentIndex: number;
  wordOrder: string[];
  startedAt?: Date;
  finishedAt?: Date;
  result: VocabularySessionResult;
};

type PersistedVocabularyStore = {
  progress: Record<
    string,
    {
      status: WordStatus;
      correctCount: number;
      wrongCount: number;
      nextReview?: string;
      lastReviewedAt?: string;
    }
  >;
  currentLanguage?: SupportedVocabularyLanguageCode;
};

type VocabularyStore = {
  topics: Topic[];
  progress: VocabularyProgressMap;
  currentLanguage: SupportedVocabularyLanguageCode;
  currentSession: VocabularyCurrentSession;
  setLanguage: (languageCode: string | undefined, topicsOverride?: Topic[]) => void;
  getTopicsForLanguage: (languageCode: string | undefined) => Topic[];
  getTopicById: (topicId: string) => Topic | undefined;
  getLessonById: (lessonId: string) => Lesson | undefined;
  getWordById: (wordId: string) => Word | undefined;
  getWordsForLesson: (lessonId: string) => Word[];
  startSession: (params: { topicId: string; lessonId: string; mode: VocabularySessionMode; shuffle?: boolean }) => void;
  setSessionIndex: (index: number) => void;
  recordFlashcardResult: (wordId: string, remembered: boolean) => void;
  recordQuizAnswer: (wordId: string, isCorrect: boolean) => void;
  finishSession: () => void;
  resetSession: () => void;
  updateWordProgress: (wordId: string, updates: Partial<VocabularyProgressItem>) => void;
  resetProgress: () => void;
};

const STORAGE_KEY = "vmora-vocabulary-progress";

function buildDefaultProgress(topicsMap: Record<string, Topic[]>): VocabularyProgressMap {
  return Object.values(topicsMap).reduce<VocabularyProgressMap>((progressMap, topics) => {
    topics.forEach((topic) => {
      topic.lessons.forEach((lesson) => {
        lesson.words.forEach((word) => {
          progressMap[word.id] = {
            status: word.status,
            correctCount: word.correctCount,
            wrongCount: word.wrongCount,
            nextReview: word.nextReview,
          };
        });
      });
    });

    return progressMap;
  }, {});
}

function buildProgressFromTopics(topics: Topic[]): VocabularyProgressMap {
  return topics.reduce<VocabularyProgressMap>((progressMap, topic) => {
    topic.lessons.forEach((lesson) => {
      lesson.words.forEach((word) => {
        progressMap[word.id] = {
          status: word.status,
          correctCount: word.correctCount,
          wrongCount: word.wrongCount,
          nextReview: word.nextReview,
        };
      });
    });

    return progressMap;
  }, {});
}

function createEmptyResult(): VocabularySessionResult {
  return {
    correctWordIds: [],
    wrongWordIds: [],
    answers: {},
    score: 0,
    completed: false,
  };
}

function createInitialSession(): VocabularyCurrentSession {
  return {
    topicId: null,
    lessonId: null,
    mode: null,
    currentIndex: 0,
    wordOrder: [],
    result: createEmptyResult(),
  };
}

function cloneTopics(topics: Topic[]): Topic[] {
  return topics.map((topic) => ({
    ...topic,
    lessons: topic.lessons.map((lesson) => ({
      ...lesson,
      words: lesson.words.map((word) => ({
        ...word,
        nextReview: word.nextReview ? new Date(word.nextReview) : undefined,
      })),
    })),
  }));
}

function normalizePersistedProgress(progress: PersistedVocabularyStore["progress"] | undefined): VocabularyProgressMap {
  if (!progress) return {};

  return Object.entries(progress).reduce<VocabularyProgressMap>((result, [wordId, item]) => {
    result[wordId] = {
      status: item.status,
      correctCount: item.correctCount,
      wrongCount: item.wrongCount,
      nextReview: item.nextReview ? new Date(item.nextReview) : undefined,
      lastReviewedAt: item.lastReviewedAt ? new Date(item.lastReviewedAt) : undefined,
    };
    return result;
  }, {});
}

function toPersistedProgress(progress: VocabularyProgressMap): PersistedVocabularyStore["progress"] {
  return Object.entries(progress).reduce<PersistedVocabularyStore["progress"]>((result, [wordId, item]) => {
    result[wordId] = {
      status: item.status,
      correctCount: item.correctCount,
      wrongCount: item.wrongCount,
      nextReview: item.nextReview ? item.nextReview.toISOString() : undefined,
      lastReviewedAt: item.lastReviewedAt ? item.lastReviewedAt.toISOString() : undefined,
    };
    return result;
  }, {});
}

function mergeProgress(base: VocabularyProgressMap, incoming: VocabularyProgressMap): VocabularyProgressMap {
  const merged: VocabularyProgressMap = { ...base };

  Object.entries(incoming).forEach(([wordId, item]) => {
    if (!merged[wordId]) {
      merged[wordId] = item;
      return;
    }

    merged[wordId] = {
      ...merged[wordId],
      ...item,
    };
  });

  return merged;
}

function pickLessonWords(topics: Topic[], lessonId: string): Word[] {
  for (const topic of topics) {
    const lesson = topic.lessons.find((entry) => entry.id === lessonId);
    if (lesson) return lesson.words;
  }
  return [];
}

function shuffleIds(ids: string[]): string[] {
  const nextIds = [...ids];
  for (let index = nextIds.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextIds[index], nextIds[swapIndex]] = [nextIds[swapIndex], nextIds[index]];
  }
  return nextIds;
}

function normalizeLanguage(languageCode: string | undefined): SupportedVocabularyLanguageCode {
  if (!languageCode || !(languageCode in vocabularyTopicsByLanguage)) {
    return "zh";
  }

  return languageCode as SupportedVocabularyLanguageCode;
}

const defaultProgress = buildDefaultProgress(vocabularyTopicsByLanguage);
const defaultTopics = cloneTopics(getVocabularyTopicsByLanguage("zh"));

export const useVocabularyStore = create<VocabularyStore>()(
  persist(
    (set, get) => ({
      topics: defaultTopics,
      progress: defaultProgress,
      currentLanguage: "zh",
      currentSession: createInitialSession(),

      setLanguage: (languageCode, topicsOverride) => {
        const normalizedLanguage = normalizeLanguage(languageCode);
        const nextTopics = cloneTopics(topicsOverride?.length ? topicsOverride : getVocabularyTopicsByLanguage(normalizedLanguage));
        const nextProgressDefaults = buildProgressFromTopics(nextTopics);

        set((state) => ({
          currentLanguage: normalizedLanguage,
          topics: nextTopics,
          progress: mergeProgress(nextProgressDefaults, state.progress),
          currentSession:
            state.currentSession.lessonId &&
            pickLessonWords(nextTopics, state.currentSession.lessonId).length
              ? state.currentSession
              : createInitialSession(),
        }));
      },

      getTopicsForLanguage: (languageCode) => cloneTopics(getVocabularyTopicsByLanguage(languageCode ?? get().currentLanguage)),

      getTopicById: (topicId) => get().topics.find((topic) => topic.id === topicId),

      getLessonById: (lessonId) => {
        for (const topic of get().topics) {
          const lesson = topic.lessons.find((entry) => entry.id === lessonId);
          if (lesson) return lesson;
        }
        return undefined;
      },

      getWordById: (wordId) => {
        for (const topic of get().topics) {
          for (const lesson of topic.lessons) {
            const word = lesson.words.find((entry) => entry.id === wordId);
            if (word) return word;
          }
        }
        return undefined;
      },

      getWordsForLesson: (lessonId) => pickLessonWords(get().topics, lessonId),

      startSession: ({ topicId, lessonId, mode, shuffle = false }) => {
        const words = pickLessonWords(get().topics, lessonId);
        const wordOrder = shuffle ? shuffleIds(words.map((word) => word.id)) : words.map((word) => word.id);

        set({
          currentSession: {
            topicId,
            lessonId,
            mode,
            currentIndex: 0,
            wordOrder,
            startedAt: new Date(),
            finishedAt: undefined,
            result: createEmptyResult(),
          },
        });
      },

      setSessionIndex: (index) =>
        set((state) => ({
          currentSession: {
            ...state.currentSession,
            currentIndex: index,
          },
        })),

      recordFlashcardResult: (wordId, remembered) =>
        set((state) => {
          const currentProgress = state.progress[wordId] ?? {
            status: "new" as WordStatus,
            correctCount: 0,
            wrongCount: 0,
          };
          const nextStatus: WordStatus = remembered
            ? currentProgress.correctCount + 1 >= 2
              ? "mastered"
              : "learning"
            : "learning";
          const nextResult = { ...state.currentSession.result };

          nextResult.answers[wordId] = remembered;
          nextResult.correctWordIds = remembered
            ? [...new Set([...nextResult.correctWordIds, wordId])]
            : nextResult.correctWordIds.filter((id) => id !== wordId);
          nextResult.wrongWordIds = remembered
            ? nextResult.wrongWordIds.filter((id) => id !== wordId)
            : [...new Set([...nextResult.wrongWordIds, wordId])];
          nextResult.score = nextResult.correctWordIds.length;

          return {
            progress: {
              ...state.progress,
              [wordId]: {
                ...currentProgress,
                status: nextStatus,
                correctCount: remembered ? currentProgress.correctCount + 1 : currentProgress.correctCount,
                wrongCount: remembered ? currentProgress.wrongCount : currentProgress.wrongCount + 1,
                lastReviewedAt: new Date(),
              },
            },
            currentSession: {
              ...state.currentSession,
              result: nextResult,
            },
          };
        }),

      recordQuizAnswer: (wordId, isCorrect) =>
        set((state) => {
          const currentProgress = state.progress[wordId] ?? {
            status: "new" as WordStatus,
            correctCount: 0,
            wrongCount: 0,
          };
          const nextStatus: WordStatus = isCorrect
            ? currentProgress.correctCount + 1 >= 2
              ? "mastered"
              : "learning"
            : "learning";
          const nextResult = { ...state.currentSession.result };

          nextResult.answers[wordId] = isCorrect;
          nextResult.correctWordIds = isCorrect
            ? [...new Set([...nextResult.correctWordIds, wordId])]
            : nextResult.correctWordIds.filter((id) => id !== wordId);
          nextResult.wrongWordIds = isCorrect
            ? nextResult.wrongWordIds.filter((id) => id !== wordId)
            : [...new Set([...nextResult.wrongWordIds, wordId])];
          nextResult.score = nextResult.correctWordIds.length;

          return {
            progress: {
              ...state.progress,
              [wordId]: {
                ...currentProgress,
                status: nextStatus,
                correctCount: isCorrect ? currentProgress.correctCount + 1 : currentProgress.correctCount,
                wrongCount: isCorrect ? currentProgress.wrongCount : currentProgress.wrongCount + 1,
                lastReviewedAt: new Date(),
              },
            },
            currentSession: {
              ...state.currentSession,
              result: nextResult,
            },
          };
        }),

      finishSession: () =>
        set((state) => ({
          currentSession: {
            ...state.currentSession,
            finishedAt: new Date(),
            result: {
              ...state.currentSession.result,
              completed: true,
            },
          },
        })),

      resetSession: () =>
        set({
          currentSession: createInitialSession(),
        }),

      updateWordProgress: (wordId, updates) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [wordId]: {
              ...(state.progress[wordId] ?? {
                status: "new" as WordStatus,
                correctCount: 0,
                wrongCount: 0,
              }),
              ...updates,
            },
          },
        })),

      resetProgress: () =>
        set({
          progress: buildDefaultProgress(vocabularyTopicsByLanguage),
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        progress: toPersistedProgress(state.progress),
        currentLanguage: state.currentLanguage,
      }),
      merge: (persistedState, currentState) => {
        const typedPersisted = persistedState as PersistedVocabularyStore | undefined;
        const normalizedProgress = normalizePersistedProgress(typedPersisted?.progress);
        const mergedLanguage = normalizeLanguage(typedPersisted?.currentLanguage ?? currentState.currentLanguage);

        return {
          ...currentState,
          currentLanguage: mergedLanguage,
          topics: cloneTopics(getVocabularyTopicsByLanguage(mergedLanguage)),
          progress: mergeProgress(currentState.progress, normalizedProgress),
        };
      },
    },
  ),
);
