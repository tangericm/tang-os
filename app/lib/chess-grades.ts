import type { MoveGrade } from "./chess-review";

/** Display order for the classification table, best to worst. Forced is counted but not listed. */
export const GRADE_ORDER: readonly MoveGrade[] = [
  "Brilliant", "Great", "Best", "Excellent", "Good", "Book", "Inaccuracy", "Mistake", "Miss", "Blunder",
];

const PHRASES: Record<MoveGrade, string> = {
  Brilliant: "is brilliant", Great: "is a great move", Best: "is best", Excellent: "is excellent",
  Good: "is good", Book: "is a book move", Inaccuracy: "is an inaccuracy", Mistake: "is a mistake",
  Miss: "is a miss", Blunder: "is a blunder", Forced: "is forced",
};

/** "Nf3 is best", "Qxd5 is a blunder". */
export function gradeSentence(san: string, grade: MoveGrade) {
  return `${san} ${PHRASES[grade]}`;
}

export const KEY_GRADES: ReadonlySet<MoveGrade> = new Set(["Brilliant", "Great", "Miss", "Mistake", "Blunder"]);

/** White-perspective engine score as a short label: +1.4, −0.3, M3, −M2, 1-0. */
export function scoreLabel(score: { type: "cp" | "mate"; value: number } | undefined, mover: "w" | "b") {
  if (!score) return undefined;
  const sign = mover === "w" ? 1 : -1;
  if (score.type === "mate") {
    if (score.value === 0) return mover === "w" ? "1-0" : "0-1";
    const value = score.value * sign;
    return `${value > 0 ? "" : "−"}M${Math.abs(value)}`;
  }
  const pawns = score.value * sign / 100;
  if (Math.abs(pawns) < .05) return "0.0";
  return `${pawns > 0 ? "+" : "−"}${Math.abs(pawns).toFixed(1)}`;
}
