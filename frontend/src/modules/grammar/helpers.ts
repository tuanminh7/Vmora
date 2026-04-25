import type { GrammarDifficulty } from "./types";

export function getGrammarDifficultyClass(difficulty: GrammarDifficulty) {
  if (difficulty === "Nâng cao") {
    return "vmora-grammar-badge vmora-grammar-badge-hard";
  }

  if (difficulty === "Trung cấp") {
    return "vmora-grammar-badge vmora-grammar-badge-mid";
  }

  return "vmora-grammar-badge vmora-grammar-badge-basic";
}
