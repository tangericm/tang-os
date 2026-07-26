import type { MetadataRoute } from "next";

/**
 * robots.txt via Next's file convention (served at /robots.txt).
 *
 * Policy: search engines welcome (recruiters DO google you, SEO is a
 * feature), and as of this rewrite that welcome extends to the assistants
 * too. The old blanket "AI crawlers are asked to leave" collapsed two very
 * different fetches into one label. The distinction that actually matters
 * is what the fetch is FOR:
 *
 *   TRAINING crawlers read the page once and bake it into weights. Nothing
 *   returns — no visit, no citation, no link, and no way to correct the
 *   record later when a model paraphrases a 2019 paper wrong. The exchange
 *   is entirely one-directional, so these stay disallowed.
 *
 *   RETRIEVAL crawlers fetch because a human asked a question ten seconds
 *   ago, and they cite what they fetch. That is a recruiter typing "who is
 *   Eric Tang" into an assistant and getting this site named in the answer.
 *   It is the highest-intent traffic this domain sees, and blocking it does
 *   not protect anything — it just removes him from the answer and leaves
 *   whatever the model already half-remembers to stand uncorrected.
 *
 * Note this is etiquette, not enforcement: polite bots honor it, rude ones
 * don't, enforcement lives in Vercel's bot firewall.
 */

/* Training and bulk-corpus scrapers.
   Applebot-Extended is the subtle one: it is not a crawler at all, it is an
   opt-out token governing whether Apple Intelligence may train on what
   Applebot already fetched. Blocking it costs no search visibility, because
   Applebot itself is not named here and keeps matching the "*" rule below.
   Claude-Web is deliberately absent — Anthropic retired that token, so a rule
   naming it enforces nothing while reading like live policy to the next
   person who opens this file. */
const TRAINING_CRAWLERS = [
  "GPTBot",
  "CCBot",
  "ClaudeBot",
  "Applebot-Extended",
  "Bytespider",
  "meta-externalagent",
  "Amazonbot",
];

/* Answer engines. OAI-SearchBot and PerplexityBot build the indexes those
   answers are drawn from; ChatGPT-User and Claude-User are live fetches a
   specific person triggered; Claude-SearchBot is the indexing half of the
   same split ClaudeBot sits on the training side of.

   Google-Extended is here rather than above despite also being a training
   token, and it is the one entry that is a judgement call rather than a
   category. Google documents it as governing training AND grounding —
   supplying pages to Gemini at prompt time for factuality. There is no way
   to take the grounding without the training, so blocking it would have
   meant a recruiter asking Gemini "who is Eric Tang" gets an answer built
   from whatever the model half-remembers, with this site neither consulted
   nor cited. Being in the answer wins.

   Listing them is redundant while "*" allows everything, and that is the
   point twice over: the redundancy states the intent explicitly for anyone
   auditing the file, and if "*" is ever tightened these keep working instead
   of silently going dark along with the scrapers. */
const RETRIEVAL_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Claude-SearchBot",
  "Claude-User",
  "Google-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    /* Each named token gets its own group, and both groups sit ahead of the
       wildcard. A crawler obeys exactly one group — the most specific one
       naming it — so ClaudeBot never sees the allow and Claude-User never
       sees the disallow, and the two lists stay disjoint so they cannot
       fight. Folding either into the "*" group instead would silently hand
       every unnamed bot the same verdict. The wildcard goes last because it
       is the fallback, and because parsers that ignore specificity and take
       the first matching group are common enough to design around. */
    rules: [
      { userAgent: TRAINING_CRAWLERS, disallow: "/" },
      { userAgent: RETRIEVAL_CRAWLERS, allow: "/" },
      { userAgent: "*", allow: "/" },
    ],
    /* Absolute by spec: robots.txt Sitemap directives are not resolved
       against the file's own origin, so a relative path here is ignored. */
    sitemap: "https://ericmtang.com/sitemap.xml",
  };
}
