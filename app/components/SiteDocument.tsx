import { Fragment } from "react";
import ResumeDocument from "./ResumeDocument";
import { EDUCATION, EXPERIENCE, LINKS, PROFILE, TAGLINE } from "../data/profile";
import { GROUPS, PROJECTS } from "../data/projects";
import { PUBLICATIONS } from "../data/publications";

/**
 * SiteDocument, the entire site rendered once as a linear HTML document.
 *
 * The desktop is a window manager: a crawler cannot double-click an icon, a
 * screen reader arrives before the window state machine exists, and a visitor
 * with JS off gets a wallpaper. Everything those three need is here instead,
 * in the server-rendered markup, in reading order, hidden from a sighted JS
 * visitor by the clip technique in globals.css (see the .sitedoc block there
 * for why clip and not display:none).
 *
 * The rule that makes this maintainable, and the entire justification for the
 * file existing: NOT ONE SENTENCE of prose is typed below. Every noun comes
 * from data/profile.ts, data/projects.ts, data/publications.ts or
 * ResumeDocument. A mirror that can drift from the windows is worse than no
 * mirror, because the version search engines index would be the stale one and
 * nobody looking at the site would ever notice. Section labels ("Experience",
 * "Contact") and connective words are the only strings authored here, and none
 * of them state a fact.
 *
 * Server component on purpose. A "use client" here would ship the whole
 * document to the browser as a JS payload and hand a crawler an empty div,
 * which is precisely the failure this is built to avoid.
 *
 * No props: the container, and therefore the .sitedoc class, belongs to the
 * route. Taking a className would mean owning a wrapper element, and a wrapper
 * between .sitedoc and the <h1> would silently capture the
 * `> :first-child` margin reset in globals.css.
 */

/* Human labels for the LINKS keys. Rendering Object.entries rather than three
   named reads is deliberate — lib/jsonld.ts makes the same choice for the same
   reason — so a fourth profile added to LINKS reaches this page without anyone
   remembering the file exists. An unlabeled key falls back to the key itself:
   it renders as "orcid" rather than vanishing, so the omission is visible on
   the page instead of being a link that silently never shipped. */
const LINK_LABELS: Record<string, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  scholar: "Google Scholar",
};

/**
 * The order project groups appear in, GROUPS first and then any group a
 * project claims that GROUPS does not list.
 *
 * The naive version is `GROUPS.map(...)`, which is what the Projects window
 * does. It is fine there — a project missing from the sidebar is visibly
 * missing. Here it is a trap: `Group` is a union type declared beside GROUPS
 * rather than derived from it, so adding a fourth member to the union and to a
 * project, but forgetting the array, deletes that project from the one copy of
 * the site a crawler ever reads, with no type error and nothing to see on the
 * desktop. Appending the strays costs three lines and makes that impossible.
 */
function orderedGroups(): string[] {
  const ordered: string[] = [...GROUPS];
  for (const { group } of PROJECTS) {
    if (!ordered.includes(group)) ordered.push(group);
  }
  return ordered;
}

/* ---------- sections ---------- */

const Experience = () => (
  <>
    <h2>Experience</h2>
    {/* Ordered, not unordered: EXPERIENCE is reverse-chronological and that
        sequence is the content. A reader who meets these shuffled learns
        something false about the career. */}
    <ol>
      {EXPERIENCE.map((job) => (
        <li key={`${job.role} ${job.org}`}>
          <strong>{job.role}</strong> · {job.org} · <small>{job.when}</small>
          <p>{job.line}</p>
        </li>
      ))}
    </ol>
  </>
);

const Education = () => (
  <>
    <h2>Education</h2>
    {/* Keyed on degree AND school: Duke granted two of the three, so the school
        alone is not unique and React would warn (and reconcile wrongly). */}
    <ul>
      {EDUCATION.map((degree) => (
        <li key={`${degree.degree} ${degree.school}`}>
          <strong>{degree.degree}</strong> · {degree.school} · <small>{degree.year}</small>
        </li>
      ))}
    </ul>
  </>
);

/**
 * Projects, the densest keyword content on the site and the main reason this
 * document exists: the windowed version shows exactly one project at a time,
 * behind a click, so five of the six blurbs are invisible to anything that
 * does not drive a mouse.
 *
 * Group names are h2 rather than an "Projects" h2 with h3 groups and h4 project
 * names. Two reasons, and the second is the binding one: the project name is
 * the entity worth ranking and belongs as high in the outline as it honestly
 * can, and the .sitedoc typography in globals.css styles h1 through h3
 * only — an h4 would land unstyled, which after the global margin reset means
 * a bold line jammed against the heading above it with no separation at all.
 */
const Projects = () => (
  <>
    {orderedGroups().map((group) => {
      const inGroup = PROJECTS.filter((project) => project.group === group);
      if (inGroup.length === 0) return null;

      return (
        <Fragment key={group}>
          <h2>Projects · {group}</h2>
          {inGroup.map((project) => (
            <article key={project.id}>
              <h3>{project.name}</h3>
              <p>
                <small>{project.kind}</small>
              </p>
              <p>{project.blurb}</p>
              <p>
                <small>{project.tags.join(" · ")}</small>
              </p>
              {/* Guarded rather than always emitted: an empty <ul> is legal but
                  still carries its bottom margin, so a link-less project would
                  print a 16px hole under itself. */}
              {project.links.length > 0 && (
                <ul>
                  {project.links.map((link) => (
                    <li key={link.href}>
                      <a href={link.href} target="_blank" rel="noreferrer">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </Fragment>
      );
    })}
  </>
);

/**
 * Publications as titles-first citations, each title being the link.
 *
 * Authors are joined with a plain comma, deliberately unlike ResumeDocument,
 * which renders "A and B" versus "A, B, and C" and bolds SELF. That rule lives
 * in one place on purpose (its own comment there explains what the tempting
 * simplification breaks) and is not exported, so the choice here is between
 * copying it and doing without. The full citations appear a few hundred pixels
 * below inside the resume anyway; a second, subtly different implementation of
 * the same punctuation rule would be a bug waiting for someone to fix only one
 * of them.
 */
const Publications = () => (
  <>
    <h2>Publications</h2>
    <ol>
      {PUBLICATIONS.map((pub) => (
        <li key={pub.id}>
          <a href={pub.url} target="_blank" rel="noreferrer">
            {pub.title}
          </a>{" "}
          <small>
            {pub.authors.join(", ")} · {pub.journal} {pub.volume}({pub.issue}), {pub.pages} (
            {pub.year})
          </small>
        </li>
      ))}
    </ol>
  </>
);

/**
 * The resume, whole, from the same component the Resume window renders.
 *
 * Two decisions worth stating.
 *
 * It brings its own <h2> (the legal name) and h3 section headings, so it is
 * dropped in at section level with no heading of its own. Adding one would
 * either duplicate the name or push the resume's headings out of order, and
 * editing ResumeDocument to suit this page would break the window. The section
 * takes its name from aria-label instead: a name for assistive tech, no second
 * visible title.
 *
 * The .doc-page sheet comes along too, exactly as ResumeWindow applies it.
 * ResumeDocument's own classes (.doc-contact, .doc-job-head span, .doc-edu-year)
 * hardcode #5c554b — readable on the white sheet those classes were written
 * for, invisible on the mirror's dark surface. Reusing the sheet fixes every
 * one of them at once and costs nothing; the alternative was a second set of
 * color overrides in globals.css that would have to track the first.
 */
const Resume = () => (
  <section aria-label="Resume">
    <article className="doc-page">
      <ResumeDocument />
    </article>
  </section>
);

const Contact = () => (
  <>
    <h2>Contact</h2>
    <p>
      <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
    </p>
    <ul>
      {Object.entries(LINKS).map(([key, href]) => (
        <li key={key}>
          <a href={href} target="_blank" rel="noreferrer">
            {LINK_LABELS[key] ?? key}
          </a>
        </li>
      ))}
    </ul>
  </>
);

/* ---------- the document ---------- */

export default function SiteDocument() {
  return (
    <>
      {/* The page's only h1. The desktop deliberately ships none — a window
          title is not a document title — and ResumeDocument starts at h2 for
          the same reason, so this is the single root the whole outline hangs
          from. Name plus honorific, both from PROFILE, which also keeps it
          distinct from the resume's heading (that one uses the legal name). */}
      <h1>
        {PROFILE.name}, {PROFILE.honorific}
      </h1>
      <p>{TAGLINE}</p>
      <p>
        Currently <strong>{PROFILE.jobTitle}</strong> at {PROFILE.employer}, based in{" "}
        {PROFILE.location}.
      </p>

      <Experience />
      <Education />
      <Projects />
      <Publications />
      <Resume />
      <Contact />
    </>
  );
}
