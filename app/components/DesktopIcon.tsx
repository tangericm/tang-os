"use client";

/**
 * DesktopIcon — a clickable icon that lives on the desktop.
 * Double-click opens its app, exactly like the real thing.
 * (Also opens on Enter, for keyboard users.)
 */
export default function DesktopIcon({
  label,
  onOpen,
}: {
  label: string;
  onOpen: () => void;
}) {
  return (
    <button
      className="desktop-icon"
      onDoubleClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      title="Double-click to open"
    >
      <span className="desktop-icon-art" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="8.2" r="3.4" />
          <path d="M4.8 19.4a7.2 7.2 0 0 1 14.4 0" strokeLinecap="round" />
        </svg>
      </span>
      <span className="desktop-icon-label">{label}</span>
    </button>
  );
}
