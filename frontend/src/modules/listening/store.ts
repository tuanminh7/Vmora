import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getListeningExercisesByLanguage, listeningExercisesByLanguage } from "./mockData";
import type {
  ListeningExercise,
  ListeningExerciseProgress,
  ListeningProgressMap,
  ListeningExerciseType,
  SupportedListeningLanguageCode,
} from "./types";

type ListeningToast = {
  id: number;
  kind: "hint" | "score";
  message: string;
};

type ListeningStore = {
  progress: ListeningProgressMap;
  totalScore: number;
  scorePulse: number;
  currentLanguage: SupportedListeningLanguageCode;
  toasts: ListeningToast[];
  setLanguage: (languageCode: string | undefined, exercisesOverride?: ListeningExercise[]) => void;
  getExercisesForLanguage: (languageCode: string | undefined) => ListeningExercise[];
  getExercisesByType: (languageCode: string | undefined, type: ListeningExerciseType) => ListeningExercise[];
  markHintUsed: (exerciseId: string) => void;
  submitResult: (params: {
    exerciseId: string;
    answer: string;
    isCorrect: boolean;
    wasRetry: boolean;
  }) => number;
  skipExercise: (exerciseId: string, answer?: string) => void;
  resetExercisesProgress: (exerciseIds: string[]) => void;
  resetActivityProgress: (languageCode: string | undefined, type: ListeningExerciseType) => void;
  dismissToast: (id: number) => void;
};

type PersistedListeningStore = Pick<ListeningStore, "progress" | "totalScore" | "currentLanguage">;

const STORAGE_KEY = "vmora-listening-progress";

function buildBlankExerciseProgress(): ListeningExerciseProgress {
  return {
    completed: false,
    status: "pending",
    attempts: 0,
    usedHints: 0,
    pointsEarned: 0,
  };
}

function buildDefaultProgress(): ListeningProgressMap {
  const progress: ListeningProgressMap = {};

  Object.values(listeningExercisesByLanguage).forEach((exercises) => {
    exercises.forEach((exercise) => {
      progress[exercise.id] = buildBlankExerciseProgress();
    });
  });

  return progress;
}

function createToast(kind: ListeningToast["kind"], message: string): ListeningToast {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    kind,
    message,
  };
}

function calculateScore(progress: ListeningProgressMap): number {
  return Object.values(progress).reduce((total, item) => total + (item.pointsEarned ?? 0), 0);
}

const defaultProgress = buildDefaultProgress();

export const useListeningStore = create<ListeningStore>()(
  persist(
    (set, get) => ({
      progress: defaultProgress,
      totalScore: 0,
      scorePulse: 0,
      currentLanguage: "zh",
      toasts: [],

      setLanguage: (languageCode, exercisesOverride) => {
        const normalized = exercisesOverride?.length ? exercisesOverride : getListeningExercisesByLanguage(languageCode);
        set({
          currentLanguage: normalized[0]?.languageCode ?? "zh",
        });
      },

      getExercisesForLanguage: (languageCode) => getListeningExercisesByLanguage(languageCode ?? get().currentLanguage),

      getExercisesByType: (languageCode, type) =>
        getListeningExercisesByLanguage(languageCode ?? get().currentLanguage).filter((exercise) => exercise.type === type),

      markHintUsed: (exerciseId) =>
        set((state) => {
          const current = state.progress[exerciseId] ?? defaultProgress[exerciseId] ?? buildBlankExerciseProgress();

          return {
            progress: {
              ...state.progress,
              [exerciseId]: {
                ...current,
                usedHints: current.usedHints + 1,
              },
            },
            toasts: [...state.toasts, createToast("hint", "Đã dùng gợi ý, -2 điểm nếu trả lời đúng.")],
          };
        }),

      submitResult: ({ exerciseId, answer, isCorrect, wasRetry }) => {
        const current = get().progress[exerciseId] ?? defaultProgress[exerciseId] ?? buildBlankExerciseProgress();

        let points = 0;
        if (isCorrect) {
          if (wasRetry || current.attempts > 0) {
            points = 3;
          } else if (current.usedHints > 0) {
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
                status: current.status === "wrong" ? "wrong" : "skipped",
                attempts: current.attempts + (current.attempts === 0 ? 1 : 0),
                lastAnswer: answer,
              },
            },
          };
        }),

      resetExercisesProgress: (exerciseIds) =>
        set((state) => {
          const nextProgress = { ...state.progress };

          exerciseIds.forEach((exerciseId) => {
            nextProgress[exerciseId] = {
              ...(defaultProgress[exerciseId] ?? buildBlankExerciseProgress()),
            };
          });

          return {
            progress: nextProgress,
            totalScore: calculateScore(nextProgress),
            scorePulse: 0,
            toasts: [],
          };
        }),

      resetActivityProgress: (languageCode, type) =>
        set((state) => {
          const exercises = getListeningExercisesByLanguage(languageCode ?? state.currentLanguage).filter((exercise) => exercise.type === type);
          const nextProgress = { ...state.progress };

          exercises.forEach((exercise) => {
            nextProgress[exercise.id] = {
              ...defaultProgress[exercise.id],
            };
          });

          return {
            progress: nextProgress,
            totalScore: calculateScore(nextProgress),
            scorePulse: 0,
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
      partialize: (state): PersistedListeningStore => ({
        progress: state.progress,
        totalScore: state.totalScore,
        currentLanguage: state.currentLanguage,
      }),
      merge: (persistedState, currentState) => {
        const typedPersisted = persistedState as PersistedListeningStore | undefined;

        return {
          ...currentState,
          progress: {
            ...buildDefaultProgress(),
            ...(typedPersisted?.progress ?? {}),
          },
          totalScore: typedPersisted?.totalScore ?? currentState.totalScore,
          currentLanguage: typedPersisted?.currentLanguage ?? currentState.currentLanguage,
        };
      },
    },
  ),
);
