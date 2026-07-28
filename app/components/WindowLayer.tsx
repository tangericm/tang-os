"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AboutWindow from "./AboutWindow";
import ProjectsWindow from "./ProjectsWindow";
import ResumeWindow from "./ResumeWindow";
import TerminalWindow from "./TerminalWindow";
import GameWindow from "./GameWindow";
import DesktopFile from "./DesktopFile";
import Dock from "./Dock";
import { DEFAULT_PROJECT, hrefFor, parseRoute, type AppId } from "../lib/routes";

/**
 * WindowLayer, the window manager, now also the router.
 *
 * Each app is a little state machine:
 *
 *   closed → open → minimizing → minimized
 *                 ↘ closing   → closed
 *
 * "minimizing"/"closing" are TRANSIENT states: the window stays mounted with
 * an exit animation class, and a timer completes the transition once the
 * animation has played. (If the visitor prefers reduced motion, the timer is 0
 * and windows just disappear, the animation is a courtesy, never a delay.)
 *
 * Focus: `front` records which app was last touched; it renders at a higher
 * z-index. That is the entire focus model, and it is the same one real window
 * managers use.
 *
 * ── The URL ──────────────────────────────────────────────────────────────
 * One record of phases rather than five useState calls. Five slots plus a
 * route-derived initial value is five chances to desync, and the desync is
 * invisible until someone shares a link.
 *
 * The initial value comes from the path through a lazy initializer, which
 * touches no browser API — that is the whole hydration story. The server
 * renders /projects/speckle with the Projects window already open on that
 * project, and the client's first render computes the same thing from the
 * same string.
 *
 * This component lives in the (desktop) LAYOUT, not in a page, so a soft
 * navigation re-renders only the document beneath it. No window remounts, and
 * drag position, size, zoom, terminal scrollback and the game all survive
 * moving between URLs.
 */

type Phase = "closed" | "open" | "minimizing" | "minimized" | "closing";

const EXIT_MS = 280; // keep in sync with the CSS exit animations

const CLOSED: Record<AppId, Phase> = {
  about: "closed",
  projects: "closed",
  resume: "closed",
  terminal: "closed",
  game: "closed",
};

export default function WindowLayer() {
  const pathname = usePathname();
  const router = useRouter();
  const route = parseRoute(pathname);

  const [phases, setPhases] = useState<Record<AppId, Phase>>(() => ({
    ...CLOSED,
    /* About is the arrival screen, so it opens behind whatever the URL asked
       for. Landing on /resume gives you the resume over the desktop, not a
       bare wallpaper. */
    about: "open",
    [route.app]: "open",
  }));
  const [front, setFront] = useState<AppId>(route.app);

  /* Which app the URL currently names. Set BEFORE any push we initiate, so the
     effect below can tell "the user navigated" from "we just navigated". Get
     this backwards and every open immediately closes itself. */
  const routedApp = useRef<AppId>(route.app);

  /* Remembered separately from the URL. Opening Resume from /projects/speckle
     moves the path to /resume and nulls route.project, and without this the
     still-mounted Projects window would silently snap back to the default. */
  const [lastProject, setLastProject] = useState(route.project ?? DEFAULT_PROJECT);
  useEffect(() => {
    if (route.project) setLastProject(route.project);
  }, [route.project]);
  const selected = route.project ?? lastProject;

  const reducedMotion = useRef(false);
  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  function settle(id: AppId, transient: Phase, final: Phase) {
    window.setTimeout(
      () => setPhases((p) => (p[id] === transient ? { ...p, [id]: final } : p)),
      reducedMotion.current ? 0 : EXIT_MS
    );
  }

  function exit(id: AppId, transient: "minimizing" | "closing", final: Phase) {
    setPhases((p) => ({ ...p, [id]: transient }));
    settle(id, transient, final);
  }

  /* URL → state. Keyed on route.app so a project change inside /projects does
     not re-run it. */
  useEffect(() => {
    const next = route.app;
    const prev = routedApp.current;
    if (next === prev) return; // a push we made; state is already correct
    routedApp.current = next;

    setPhases((p) => {
      const out = { ...p, [next]: "open" as Phase };
      /* Back closes the app the URL used to name, and only that one. Closing
         everything would feel like a page reload; closing nothing would make
         Back do visibly nothing. About is the arrival screen and stays.

         A MINIMIZED window goes straight to "closed" with no animation. It is
         unmounted while minimized and mounted while closing, so handing it
         "closing" would pop it back to full size to play an exit animation
         for something the user cannot currently see — the window visibly
         reappearing in order to disappear. */
      if (prev !== "about") out[prev] = p[prev] === "open" ? "closing" : "closed";
      return out;
    });
    /* Unconditional on purpose: settle only acts when the phase is still the
       transient one it was given, so for a window sent directly to "closed"
       this is already a no-op and needs no second condition to keep in sync. */
    if (prev !== "about") settle(prev, "closing", "closed");
    setFront(next);
  }, [route.app]);

  function open(id: AppId) {
    setPhases((p) => ({ ...p, [id]: "open" }));
    setFront(id);
    routedApp.current = id;
    router.push(hrefFor(id, id === "projects" ? selected : null), { scroll: false });
  }

  function close(id: AppId) {
    exit(id, "closing", "closed");
    /* Only the routed app owns the URL. Closing a window stacked on top of it
       leaves the path alone. */
    if (routedApp.current === id) {
      routedApp.current = "about";
      router.push("/", { scroll: false });
    }
  }

  function selectProject(id: string) {
    setLastProject(id);
    router.push(hrefFor("projects", id), { scroll: false });
  }

  function windowProps(id: AppId) {
    const phase = phases[id];
    return {
      motion: phase === "minimizing" || phase === "closing" ? phase : undefined,
      minimizeTarget: `.dock-button[data-app="${id}"]`,
      zIndex: front === id ? 12 : 10,
      onFocus: () => setFront(id),
      /* Minimize deliberately does NOT touch the URL: a minimized app is still
         running, and the address bar should not disagree with the dock. */
      onMinimize: () => exit(id, "minimizing", "minimized"),
      /* Out of layout and out of the accessibility tree, but still mounted —
         see .window-hidden in globals.css. */
      hidden: phase === "minimized",
      onClose: () => close(id),
    };
  }

  /* Mounted for every phase except closed. A minimized window used to unmount,
     which threw away the terminal's scrollback, the runner's high score, the
     selected project and any window the visitor had dragged somewhere they
     wanted it — while the dock went on showing a running dot for it. */
  const mounted = (p: Phase) => p !== "closed";

  return (
    <>
      <DesktopFile label="Eric Tang Resume.pdf" onOpen={() => open("resume")} />
      <DesktopFile label="Terminal" art="terminal" onOpen={() => open("terminal")} />
      <DesktopFile label="Runner" art="game" onOpen={() => open("game")} />

      {mounted(phases.about) && <AboutWindow {...windowProps("about")} />}
      {mounted(phases.projects) && (
        <ProjectsWindow
          {...windowProps("projects")}
          selected={selected}
          onSelect={selectProject}
        />
      )}
      {mounted(phases.resume) && <ResumeWindow {...windowProps("resume")} />}
      {mounted(phases.terminal) && (
        <TerminalWindow {...windowProps("terminal")} onOpenApp={open} />
      )}
      {mounted(phases.game) && <GameWindow {...windowProps("game")} active={phases.game === "open"} />}

      <Dock
        onOpenApp={(id) => open(id as AppId)}
        running={{
          about: phases.about !== "closed",
          projects: phases.projects !== "closed",
          resume: phases.resume !== "closed",
          terminal: phases.terminal !== "closed",
          game: phases.game !== "closed",
        }}
      />
    </>
  );
}
