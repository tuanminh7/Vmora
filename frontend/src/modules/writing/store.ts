import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getWritingExercisesByLanguage, writingExercisesByLanguage } from "./mockData";
import type { SupportedLanguageCode, WritingExercise, WritingExerciseProgress, WritingProgressMap } from "./types";

type WritingToast = {
  id: number;
  kind: "hint" | "score";
  message: string;
};

type WritingStore = {
  progress: WritingProgressMap;
  totalScore: number;
  scorePulse: number;
  currentLanguage: SupportedLanguageCode;
  activeExerciseId: string | null;
  toasts: WritingToast[];
  getExercisesForLanguage: (languageCode: string | undefined) => WritingExercise[];
  getActiveExercise: (languageCode: string | undefined) => WritingExercise | undefined;
  setLanguage: (languageCode: string | undefined, exercisesOverride?: WritingExercise[]) => void;
  setActiveExercise: (exerciseId: string) => void;
  markHintUsed: (exerciseId: string) => void;
  submitResult: (params: {
    exerciseId: string;
    answer: string;
    isCorrect: boolean;
    wasRetry: boolean;
    usedHint: boolean;
  }) => number;
  skipExercise: (exerciseId: string, answer?: string) => void;
  resetLanguageProgress: (languageCode: string | undefined, exercisesOverride?: WritingExercise[]) => void;
  dismissToast: (id: number) => void;
};

type PersistedWritingStore = Pick<WritingStore, "progress" | "totalScore" | "currentLanguage" | "activeExerciseId">;

const STORAGE_KEY = "vmora-writing-progress";

function buildDefaultProgress(): WritingProgressMap {
  const progress: WritingProgressMap = {};

  Object.values(writingExercisesByLanguage).forEach((exercises) => {
    exercises.forEach((exercise) => {
      progress[exercise.id] = buildBlankExerciseProgress();
    });
  });

  return progress;
}

function buildBlankExerciseProgress(): WritingExerciseProgress {
  return {
    completed: false,
    status: "pending",
    usedHint: false,
    attempts: 0,
    pointsEarned: 0,
  };
}

function createToast(kind: WritingToast["kind"], message: string): WritingToast {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    kind,
    message,
  };
}

const defaultProgress = buildDefaultProgress();

function calculateScore(progress: WritingProgressMap): number {
  return Object.values(progress).reduce((total, item) => total + (item.pointsEarned ?? 0), 0);
}

export const useWritingStore = create<WritingStore>()(
  persist(
    (set, get) => ({
      progress: defaultProgress,
      totalScore: 0,
      scorePulse: 0,
      currentLanguage: "zh",
      activeExerciseId: null,
      toasts: [],

      getExercisesForLanguage: (languageCode) => getWritingExercisesByLanguage(languageCode ?? get().currentLanguage),

      getActiveExercise: (languageCode) => {
        const exercises = get().getExercisesForLanguage(languageCode ?? get().currentLanguage);
        const activeExerciseId = get().activeExerciseId;

        return exercises.find((exercise) => exercise.id === activeExerciseId) ?? exercises[0];
      },

      setLanguage: (languageCode, exercisesOverride) => {
        const normalized = exercisesOverride?.length ? exercisesOverride : getWritingExercisesByLanguage(languageCode);
        const nextLanguage = normalized[0]?.languageCode ?? "zh";

        set((state) => {
          const activeExists = normalized.some((exercise) => exercise.id === state.activeExerciseId);

          return {
            currentLanguage: nextLanguage,
            activeExerciseId: activeExists ? state.activeExerciseId : normalized[0]?.id ?? null,
          };
        });
      },

      setActiveExercise: (exerciseId) =>
        set({
          activeExerciseId: exerciseId,
        }),

      markHintUsed: (exerciseId) =>
        set((state) => {
          const current = state.progress[exerciseId] ?? defaultProgress[exerciseId] ?? buildBlankExerciseProgress();

          if (current.usedHint) {
            return state;
          }

          return {
            progress: {
              ...state.progress,
              [exerciseId]: {
                ...current,
                usedHint: true,
              },
            },
            toasts: [...state.toasts, createToast("hint", "Đã mở gợi ý. Bài này sẽ bị trừ 2 điểm.")],
          };
        }),

      submitResult: ({ exerciseId, answer, isCorrect, wasRetry, usedHint }) => {
        const current = get().progress[exerciseId] ?? defaultProgress[exerciseId] ?? buildBlankExerciseProgress();

        let points = 0;

        if (isCorrect) {
          if (wasRetry || current.attempts > 0) {
            points = 3;
          } else if (usedHint || current.usedHint) {
            points = 5;
          } else {
            points = 10;
          }
        }

        set((state) => ({
          progress: {
            ...state.progress,
            [exerciseId]: {
              ...current,
              completed: isCorrect,
              status: isCorrect ? "correct" : "wrong",
              usedHint: current.usedHint || usedHint,
              attempts: current.attempts + 1,
              pointsEarned: isCorrect ? Math.max(current.pointsEarned, points) : current.pointsEarned,
              lastAnswer: answer,
            },
          },
          totalScore: isCorrect ? state.totalScore + Math.max(0, points - current.pointsEarned) : state.totalScore,
          scorePulse: isCorrect ? Math.max(0, points - current.pointsEarned) : 0,
          toasts:
            isCorrect && Math.max(0, points - current.pointsEarned) > 0
              ? [...state.toasts, createToast("score", `+${Math.max(0, points - current.pointsEarned)} điểm`)]
              : state.toasts,
        }));

        return points;
      },

      skipExercise: (exerciseId, answer = "") =>
        set((state) => {
          const current = state.progress[exerciseId] ?? defaultProgress[exerciseId] ?? buildBlankExerciseProgress();

          return {
            progress: {
              ...state.progress,
              [exerciseId]: {
                ...current,
                completed: true,
                status: "skipped",
                attempts: current.attempts + 1,
                lastAnswer: answer,
              },
            },
          };
        }),

      resetLanguageProgress: (languageCode, exercisesOverride) =>
        set((state) => {
          const exercises = exercisesOverride?.length ? exercisesOverride : getWritingExercisesByLanguage(languageCode ?? state.currentLanguage);
          const nextProgress = { ...state.progress };

          exercises.forEach((exercise) => {
            nextProgress[exercise.id] = {
              ...(defaultProgress[exercise.id] ?? buildBlankExerciseProgress()),
            };
          });

          return {
            progress: nextProgress,
            totalScore: calculateScore(nextProgress),
            scorePulse: 0,
            activeExerciseId: exercises[0]?.id ?? state.activeExerciseId,
            toasts: [],
          };
        }),

      dismissToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedWritingStore => ({
        progress: state.progress,
        totalScore: state.totalScore,
        currentLanguage: state.currentLanguage,
        activeExerciseId: state.activeExerciseId,
      }),
      merge: (persistedState, currentState) => {
        const typedPersisted = persistedState as PersistedWritingStore | undefined;

        return {
          ...currentState,
          progress: {
            ...buildDefaultProgress(),
            ...(typedPersisted?.progress ?? {}),
          },
          totalScore: typedPersisted?.totalScore ?? currentState.totalScore,
          currentLanguage: typedPersisted?.currentLanguage ?? currentState.currentLanguage,
          activeExerciseId: typedPersisted?.activeExerciseId ?? currentState.activeExerciseId,
        };
      },
    },
  ),
);
