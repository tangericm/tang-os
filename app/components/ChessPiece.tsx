import type { Color, PieceSymbol } from "chess.js";

/** Original vector pieces share a silhouette, base, and stroke weight at every size. */
export default function ChessPiece({ type, color }: { type: PieceSymbol; color: Color }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={`chess-piece chess-piece-${color}`}
      fill={color === "w" ? "#fff6e6" : "#30251e"} stroke={color === "w" ? "#49392b" : "#dac5a4"}
      strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
      {type === "p" && <><circle cx="24" cy="13" r="6" /><path d="M20 19h8l-1 8 6 8H15l6-8z" /></>}
      {type === "r" && <><path d="M13 8h5v6h4V8h4v6h4V8h5v12l-5 4v11H18V24l-5-4z" /><path d="M17 20h14M18 27h12" /></>}
      {type === "n" && <><path d="m15 35 2-9 9-6-7-1-5 3-4-5 9-9 1-5 6 5c10 1 12 12 8 27z" /><path d="M20 10h3M26 14h1M17 26l9-6" /><circle cx="24" cy="13" r="1" fill="currentColor" stroke="none" /></>}
      {type === "b" && <><circle cx="24" cy="6" r="2" /><path d="M24 9c-13 9-12 15-3 17l-4 9h14l-4-9c9-2 10-8-3-17z" /><path d="m27 13-7 8M20 28h8" /></>}
      {type === "q" && <><path d="m12 14 7 7 5-11 5 11 7-7-6 20H18z" /><circle cx="11" cy="12" r="2.5" /><circle cx="24" cy="7" r="2.5" /><circle cx="37" cy="12" r="2.5" /><path d="M17 28h14" /></>}
      {type === "k" && <><path d="M24 3v10M20 7h8" /><path d="M24 15c-8-7-15-1-10 7l5 6-2 7h14l-2-7 5-6c5-8-2-14-10-7z" /><path d="M19 28h10M24 15v9" /></>}
      <path d="M15 35h18l3 6H12z" /><path d="M12 41h24" />
    </svg>
  );
}
