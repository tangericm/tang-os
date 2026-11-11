"use client";

import type { Move } from "chess.js";
import { continuationMoves, describeMove } from "../lib/chess-coach";
import type { MoveReview } from "../lib/chess-review";
import ChessPiece from "./ChessPiece";

type Props = { move: Move; review: MoveReview; showing: boolean; onToggle: () => void; disabled?: boolean };

/** After every graded move: what the engine preferred, why, and a toggle to see it on the board. */
export default function ChessBestMove({ move, review, showing, onToggle, disabled }: Props) {
  const found = review.bestLan === move.lan;
  const best = found ? move : continuationMoves(move.before, [review.bestLan])[0];
  if (!best) return null;
  const lost = Math.round(review.loss * 100);
  return <div className="chess-best" data-found={found || undefined} aria-label="Best move">
    <span className="chess-best-piece" aria-hidden="true"><ChessPiece type={best.piece} color={best.color} /></span>
    <div className="chess-best-text">
      <small>{found ? "Best move — found it" : "Best move was"}</small>
      <strong>{best.san}</strong>
    </div>
    <button type="button" className="chess-chip" aria-pressed={showing} disabled={disabled} onClick={onToggle}>
      {showing ? "Hide" : "Show"}<span className="chess-sr-only"> best move</span></button>
    {!found && <p>{describeMove(best)}{lost >= 2 ? ` Your move gave up about ${lost}% of the expected score.` : ""}</p>}
  </div>;
}
