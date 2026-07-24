"use client";

import { useRef, useState } from "react";

/**
 * Window — the generic, reusable macOS window frame.
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
        <div className="traffic">
          <button
            className="light light-red"
            aria-label="Close window"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg viewBox="0 0 8 8" aria-hidden="true">
              <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" />
            </svg>
          </button>
          <button
            className="light light-yellow"
            aria-label="Minimize to Dock"
            onClick={onMinimize}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg viewBox="0 0 8 8" aria-hidden="true">
              <path d="M1.25 4h5.5" />
            </svg>
          </button>
          <button
            className="light light-green"
            aria-label={zoomed ? "Zoom out" : "Zoom in"}
            onClick={() => setZoomed(!zoomed)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg viewBox="0 0 8 8" aria-hidden="true">
              <path d="M4 1.25v5.5M1.25 4h5.5" />
            </svg>
          </button>
        </div>
        <span className="window-title">{title}</span>
      </header>

      <div className="window-body">{children}</div>

      {/* resize grip — bottom-right, like every window since 1984 */}
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
