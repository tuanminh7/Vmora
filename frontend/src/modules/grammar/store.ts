import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getGrammarTopicsByLanguage, grammarTopicsByLanguage } from "./mockData";
import type { GrammarLessonProgress, GrammarProgressMap, SupportedGrammarLanguageCode } from "./types";

type PersistedGrammarStore = {
  progress: GrammarProgressMap;
  currentLanguage: SupportedGrammarLanguageCode;
};

type GrammarStore = {
  progress: GrammarProgressMap;
  currentLanguage: SupportedGrammarLanguageCode;
  setLanguage: (languageCode: string | undefined) => void;
  getLessonProgress: (lessonId: string) => GrammarLessonProgress | undefined;
  submitLessonResult: (lessonId: string, result: GrammarLessonProgress) => void;
  resetLessonProgress: (lessonId: string) => void;
};

const STORAGE_KEY = "vmora-grammar-progress";

function normalizeLanguage(languageCode: string | undefined): SupportedGrammarLanguageCode {
  if (!languageCode || !(languageCode in grammarTopicsByLanguage)) {
    return "zh";
  }

  return languageCode as SupportedGrammarLanguageCode;
}

function buildDefaultProgress() {
  const progress: GrammarProgressMap = {};

  Object.values(grammarTopicsByLanguage).forEach((topics) => {
    topics.forEach((topic) => {
      topic.lessons.forEach((lesson) => {
        progress[lesson.id] = {
          completed: false,
          score: 0,
          totalQuestions: lesson.questions.length,
          correctCount: 0,
          wrongQuestionIds: [],
        };
      });
    });
  });

  return progress;
}

const defaultProgress = buildDefaultProgress();

export const useGrammarStore = create<GrammarStore>()(
  persist(
    (set, get) => ({
      progress: defaultProgress,
      currentLanguage: "zh",
      setLanguage: (languageCode) => {
        set({ currentLanguage: normalizeLanguage(languageCode) });
      },
      getLessonProgress: (lessonId) => get().progress[lessonId],
      submitLessonResult: (lessonId, result) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [lessonId]: {
              ...result,
              completed: true,
              lastCompletedAt: new Date().toISOString(),
            },
          },
        })),
      resetLessonProgress: (lessonId) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [lessonId]: {
              ...(defaultProgress[lessonId] ?? {
                completed: false,
                score: 0,
                totalQuestions: 0,
                correctCount: 0,
                wrongQuestionIds: [],
              }),
            },
          },
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedGrammarStore => ({
        progress: state.progress,
        currentLanguage: state.currentLanguage,
      }),
      merge: (persistedState, currentState) => {
        const typed = persistedState as PersistedGrammarStore | undefined;
        return {
          ...currentState,
          progress: {
            ...buildDefaultProgress(),
            ...(typed?.progress ?? {}),
          },
          currentLanguage: typed?.currentLanguage ?? currentState.currentLanguage,
        };
      },
    },
  ),
);
