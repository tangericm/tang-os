"use client";

import { useState } from "react";
import AboutWindow from "./AboutWindow";
import Dock from "./Dock";
import DesktopIcon from "./DesktopIcon";

/**
 * WindowLayer — the window manager (still small, but now it earns
 * the name).
 *
 * The About app is no longer just open/closed — it's a tiny state
 * machine:
 *
 *   "open"      → window visible, dock shows its running dot
 *   "minimized" → window unmounted, dot still on (it's "running"),
 *                 clicking the dock icon restores it
 *   "closed"    → gone entirely; dock or desktop icon relaunches it
 *
 * One string of state, three UI surfaces reading it. This is the
 * pattern every additional app will follow.
 */

type AppState = "open" | "minimized" | "closed";

export default function WindowLayer() {
  const [about, setAbout] = useState<AppState>("open"); // auto-open on arrival

  return (
    <>
      <DesktopIcon label="About Eric" onOpen={() => setAbout("open")} />

      {about === "open" && (
        <AboutWindow
          onClose={() => setAbout("closed")}
          onMinimize={() => setAbout("minimized")}
        />
      )}

      <Dock onOpenAbout={() => setAbout("open")} aboutRunning={about !== "closed"} />
    </>
  );
}
