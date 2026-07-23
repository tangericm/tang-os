export default function BootScreen() {
  return (
    <main className="boot">
      <div className="boot-center">
        <svg
          className="boot-logo"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {/* power symbol */}
          <path d="M12 3v8" />
          <path d="M6.2 6.2a8.2 8.2 0 1 0 11.6 0" />
        </svg>

        <div className="boot-progress" role="progressbar" aria-label="Booting">
          <div className="boot-progress-fill" />
        </div>

        <p className="boot-caption">
          <span className="boot-name">TangOS</span> v0.1 — first boot
        </p>

        <p className="boot-message">
          Desktop under construction · Eric&nbsp;M.&nbsp;Tang
        </p>
      </div>

      <footer className="boot-footer">ericmtang.com</footer>
    </main>
  );
}
