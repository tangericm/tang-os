import type { MetadataRoute } from "next";
import { PROJECTS } from "./data/projects";

/**
 * sitemap.xml via Next's file convention (served at /sitemap.xml).
 *
 * The site is one route. A one-entry sitemap looks pointless next to the
 * hundred-URL files most sites ship, but it is the honest shape of this
 * codebase, and it still earns its keep: it hands crawlers a canonical,
 * absolute, trailing-slash-free URL and a lastModified they can diff
 * against their last crawl, which is what stops the same page being
 * refetched as if it were new.
 *
 * The temptation is to pad it with /projects/<id> so it looks substantial.
 * Don't. Every one of those is a 404 today, and a sitemap that resolves to
 * 404s is worse than a small one — crawlers treat it as a quality signal
 * about the whole domain and back off the routes that DO exist.
 */

const SITE = "https://ericmtang.com";

/* Evaluated once, when the module is first loaded — which for a statically
   generated route means build time, so every request gets the byte-identical
   file. Precisely: this moves once per BUILD, not once per content change, so
   a redeploy that changes nothing still advances lastmod. That is a mild
   overstatement to a crawler rather than a false one, at a handful of deploys
   a year; deriving it from a hash of the data modules would be exact, and is
   worth doing only if the deploy rate ever climbs.
   The obvious alternative, new Date() inside sitemap(), is a trap: the moment
   this route renders dynamically it stamps "modified" on every single crawl,
   the claim becomes provably false, and search engines respond by ignoring
   lastModified on this domain entirely. A hardcoded ISO string would also be
   build-stable but goes stale in silence, which is the same lie told slower. */
const BUILT_AT = new Date();

/* One route per line. Everything that varies lives in the arguments, so
   shipping a page is a single entry() call rather than a six-line object
   literal copied from the one above it and half-edited — the failure mode
   that produces two URLs sharing one priority and nobody noticing.
   changeFrequency is uniform today; when a route needs its own, it becomes
   a third parameter rather than a reason to expand these back into objects. */
function entry(path: string, priority: number): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE}${path}`,
    lastModified: BUILT_AT,
    /* Google has said for years that it ignores both changeFrequency and
       priority. Bing and the smaller crawlers still read them, and they cost
       two lines, so they stay — as a hint, never as load-bearing. */
    changeFrequency: "monthly",
    priority,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    /* Root is "" rather than "/" so the URL emitted is exactly the canonical
       one in app/(desktop)/page.tsx — https://ericmtang.com, no trailing
       slash. A sitemap disagreeing with the canonical tag by one character
       is a self-inflicted duplicate-content report. */
    entry("", 1),
    entry("/resume", 0.9),
    entry("/projects", 0.8),
    /* Driven off PROJECTS, so a seventh project appears here the day it is
       added rather than the day someone remembers this file. The ids are the
       same ones generateStaticParams builds, which is what keeps every entry
       a URL that actually returns 200. */
    ...PROJECTS.map((project) => entry(`/projects/${project.id}`, 0.7)),
    /* /terminal and /play are deliberately absent: both are noindex, and a
       sitemap is a list of pages you are asking to have indexed. */
  ];
}
