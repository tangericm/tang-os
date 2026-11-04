import type { Color, PieceSymbol } from "chess.js";

/** Original, rounded Staunton pieces, drawn to stay distinct at board-square sizes. */
export default function ChessPiece({ type, color }: { type: PieceSymbol; color: Color }) {
  const white = color === "w";
  const body = white ? "#fff3d9" : "#493126";
  const edge = white ? "#58402e" : "#e5c99b";
  const shade = white ? "#ddbf91" : "#2c1d18";
  const light = white ? "#fffdf2" : "#79543b";

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={`chess-piece chess-piece-${color}`}
      fill={body} stroke={edge} strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round">
      {type === "p" && <>
        <path d="M20 21h8c-1.8 6.5-.5 10 5 15H15c5.5-5 6.8-8.5 5-15Z" />
        <path d="M25 23h3c-1.4 5.8-.1 9 5 13h-7c-1.6-4-2-8-1-13Z" fill={shade} stroke="none" />
        <circle cx="24" cy="14" r="7.4" />
        <path d="M19.5 13a4.8 4.8 0 0 1 4.5-4.1" fill="none" stroke={light} strokeWidth="2.6" />
        <path d="M19 23h10" />
      </>}
      {type === "r" && <>
        <path d="M12 8h6v6h4V8h4v6h4V8h6v13l-5 4 1 11H16l1-11-5-4Z" />
        <path d="M27 24h4l1 12h-7Z" fill={shade} stroke="none" />
        <path d="M15 20h18M17 25h14" fill="none" />
        <path d="M20 28v5" stroke={light} strokeWidth="2.5" />
      </>}
      {type === "n" && <>
        <path d="M14 36c.5-6 4.4-9.4 10.3-13.7l-5.1-2.1-5.5 3-4-4.3 8.7-10.1.2-5.3 7 4.3C36.8 9 39 20.6 33 36Z" />
        <path d="M27.5 11c7 5 7.4 13 2 25h-7c6.5-9.7 8.8-17.4 5-25Z" fill={shade} stroke="none" />
        <path d="m19.7 10.3 2.8 1.4M13.1 18.6l2.2.8M19 29c3-2 5.2-4.1 6.2-6.2" fill="none" />
        <path d="M29 12.5c3.4 3.3 3.5 6.3 3 9.7" fill="none" stroke={light} strokeWidth="2.5" />
        <circle cx="21.6" cy="15.8" r="1.6" fill={edge} stroke="none" />
      </>}
      {type === "b" && <>
        <path d="M21 24h6c-1 5 1 8.2 6 12H15c5-3.8 7-7 6-12Z" />
        <path d="M26 26h2c.2 4.2 1.7 6.8 5 10h-7Z" fill={shade} stroke="none" />
        <path d="M24 8c-3.7 3.3-10 7.9-10 12.5 0 4.3 4.5 6.5 10 6.5s10-2.2 10-6.5C34 15.9 27.7 11.3 24 8Z" />
        <path d="M29 14c5.2 6 3.8 10.1-3 11" fill="none" stroke={shade} strokeWidth="3" />
        <path d="m25.5 12-5 7" fill="none" strokeWidth="2.6" />
        <circle cx="24" cy="6.4" r="2.3" />
        <path d="M19 29h10" />
      </>}
      {type === "q" && <>
        <path d="m11 14 7.5 6.5L24 9l5.5 11.5L37 14l-6 15 2 7H15l2-7Z" />
        <path d="m28.6 23 5.2-3.8L30 29l2 7h-7l1-7Z" fill={shade} stroke="none" />
        <path d="M17 28h14M18 32h12" fill="none" />
        <path d="m18 23 1.5 2" stroke={light} strokeWidth="2.3" />
        <circle cx="10.5" cy="12.4" r="2.7" />
        <circle cx="24" cy="7" r="2.7" />
        <circle cx="37.5" cy="12.4" r="2.7" />
      </>}
      {type === "k" && <>
        <path d="M21.5 3h5v4h4v4h-4v5h-5v-5h-4V7h4Z" />
        <path d="M15 16h18l-2 10h-3c0 4 1.5 7 5 10H15c3.5-3 5-6 5-10h-3Z" />
        <path d="M26 18h4.6L29 24h-3c-1 4.5-.3 8.2 2 12h-4c-2.3-6.3-.5-12.7 2-18Z" fill={shade} stroke="none" />
        <path d="M17 26h14M19 30h10" fill="none" />
        <path d="m18.5 18.5.6 4" stroke={light} strokeWidth="2.3" />
      </>}
      <path d="M15 36h18l3.5 5c.6.9 0 2-1.1 2H12.6c-1.1 0-1.7-1.1-1.1-2Z" />
      <path d="M14 40.5h20l1 1.5H13Z" fill={shade} stroke="none" />
      <path d="M16 38.5h14" fill="none" stroke={light} strokeWidth="1.7" />
    </svg>
  );
}
