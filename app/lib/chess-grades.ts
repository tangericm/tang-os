import type { MoveGrade } from "./chess-review";

export const GRADE_SYMBOLS: Record<MoveGrade, string> = {
  Brilliant: "!!", Great: "!", Best: "★", Excellent: "✓", Good: "✓",
  Inaccuracy: "?!", Mistake: "?", Miss: "×", Blunder: "??", Forced: "→",
};
