import { Chess, DEFAULT_POSITION, type Color, type Move, type PieceSymbol } from "chess.js";
import type { ChessEngine } from "./chess-engine";
import { describeMove, explainMove } from "./chess-coach";
import { isBookPosition, openingAt } from "./chess-openings";

export type MoveGrade = "Brilliant" | "Great" | "Best" | "Excellent" | "Good" | "Book" | "Inaccuracy" | "Mistake" | "Miss" | "Blunder" | "Forced";
export type ReviewMode = "live" | "review";
export interface MoveReview {
  grade: MoveGrade;
  playedSan: string;
  bestSan: string;
  bestLan: string;
  bestLine: readonly string[];
  playedLine: readonly string[];
  explanation: string;
  loss: number;
  bestPoints: number;
  playedPoints: number;
  depth: number;
  /** Engine score of the played move, from the mover's perspective. Mate 0 means the move mated. */
  score?: { type: "cp" | "mate"; value: number };
  sacrifice?: { piece: PieceSymbol; acceptedBy: string };
}
type ReviewEngine = Pick<ChessEngine, "analyze">;
type SideSummary = { accuracy: number | null; counts: Partial<Record<MoveGrade, number>> };

function play(game: Chess, lan: string) {
  return game.move({ from: lan.slice(0, 2), to: lan.slice(2, 4), promotion: lan[4] });
}

const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function balance(game: Chess, mover: Color) {
  let total = 0;
  for (const row of game.board()) {
    for (const piece of row) if (piece) total += values[piece.type] * (piece.color === mover ? 1 : -1);
  }
  return total;
}

/** Require the offered piece to be taken in the PV and the deficit to survive a reply. */
function acceptedSacrifice(move: Move, pv: readonly string[]): MoveReview["sacrifice"] {
  if (values[move.piece] < 3 || pv.length < 3 || pv[0] !== move.lan) return;
  const game = new Chess(move.before);
  const baseline = balance(game, move.color);
  play(game, pv[0]);
  const capture = play(game, pv[1]);
  if (capture.to !== move.to || capture.captured !== move.piece) return;
  // Check several plies where available to exclude routine recaptures and temporary exchanges.
  for (const lan of pv.slice(2, 7)) {
    play(game, lan);
    if (baseline - balance(game, move.color) < 2) return;
  }
  return { piece: move.piece, acceptedBy: capture.san };
}

const explanations: Record<MoveGrade, string> = {
  Forced: "This was the only legal move.",
  Brilliant: "A sound piece sacrifice. The engine sees compensation even after the piece is taken.",
  Great: "A critical find. The next-best option scores much worse.",
  Best: "The engine’s top choice. This makes the most of the position.",
  Excellent: "Nearly as strong as the best move. The position stays on track.",
  Good: "A solid move, with a slightly stronger option available.",
  Book: "An established opening move.",
  Inaccuracy: "A small opportunity slipped by. There was a stronger move here.",
  Mistake: "This weakens the position. Take a look at the stronger alternative.",
  Miss: "Your opponent slipped up, and this move didn’t punish it.",
  Blunder: "This weakens the position considerably. Try the stronger alternative.",
};

function ordinaryGrade(loss: number): MoveGrade {
  if (loss < .02) return "Excellent";
  if (loss < .05) return "Good";
  if (loss < .10) return "Inaccuracy";
  if (loss < .20) return "Mistake";
  return "Blunder";
}

/** Scores stay in the mover's perspective. Fixed WDL thresholds approximate move quality
 * using Stockfish self-play, without fitting a human rating or Chess.com's model. */
export async function reviewMove(engine: ReviewEngine, move: Move, historyBefore: readonly string[],
  mode: ReviewMode, previous?: MoveReview): Promise<MoveReview> {
  const before = new Chess(move.before);
  const legal = before.moves({ verbose: true });
  const history = historyBefore.length || move.before === DEFAULT_POSITION ? historyBefore : undefined;
  const after = history ? new Chess() : new Chess(move.before);
  for (const lan of history ?? []) play(after, lan);
  if (after.fen() !== move.before) throw new Error("Move history does not match the reviewed position.");
  play(after, move.lan);
  const terminal = after.isCheckmate() ? 1 : after.isDraw() ? .5 : undefined;
  const time = mode === "live" ? 150 : 350;
  const moves = legal.map(candidate => candidate.lan);
  let ranked = await engine.analyze(move.before, moves, history, { multiPV: 2, time });
  const rescore = terminal === undefined && !ranked.some(line => line.pv[0] === move.lan);
  if (rescore) {
    // All three candidates must share one completed search iteration. Searching the
    // played move alone can give a different depth and even reverse the ranking.
    const shortlist = [...ranked.map(line => line.pv[0]), move.lan];
    ranked = await engine.analyze(move.before, moves, history, { multiPV: shortlist.length, time, searchMoves: shortlist });
  }
  // Use the same metric for recommendations and loss; retain Stockfish's order on ties.
  ranked = [...ranked].sort((a, b) => b.points - a.points);
  const played = ranked.find(line => line.pv[0] === move.lan);
  if (!played && terminal === undefined) throw new Error("Missing played move in analysis. Please retry.");
  const playedPoints = terminal ?? played!.points;
  const runner = ranked.find(line => line.pv[0] !== move.lan);
  // A known terminal outcome overrides its search estimate, even for a top-ranked move.
  const first = ranked[0];
  let preferred = first.pv[0];
  let reference = first.points;
  if (terminal !== undefined) {
    reference = runner?.points ?? terminal;
    preferred = runner && runner.points > terminal ? runner.pv[0] : move.lan;
  }
  const bestPoints = terminal === undefined ? first.points : Math.max(terminal, reference);
  const loss = Math.round((bestPoints - playedPoints) * 10000) / 10000;
  const depth = first.depth;
  let grade = ordinaryGrade(loss);
  let sacrifice: MoveReview["sacrifice"];
  const opponentErred = Boolean(previous && previous.depth >= 8 && previous.loss >= .10);
  if (legal.length === 1) grade = "Forced";
  else if (preferred === move.lan && loss === 0) {
    grade = "Best";
    if (!rescore && terminal === undefined && runner && depth >= 8 && playedPoints >= .48) {
      if (runner.points < .8 && played) sacrifice = acceptedSacrifice(move, played.pv);
      if (sacrifice) grade = "Brilliant";
      // A critical find: the only good move, or the move that punishes an opponent's error.
      else if (playedPoints - runner.points >= (opponentErred ? .12 : .18)) grade = "Great";
    }
  } else if (depth >= 8 && opponentErred && previous!.bestPoints >= .40 && previous!.playedPoints <= .30 &&
    bestPoints >= .70 && loss >= .10) grade = "Miss";
  // Established theory outranks engine nuance, as long as the move does not throw anything away.
  if (grade !== "Forced" && loss < .05 && isBookPosition(after.fen())) grade = "Book";

  let explanation = rescore && grade === "Best"
    ? "Your move scored highest when compared directly with the two leading candidates."
    : explanations[grade];
  if (grade === "Best" && terminal !== undefined) {
    explanation = terminal === 1 ? "This move delivered checkmate." : "This move secured a draw.";
  }
  const bestLine = (ranked.find(line => line.pv[0] === preferred)?.pv ?? [preferred]).slice(0, 8);
  const playedLine = (played?.pv ?? [move.lan]).slice(0, 8);
  if (grade === "Book") {
    const name = openingAt(after.fen());
    explanation = `${name ? `A known opening move in the ${name}.` : explanations.Book} ${describeMove(move)}`;
  } else if (terminal === undefined) {
    explanation = sacrifice ? `${move.san} offers the ${sacrifice.piece === "n" ? "knight" : sacrifice.piece === "b" ? "bishop" : sacrifice.piece === "r" ? "rook" : "queen"} on ${move.to}. ${explanations.Brilliant}`
      : explainMove(move, playedLine, bestLine, loss, explanation);
    if (grade === "Forced" || grade === "Great") explanation = `${explanations[grade]} ${explanation}`;
  }
  return {
    grade, playedSan: move.san, bestSan: legal.find(candidate => candidate.lan === preferred)!.san,
    bestLan: preferred, bestLine, playedLine, explanation, loss, bestPoints, playedPoints, depth,
    score: terminal === 1 ? { type: "mate", value: 0 } : terminal === .5 ? { type: "cp", value: 0 } : played?.score,
    ...(sacrifice && { sacrifice }),
  };
}

/** Per-move accuracy from the drop in expected score (in percent), using the published
 * Lichess curve. Not Chess.com's CAPS2 model, whose calibration is unpublished. */
export function moveAccuracy(review: Pick<MoveReview, "bestPoints" | "playedPoints">): number {
  const drop = Math.max(0, review.bestPoints - review.playedPoints) * 100;
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669));
}

/** Game accuracy blends the arithmetic and harmonic means, so single blunders weigh in
 * without letting one move erase the rest of the game. Forced moves carry no weight. */
export function summarizeReviews(reviews: readonly MoveReview[], moves: readonly Move[]): Record<Color, SideSummary> {
  const summary: Record<Color, SideSummary> = {
    w: { accuracy: null, counts: {} }, b: { accuracy: null, counts: {} },
  };
  const scores = { w: [] as number[], b: [] as number[] };
  reviews.forEach((review, index) => {
    const color = moves[index]?.color;
    if (!color) return;
    const counts = summary[color].counts;
    counts[review.grade] = (counts[review.grade] ?? 0) + 1;
    if (review.grade !== "Forced") scores[color].push(moveAccuracy(review));
  });
  for (const color of ["w", "b"] as const) {
    const sample = scores[color];
    if (!sample.length) continue;
    const mean = sample.reduce((sum, value) => sum + value, 0) / sample.length;
    const harmonic = sample.length / sample.reduce((sum, value) => sum + 1 / Math.max(value, 1), 0);
    summary[color].accuracy = Math.round((mean + harmonic) * 5) / 10;
  }
  return summary;
}
