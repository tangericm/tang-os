import BootScreen from "../components/BootScreen";
import JsonLd from "../components/JsonLd";
import MenuBar from "../components/MenuBar";
import MirrorInert from "../components/MirrorInert";
import WindowLayer from "../components/WindowLayer";
import { siteJsonLd } from "../lib/jsonld";

/**
 * The desktop, shared by every route that is "the site".
 *
 * The OS chrome lives HERE rather than in a page, and that placement is the
 * whole reason the routing works. App Router preserves a layout's subtree
 * across navigations within it, so moving from / to /projects/denoiser
 * re-renders only {children} — the document beneath. Not one window remounts,
 * so a dragged window keeps its position, the terminal keeps its scrollback,
 * and the runner keeps its score while the URL changes underneath them.
 *
 * Put WindowLayer in the pages instead and every navigation would tear the
 * desktop down and rebuild it, which is exactly the page-reload feeling the
 * whole illusion exists to avoid.
 *
 * The (desktop) route group matters too: it gives these routes a shared layout
 * WITHOUT pulling app/not-found.tsx into it. The 404 renders its own bare
 * desktop with an alert on top, and it must keep doing that.
 *
 * {children} is the plain-document mirror — each route supplies its own
 * version, which is what stops the URLs from being near-duplicates of each
 * other.
 */

/**
 * Take the mirror out of the tab order and the accessibility tree once we know
 * scripting works.
 *
 * The clip idiom deliberately keeps its subtree focusable and announceable —
 * that is what separates it from display:none and what makes the text index at
 * full weight. The cost is that a sighted keyboard user tabbing off the dock
 * falls into the mirror's links with no focus ring anywhere on screen (WCAG
 * 2.4.7), and a screen reader hears the entire site announced a second time
 * after the desktop. `inert` fixes both in one attribute.
 *
 * It has to be set from script rather than in the JSX: with scripting off the
 * mirror IS the site, and an inert document is one nobody can click a link in.
 * Runs at parse time, immediately after the element it targets, so the window
 * in which those links are focusable is never painted.
 *
 * This only fires on a document load. <MirrorInert /> covers client-side
 * navigation, where React re-renders this script element without executing it.
 */
const MIRROR_INERT = `try{document.querySelector('.sitedoc').setAttribute('inert','')}catch(e){}`;

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* `desktop-mirrored` asserts that a fallback document follows, which is
          what lets public/no-js.css hide this. The 404 route renders a bare
          `.desktop` with no mirror and must stay visible, so the rule cannot
          key off `.desktop` alone. */}
      <main className="desktop desktop-mirrored">
        <MenuBar />

        {/* Icons, windows and the dock (client-side, interactive) */}
        <WindowLayer />

        {/* Rendered last so it sits on top, then fades out via CSS */}
        <BootScreen />
      </main>

      {/* role="main" on a <div>, not a second <main> element. The markup rule
          is about elements; the landmark that matters is the one in the
          accessibility tree, and exactly one of these two is ever exposed
          there — without scripting the desktop is display:none, and with
          scripting this subtree is inert.

          suppressHydrationWarning is about MIRROR_INERT: that script sets an
          attribute the props do not declare, and React 19 warns about exactly
          that case in development. It only warns, which is what makes the
          script work, but a diff on every dev load is how a real hydration bug
          goes unnoticed.

          After the desktop so that on the one path where both are reachable —
          scripting on, before MIRROR_INERT runs — the mirror sits behind the
          dock in the tab order rather than in front of the menu bar. */}
      <div className="sitedoc" role="main" suppressHydrationWarning>
        {children}
      </div>
      <script dangerouslySetInnerHTML={{ __html: MIRROR_INERT }} />
      <MirrorInert />

      <JsonLd data={siteJsonLd()} />
    </>
  );
}
