import SiteDocument from "../../components/SiteDocument";
import { routeMetadata } from "../../lib/metadata";

/* Shareable but deliberately not indexed: the terminal is an interaction, and
   its document mirror is the same identity page every other route serves.
   Indexing it would put a near-duplicate in front of the real ones. It still
   gets its own card, because "not indexed" and "shared without context" are
   different things. */
export const metadata = routeMetadata({
  title: "Terminal",
  description:
    "A working shell inside Eric M. Tang's desktop portfolio. Type help for the command list.",
  path: "/terminal",
  index: false,
});

export default function TerminalRoute() {
  return <SiteDocument scope="home" />;
}
