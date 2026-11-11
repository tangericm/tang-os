"use client";

import type { CSSProperties } from "react";
import type { Move } from "chess.js";
import type { MoveReview } from "../lib/chess-review";
import { KEY_GRADES, scoreLabel } from "../lib/chess-grades";

type Props = { moves: readonly Move[]; reviews: readonly (MoveReview | undefined)[]; selected: number; onSelect: (ply: number) => void };

/** White's expected score after each ply, carrying the last known value across gaps. */
export function whiteCurve(moves: readonly Move[], reviews: readonly (MoveReview | undefined)[]) {
  let last = .5;
  return moves.map((move, i) => {
    const review = reviews[i];
    if (review) last = move.color === "w" ? review.playedPoints : 1 - review.playedPoints;
    return { point: last, known: Boolean(review) };
  });
}

/** Compact advantage graph: White's share fills from the bottom, like a reviewed game's summary. */
export default function ChessEvaluation({ moves, reviews, selected, onSelect }: Props) {
  const curve = whiteCurve(moves, reviews);
  const x = (i: number) => (i + 1) / Math.max(1, moves.length) * 100;
  const y = (point: number) => 40 - point * 40;
  const area = `M0 40 L0 20 ${curve.map(({ point }, i) => `L${x(i)} ${y(point)}`).join(" ")} L100 ${y(curve.at(-1)?.point ?? .5)} L100 40 Z`;
  const move = moves[selected];
  const review = reviews[selected];
  const point = review ? curve[selected].point : undefined;
  const label = move && review ? scoreLabel(review.score, move.color) : undefined;
  const description = move ? `${move.before.split(" ")[5]}${move.color === "w" ? "." : "…"}${move.san}` : "Starting position";

  return <div className="chess-evaluation">
    <div className="chess-evaluation-heading"><span>Evaluation</span>
      <small>{point === undefined ? (move ? "Awaiting analysis" : "Starting position") : label ?? `${Math.round(point * 100)}% White`}</small></div>
    <div className="chess-evaluation-plot">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <path d={area} className="chess-evaluation-area" />
        <path d="M0 20H100" className="chess-evaluation-middle" />
        {move && <path d={`M${x(selected)} 0V40`} className="chess-evaluation-cursor" />}
      </svg>
      {moves.map((m, i) => {
        const grade = reviews[i]?.grade;
        if (!grade || !KEY_GRADES.has(grade)) return null;
        return <span key={i} className="chess-evaluation-dot" data-selected={i === selected || undefined}
          style={{ left: `${x(i)}%`, top: `${y(curve[i].point) / 40 * 100}%`, "--dot": `var(--g-${grade.toLowerCase()})` } as CSSProperties} />;
      })}
      <input type="range" aria-label="Review position" min={-1} max={Math.max(-1, moves.length - 1)} step={1} value={selected}
        aria-valuetext={`${description}${point === undefined ? "" : ` · White expected score ${Math.round(point * 100)}%`}`}
        disabled={!moves.length} onChange={event => onSelect(Number(event.target.value))} />
    </div>
  </div>;
}

/** Vertical evaluation bar beside the board. White fills from White's side of the board. */
export function ChessEvalBar({ point, label, flipped }: { point: number; label?: string; flipped: boolean }) {
  const white = Math.min(.97, Math.max(.03, point));
  const whiteAhead = point >= .5;
  return <div className="chess-eval-bar" data-flipped={flipped || undefined} role="img"
    aria-label={`Evaluation ${label ?? `${Math.round(point * 100)}% White`}`}>
    <span className="chess-eval-fill" style={{ height: `${white * 100}%` }} />
    {label && <span className="chess-eval-label" data-side={whiteAhead !== flipped ? "bottom" : "top"}
      data-white={whiteAhead || undefined}>{label.replace(/^[+−]/, "")}</span>}
  </div>;
}
