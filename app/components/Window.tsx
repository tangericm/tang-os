"use client";

import { useRef, useState } from "react";

/**
 * Window — the generic, reusable macOS window frame.
 *
 * It knows how to LOOK like a window (traffic lights, title bar) and how
 * to BE DRAGGED. It knows nothing about what's inside it — content comes
 * in through `children`. Every future "app" (About, Projects, Resume)
 * reuses this one component with different children.
 *
 * Dragging, step by step:
 *  1. pointerdown on the title bar: remember where inside the window the
 *     cursor grabbed it (the offset), and "capture" the pointer so we
 *     keep receiving move events even if the cursor briefly leaves the bar.
 *  2. pointermove: new window position = cursor position − grab offset.
 *  3. pointerup: forget the offset; dragging ends.
 *
 * Pointer events cover mouse, trackpad, touch, and pen with one API —
 * this is why we use them instead of mousedown/mousemove.
 */

type WindowProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Window({ title, onClose, children }: WindowProps) {
  // null = "not dragged yet" → the window sits at its CSS default
  // position (centered). After the first grab we switch to exact
  // pixel coordinates.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const grabOffset = useRef<{ dx: number; dy: number } | null>(null);
  const frameRef = useRef<HTMLElement | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    const frame = frameRef.current;
    if (!frame) return;
    // Where is the window RIGHT NOW, in real pixels? (This also converts
    // the initial CSS-centered position into numbers we can drag from.)
    const rect = frame.getBoundingClientRect();
    if (pos === null) setPos({ x: rect.left, y: rect.top });
    grabOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (!grabOffset.current) return;
    setPos({
      x: e.clientX - grabOffset.current.dx,
      // never drag a window underneath the menu bar (30px + a hair)
      y: Math.max(34, e.clientY - grabOffset.current.dy),
    });
  }

  function onPointerUp() {
    grabOffset.current = null;
  }

  return (
    <section
      ref={frameRef}
      className="window"
      style={
        pos
          ? { left: pos.x, top: pos.y, transform: "none" }
          : undefined /* undefined → fall back to the centered CSS default */
      }
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
            // stopPropagation: clicking the red light should close,
            // not start a drag of the title bar underneath it
            onPointerDown={(e) => e.stopPropagation()}
          />
          <span className="light light-yellow" aria-hidden="true" />
          <span className="light light-green" aria-hidden="true" />
        </div>
        <span className="window-title">{title}</span>
      </header>

      <div className="window-body">{children}</div>
    </section>
  );
}
