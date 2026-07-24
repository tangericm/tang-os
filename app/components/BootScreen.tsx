/**
 * BootScreen — full-screen overlay shown on load, then fades out.
 *
 * Server component: no state, no handlers — the entire sequence is
 * CSS animation. The monogram matches the About avatar and the
 * favicon, so the brand is one mark everywhere: tab, boot, window.
 */
export default function BootScreen() {
  return (
    <div className="boot-overlay" aria-hidden="true">
      <div className="boot-center">
        <div className="boot-monogram">ET</div>

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
