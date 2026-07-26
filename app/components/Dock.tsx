"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Dock, the launcher bar, with the famous magnification effect.
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
 * (we detect a "fine" pointer, mouse/trackpad, once, on mount).
 */

const RADIUS = 110; // px within which icons react
const MAX_GROWTH = 0.45; // icon under cursor grows 45%

type DockItem =
  | { kind: "app"; id: string; label: string; icon: React.ReactNode }
  | { kind: "link"; id: string; label: string; icon: React.ReactNode; href: string }
  | { kind: "soon"; id: string; label: string; icon: React.ReactNode };

/**
 * The dock icon set, drawn to one spec rather than nine.
 *
 * The audit that produced this found four inconsistencies in the old set,
 * all of them the kind you feel before you can name:
 *
 *  1. GitHub sat on a 16-unit grid while everything else used 24, and was a
 *     fill mark among stroke marks, so it read noticeably heavier.
 *  2. Optical size drifted. The folder spanned 17 units of the grid, the
 *     document only 12, so icons that should have looked equal did not.
 *  3. Corner radii were ad hoc: rx 3, rx 2, rx 2, no relationship.
 *  4. Line caps and joins were declared per-path, so some corners were
 *     mitred and some round within the same icon.
 *
 * The spec now: **24-unit grid, 17-unit optical box centred on (12,12),
 * stroke 1.6, round caps and joins set once on the wrapper, radius 2.5 for
 * large containers and 1 for small details.** Caps and joins live on `Ico`
 * so an individual path cannot drift.
 *
 * The two brand marks are the deliberate exception. GitHub and LinkedIn are
 * recognised as filled silhouettes, so redrawing them as outlines would cost
 * more in legibility than it gains in consistency. They are instead scaled
 * into the same 17-unit optical box and given slightly reduced opacity via
 * `.dock-brand`, which is what actually equalises their visual weight
 * against the stroke icons.
 */
function Ico({ children, fill = false }: { children: React.ReactNode; fill?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={fill ? "dock-brand" : undefined}
    >
      {children}
    </svg>
  );
}

const icons = {
  person: (
    <Ico>
      <circle cx="12" cy="8.6" r="3.5" />
      <path d="M5 19.5a7 7 0 0 1 14 0" />
    </Ico>
  ),
  folder: (
    <Ico>
      <path d="M3.5 7.2a1.7 1.7 0 0 1 1.7-1.7h3.4l1.9 2.3h8.2a1.7 1.7 0 0 1 1.7 1.7v7.3a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7V7.2z" />
    </Ico>
  ),
  doc: (
    <Ico>
      <path d="M6 5.2a1.7 1.7 0 0 1 1.7-1.7h5.6L18 8.2v10.6a1.7 1.7 0 0 1-1.7 1.7H7.7A1.7 1.7 0 0 1 6 18.8V5.2z" />
      <path d="M13.2 3.5v3.4a1.4 1.4 0 0 0 1.4 1.4H18" />
      <path d="M9.4 12.4h5.2M9.4 15.6h5.2" />
    </Ico>
  ),
  scholar: (
    <Ico>
      <path d="M3.5 9.8 12 5.5l8.5 4.3L12 14.1 3.5 9.8z" />
      <path d="M7.2 11.7v3.7c0 1.3 2.2 2.4 4.8 2.4s4.8-1.1 4.8-2.4v-3.7" />
      <path d="M20.5 9.8v4.4" />
    </Ico>
  ),
  linkedin: (
    /* the trademark silhouette, scaled into the shared 17-unit box */
    <Ico fill>
      <path d="M19.4 3.5H4.6a1.1 1.1 0 0 0-1.1 1.1v14.8a1.1 1.1 0 0 0 1.1 1.1h14.8a1.1 1.1 0 0 0 1.1-1.1V4.6a1.1 1.1 0 0 0-1.1-1.1zM8.6 18H6.1v-7.9h2.5V18zM7.3 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM18 18h-2.5v-3.8c0-.9 0-2.1-1.3-2.1s-1.5 1-1.5 2v3.9h-2.5v-7.9h2.4v1.1h.03a2.6 2.6 0 0 1 2.4-1.3c2.5 0 3 1.7 3 3.9V18z" />
    </Ico>
  ),
  mail: (
    <Ico>
      <rect x="3.5" y="5.8" width="17" height="12.4" rx="2.5" />
      <path d="m4.6 8.1 6.4 4.7a1.7 1.7 0 0 0 2 0l6.4-4.7" />
    </Ico>
  ),
  game: (
    /* a gamepad, redrawn so its mass sits in the optical box rather than
       hugging the bottom edge the way the old headphone-ish shape did */
    <Ico>
      <path d="M8.4 8.5h7.2a4.6 4.6 0 0 1 4.5 3.7l.7 3.6a2.2 2.2 0 0 1-3.9 1.8l-1.3-1.7H8.4l-1.3 1.7a2.2 2.2 0 0 1-3.9-1.8l.7-3.6a4.6 4.6 0 0 1 4.5-3.7z" />
      <path d="M7.6 12.3v2.2M6.5 13.4h2.2" />
      <circle cx="16" cy="12.6" r="0.95" fill="currentColor" stroke="none" />
      <circle cx="17.7" cy="14.4" r="0.95" fill="currentColor" stroke="none" />
    </Ico>
  ),
  terminal: (
    <Ico>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="m7.6 10.4 2.4 2-2.4 2" />
      <path d="M13 14.4h3.6" />
    </Ico>
  ),
  github: (
    /* Octicons mark (MIT), remapped from a 16-unit grid onto the shared 24 */
    <Ico fill>
      <g transform="translate(3.5 3.5) scale(1.0625)">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
      </g>
    </Ico>
  ),
};

const ITEMS: DockItem[] = [
  { kind: "app", id: "about", label: "About Me", icon: icons.person },
  { kind: "app", id: "projects", label: "Projects", icon: icons.folder },
  { kind: "app", id: "resume", label: "Resume", icon: icons.doc },
  { kind: "app", id: "terminal", label: "Terminal", icon: icons.terminal },
  { kind: "app", id: "game", label: "Runner", icon: icons.game },
  { kind: "link", id: "github", label: "GitHub", icon: icons.github, href: "https://github.com/tangericm" },
  { kind: "link", id: "scholar", label: "Publications", icon: icons.scholar, href: "https://scholar.google.com/citations?user=LV0RaF8AAAAJ" },
  { kind: "link", id: "linkedin", label: "LinkedIn", icon: icons.linkedin, href: "https://www.linkedin.com/in/eric-tang-a09524ab/" },
  { kind: "link", id: "mail", label: "Email me", icon: icons.mail, href: "mailto:eric.tang22@gmail.com" },
];

export default function Dock({
  onOpenApp,
  running,
}: {
  onOpenApp: (id: string) => void;
  /** which app ids currently have a window alive, for the running dots */
  running: Record<string, boolean>;
}) {
  const [canMagnify, setCanMagnify] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);

  /* Resting centres, measured once. The previous version called
     getBoundingClientRect on all nine items inside the mousemove handler —
     nine forced synchronous layouts per event — and then setState with a
     fresh nine-element array, re-rendering the whole dock on top of a
     backdrop-filter layer. Measuring at rest is also more correct: distances
     have to be taken from where the icons SIT, not from where the current
     magnification has already pushed them, or the geometry feeds back on
     itself as the cursor moves. */
  const centres = useRef<number[]>([]);
  const frame = useRef<number | null>(null);
  const pendingX = useRef<number | null>(null);

  const measure = useCallback(() => {
    const ul = listRef.current;
    if (!ul) return;
    centres.current = Array.from(ul.children).map((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      return r.left + r.width / 2;
    });
  }, []);

  // matchMedia touches `window`, which doesn't exist during server
  // rendering, so we ask the question once, after mount.
  useEffect(() => {
    setCanMagnify(window.matchMedia("(pointer: fine)").matches);
  }, []);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  /* Writes straight to the DOM as a custom property. React never sees a
     pointer move, so nothing re-renders and the nine <li> elements are not
     rebuilt sixty times a second; CSS reads --s for both the layout width and
     the button transform. */
  const apply = useCallback((x: number | null) => {
    const ul = listRef.current;
    if (!ul) return;
    const items = ul.children;
    for (let i = 0; i < items.length; i++) {
      let scale = 1;
      if (x !== null) {
        const d = Math.abs(x - (centres.current[i] ?? 0));
        const t = 1 - (d / RADIUS) ** 2;
        if (t > 0) scale = 1 + MAX_GROWTH * t;
      }
      (items[i] as HTMLElement).style.setProperty("--s", String(scale));
    }
  }, []);

  function onMouseMove(e: React.MouseEvent) {
    if (!canMagnify) return;
    listRef.current?.classList.remove("dock-settling");
    pendingX.current = e.clientX;
    /* Coalesced to one write per frame. Pointer events fire faster than the
       compositor paints, so anything more is work thrown away. */
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      apply(pendingX.current);
    });
  }

  function onMouseLeave() {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    /* The only moment a transition is wanted. While the cursor is over the
       dock the icons must track it exactly; a transition there would make the
       whole row lag behind the pointer. On the way out there is nothing to
       track, so the collapse gets to ease. */
    listRef.current?.classList.add("dock-settling");
    apply(null);
  }

  useEffect(() => {
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <nav className="dock" aria-label="Dock">
      {/* The frosted glass lives on its own layer behind the icons.
          If the blurred element contained the scaling buttons,
          Chromium would paint ghost boxes during magnification, a
          real rendering quirk of backdrop-filter + child transforms. */}
      <div className="dock-glass" aria-hidden="true" />
      <ul ref={listRef} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
        {ITEMS.map((item) => {
          /* Two jobs, two elements, both driven by --s: the <li> grows in
             LAYOUT width so neighbours get pushed aside (transforms alone
             take up no space — that was the "squished icons" bug), while the
             button inside scales visually. Both live in globals.css now, so
             the pointer handler only has to write one number. */
          return (
            <li key={item.id} className="dock-item" data-label={item.label}>
              {item.kind === "link" ? (
                <a
                  className="dock-button"
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
                  data-app={item.id}
                  disabled={item.kind === "soon"}
                  onClick={() => onOpenApp(item.id)}
                  aria-label={item.label}
                >
                  {item.icon}
                </button>
              )}
              {/* the little "this app is running" dot */}
              {item.kind === "app" && running[item.id] && <span className="dock-dot" />}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
