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

  /* Close on outside click or Escape, the two things a menu must honour.
     Armed on a delay for the same reason as the sleep veil: the tap that
     opens the menu must not also be the tap that dismisses it. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const arm = window.setTimeout(
      () => document.addEventListener("pointerdown", onDown),
      250
    );
    return () => {
      window.clearTimeout(arm);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* Sleep wakes on any input, but NOT on the tail of the gesture that started
     it. On a touch screen one tap fires pointerdown, pointerup, click, and on
     some browsers a second compatibility mouse sequence a moment later. A
     wake listener attached synchronously catches that tail and the veil
     vanishes on the same tap that summoned it, which is exactly what "sleep
     doesn't work on mobile" looked like. Arming after a short delay, and
     listening for pointerUP rather than pointerdown, means the wake can only
     come from a genuinely new touch. */
  useEffect(() => {
    if (mode !== "sleep") return;
    const wake = () => setMode(null);
    let armed = false;
    const arm = window.setTimeout(() => {
      armed = true;
      document.addEventListener("pointerup", wake);
      document.addEventListener("keydown", wake);
      document.addEventListener("wheel", wake, { passive: true });
    }, 450);
    return () => {
      window.clearTimeout(arm);
      if (armed) {
        document.removeEventListener("pointerup", wake);
        document.removeEventListener("keydown", wake);
        document.removeEventListener("wheel", wake);
      }
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
            {/* onPointerUp, not onClick: the menu unmounts as soon as the
                action fires, and on touch a synthetic click arriving after
                unmount is simply dropped. */}
            <button
              role="menuitem"
              onPointerUp={() => { setOpen(false); setMode("sleep"); }}
              onClick={() => { setOpen(false); setMode("sleep"); }}
            >
              Sleep
            </button>
            <button role="menuitem" onPointerUp={restart} onClick={restart}>
              Restart
            </button>
            <button
              role="menuitem"
              onPointerUp={() => { setOpen(false); setMode("off"); }}
              onClick={() => { setOpen(false); setMode("off"); }}
            >
              Shut Down
            </button>
          </div>
        )}
      </div>

      {mode === "sleep" && (
        <div
          className="sleep-veil"
          role="presentation"
          onPointerUp={() => setMode(null)}
        >
          <p>Sleeping. Tap anywhere to wake.</p>
        </div>
      )}

      {mode === "off" && (
        <div className="power-off" role="dialog" aria-label="Powered off">
          <p className="power-off-line">It is now safe to close this tab.</p>
          <button className="power-on" onPointerUp={powerOn} onClick={powerOn} aria-label="Power on">
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
