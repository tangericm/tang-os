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
  /* Whether the title already ends in the name decides two things at once:
     the <title> must opt out of the root layout's template, and the card
     title must not have the name appended a second time.

     The root layout's `title.template` appends " · Eric M. Tang" to every
     DESCENDANT title, and the home page's title is the full brand string that
     already carries it, so letting the template run emits
     "…Computer Vision · Eric M. Tang". `absolute` opts that one route out. */
  const carriesName = title.includes(PROFILE.name);
  const cardTitle = carriesName ? title : `${title} · ${PROFILE.name}`;

  return {
    title: carriesName ? { absolute: title } : title,
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
      /* Restated, NOT inherited. Next replaces nested metadata objects rather
         than deep-merging them, so declaring `openGraph` here drops every
         field the root layout set — `type` and `siteName` disappeared
         outright, and `twitter.card` silently fell back from
         summary_large_image to the small `summary` card. The invariant to
         remember: any key you touch, you own completely. */
      type: "website",
      siteName: PROFILE.name,
    },
    twitter: { card: "summary_large_image", title: cardTitle, description },
    ...(index ? {} : { robots: { index: false } }),
  };
}
