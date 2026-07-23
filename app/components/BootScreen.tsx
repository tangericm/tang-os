/**
 * BootScreen — a full-screen overlay shown on page load.
 *
 * This is a SERVER component (no "use client" directive): it has no state,
 * no event handlers, no browser APIs. Next.js renders it to plain HTML on
 * the server and ships zero JavaScript for it. The entire boot sequence —
 * logo fade-in, progress fill, overlay fade-out — is pure CSS animation
 * (see the .boot-* rules in globals.css).
 */
export default function BootScreen() {
  return (
    <div className="boot-overlay" aria-hidden="true">
      <div className="boot-center">
        <svg
          className="boot-logo"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          {/* power symbol */}
          <path d="M12 3v8" />
          <path d="M6.2 6.2a8.2 8.2 0 1 0 11.6 0" />
        </svg>

        <div className="boot-progress">
          <div className="boot-progress-fill" />
        </div>

        <p className="boot-caption">
          <span className="boot-name">TangOS</span> — starting up
        </p>
      </div>
    </div>
  );
}
