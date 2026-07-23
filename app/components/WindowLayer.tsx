"use client";

import { useState } from "react";
import AboutWindow from "./AboutWindow";
import DesktopIcon from "./DesktopIcon";

/**
 * WindowLayer — the beginnings of a window manager.
 *
 * The key idea is "lifting state up": the About window can't own its
 * own open/closed state, because when it's closed it doesn't exist —
 * something ABOVE it must remember and be able to reopen it. That
 * something is this component. When we add more apps and a dock, this
 * grows into a real window manager (open list, focus order, z-index).
 */
export default function WindowLayer() {
  // Auto-open on arrival: the About window is sitting there when the
  // boot overlay fades — a recruiter gets the pitch with zero clicks.
  const [aboutOpen, setAboutOpen] = useState(true);

  return (
    <>
      <DesktopIcon label="About Eric" onOpen={() => setAboutOpen(true)} />

      {/* Conditional rendering: when aboutOpen is false, the window
          isn't hidden — it's not in the page at all. */}
      {aboutOpen && <AboutWindow onClose={() => setAboutOpen(false)} />}
    </>
  );
}
