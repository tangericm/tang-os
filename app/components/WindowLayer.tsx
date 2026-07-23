"use client";

import { useState } from "react";
import AboutWindow from "./AboutWindow";
import Dock from "./Dock";

/**
 * WindowLayer — the window manager.
 *
 *   "open"      → window visible, dock shows its running dot
 *   "minimized" → window unmounted, dot still on; dock icon restores it
 *   "closed"    → gone entirely; the dock relaunches it
 *
 * One string of state, multiple UI surfaces reading it. Every app we
 * add will follow this pattern.
 */

type AppState = "open" | "minimized" | "closed";

export default function WindowLayer() {
  const [about, setAbout] = useState<AppState>("open"); // auto-open on arrival

  return (
    <>
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
