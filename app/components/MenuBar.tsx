"use client";
// ^ This directive makes MenuBar a CLIENT component: its JavaScript is sent
// to the browser so it can hold state and run effects. We need that here
// because the clock ticks — everything else on the page stays server-only.

import { useEffect, useState } from "react";

const MENUS = ["File", "Edit", "View", "Go", "Window", "Help"];

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

export default function MenuBar() {
  // `now` starts as null on purpose. The server renders this component once
  // (with no clock), and the browser's FIRST render must produce identical
  // HTML — if the server baked in its own time, the two would differ and
  // React would warn about a "hydration mismatch". Effects only run in the
  // browser, so the real time appears right after mount.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id); // cleanup: stop ticking if unmounted
  }, []);

  return (
    <header className="menubar">
      <div className="menubar-left">
        <svg
          className="menubar-logo"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        >
          <path d="M12 3v8" />
          <path d="M6.2 6.2a8.2 8.2 0 1 0 11.6 0" />
        </svg>
        <span className="menubar-app">TangOS</span>
        {MENUS.map((menu) => (
          <span key={menu} className="menubar-item">
            {menu}
          </span>
        ))}
      </div>

      <div className="menubar-right">
        <span className="menubar-clock">{now ? formatClock(now) : ""}</span>
      </div>
    </header>
  );
}
