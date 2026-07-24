"use client";

import { useEffect, useRef, useState } from "react";
import AboutWindow from "./AboutWindow";
import ResumeWindow from "./ResumeWindow";
import DesktopFile from "./DesktopFile";
import Dock from "./Dock";

/**
 * WindowLayer — the window manager, now managing two apps.
 *
 * Each app is a little state machine:
 *
 *   closed → open → minimizing → minimized
 *                 ↘ closing   → closed
 *
 * "minimizing"/"closing" are TRANSIENT states: the window stays
 * mounted with an exit animation class, and a timer completes the
 * transition once the animation has played. (If the visitor prefers
 * reduced motion, the timer is 0 and windows just disappear — the
 * animation is a courtesy, never a delay.)
 *
 * Focus: `front` records which app was last touched; it renders at a
 * higher z-index. This is the entire focus model — and it's the same
 * one real window managers use, just with more apps.
 */

type Phase = "closed" | "open" | "minimizing" | "minimized" | "closing";
type AppId = "about" | "resume";

const EXIT_MS = 280; // keep in sync with the CSS exit animations

export default function WindowLayer() {
  const [about, setAbout] = useState<Phase>("open"); // auto-open on arrival
  const [resume, setResume] = useState<Phase>("closed");
  const [front, setFront] = useState<AppId>("about");
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  function exit(set: (fn: (p: Phase) => Phase) => void, transient: Phase, final: Phase) {
    set(() => transient);
    window.setTimeout(
      () => set((p) => (p === transient ? final : p)),
      reducedMotion.current ? 0 : EXIT_MS
    );
  }

  const apps: Record<
    AppId,
    { phase: Phase; set: typeof setAbout }
  > = {
    about: { phase: about, set: setAbout },
    resume: { phase: resume, set: setResume },
  };

  function open(id: AppId) {
    apps[id].set("open");
    setFront(id);
  }

  function windowProps(id: AppId) {
    const { phase, set } = apps[id];
    return {
      motion:
        phase === "minimizing" || phase === "closing" ? phase : undefined,
      zIndex: front === id ? 12 : 10,
      onFocus: () => setFront(id),
      onMinimize: () => exit(set, "minimizing", "minimized"),
      onClose: () => exit(set, "closing", "closed"),
    };
  }

  const visible = (p: Phase) =>
    p === "open" || p === "minimizing" || p === "closing";

  return (
    <>
      <DesktopFile label="Tang-Eric-Resume.pdf" onOpen={() => open("resume")} />

      {visible(about) && <AboutWindow {...windowProps("about")} />}
      {visible(resume) && <ResumeWindow {...windowProps("resume")} />}

      <Dock
        onOpenAbout={() => open("about")}
        onOpenResume={() => open("resume")}
        aboutRunning={about !== "closed"}
        resumeRunning={resume !== "closed"}
      />
    </>
  );
}
