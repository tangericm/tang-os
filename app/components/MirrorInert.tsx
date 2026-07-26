"use client";

import { useEffect } from "react";

/**
 * Belt to the inline script's braces: keeps the .sitedoc mirror inert on the
 * paths where that script cannot run.
 *
 * page.tsx sets the attribute from a parser-inserted <script> so the mirror is
 * never focusable in the window before hydration. That covers a document load
 * and nothing else. React refuses to execute a <script> element it creates
 * itself — it builds the node through an innerHTML round-trip, which sets the
 * "already started" flag the HTML spec uses to stop exactly this — so on a
 * client-side navigation the script re-renders and does nothing. The one route
 * that reaches / that way is the 404's "Back to the desktop" link, and the same
 * hole opens if React discards the server DOM after a hydration mismatch.
 *
 * Without this, that visitor gets a clipped-but-focusable mirror: nineteen tab
 * stops with no focus ring anywhere on screen, and the whole site announced a
 * second time.
 *
 * No dependency array on purpose. setAttribute is idempotent and costs a
 * querySelector, which is cheaper than reasoning about which remounts need it.
 */
export default function MirrorInert() {
  useEffect(() => {
    document.querySelector(".sitedoc")?.setAttribute("inert", "");
  });

  return null;
}
