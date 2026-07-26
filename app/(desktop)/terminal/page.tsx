import type { Metadata } from "next";
import SiteDocument from "../../components/SiteDocument";

/* Shareable but deliberately not indexed: the terminal is an interaction, and
   its document mirror is the same identity page every other route already
   serves. Indexing it would put a near-duplicate in front of the real ones. */
export const metadata: Metadata = {
  title: "Terminal",
  robots: { index: false },
  alternates: { canonical: "/terminal" },
};

export default function TerminalRoute() {
  return <SiteDocument scope="home" />;
}
