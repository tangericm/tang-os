/**
 * schema.org builders for the site's structured data.
 *
 * The point of this file is that a crawler sees ONE Eric. A resume document, an
 * About window and three papers all describe the same person, and a search
 * engine will not join those by name — so every node here either *is* the person
 * node or points at it by @id. Names are never repeated in the hope someone
 * matches the strings.
 *
 * For the same reason not a single fact is typed out below: everything is read
 * from data/profile.ts and data/publications.ts, which are also what the visible
 * pages render. Structured data that disagrees with the page it sits on is worse
 * than no structured data at all, and the only way to guarantee they agree is to
 * make disagreement impossible.
 *
 * Pure data, no React, no JSX: components/JsonLd.tsx owns rendering, so this
 * module stays importable from a route handler or pasteable into a validator.
 */

import { EDUCATION, KNOWS_ABOUT, LINKS, PROFILE } from "../data/profile";
import { PUBLICATIONS, SELF } from "../data/publications";

/* JSON-LD is an open vocabulary. Typing it tighter than "a JSON object" would
   mean hand-maintaining a schema.org .d.ts to buy checking we do not want:
   the useful errors here are semantic (wrong property for a type), and no
   TypeScript definition anyone would actually maintain catches those. */
type JsonLdNode = Record<string, unknown>;

/* Canonical origin. PROFILE.site is authored without a trailing slash, but a
   stray one would quietly yield "https://ericmtang.com//#person" and break
   every cross-reference in the graph at once — a failure that shows up only in
   a crawler weeks later. Cheaper to strip it than to trust an edit two files
   away to stay careful. */
const SITE = PROFILE.site.replace(/\/+$/, "");

/**
 * The identifier that makes the person addressable. It is a URI, not a URL —
 * nothing is served at /#person. Its whole job is to be the identical string in
 * every node, in every document, across every re-crawl, so the mentions merge
 * into one entity instead of accumulating near-duplicate Persons.
 */
const PERSON_ID = `${SITE}/#person`;

/**
 * PROFILE.location is one human-readable string ("San Jose, California")
 * because that is what the About window prints. schema.org wants the parts, so
 * we split rather than store the same place twice and let the two drift.
 *
 * A value with no comma degrades to a locality-only address, which is still
 * valid; parsing harder would invent structure the data does not have.
 * addressCountry is deliberately absent for the same reason — it is not in
 * profile.ts, and hardcoding it here would create a second, invisible copy of
 * "where Eric is" that no one would think to update.
 */
function postalAddress(): JsonLdNode {
  const [locality, region] = PROFILE.location.split(",").map((part) => part.trim());
  return {
    "@type": "PostalAddress",
    addressLocality: locality,
    ...(region ? { addressRegion: region } : null),
  };
}

/**
 * EDUCATION lists degrees; alumniOf lists schools. Duke granted two of the
 * three, so the naive map emits that organization twice — which reads to a
 * consumer as two different Dukes rather than as a double major, and looks like
 * a data-quality problem in exactly the feed where that costs you.
 *
 * Dedupe on school name, first mention wins so the order still tracks the
 * resume. The degree is dropped rather than attached: one deduplicated node
 * cannot carry two, and the resume document is where degrees are actually
 * stated. (schema.org has hasCredential for that, but it belongs on the person,
 * not smuggled into an organization node.)
 */
function alumniOf(): JsonLdNode[] {
  const seen = new Set<string>();
  const schools: string[] = [];
  for (const { school } of EDUCATION) {
    if (seen.has(school)) continue;
    seen.add(school);
    schools.push(school);
  }
  return schools.map((name) => ({ "@type": "EducationalOrganization", name }));
}

/**
 * "Tao, Y. K." is bibliography order, which is not how schema.org's `name`
 * reads — it wants the name as the person writes it. Flip on the FIRST comma
 * only: everything before it is the family name, hyphens intact
 * ("Rico-Jimenez"), everything after is initials. A string with no comma is
 * already a plain name, so leave it untouched rather than guess.
 */
function displayName(bibName: string): string {
  const comma = bibName.indexOf(",");
  if (comma === -1) return bibName;
  const family = bibName.slice(0, comma).trim();
  const given = bibName.slice(comma + 1).trim();
  return given ? `${given} ${family}` : family;
}

/**
 * Eric's own entry collapses to a bare @id reference. Spelling his name out on
 * each paper would mint three Persons that merely share a string, and nothing
 * obliges a crawler to merge them; one @id, repeated, *is* the merge. Co-authors
 * really are distinct people and get real nodes — dropping them to keep the
 * shape simple would misstate who wrote the papers.
 *
 * SELF exists in the data module precisely so this is an identity check and not
 * a fuzzy match against a name that appears in two different spellings.
 */
function authorNode(bibName: string): JsonLdNode {
  if (bibName === SELF) return { "@id": PERSON_ID };
  return { "@type": "Person", name: displayName(bibName) };
}

/**
 * The person node. Every other node in the graph points here.
 */
export function personJsonLd(): JsonLdNode {
  const address = postalAddress();

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: PROFILE.name,
    /* the legal name is an alternate, not the primary: the primary should be
       the string a searcher actually types and the site actually shows */
    alternateName: PROFILE.legalName,
    honorificSuffix: PROFILE.honorific,
    url: SITE,
    /* schema.org types email as Text, so it takes the bare address. Emitting
       `mailto:eric@...` here ships a scheme as part of the value and hands a
       strict consumer an address that is not one; anything that wants to make
       it clickable can prepend the scheme itself. */
    email: PROFILE.email,
    jobTitle: PROFILE.jobTitle,
    worksFor: { "@type": "Organization", name: PROFILE.employer },
    alumniOf: alumniOf(),
    /* copied, not aliased. KNOWS_ABOUT is a mutable array that the running app
       renders from; handing the same reference to a caller means one sort() in
       consumer code silently reorders a live page. */
    knowsAbout: [...KNOWS_ABOUT],
    /* Both properties, and they are not redundant: `address` is what most
       consumers actually read off a Person, `homeLocation` is the semantically
       precise one (a Place someone lives in). They cost a few bytes and no
       single consumer reads both, so emitting one and guessing right is the
       riskier option. */
    homeLocation: { "@type": "Place", name: PROFILE.location, address },
    address,
    /* Object.values rather than three named reads: adding a profile to LINKS
       should reach the graph without anyone remembering this file exists. */
    sameAs: Object.values(LINKS),
  };
}

/**
 * One ScholarlyArticle per publication.
 *
 * The journal metadata nests the way schema.org actually models a serial —
 * article isPartOf issue isPartOf volume isPartOf periodical. The common
 * shortcut (journal name flattened onto the article) loses volume and issue
 * entirely, which is most of what makes a citation resolvable.
 */
export function publicationsJsonLd(): JsonLdNode[] {
  return PUBLICATIONS.map((pub) => ({
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    /* stable per-paper URI, so a future node (a project page, a CreativeWork
       "about") can reference a paper the same way papers reference the person */
    "@id": `${SITE}/#publication-${pub.id}`,
    /* both spellings of the title on purpose: Google's Article parsing reads
       `headline`, generic schema.org consumers read `name`, and this is a
       string we already own rather than a fact being duplicated */
    name: pub.title,
    headline: pub.title,
    author: pub.authors.map(authorNode),
    url: pub.url,
    pagination: pub.pages,
    /* Year-only is a legal ISO 8601 date and the only precision publications.ts
       carries. Padding it to a month to look more specific would be inventing
       data that a citation checker could contradict. */
    datePublished: String(pub.year),
    isPartOf: {
      "@type": "PublicationIssue",
      issueNumber: pub.issue,
      isPartOf: {
        "@type": "PublicationVolume",
        volumeNumber: pub.volume,
        isPartOf: {
          "@type": "Periodical",
          name: pub.journal,
        },
      },
    },
  }));
}

/**
 * The whole graph, in the order a reader meets it: who, then what he wrote.
 *
 * Returned as an array so a caller emits exactly ONE script tag. That matters:
 * separate script tags are separate JSON-LD documents, and an @id in one
 * document has no obligation to resolve against a node in another — the papers
 * would come back detached from the person, which is the exact failure this
 * whole file exists to avoid.
 *
 * A bare array of node objects is itself a valid JSON-LD document, and each node
 * carries its own @context, so this drops straight into a script tag as-is and
 * each builder above also stands alone if something ever needs only one of them.
 * Nesting the array under a caller-supplied "@graph" parses identically.
 */
export function siteJsonLd(): JsonLdNode[] {
  return [personJsonLd(), ...publicationsJsonLd()];
}
