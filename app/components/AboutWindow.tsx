"use client";

import { useRef, useState } from "react";
import Window from "./Window";
import { EDUCATION, EXPERIENCE, PROFILE, SPECS, TAGLINE } from "../data/profile";

/**
 * AboutWindow: a loving parody of macOS's "About This Mac",
 * except the hardware being described is Eric.
 *
 * The CONTENT moved to data/profile.ts, because the document mirror and the
 * JSON-LD builder need the same facts; keeping a second copy here meant a bio
 * edit could ship to the window and not to the markup search engines read.
 * What is left is presentation: which tab is showing, and the ARIA wiring
 * that makes the tab bar usable without a mouse.
 */

const TABS = ["Overview", "Experience", "Education"] as const;
type Tab = (typeof TABS)[number];

/* useId() is the reflex for tying tabs to panels, but WindowLayer treats
   About as a singleton (one `about` phase, one mounted instance), so two of
   these tablists can never coexist and there is nothing to disambiguate. A
   hand-written id is readable in the accessibility inspector; ":r7:" is not. */
const tabId = (t: Tab) => `about-tab-${t.toLowerCase()}`;
const panelId = (t: Tab) => `about-panel-${t.toLowerCase()}`;

/* The panel wrapper is a NEW flex item inside `.about`, which is a centered
   column, and `align-items: center` shrink-wraps any item it does not
   stretch. Dropping a bare <div> around the panels would therefore have
   collapsed them to their content width and silently voided the max-width
   rules on `.specs` / `.xp` / `.edu`. Re-establishing the same centered
   column inside the wrapper makes it layout-transparent, so the panels size
   exactly as they did when they were direct children. Inline rather than a
   new class because this is structural glue holding the old design still,
   not design of its own. */
const PANEL_LAYOUT: React.CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

/** One place that owns the id/aria-labelledby pairing, so a tab and its
 *  panel cannot drift apart the way two hand-typed IDREFs eventually do.
 *
 *  All three panels are always rendered and the inactive ones are hidden,
 *  rather than only the selected one existing. Each tab carries an
 *  aria-controls pointing at its panel's id, and with conditional rendering
 *  two of those three IDREFs resolved to nothing at any moment — an
 *  aria-controls with no such element is simply invalid, whether or not a
 *  given checker happens to flag it.
 *
 *  `hidden` needs the display:none spelled out because PANEL_LAYOUT sets
 *  display:flex inline, and an inline style beats the UA sheet's
 *  [hidden] { display: none } every time. Setting the attribute alone would
 *  have left all three panels stacked and visible.
 *
 *  tabIndex makes the panel itself focusable, which APG asks for when a
 *  panel holds no focusable content — Experience and Education hold none, so
 *  without it there is no way to reach their text by keyboard at all. */
function TabPanel({
  tab,
  active,
  children,
}: {
  tab: Tab;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={panelId(tab)}
      aria-labelledby={tabId(tab)}
      hidden={!active}
      tabIndex={active ? 0 : -1}
      style={active ? PANEL_LAYOUT : { ...PANEL_LAYOUT, display: "none" }}
    >
      {children}
    </div>
  );
}

/** Same pass-through contract as ResumeWindow: the window manager
 *  drives animation phase, stacking, and focus for every app alike.
 *  (An earlier version omitted `motion` here, which is why About
 *  vanished without animating while Resume shrank gracefully.) */
type Passthrough = {
  onClose: () => void;
  onMinimize: () => void;
  motion?: "minimizing" | "closing";
  minimizeTarget?: string;
  zIndex?: number;
  onFocus?: () => void;
  /** true while minimized; the window stays mounted but is display:none */
  hidden?: boolean;
};

export default function AboutWindow({ onClose, onMinimize, ...rest }: Passthrough) {
  // A "controlled" tab bar: which tab is showing is just a piece of
  // state, and clicking a tab is just setState. No routing needed.
  const [tab, setTab] = useState<Tab>("Overview");

  /* Under a roving tabindex the arrow keys, not Tab, move between tabs, and
     the browser only moves focus for keys it owns, so we move it ourselves.
     The buttons are keyed by their label and never unmount, which is what
     makes a ref parked here valid for the life of the window. */
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  /* Automatic activation (the APG default when panels are cheap to render):
     arrowing onto a tab selects it outright instead of demanding a second
     Enter press. Focus has to travel with the selection, otherwise the next
     arrow press would compute its neighbour from the tab the user just left. */
  function select(next: Tab) {
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  function onTabKeys(e: React.KeyboardEvent<HTMLDivElement>) {
    const i = TABS.indexOf(tab);
    const last = TABS.length - 1;
    let next: Tab;
    if (e.key === "ArrowRight") next = TABS[i === last ? 0 : i + 1];
    else if (e.key === "ArrowLeft") next = TABS[i === 0 ? last : i - 1];
    else if (e.key === "Home") next = TABS[0];
    else if (e.key === "End") next = TABS[last];
    else return; // everything else, Tab included, still belongs to the browser
    // Home/End and the arrows would otherwise scroll the window body underneath.
    e.preventDefault();
    select(next);
  }

  return (
    <Window title="About Me" onClose={onClose} onMinimize={onMinimize} {...rest}>
      <div className="about">
        <div className="about-avatar" aria-hidden="true">
          ET
        </div>
        {/* Yes, the .sitedoc mirror also renders an h1, and yes that means two
            of them in the served HTML. Multiple h1 elements are valid HTML5 and
            Google has said outright that it handles them, so the cost is zero —
            and exactly one is ever live in a given state: without scripting the
            desktop is display:none, and with scripting the mirror is inert and
            out of the accessibility tree. Demoting this to h2 instead left a
            heading-navigation user with no level-1 heading anywhere on the
            interface they are actually using. */}
        <h1 className="about-name">
          {PROFILE.name}, {PROFILE.honorific}
        </h1>
        <p className="about-tagline">{TAGLINE}</p>

        <div className="tabs" role="tablist" aria-label="About sections" onKeyDown={onTabKeys}>
          {TABS.map((t) => (
            <button
              key={t}
              ref={(el) => {
                tabRefs.current[t] = el;
              }}
              id={tabId(t)}
              role="tab"
              aria-selected={tab === t}
              /* Resolves for all three tabs, not just the selected one: every
                 panel is rendered and the inactive two are hidden. See
                 TabPanel. */
              aria-controls={panelId(t)}
              /* Roving tabindex: the whole tablist is ONE stop in the page's
                 tab order, so Tab leaves the control instead of walking it. */
              tabIndex={tab === t ? 0 : -1}
              className={tab === t ? "tab tab-active" : "tab"}
              /* Safari does not focus a <button> on click, so route clicks
                 through the same helper the keys use and the roving tabindex
                 stays in sync with where focus actually is. */
              onClick={() => select(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <TabPanel tab="Overview" active={tab === "Overview"}>
          <dl className="specs">
            {SPECS.map(([label, value]) => (
              <div className="spec-row" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
            {/* Contact gets its own row (it's a link, not plain text),
                  kept here so a recruiter who never explores the dock
                  still finds an email address in the first screen */}
            <div className="spec-row">
              <dt>Contact</dt>
              <dd>
                <a className="spec-link" href="mailto:eric.tang22@gmail.com">
                  eric.tang22@gmail.com
                </a>
              </dd>
            </div>
          </dl>
        </TabPanel>

        <TabPanel tab="Experience" active={tab === "Experience"}>
          <ul className="xp">
            {EXPERIENCE.map((job) => (
              <li className="xp-item" key={job.role}>
                <div className="xp-head">
                  <strong>{job.role}</strong>
                  <span className="xp-when">{job.when}</span>
                </div>
                <div className="xp-org">{job.org}</div>
                <p className="xp-line">{job.line}</p>
              </li>
            ))}
          </ul>
        </TabPanel>

        <TabPanel tab="Education" active={tab === "Education"}>
          <ul className="edu">
            {EDUCATION.map((e) => (
              <li className="edu-item" key={e.degree}>
                <strong>{e.degree}</strong>
                <span className="edu-school">{e.school}</span>
                <span className="edu-year">{e.year}</span>
              </li>
            ))}
          </ul>
        </TabPanel>
      </div>
    </Window>
  );
}
