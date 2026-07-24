"use client";

/**
 * DesktopFile — a document sitting on the desktop, like a real Mac.
 * Double-click opens it (single tap on touch screens, where
 * double-click doesn't exist).
 */
export default function DesktopFile({
  label,
  onOpen,
}: {
  label: string;
  onOpen: () => void;
}) {
  return (
    <button
      className="desktop-file"
      onDoubleClick={onOpen}
      onPointerUp={(e) => {
        if (e.pointerType === "touch") onOpen();
      }}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      title="Double-click to open"
    >
      <span className="desktop-file-art" aria-hidden="true">
        <svg viewBox="0 0 40 48">
          {/* the page */}
          <path
            d="M4 3a3 3 0 0 1 3-3h19l10 10v35a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V3z"
            fill="#fbfaf8"
          />
          {/* folded corner */}
          <path d="M26 0v7a3 3 0 0 0 3 3h7L26 0z" fill="#d9d4cc" />
          {/* text lines */}
          <g stroke="#b9b2a6" strokeWidth="2" strokeLinecap="round">
            <path d="M10 18h20M10 24h20M10 30h20M10 36h13" />
          </g>
          {/* PDF badge */}
          <rect x="6" y="34" width="19" height="10" rx="2.5" fill="#b0532f" />
          <text
            x="15.5"
            y="41.5"
            textAnchor="middle"
            fontSize="7"
            fontWeight="700"
            fill="#fff"
            fontFamily="-apple-system, 'Segoe UI', Arial, sans-serif"
          >
            PDF
          </text>
        </svg>
      </span>
      <span className="desktop-file-label">{label}</span>
    </button>
  );
}
