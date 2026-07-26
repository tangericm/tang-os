"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/* Desktop chrome a maximized window must not cover. Kept here next to the
   geometry that uses them; they mirror .menubar height and the dock's
   tile + padding + bottom offset in globals.css. */
const MENUBAR_H = 30;
const DOCK_RESERVE = 84;
const EDGE_GAP = 8;

/* Enough of the frame to grab and drag back. A window may sit mostly
   off-screen — that is a legitimate place to put one — but its titlebar has to
   remain reachable or the only recovery is a reload. */
const MIN_ON_SCREEN = 96;

function clampToViewport(p: { x: number; y: number }, frame: HTMLElement | null) {
  const w = frame?.offsetWidth ?? MIN_ON_SCREEN;
  return {
    x: Math.min(Math.max(p.x, MIN_ON_SCREEN - w), window.innerWidth - MIN_ON_SCREEN),
    y: Math.min(Math.max(p.y, MENUBAR_H + 4), window.innerHeight - MIN_ON_SCREEN),
  };
}

function maximizedGeometry() {
  return {
    pos: { x: EDGE_GAP, y: MENUBAR_H + EDGE_GAP },
    size: {
      w: window.innerWidth - EDGE_GAP * 2,
      h: window.innerHeight - MENUBAR_H - EDGE_GAP - DOCK_RESERVE,
    },
  };
}

/**
 * Window, the generic, reusable macOS window frame.
 *
 * New in this round:
 *  - `motion`: the window manager can put the frame into a transient
 *    animation state ("minimizing" | "closing"). The trick to animating
 *    an unmount in React: the parent KEEPS the component mounted while
 *    the exit animation plays, then removes it when the timer ends.
 *  - `zIndex` + `onFocus`: with two windows alive, clicking one must
 *    bring it to the front. Focus order lives in the window manager;
 *    the frame just reports pointer-downs.
 *  - `frameClassName`: lets an app nudge its default position so two
 *    freshly opened windows don't stack exactly on top of each other.
 */

type WindowProps = {
  /** minimized: stays mounted so its app keeps its state, but out of layout,
   *  out of the tab order and out of the accessibility tree */
  hidden?: boolean;
  title: string;
  onClose: () => void;
  onMinimize?: () => void;
  motion?: "minimizing" | "closing";
  /** CSS selector of the dock icon this window minimizes INTO */
  minimizeTarget?: string;
  zIndex?: number;
  onFocus?: () => void;
  frameClassName?: string;
  children: React.ReactNode;
};

export default function Window({
  title,
  onClose,
  onMinimize,
  motion,
  minimizeTarget,
  zIndex,
  onFocus,
  frameClassName,
  hidden = false,
  children,
}: WindowProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const grabOffset = useRef<{ dx: number; dy: number } | null>(null);
  const resizeStart = useRef<{ w: number; h: number; x: number; y: number } | null>(null);
  const frameRef = useRef<HTMLElement | null>(null);

  /* Un-minimizing. A window that owns explicit coordinates cannot reuse
     `win-open`: that keyframe hardcodes translateX(-50%) for the centered
     default, and this frame writes `transform: none` inline, so replaying it
     would yank the window half its own width to the left before settling.
     `win-restore` runs the genie backwards from the dock icon instead, using
     the --min-dx/--min-dy vector minimize already measured.

     Windows still at the stylesheet's default position need none of this:
     display:none → displayed restarts CSS animations by itself, and for them
     `win-open` is the geometrically correct one. */
  const [restoring, setRestoring] = useState(false);
  const wasHidden = useRef(hidden);
  /* useLayoutEffect, not useEffect, and that is the whole point of it. The
     render that un-minimizes a window removes `window-hidden` while
     `restoring` is still false; a post-paint effect would let the browser
     paint the window once at full size before the animation started, so every
     restore flashed. A layout effect commits the class before that paint.

     It also clamps the position it is about to reveal. The window kept its
     coordinates while minimized, which is the feature — but if the viewport
     narrowed in the meantime (a rotated phone, a resized browser) those
     coordinates can be off-screen, and unmounting used to hide that by
     re-centring on the way back. */
  useLayoutEffect(() => {
    if (wasHidden.current && !hidden) {
      setPos((p) => (p === null ? p : clampToViewport(p, frameRef.current)));
      if (pos !== null) setRestoring(true);
    }
    wasHidden.current = hidden;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden]);
  /* geometry to restore when the window is un-zoomed; null means "go back
     to whatever the stylesheet says", which is the state a freshly opened
     window is in */
  const preZoom = useRef<{
    pos: { x: number; y: number } | null;
    size: { w: number; h: number } | null;
  } | null>(null);

  /* Aim the minimize animation at THIS window's dock icon.
     Runs before paint (useLayoutEffect): we pin the window to pixel
     coordinates (so the CSS keyframe owns `transform` outright) and
     write the window→icon vector into CSS custom properties that the
     keyframe reads. Every window flies home to its own icon. */
  useLayoutEffect(() => {
    if (motion !== "minimizing") return;
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (pos === null) setPos({ x: rect.left, y: rect.top });
    const target = minimizeTarget
      ? document.querySelector(minimizeTarget)
      : null;
    if (target) {
      const t = target.getBoundingClientRect();
      frame.style.setProperty(
        "--min-dx",
        `${t.left + t.width / 2 - (rect.left + rect.width / 2)}px`
      );
      frame.style.setProperty(
        "--min-dy",
        `${t.top + t.height / 2 - (rect.top + rect.height / 2)}px`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion, minimizeTarget]);

  /* A maximized window should stay maximized when the viewport changes,
     otherwise rotating a tablet leaves it the wrong size. */
  useEffect(() => {
    /* Two jobs, because both failure modes are the viewport moving underneath
       a window that is not going to move itself: a maximized one has to keep
       filling the screen, and a positioned one has to stay reachable. The
       second matters more now that windows survive minimize — a window
       dragged to the right edge on a wide browser is off-screen entirely once
       the same session continues on a narrow one. */
    const fit = () => {
      if (zoomed) setSize(maximizedGeometry().size);
      else setPos((p) => (p === null ? p : clampToViewport(p, frameRef.current)));
    };
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [zoomed]);

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (pos === null) setPos({ x: rect.left, y: rect.top });
    grabOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (!grabOffset.current) return;
    setPos({
      x: e.clientX - grabOffset.current.dx,
      y: Math.max(34, e.clientY - grabOffset.current.dy),
    });
  }

  function onPointerUp() {
    grabOffset.current = null;
  }

  /* Resizing (the bottom-right grip): record the size and cursor at
     grab time; every move applies the delta, clamped to sane bounds. */
  function onResizeDown(e: React.PointerEvent<HTMLElement>) {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (pos === null) setPos({ x: rect.left, y: rect.top }); // pin position
    resizeStart.current = { w: rect.width, h: rect.height, x: e.clientX, y: e.clientY };
    if (size === null) setSize({ w: rect.width, h: rect.height }); // pin size
    setZoomed(false); // manual sizing takes over from zoom
    preZoom.current = null; // ...and discards the geometry zoom would restore
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
  }

  function onResizeMove(e: React.PointerEvent<HTMLElement>) {
    const s = resizeStart.current;
    if (!s) return;
    setSize({
      w: Math.min(Math.max(s.w + e.clientX - s.x, 340), window.innerWidth * 0.96),
      h: Math.min(Math.max(s.h + e.clientY - s.y, 240), window.innerHeight * 0.88),
    });
  }

  function onResizeUp() {
    resizeStart.current = null;
  }

  /* Zoom (the green light), a real maximize.
     This used to be CSS-only: `.window-zoomed { width: ... }`. That broke
     silently the moment an app shipped its own `.window-<app>` width rule,
     because both selectors have the same specificity and the app rule is
     further down the stylesheet, so it won. Owning the geometry in JS makes
     zoom app-agnostic, and lets it set HEIGHT too, which CSS alone could not
     do without hard-coding the chrome. We fill the desktop, leaving the menu
     bar and dock uncovered, and stash the old geometry to restore. */
  function toggleZoom() {
    if (zoomed) {
      const prev = preZoom.current;
      setPos(prev?.pos ?? null);
      setSize(prev?.size ?? null);
      preZoom.current = null;
      setZoomed(false);
      return;
    }
    preZoom.current = { pos, size };
    const g = maximizedGeometry();
    setPos(g.pos);
    setSize(g.size);
    setZoomed(true);
  }

  const classes = [
    "window",
    /* Only for a window sitting where the stylesheet put it. Once pos is set
       the frame carries `transform: none` and win-open's translateX(-50%)
       would be a visible sideways jump. */
    pos === null ? "window-opening" : "",
    restoring ? "window-restoring" : "",
    hidden ? "window-hidden" : "",
    zoomed ? "window-zoomed" : "",
    motion ? `window-${motion}` : "", // exit animations override entrance
    frameClassName ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      ref={frameRef}
      className={classes}
      style={{
        ...(pos ? { left: pos.x, top: pos.y, transform: "none" } : null),
        ...(size ? { width: size.w, height: size.h } : null),
        ...(zIndex !== undefined ? { zIndex } : null),
      }}
      onPointerDownCapture={onFocus}
      /* Guarded: animationend bubbles, and the window body is full of
         animated schematics that would otherwise clear this on their own. */
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setRestoring(false);
      }}
    >
      <header
        className="window-titlebar"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Each light is ONE SVG holding both circle and glyph in the
            same 12-unit coordinate system, centering is arithmetic
            (everything drawn around 6,6), immune to borders, flexbox,
            and fractional-DPI rounding. */}
        <div className="traffic">
          <button
            className="light"
            aria-label="Close window"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <circle cx="6" cy="6" r="6" fill="#ff5f57" />
              <circle cx="6" cy="6" r="5.5" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1" />
              <path className="light-glyph" d="M4.1 4.1l3.8 3.8M7.9 4.1l-3.8 3.8" />
            </svg>
          </button>
          <button
            className="light"
            aria-label="Minimize to Dock"
            onClick={onMinimize}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <circle cx="6" cy="6" r="6" fill="#febc2e" />
              <circle cx="6" cy="6" r="5.5" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1" />
              <path className="light-glyph" d="M3.7 6h4.6" />
            </svg>
          </button>
          <button
            className="light"
            aria-label={zoomed ? "Zoom out" : "Zoom in"}
            onClick={toggleZoom}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <circle cx="6" cy="6" r="6" fill="#28c840" />
              <circle cx="6" cy="6" r="5.5" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1" />
              <path className="light-glyph" d="M6 3.7v4.6M3.7 6h4.6" />
            </svg>
          </button>
        </div>
        <span className="window-title">{title}</span>
      </header>

      <div className="window-body">{children}</div>

      {/* resize grip, bottom-right, like every window since 1984 */}
      <div
        className="window-resize"
        aria-hidden="true"
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        onPointerCancel={onResizeUp}
      />
    </section>
  );
}
