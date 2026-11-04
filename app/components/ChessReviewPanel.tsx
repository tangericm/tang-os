"use client";

import type { Move } from "chess.js";
import { summarizeReviews, type MoveReview, type ReviewMode } from "../lib/chess-review";
import type { Lesson } from "./ChessLesson";
import ChessEvaluation from "./ChessEvaluation";

type Props = {
  moves: readonly Move[];
  reviews: readonly (MoveReview | undefined)[];
  selected: number;
  onSelect: (ply: number) => void;
  running: boolean;
  completed: number;
  quality?: ReviewMode;
  error: string;
  onStop: () => void;
  onRestart: () => void;
  showBest: boolean;
  onToggleBest: () => void;
  onLesson: (kind: Lesson["kind"]) => void;
  lessonOpen: boolean;
};

function notation(move: Move) {
  return `${move.before.split(" ")[5]}${move.color === "w" ? "." : "…"} ${move.san}`;
}

const priority: Partial<Record<MoveReview["grade"], number>> = {
  Brilliant: 3, Blunder: 3, Miss: 3, Great: 2, Mistake: 1,
};

export default function ChessReviewPanel({
  moves, reviews, selected, onSelect, running, completed, quality, error, onStop, onRestart, showBest, onToggleBest, onLesson, lessonOpen,
}: Props) {
  const evaluated = moves.flatMap((move, i) => {
    const review = reviews[i];
    return review ? [{ move, review, i }] : [];
  });
  const summary = summarizeReviews(evaluated.map(row => row.review), evaluated.map(row => row.move));
  const moments = evaluated.filter(row => priority[row.review.grade])
    .sort((a, b) => priority[b.review.grade]! - priority[a.review.grade]! || b.review.loss - a.review.loss)
    .slice(0, 5).sort((a, b) => a.i - b.i);
  const selectedMove = moves[selected];
  const result = reviews[selected];
  const unfinished = completed < moves.length;
  const previousMoment = moments.findLast(row => row.i < selected);
  const nextMoment = moments.find(row => row.i > selected);

  return <section className="chess-review" aria-label="Game review">
    <div className="chess-review-heading">
      <h3>Game review</h3>
      <span className="chess-review-progress" role="status" title="Moves refined with deeper analysis">{completed} / {moves.length} refined</span>
      {running && <button type="button" onClick={onStop}>Stop</button>}
      {!running && unfinished && <button type="button" onClick={onRestart}>{error ? "Retry" : "Resume"}</button>}
    </div>
    {error && <p className="chess-review-error" role="alert">{error}</p>}
    <h4 className="chess-review-label">Move precision</h4>
    <div className="chess-review-summary">
      {(["w", "b"] as const).map(color => {
        const { precision, counts } = summary[color];
        const errors = (counts.Mistake ?? 0) + (counts.Miss ?? 0) + (counts.Blunder ?? 0);
        return <div key={color} className="chess-review-side">
          <span>{color === "w" ? "White" : "Black"}</span>
          <strong>{precision === null ? "—" : `${precision}%`}</strong>
          <small>{errors} {errors === 1 ? "error" : "errors"}</small>
        </div>;
      })}
    </div>
    <ChessEvaluation moves={moves} reviews={reviews} selected={selected} onSelect={onSelect} />
    <div className="chess-review-selected" aria-label="Selected move">
      <div className="chess-review-move">
        <strong>{selectedMove ? notation(selectedMove) : "Starting position"}</strong>
        {result && <span className="chess-review-grade" data-grade={result.grade.toLowerCase()}>{result.grade}</span>}
      </div>
      {result && selectedMove ? <>
        {quality === "live" && <small className="chess-review-quality">Quick estimate{running ? " · refining" : ""}</small>}
        <p>{result.explanation}</p>
        <div className="chess-review-best">
          <button type="button" aria-pressed={showBest} onClick={onToggleBest}>{showBest ? "Hide best move" : "Show best move"}</button>
          {showBest && <strong>{result.bestSan}</strong>}
        </div>
        <div className="chess-coach-actions">
          <button type="button" className="chess-text-button" disabled={lessonOpen} onClick={() => onLesson("best")}>Show continuation</button>
          {result.bestLan !== selectedMove.lan && <button type="button" className="chess-text-button" disabled={lessonOpen} onClick={() => onLesson("played")}>Explore played move</button>}
          <button type="button" className="chess-text-button" disabled={lessonOpen} onClick={() => onLesson("practice")}>Try again</button>
        </div>
      </> : <p>{selectedMove ? "Awaiting analysis." : moves.length ? "Select a move to see its grade." : "Play a move to start the review."}</p>}
    </div>
    {moments.length > 0 && <div className="chess-review-moments" role="group" aria-label="Key moments">
      <h4>Key moments</h4>
      <div className="chess-moment-nav"><button type="button" disabled={!previousMoment} onClick={() => previousMoment && onSelect(previousMoment.i)}>Previous moment</button>
        <button type="button" disabled={!nextMoment} onClick={() => nextMoment && onSelect(nextMoment.i)}>Next moment</button></div>
      {moments.map(({ i, move, review }) => <button key={i} type="button" onClick={() => onSelect(i)}
        aria-pressed={i === selected} data-grade={review.grade.toLowerCase()}>
        <strong>{notation(move)}</strong> {review.grade}
      </button>)}
    </div>}
    <details className="chess-review-method">
      <summary>About move precision</summary>
      <p>TangOS estimates precision from the average loss in Stockfish’s expected score, excluding forced moves.
        Errors count mistakes, misses and blunders. The graph shows Stockfish’s expected score for White, not a human win probability. Grades can change with search depth.{result && ` This move reached depth ${result.depth}.`}</p>
    </details>
  </section>;
}
