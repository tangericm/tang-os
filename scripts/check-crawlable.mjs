/**
 * Asserts that the built site still serves its content to something that is
 * not a browser.
 *
 * This exists because a crawlability regression is invisible. Wrap
 * SiteDocument in a client component, add "use client" to ResumeDocument,
 * swap the clip idiom for display:none, or let the mirror fall out of
 * page.tsx, and the site looks flawless in every browser while the served
 * HTML quietly goes back to being one tagline and six spec rows. Nobody
 * notices until Search Console does, months later. Every check below
 * corresponds to a failure that has either already happened once during
 * development or was caught in review before it shipped.
 *
 * Reads the PRERENDERED artifact, not a running server: that file is
 * literally the bytes a crawler receives. Run after `next build`.
 *
 * No dependencies, no test framework. Exits non-zero with the specific
 * broken invariant named.
 */

import { readFileSync, existsSync } from "node:fs";

const OUT = ".next/server/app";
const failures = [];
const checks = [];

function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(name);
}

function must(path) {
  if (!existsSync(path)) {
    console.error(`\nMISSING BUILD ARTIFACT: ${path}`);
    console.error("Run `next build` first. If the path moved, this script needs updating.");
    process.exit(1);
  }
  return readFileSync(path, "utf8");
}

const html = must(`${OUT}/index.html`);

/* Everything below the RSC payload is React's own serialized copy of the tree.
   It is not markup a crawler reads, and counting it would let a check pass on
   the strength of a duplicate that never renders. */
const rscAt = html.indexOf("self.__next_f");
const dom = rscAt === -1 ? html : html.slice(0, rscAt);

/* ------------------------------------------------------------------ *
 * The mirror exists and carries the content
 * ------------------------------------------------------------------ */

const mirrorStart = dom.indexOf('class="sitedoc"');
check("mirror present in prerendered HTML", mirrorStart !== -1);

const mirrorHtml = mirrorStart === -1 ? "" : dom.slice(mirrorStart);
const mirrorText = mirrorHtml
  .replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'")
  .replace(/&amp;/g, "&")
  .replace(/\s+/g, " ")
  .trim();

check("mirror carries real prose", mirrorText.length > 10000, `${mirrorText.length} chars`);

/* Project names are read out of the data module rather than hardcoded here, so
   a seventh project is covered the day it is added and this file never becomes
   the stale copy it exists to prevent. The quote in the pattern is what keeps
   it off the `name: string` in the type declaration above the data. */
const projectsSrc = must("app/data/projects.ts");
const projectNames = [...projectsSrc.matchAll(/^\s+name: "([^"]+)"/gm)].map((m) => m[1]);
const projectIds = [...projectsSrc.matchAll(/^\s+id: "([^"]+)"/gm)].map((m) => m[1]);
check("found projects in data module", projectNames.length >= 6, `${projectNames.length} projects`);
for (const name of projectNames) {
  check(`  project in mirror: ${name}`, mirrorText.includes(name));
}

/* Every project link must point at something specific. The simulator shipped
   for weeks linking to the bare GitHub profile because its repo was still
   private — a featured project whose "GitHub" link lands on a profile page
   reads as vapour, and it was live on an indexable route by the time anyone
   noticed. A string compare is enough to stop it recurring. */
const projectLinks = [...projectsSrc.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
const bareProfile = projectLinks.filter((href) =>
  /^https:\/\/github\.com\/[^/]+\/?$/.test(href)
);
check("no project links to a bare profile", bareProfile.length === 0, bareProfile.join(", "));
check("every project has a link", projectLinks.length >= projectIds.length, `${projectLinks.length} links / ${projectIds.length} projects`);

/* Sections that live in ResumeDocument rather than in a data module. If the
   resume ever becomes data too, read them from there instead. */
for (const section of [
  "Technical Skills",
  "Education",
  "Work Experience",
  "Selected Publications",
]) {
  check(`  resume section in mirror: ${section}`, mirrorText.includes(section));
}

/* ------------------------------------------------------------------ *
 * The mirror is hidden the RIGHT way
 * ------------------------------------------------------------------ */

const cssHref = html.match(/href="(\/_next\/static\/[^"]+\.css)"/)?.[1];
check("stylesheet linked", Boolean(cssHref));

const css = cssHref ? must(`.next${cssHref.replace("/_next", "")}`) : "";

/* Clipped by DEFAULT, with no `html.js` or any other script-set hook in the
   selector. This is the check that would have caught the phone bug: a design
   where a script decides which of the two documents is visible serves the
   fallback forever to anyone whose browser did not run it. */
check("mirror clipped by default", /(^|})\.sitedoc\{[^}]*clip-path:inset\(50%\)/.test(css));
check("clip does not depend on a script-set class", !/html\.js\s+\.sitedoc/.test(css));

/* The promoted state lives in one file, loaded from a <noscript> link. If it
   ever moves back into the markup there will be two copies of it. */
check("noscript loads the fallback stylesheet", /<noscript><link rel="stylesheet" href="\/no-js\.css"\/><\/noscript>/.test(html));

const noJs = must("public/no-js.css");
check("fallback sheet hides the desktop", /html\s+\.desktop-mirrored\s*\{[^}]*display:\s*none/.test(noJs));
check("fallback sheet promotes the mirror", /html\s+\.sitedoc\s*\{[^}]*clip-path:\s*none/.test(noJs));

/* The cloaking failure mode. display:none text is discounted by search
   engines and dropped from the accessibility tree, which is the entire reason
   this site uses the clip idiom instead. A rule that hides `.sitedoc` that way
   would silently undo the whole feature while looking like a tidy-up. */
check(
  "mirror never uses display:none",
  !/\.sitedoc(?![-\w])[^{]*\{[^}]*display:none/.test(css)
);

/* ------------------------------------------------------------------ *
 * Document structure
 * ------------------------------------------------------------------ */

const mains = (dom.match(/<main[\s>]/g) || []).length;
check("exactly one <main> element", mains === 1, `${mains} found`);

/* The landmark invariant, which is the kind that regresses in silence.
   Exactly one main landmark is EXPOSED in each state — the desktop's <main>
   while scripting is on and the mirror is inert, and the mirror's role="main"
   while scripting is off and the desktop is display:none. Drop the role and
   a no-JS screen-reader user gets the entire site with no landmark; promote
   the mirror to a real <main> element instead and the markup is invalid. */
const mirrorTag = dom.match(/<div[^>]*class="sitedoc"[^>]*>/)?.[0] ?? "";
check("mirror exposes a main landmark", /role="main"/.test(mirrorTag), mirrorTag.slice(0, 70));

const h1s = (dom.match(/<h1[\s>]/g) || []).length;
check("h1 present", h1s >= 1, `${h1s} found`);

const controls = new Set([...dom.matchAll(/aria-controls="([^"]+)"/g)].map((m) => m[1]));
const ids = new Set([...dom.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
const dangling = [...controls].filter((c) => !ids.has(c));
check("every aria-controls resolves", dangling.length === 0, dangling.join(", "));

/* ------------------------------------------------------------------ *
 * Structured data
 * ------------------------------------------------------------------ */

const ldRaw = html.match(/type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)?.[1];
check("JSON-LD emitted", Boolean(ldRaw));

if (ldRaw) {
  /* An unescaped `<` inside any string field would have closed the script tag
     early and taken the rest of the document with it. */
  check("JSON-LD escapes <", !ldRaw.includes("<"));

  let graph = null;
  try {
    const parsed = JSON.parse(ldRaw);
    graph = Array.isArray(parsed) ? parsed : parsed["@graph"] ?? [parsed];
    check("JSON-LD parses", true);
  } catch (err) {
    check("JSON-LD parses", false, err.message);
  }

  if (graph) {
    const person = graph.find((n) => n["@type"] === "Person");
    check("Person node present", Boolean(person));

    const articles = graph.filter((n) => n["@type"] === "ScholarlyArticle");
    check("ScholarlyArticle nodes present", articles.length > 0, `${articles.length} articles`);

    /* Papers must point at the Person by @id, not repeat the name. Without the
       reference the graph describes several unrelated authors who happen to
       share a name, which is the opposite of what an entity claim is for. */
    if (person && articles.length) {
      const resolves = articles.every((a) =>
        [a.author].flat().some((au) => au && au["@id"] === person["@id"])
      );
      check("every article references the Person @id", resolves);
    }
  }
}

/* ------------------------------------------------------------------ *
 * robots.txt and sitemap.xml
 * ------------------------------------------------------------------ */

const robotsPath = `${OUT}/robots.txt.body`;
if (existsSync(robotsPath)) {
  const robots = readFileSync(robotsPath, "utf8");
  check("robots declares the sitemap", /^Sitemap:\s*https?:\/\//m.test(robots));

  /* Googlebot must never end up in a Disallow group. It is not named in the
     source today, so this guards against someone adding it while reaching for
     Google-Extended, which is a different token with a different job. */
  const disallowGroups = robots
    .split(/\n\s*\n/)
    .filter((g) => /^Disallow:\s*\/\s*$/m.test(g));
  const blockedAgents = disallowGroups.flatMap((g) =>
    [...g.matchAll(/^User-Agent:\s*(.+)$/gim)].map((m) => m[1].trim())
  );
  check("Googlebot not disallowed", !blockedAgents.includes("Googlebot"), blockedAgents.join(", "));
} else {
  check("robots.txt built", false, robotsPath);
}

const sitemapPath = `${OUT}/sitemap.xml.body`;
if (existsSync(sitemapPath)) {
  const sitemap = readFileSync(sitemapPath, "utf8");
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check("sitemap lists at least one URL", locs.length > 0, locs.join(", "));

  /* Derived from the same data the routes are, so this cannot drift: every
     indexable route must appear exactly once, and nothing else may. A sitemap
     listing a 404, or quietly omitting a page, both pass a "does it parse"
     check and both cost real indexing. */
  const expected = new Set([
    "https://ericmtang.com",
    "https://ericmtang.com/resume",
    "https://ericmtang.com/projects",
    ...projectIds.map((id) => `https://ericmtang.com/projects/${id}`),
  ]);
  const unknown = locs.filter((l) => !expected.has(l));
  const missing = [...expected].filter((u) => !locs.includes(u));
  check("sitemap lists only routes we serve", unknown.length === 0, unknown.join(", "));
  check("sitemap lists every indexable route", missing.length === 0, missing.join(", "));
  /* noindex routes must never be advertised for indexing. */
  const noindexed = locs.filter((l) => /\/(terminal|play)$/.test(l));
  check("sitemap omits noindex routes", noindexed.length === 0, noindexed.join(", "));
} else {
  check("sitemap.xml built", false, sitemapPath);
}

/* ------------------------------------------------------------------ *
 * Every route, not just the home page
 * ------------------------------------------------------------------ */

/* The routing phase's whole point is that each URL is its own document. Two
   ways that silently fails: a canonical inherited from the root layout makes
   every page declare itself a copy of "/", and a shared document body makes
   them near-duplicates of each other. Both look completely fine in a browser. */
const ROUTES = [
  { file: "index.html", url: "https://ericmtang.com", indexed: true },
  { file: "projects.html", url: "https://ericmtang.com/projects", indexed: true },
  { file: "resume.html", url: "https://ericmtang.com/resume", indexed: true },
  { file: "terminal.html", url: "https://ericmtang.com/terminal", indexed: false },
  { file: "play.html", url: "https://ericmtang.com/play", indexed: false },
  ...projectIds.map((id) => ({
    file: `projects/${id}.html`,
    url: `https://ericmtang.com/projects/${id}`,
    indexed: true,
    projectId: id,
  })),
];

/* Read from the home page rather than hardcoded, so rewording the site's
   tagline does not silently disable the comparison below. */
const HOME_OG_TITLE = readFileSync(`${OUT}/index.html`, "utf8")
  .match(/<meta property="og:title" content="([^"]+)"/)?.[1];

const bodies = new Map();

for (const route of ROUTES) {
  const path = `${OUT}/${route.file}`;
  if (!existsSync(path)) {
    check(`route built: ${route.url}`, false, path);
    continue;
  }
  const routeHtml = readFileSync(path, "utf8");
  const canonical = routeHtml.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  check(`canonical is self-referential: ${route.url}`, canonical === route.url, `got ${canonical}`);

  /* Next merges metadata by top-level KEY. A route that sets `title` and
     `description` but not `openGraph` inherits the ROOT's card wholesale,
     including its url — so the page reads correctly everywhere except in a
     link pasted into LinkedIn, which is the one surface deep links exist for.
     This shipped that way and only a review caught it. */
  const ogUrl = routeHtml.match(/<meta property="og:url" content="([^"]+)"/)?.[1];
  check(`og:url matches canonical: ${route.url}`, ogUrl === route.url, `got ${ogUrl}`);

  /* Next REPLACES nested metadata objects instead of deep-merging them, so a
     route that declares openGraph silently drops every field the root layout
     set. That is how og:type and og:site_name disappeared and twitter:card
     fell back from summary_large_image to the small card — invisible in the
     HTML unless you go looking for absence. */
  for (const [label, pattern] of [
    ["og:type", /<meta property="og:type" content="website"/],
    ["og:site_name", /<meta property="og:site_name" content="[^"]+"/],
    ["twitter:card", /<meta name="twitter:card" content="summary_large_image"/],
  ]) {
    check(`  ${label} survives: ${route.url}`, pattern.test(routeHtml));
  }

  /* The template appends " · Eric M. Tang" to descendant titles, so a title
     that already ends in the name gets it twice unless it opts out. */
  const pageTitle = routeHtml.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  const suffix = " · Eric M. Tang";
  check(
    `  title not doubled: ${route.url}`,
    !pageTitle.replace(new RegExp(`${suffix}$`), "").includes(suffix)
  );

  const ogTitle = routeHtml.match(/<meta property="og:title" content="([^"]+)"/)?.[1];
  check(
    `og:title is route-specific: ${route.url}`,
    route.url === "https://ericmtang.com" || ogTitle !== HOME_OG_TITLE,
    `got ${ogTitle}`
  );

  const noindex = /<meta name="robots" content="[^"]*noindex/.test(routeHtml);
  check(
    `robots ${route.indexed ? "indexable" : "noindex"}: ${route.url}`,
    noindex === !route.indexed
  );

  const rsc = routeHtml.indexOf("self.__next_f");
  const routeDom = rsc === -1 ? routeHtml : routeHtml.slice(0, rsc);
  const start = routeDom.indexOf('class="sitedoc"');
  /* Entities must be decoded before matching. Two project names contain "&",
     which serialises as &amp;, and comparing against the raw data module would
     fail on those two alone — a test that reports a bug the site does not have
     is worse than no test. */
  const body =
    start === -1
      ? ""
      : routeDom
          .slice(start)
          .replace(/<[^>]+>/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&#x27;/g, "'")
          .replace(/\s+/g, " ")
          .trim();
  bodies.set(route.url, body);

  if (route.projectId) {
    const name = projectNames[projectIds.indexOf(route.projectId)];
    check(`  project page leads with its own work: ${route.projectId}`, body.includes(name));
  }
}

/* No two indexable documents may be byte-identical. This is the check that
   catches "every route renders the same SiteDocument", which would ship nine
   URLs competing with each other for the same query. */
const indexedBodies = ROUTES.filter((r) => r.indexed).map((r) => bodies.get(r.url) ?? "");
const duplicates = indexedBodies.length - new Set(indexedBodies).size;
check("indexable routes are not duplicates of each other", duplicates === 0, `${duplicates} repeated`);

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

for (const { name, ok, detail } of checks) {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

console.log(`\n${checks.length - failures.length}/${checks.length} checks passed`);

if (failures.length) {
  console.error(`\nFAILED: ${failures.join("; ")}`);
  process.exit(1);
}
