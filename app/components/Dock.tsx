"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Dock — the launcher bar, with the famous magnification effect.
 *
 * How magnification works (the fun math):
 * on every mousemove we measure the horizontal distance `d` from the
 * cursor to each icon's center, and map it through a smooth falloff:
 *
 *   scale = 1 + MAX_GROWTH * (1 − (d / RADIUS)²)   …clamped at ≥ 1
 *
 * Icons under the cursor grow the most, neighbors grow a little,
 * everything two icons away is untouched. A short CSS transition
 * smooths the changes between mouse events.
 *
 * On touch screens there is no hover, so magnification is skipped
 * (we detect a "fine" pointer — mouse/trackpad — once, on mount).
 */

const RADIUS = 110; // px within which icons react
const MAX_GROWTH = 0.45; // icon under cursor grows 45%

type DockItem =
  | { kind: "app"; id: string; label: string; icon: React.ReactNode }
  | { kind: "link"; id: string; label: string; icon: React.ReactNode; href: string }
  | { kind: "soon"; id: string; label: string; icon: React.ReactNode };

/* Small hand-drawn SVG icons — no icon library, no trademark worries */
const icons = {
  person: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="8.2" r="3.4" />
      <path d="M4.8 19.4a7.2 7.2 0 0 1 14.4 0" strokeLinecap="round" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3.5 6.5h5l2 2.4h10v9.6a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 18.5v-12z" strokeLinejoin="round" />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V3.5z" strokeLinejoin="round" />
      <path d="M14 3.5v4h4" strokeLinejoin="round" />
      <path d="M9 12h6M9 15.5h6" strokeLinecap="round" />
    </svg>
  ),
  scholar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2.5 9.5 12 4.5l9.5 5L12 14.5l-9.5-5z" strokeLinejoin="round" />
      <path d="M6.5 11.8V16c0 1.4 2.5 2.9 5.5 2.9s5.5-1.5 5.5-2.9v-4.2" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8 10.5V17M8 7.6v.1M12 17v-3.8a2.4 2.4 0 0 1 4.8 0V17" strokeLinecap="round" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m4.5 7.5 7.5 6 7.5-6" strokeLinejoin="round" />
    </svg>
  ),
};

const ITEMS: DockItem[] = [
  { kind: "app", id: "about", label: "About Me", icon: icons.person },
  { kind: "soon", id: "projects", label: "Projects — coming soon", icon: icons.folder },
  { kind: "soon", id: "resume", label: "Resume — coming soon", icon: icons.doc },
  { kind: "link", id: "scholar", label: "Publications", icon: icons.scholar, href: "https://scholar.google.com/citations?user=LV0RaF8AAAAJ" },
  { kind: "link", id: "linkedin", label: "LinkedIn", icon: icons.linkedin, href: "https://www.linkedin.com/in/eric-tang-a09524ab/" },
  { kind: "link", id: "mail", label: "Email me", icon: icons.mail, href: "mailto:eric.tang22@gmail.com" },
];

export default function Dock({
  onOpenAbout,
  aboutRunning,
}: {
  onOpenAbout: () => void;
  aboutRunning: boolean;
}) {
  const [scales, setScales] = useState<number[]>(() => ITEMS.map(() => 1));
  const [canMagnify, setCanMagnify] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);

  // matchMedia touches `window`, which doesn't exist during server
  // rendering — so we ask the question once, after mount.
  useEffect(() => {
    setCanMagnify(window.matchMedia("(pointer: fine)").matches);
  }, []);

  function onMouseMove(e: React.MouseEvent) {
    if (!canMagnify || !listRef.current) return;
    const items = Array.from(listRef.current.children) as HTMLElement[];
    setScales(
      items.map((el) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(e.clientX - (r.left + r.width / 2));
        const t = 1 - (d / RADIUS) ** 2;
        return t > 0 ? 1 + MAX_GROWTH * t : 1;
      })
    );
  }

  function onMouseLeave() {
    setScales(ITEMS.map(() => 1));
  }

  return (
    <nav className="dock" aria-label="Dock">
      {/* The frosted glass lives on its own layer behind the icons.
          If the blurred element contained the scaling buttons,
          Chromium would paint ghost boxes during magnification — a
          real rendering quirk of backdrop-filter + child transforms. */}
      <div className="dock-glass" aria-hidden="true" />
      <ul ref={listRef} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
        {ITEMS.map((item, i) => {
          const s = scales[i];
          // Two jobs, two elements: the <li> grows in LAYOUT width so
          // neighbors get pushed aside (transforms alone don't take up
          // space — that was the "squished icons" bug), while the
          // button inside scales visually.
          const liStyle = { width: 48 * s };
          const buttonStyle = {
            transform: `translateY(${-(s - 1) * 14}px) scale(${s})`,
          };
          return (
            <li key={item.id} className="dock-item" data-label={item.label} style={liStyle}>
              {item.kind === "link" ? (
                <a
                  className="dock-button"
                  style={buttonStyle}
                  href={item.href}
                  target={item.href.startsWith("mailto") ? undefined : "_blank"}
                  rel="noreferrer"
                  aria-label={item.label}
                >
                  {item.icon}
                </a>
              ) : (
                <button
                  className="dock-button"
                  style={buttonStyle}
                  disabled={item.kind === "soon"}
                  onClick={item.id === "about" ? onOpenAbout : undefined}
                  aria-label={item.label}
                >
                  {item.icon}
                </button>
              )}
              {/* the little "this app is running" dot */}
              {item.id === "about" && aboutRunning && <span className="dock-dot" />}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
