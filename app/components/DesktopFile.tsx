"use client";

import { useRef, useState } from "react";

/**
 * DesktopFile — a document on the desktop that you can DRAG around,
 * like the real thing.
 *
 * The subtle problem this solves: the same pointer gestures must mean
 * two different things. Press-move = drag; press-release without
 * moving = (part of) a click. We disambiguate with a distance
 * threshold — under 5px of travel it's a click, over it's a drag —
 * so double-click still opens and drags never accidentally open.
 */
export default function DesktopFile({
  label,
  onOpen,
}: {
  label: string;
  onOpen: () => void;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{
    dx: number;
    dy: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const ref = useRef<HTMLButtonElement | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    drag.current = {
      dx: e.clientX - r.left,
      dy: e.clientY - r.top,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    if (!d.moved) {
      const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
      if (dist < 5) return; // still a click, not a drag
      d.moved = true;
    }
    setPos({
      x: e.clientX - d.dx,
      y: Math.max(34, e.clientY - d.dy),
    });
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const wasDrag = drag.current?.moved ?? false;
    drag.current = null;
    // touch screens have no double-click: a clean tap opens
    if (!wasDrag && e.pointerType === "touch") onOpen();
  }

  return (
    <button
      ref={ref}
      className="desktop-file"
      style={pos ? { left: pos.x, top: pos.y, right: "auto" } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
      onDoubleClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      title="Double-click to open"
    >
      <span className="desktop-file-art" aria-hidden="true">
        <svg viewBox="0 0 40 48">
          <path
            d="M4 3a3 3 0 0 1 3-3h19l10 10v35a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V3z"
            fill="#fbfaf8"
          />
          <path d="M26 0v7a3 3 0 0 0 3 3h7L26 0z" fill="#d9d4cc" />
          <g stroke="#b9b2a6" strokeWidth="2" strokeLinecap="round">
            <path d="M10 18h20M10 24h20M10 30h20M10 36h13" />
          </g>
          <rect x="6" y="34" width="19" height="10" rx="2.5" fill="#b0532f" />
          <text
            x="15.5"
            y="41.5"
            textAnchor="middle"
            fontSize="7"
            fontWeight="700"
            fill="#fff"
            fontFamily="-apple-system, 'Segoe UI', Arial, sans-serif"
          >
            PDF
          </text>
        </svg>
      </span>
      <span className="desktop-file-label">{label}</span>
    </button>
  );
}
