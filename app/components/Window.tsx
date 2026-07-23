"use client";

import { useRef, useState } from "react";

/**
 * Window — the generic, reusable macOS window frame.
 *
 * All three traffic lights now work:
 *   red    → close    (handled by the parent via onClose)
 *   yellow → minimize (handled by the parent via onMinimize — the parent
 *            owns open/minimized state because the dock restores it)
 *   green  → zoom     (handled HERE with local state — how big the window
 *            is concerns nobody but the window itself)
 *
 * That split is deliberate and worth noticing: state lives at the lowest
 * level that still lets everyone who needs it reach it.
 */

type WindowProps = {
  title: string;
  onClose: () => void;
  onMinimize?: () => void;
  children: React.ReactNode;
};

export default function Window({ title, onClose, onMinimize, children }: WindowProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const grabOffset = useRef<{ dx: number; dy: number } | null>(null);
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

  return (
    <section
      ref={frameRef}
      className={zoomed ? "window window-zoomed" : "window"}
      style={pos ? { left: pos.x, top: pos.y, transform: "none" } : undefined}
    >
      <header
        className="window-titlebar"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Hovering anywhere on the group reveals the ×  −  + glyphs
            (drawn in CSS with ::after — no extra markup needed) */}
        <div className="traffic">
          <button
            className="light light-red"
            aria-label="Close window"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <button
            className="light light-yellow"
            aria-label="Minimize to Dock"
            onClick={onMinimize}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <button
            className="light light-green"
            aria-label={zoomed ? "Zoom out" : "Zoom in"}
            onClick={() => setZoomed(!zoomed)}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
        <span className="window-title">{title}</span>
      </header>

      <div className="window-body">{children}</div>
    </section>
  );
}
