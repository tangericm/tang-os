import type { MoveGrade } from "../lib/chess-review";

const TEXT: Partial<Record<MoveGrade, string>> = { Brilliant: "!!", Great: "!", Inaccuracy: "?!", Mistake: "?", Blunder: "??" };

function Glyph({ grade }: { grade: MoveGrade }) {
  const text = TEXT[grade];
  if (text) return <text x="10" y="14.4" textAnchor="middle" fontSize={text.length > 1 ? 10.5 : 12} fontWeight="900"
    letterSpacing={text.length > 1 ? "-.6" : 0} fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fill="#fff">{text}</text>;
  switch (grade) {
    case "Best": return <path d="M10 4.4 11.5 8.3 15.6 8.5 12.4 11.1 13.5 15.1 10 12.9 6.5 15.1 7.6 11.1 4.4 8.5 8.5 8.3Z" fill="#fff" />;
    case "Excellent": return <g fill="#fff"><rect x="4.6" y="9.1" width="2.4" height="6.3" rx=".6" />
      <path d="M8 15.4V9.2l2.7-4.3c.4-.6 1.4-.4 1.5.4l-.4 3h3.2c.9 0 1.5.8 1.3 1.6l-1.1 4.3c-.2.7-.8 1.2-1.5 1.2Z" /></g>;
    case "Good": return <path d="m5.6 10.4 2.9 2.9 5.9-6.1" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />;
    case "Book": return <path d="M4.6 6.3c2-.4 3.9 0 5.4 1.2v7.7c-1.5-1-3.4-1.4-5.4-1.1ZM15.4 6.3c-2-.4-3.9 0-5.4 1.2v7.7c1.5-1 3.4-1.4 5.4-1.1Z"
      fill="#fff" stroke="#fff" strokeWidth=".4" strokeLinejoin="round" />;
    case "Miss": return <path d="m6.5 6.5 7 7m0-7-7 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />;
    default: return <path d="M5.4 10h8.2M10.4 6.5 13.9 10l-3.5 3.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />;
  }
}

/** A round classification badge. Colour comes from the --g-* tokens on the chess root. */
export default function ChessGradeIcon({ grade, className }: { grade: MoveGrade; className?: string }) {
  return <svg viewBox="0 0 20 20" className={`chess-grade-icon${className ? ` ${className}` : ""}`} aria-hidden="true" focusable="false">
    <circle cx="10" cy="10" r="9.6" fill={`var(--g-${grade.toLowerCase()})`} />
    <circle cx="10" cy="10" r="9.1" fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth=".9" />
    <Glyph grade={grade} />
  </svg>;
}
