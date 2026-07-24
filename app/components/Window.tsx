"use client";

import { useLayoutEffect, useRef, useState } from "react";

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
  children,
}: WindowProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const grabOffset = useRef<{ dx: number; dy: number } | null>(null);
  const resizeStart = useRef<{ w: number; h: number; x: number; y: number } | null>(null);
  const frameRef = useRef<HTMLElement | null>(null);

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
    setZoomed(false); // manual sizing takes over from zoom
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

  const classes = [
    "window",
    "window-opening", // entrance animation on mount
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
            onClick={() => setZoomed(!zoomed)}
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
