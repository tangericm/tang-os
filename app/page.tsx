import BootScreen from "./components/BootScreen";
import JsonLd from "./components/JsonLd";
import MenuBar from "./components/MenuBar";
import MirrorInert from "./components/MirrorInert";
import SiteDocument from "./components/SiteDocument";
import WindowLayer from "./components/WindowLayer";
import { siteJsonLd } from "./lib/jsonld";

/**
 * The home route ("/"), which serves two documents at once.
 *
 * The desktop is the site for anyone running JavaScript. The .sitedoc mirror
 * is the same content as one linear HTML document for everyone else — search
 * engines, link unfurlers, and the visitor with scripting off — and it is
 * always in the markup, clipped rather than removed (globals.css explains why
 * display:none would have been the cloaking pattern that gets text discounted).
 *
 * Which of the two is visible is decided by the `js` class the head script in
 * layout.tsx writes before first paint, not by a <noscript> block. Both states
 * therefore live in globals.css with nothing duplicated into the markup.
 *
 * This file stays a composition and nothing else. Each OS feature (menu bar,
 * dock, windows...) lives in its own component under app/components/, and the
 * document body lives in SiteDocument.
 */

/**
 * Take the mirror out of the tab order and the accessibility tree once we know
 * scripting works.
 *
 * The clip idiom deliberately keeps its subtree focusable and announceable —
 * that is what separates it from display:none and what makes the text index at
 * full weight. The cost is that a sighted keyboard user tabbing off the dock
 * falls into nineteen invisible links with no focus ring anywhere on screen
 * (WCAG 2.4.7), and a screen reader hears the entire site announced a second
 * time after the desktop. `inert` fixes both in one attribute.
 *
 * It has to be set from script rather than in the JSX: with scripting off the
 * mirror IS the site, and an inert document is one nobody can click a link in.
 * Runs at parse time, immediately after the element it targets, so the window
 * in which those links are focusable is never painted. React does not manage an
 * `inert` prop it was not given, so hydration leaves it alone.
 *
 * This only fires on a document load. <MirrorInert /> below covers client-side
 * navigation, where React re-renders this script element without executing it.
 */
const MIRROR_INERT = `try{document.querySelector('.sitedoc').setAttribute('inert','')}catch(e){}`;

export default function Desktop() {
  return (
    <>
      {/* `desktop-mirrored` is what lets globals.css hide this without
          scripting: it asserts that a fallback document follows. The 404
          route renders a bare `.desktop` with no mirror and must stay
          visible, which is why the rule cannot key off `.desktop` alone. */}
      <main className="desktop desktop-mirrored">
        <MenuBar />

        {/* Icons, windows and the dock (client-side, interactive) */}
        <WindowLayer />

        {/* Rendered last so it sits on top, then fades out via CSS */}
        <BootScreen />
      </main>

      {/* role="main" on a <div>, rather than a second <main> element. The
          markup rule is about elements — more than one <main> is invalid —
          but the landmark that matters is the one in the accessibility tree,
          and exactly one of these two is ever exposed there:

            scripting off → .desktop-mirrored is display:none, so its <main>
                            is gone from the tree entirely and this is the
                            whole page. Without the role it would be the only
                            visible content on the site with no landmark at
                            all, which is what an earlier revision shipped.
            scripting on  → this subtree is inert, and inert content is hidden
                            from assistive technology, so the desktop's <main>
                            is the only landmark exposed.

          suppressHydrationWarning is about MIRROR_INERT, not about anything
          rendered here. That script sets `inert` before React hydrates, so at
          hydration the DOM carries an attribute the props do not declare.
          React 19 collects exactly that case and warns
          (react-dom-client.development.js, warnForExtraAttributes). It only
          warns — the attribute survives, which is what makes the script work
          — but a diff printed on every dev load is how a real hydration bug
          goes unnoticed. This flag is React's sanctioned way to say the
          mutation is deliberate.

          Placed after the desktop so that on the one path where both are
          reachable — scripting on, before MIRROR_INERT runs — the mirror is
          behind the dock in the tab order rather than in front of the menu
          bar. */}
      <div className="sitedoc" role="main" suppressHydrationWarning>
        <SiteDocument />
      </div>
      <script dangerouslySetInnerHTML={{ __html: MIRROR_INERT }} />
      <MirrorInert />

      <JsonLd data={siteJsonLd()} />
    </>
  );
}
