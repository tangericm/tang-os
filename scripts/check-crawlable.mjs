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
check("found projects in data module", projectNames.length >= 6, `${projectNames.length} projects`);
for (const name of projectNames) {
  check(`  project in mirror: ${name}`, mirrorText.includes(name));
}

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

  /* Only "/" is a real route today. When routing ships, this needs to learn
     about the new URLs — deliberately, so that a sitemap listing 404s cannot
     pass quietly. */
  const known = new Set(["https://ericmtang.com", "https://ericmtang.com/"]);
  const unknown = locs.filter((l) => !known.has(l));
  check("sitemap lists only routes we serve", unknown.length === 0, unknown.join(", "));
} else {
  check("sitemap.xml built", false, sitemapPath);
}

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
