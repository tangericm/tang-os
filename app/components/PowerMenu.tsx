"use client";

import { useEffect, useRef, useState } from "react";

/**
 * PowerMenu: the power glyph in the menu bar, made to mean something.
 *
 * Three states, each borrowed from the machine this interface imitates.
 * Sleep dims until you touch something. Restart clears the once-per-session
 * boot flag and reloads, so the boot sequence genuinely plays again rather
 * than being simulated. Shut Down is the one worth building: the screen
 * powers off to a single line of text and the only way back is the power
 * button, which is exactly the deal a real machine offers.
 *
 * Escape and a click outside both close the menu; sleep wakes on any input.
 */

type Mode = null | "sleep" | "off";

export default function PowerMenu() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const wrap = useRef<HTMLDivElement | null>(null);

  /* close on outside click or Escape, the two things a menu must honour */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* sleep wakes on any input at all */
  useEffect(() => {
    if (mode !== "sleep") return;
    const wake = () => setMode(null);
    document.addEventListener("pointerdown", wake);
    document.addEventListener("keydown", wake);
    return () => {
      document.removeEventListener("pointerdown", wake);
      document.removeEventListener("keydown", wake);
    };
  }, [mode]);

  function restart() {
    // drop the flag so the boot sequence actually replays
    try {
      sessionStorage.removeItem("tangos-booted");
    } catch {}
    window.location.reload();
  }

  function powerOn() {
    try {
      sessionStorage.removeItem("tangos-booted");
    } catch {}
    window.location.reload();
  }

  return (
    <>
      <div className="power" ref={wrap}>
        <button
          className="power-button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Power"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 3v8" />
            <path d="M6.2 6.2a8.2 8.2 0 1 0 11.6 0" />
          </svg>
        </button>

        {open && (
          <div className="power-menu" role="menu">
            <button role="menuitem" onClick={() => { setOpen(false); setMode("sleep"); }}>
              Sleep
            </button>
            <button role="menuitem" onClick={restart}>
              Restart
            </button>
            <button role="menuitem" onClick={() => { setOpen(false); setMode("off"); }}>
              Shut Down
            </button>
          </div>
        )}
      </div>

      {mode === "sleep" && (
        <div className="sleep-veil" role="presentation">
          <p>Sleeping. Click anywhere to wake.</p>
        </div>
      )}

      {mode === "off" && (
        <div className="power-off" role="dialog" aria-label="Powered off">
          <p className="power-off-line">It is now safe to close this tab.</p>
          <button className="power-on" onClick={powerOn} aria-label="Power on">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 3v8" />
              <path d="M6.2 6.2a8.2 8.2 0 1 0 11.6 0" />
            </svg>
          </button>
          <p className="power-off-hint">power on</p>
        </div>
      )}
    </>
  );
}
