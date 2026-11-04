"use client";

import type { Move } from "chess.js";
import type { MoveReview } from "../lib/chess-review";

type Props = { moves: readonly Move[]; reviews: readonly (MoveReview | undefined)[]; selected: number; onSelect: (ply: number) => void };

export default function ChessEvaluation({ moves, reviews, selected, onSelect }: Props) {
  const points = moves.map((move, i) => reviews[i] ? (move.color === "w" ? reviews[i]!.playedPoints : 1 - reviews[i]!.playedPoints) : undefined);
  let connected = false;
  const path = points.map((point, i) => {
    if (point === undefined) { connected = false; return ""; }
    const command = `${connected ? "L" : "M"}${(i + 1) / moves.length * 100},${4 + (1 - point) * 32}`;
    connected = true;
    return command;
  }).join(" ");
  const point = points[selected];
  const move = moves[selected];
  const description = move ? `${move.before.split(" ")[5]}${move.color === "w" ? "." : "…"}${move.san}` : "Starting position";

  return <div className="chess-evaluation">
    <div className="chess-evaluation-heading"><span>Evaluation</span><small>{point === undefined ? (move ? "Awaiting analysis" : "Starting position") : `${Math.round(point * 100)}% White`}</small></div>
    <div className="chess-evaluation-plot">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 20H100" className="chess-evaluation-middle" />
        <path d={path} className="chess-evaluation-line" />
        {move && <path d={`M${(selected + 1) / moves.length * 100} 0V40`} className="chess-evaluation-cursor" />}
        {point !== undefined && <circle cx={(selected + 1) / moves.length * 100} cy={4 + (1 - point) * 32} r="1.3" />}
      </svg>
      <input type="range" aria-label="Review position" min={-1} max={Math.max(-1, moves.length - 1)} step={1} value={selected}
        aria-valuetext={`${description}${point === undefined ? "" : ` · White expected score ${Math.round(point * 100)}%`}`}
        disabled={!moves.length} onChange={event => onSelect(Number(event.target.value))} />
    </div>
  </div>;
}
