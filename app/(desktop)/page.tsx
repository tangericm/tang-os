import type { Metadata } from "next";
import SiteDocument from "../components/SiteDocument";

/* The canonical lives here, per route, and NOT in the root layout. A
   `canonical: "/"` in app/layout.tsx is inherited by every descendant, so
   every project page and the resume would have self-canonicalised to "/",
   Google would have dropped them from the index, and the whole routing effort
   would have produced nothing while looking like it worked. */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return <SiteDocument scope="home" />;
}
