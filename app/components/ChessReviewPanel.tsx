"use client";

import type { Color, Move } from "chess.js";
import { summarizeReviews, type MoveGrade, type MoveReview, type ReviewMode } from "../lib/chess-review";
import { GRADE_ORDER, gradeSentence, scoreLabel } from "../lib/chess-grades";
import type { Lesson } from "./ChessLesson";
import ChessEvaluation from "./ChessEvaluation";
import ChessGradeIcon from "./ChessGradeIcon";
import ChessBestMove from "./ChessBestMove";

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
  player: Color;
  opening?: string;
};

function notation(move: Move) {
  return `${move.before.split(" ")[5]}${move.color === "w" ? "." : "…"} ${move.san}`;
}

const priority: Partial<Record<MoveGrade, number>> = {
  Brilliant: 3, Blunder: 3, Miss: 3, Great: 2, Mistake: 1,
};

export default function ChessReviewPanel({
  moves, reviews, selected, onSelect, running, completed, quality, error, onStop, onRestart, showBest, onToggleBest, onLesson, lessonOpen,
  player, opening,
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
  const name = (color: Color) => color === player ? "You" : "Stockfish";
  const score = result && selectedMove ? scoreLabel(result.score, selectedMove.color) : undefined;

  /** Cycle through one side's moves of a grade, starting after the current selection. */
  function jump(color: Color, grade: MoveGrade) {
    const matches = evaluated.filter(row => row.move.color === color && row.review.grade === grade);
    const next = matches.find(row => row.i > selected) ?? matches[0];
    if (next) onSelect(next.i);
  }

  return <section className="chess-review" aria-label="Game review">
    <div className="chess-review-heading">
      <h3>Game review</h3>
      <span className="chess-review-progress" role="status" title="Moves refined with deeper analysis">{completed} / {moves.length} refined</span>
      {running && <button type="button" onClick={onStop}>Stop</button>}
      {!running && unfinished && <button type="button" onClick={onRestart}>{error ? "Retry" : "Resume"}</button>}
    </div>
    {error && <p className="chess-review-error" role="alert">{error}</p>}
    <div className="chess-review-selected" aria-label="Selected move">
      <div className="chess-review-move">
        {result && selectedMove ? <>
          <ChessGradeIcon grade={result.grade} className="chess-review-icon" />
          <strong className="chess-review-grade" data-grade={result.grade.toLowerCase()}>{gradeSentence(selectedMove.san, result.grade)}</strong>
          {score && <span className="chess-review-score" data-white={score.startsWith("−") || score === "0-1" ? undefined : true}>{score}</span>}
        </> : <strong>{selectedMove ? notation(selectedMove) : "Starting position"}</strong>}
      </div>
      {result && selectedMove ? <>
        <small className="chess-review-ply">{notation(selectedMove)} · {name(selectedMove.color)}{quality === "live" ? ` · Quick estimate${running ? " · refining" : ""}` : ""}</small>
        <p>{result.explanation}</p>
        <ChessBestMove move={selectedMove} review={result} showing={showBest} onToggle={onToggleBest} />
        <div className="chess-coach-actions">
          <button type="button" className="chess-text-button" disabled={lessonOpen} onClick={() => onLesson("best")}>Show continuation</button>
          {result.bestLan !== selectedMove.lan && <button type="button" className="chess-text-button" disabled={lessonOpen} onClick={() => onLesson("played")}>Explore played move</button>}
          <button type="button" className="chess-text-button" disabled={lessonOpen} onClick={() => onLesson("practice")}>Try again</button>
        </div>
      </> : <p>{selectedMove ? "Awaiting analysis." : moves.length ? "Select a move to see its grade." : "Play a move to start the review."}</p>}
    </div>
    <ChessEvaluation moves={moves} reviews={reviews} selected={selected} onSelect={onSelect} />
    <h4 className="chess-review-label">Accuracy</h4>
    <div className="chess-review-summary">
      {(["w", "b"] as const).map(color => {
        const { accuracy } = summary[color];
        return <div key={color} className="chess-review-side" data-color={color}>
          <span>{name(color)}</span>
          <strong>{accuracy === null ? "—" : accuracy.toFixed(1)}</strong>
        </div>;
      })}
    </div>
    <table className="chess-review-table">
      <caption className="chess-sr-only">Move classifications for each side</caption>
      <thead><tr><th scope="col">{name("w")}</th><th scope="col"><span className="chess-sr-only">Classification</span></th><th scope="col">{name("b")}</th></tr></thead>
      <tbody>{GRADE_ORDER.map(grade => <tr key={grade} data-grade={grade.toLowerCase()}>
        {(["w", "b"] as const).map((color, column) => {
          const count = summary[color].counts[grade] ?? 0;
          const cell = <td key={color}><button type="button" disabled={!count} onClick={() => jump(color, grade)}
            aria-label={`${count} ${grade} ${count === 1 ? "move" : "moves"} by ${name(color)}${count ? ", show next" : ""}`}>{count}</button></td>;
          return column === 0 ? [cell, <th key="label" scope="row"><ChessGradeIcon grade={grade} />{grade}</th>] : cell;
        })}
      </tr>)}</tbody>
    </table>
    {opening && <p className="chess-review-opening"><ChessGradeIcon grade="Book" /> {opening}</p>}
    {moments.length > 0 && <div className="chess-review-moments" role="group" aria-label="Key moments">
      <div className="chess-review-moments-heading"><h4>Key moments</h4>
        <div className="chess-moment-nav"><button type="button" aria-label="Previous moment" title="Previous moment" disabled={!previousMoment} onClick={() => previousMoment && onSelect(previousMoment.i)}>‹</button>
          <button type="button" aria-label="Next moment" title="Next moment" disabled={!nextMoment} onClick={() => nextMoment && onSelect(nextMoment.i)}>›</button></div></div>
      {moments.map(({ i, move, review }) => <button key={i} type="button" onClick={() => onSelect(i)}
        aria-pressed={i === selected} data-grade={review.grade.toLowerCase()}>
        <ChessGradeIcon grade={review.grade} /><strong>{notation(move)}</strong> <span>{review.grade}</span>
      </button>)}
    </div>}
    <details className="chess-review-method">
      <summary>About accuracy &amp; grades</summary>
      <p>Grades follow the familiar expected-points bands: each move is scored by how much of Stockfish’s expected score it keeps. Accuracy uses the published Lichess curve on that loss, blending arithmetic and harmonic means; it is not Chess.com’s CAPS2. Forced moves carry no weight. Book moves come from a built-in list of common openings. Grades can change with search depth.{result && ` This move reached depth ${result.depth}.`}</p>
    </details>
  </section>;
}
