"use client";
// ^ This directive makes MenuBar a CLIENT component: its JavaScript is sent
// to the browser so it can hold state and run effects. We need that here
// because the clock ticks, everything else on the page stays server-only.

import { useEffect, useState } from "react";
import PowerMenu from "./PowerMenu";

/** Format a Date like the macOS menu bar: "Wed Jul 23  4:32 PM" */
function formatClock(d: Date): string {
  const date = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} ${time}`; //   = en-space, slightly wider gap
}

/* The clock is its own component so its once-a-second setState re-renders one
   <span> instead of the whole menu bar. It used to live in MenuBar, which
   meant PowerMenu — portals, listeners and all — re-rendered every second for
   the life of the page to redraw a string that changes once a minute. */
function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id); // cleanup: stop ticking if unmounted
  }, []);

  return <span className="menubar-clock">{now ? formatClock(now) : ""}</span>;
}

export default function MenuBar() {
  // `now` starts as null on purpose. The server renders this component once
  // (with no clock), and the browser's FIRST render must produce identical
  // HTML, if the server baked in its own time, the two would differ and
  // React would warn about a "hydration mismatch". Effects only run in the
  // browser, so the real time appears right after mount.
  return (
    <header className="menubar">
      <div className="menubar-left">
        <PowerMenu />
        <span className="menubar-app">TangOS</span>
        {/* Real dropdown menus can land here when there's something
            real to put in them (e.g. File → Download Resume) */}
      </div>

      <div className="menubar-right">
        <Clock />
      </div>
    </header>
  );
}
