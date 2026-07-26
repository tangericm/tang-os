import type { Metadata } from "next";
import SiteDocument from "../../components/SiteDocument";

export const metadata: Metadata = {
  title: "Runner",
  robots: { index: false },
  alternates: { canonical: "/play" },
};

export default function PlayRoute() {
  return <SiteDocument scope="home" />;
}
