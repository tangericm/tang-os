import type { Metadata } from "next";
import { PROFILE } from "../data/profile";

/**
 * Per-route metadata, built in one place because the failure mode is silent.
 *
 * Next merges metadata by top-level KEY, not by field. A route that sets only
 * `title` and `description` inherits the root layout's entire `openGraph` and
 * `twitter` objects verbatim — including `openGraph.url`. The result is a page
 * whose <title> is correct, whose canonical is correct, and whose share card
 * says "Eric M. Tang · High-Speed Imaging…" and links to the home page. It
 * looks right everywhere except the one place it matters, which is a link
 * pasted into LinkedIn or Slack.
 *
 * That is exactly what shipped on /projects, /resume, /terminal and /play in
 * the first cut of the routing work. Routing that cannot be shared correctly
 * is routing that does not do its job, so every route goes through here and
 * gets all four surfaces — title, description, canonical, and both card
 * formats — from one call.
 */
export function routeMetadata({
  title,
  description,
  path,
  index = true,
}: {
  title: string;
  /** Also used verbatim as the card description; keep it under ~160 chars. */
  description: string;
  /** Route-absolute, e.g. "/resume". Resolved against metadataBase. */
  path: string;
  index?: boolean;
}): Metadata {
  /* The home page's title already carries the name, so appending it again
     would read as a stutter. */
  const cardTitle = title.includes(PROFILE.name) ? title : `${title} · ${PROFILE.name}`;

  return {
    /* Resolves through the template in app/layout.tsx to "<title> · Eric M.
       Tang", so a shared link names both the page and the person. */
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      /* Suffixed by hand because `title.template` in the root layout governs
         metadata.title only — openGraph.title takes whatever string it is
         given. Without this a shared /resume renders a card that says just
         "Resume", which names the page and not the person, and the person is
         the reason anyone opened the link. */
      title: cardTitle,
      description,
      url: path,
      /* type and siteName are inherited from the root layout, and correctly:
         they do not vary per route. Only the three fields that identify WHICH
         page this is get overridden. */
    },
    twitter: { title: cardTitle, description },
    ...(index ? {} : { robots: { index: false } }),
  };
}
