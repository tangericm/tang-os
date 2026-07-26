import type { Metadata } from "next";
import SiteDocument from "../../components/SiteDocument";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Research and independent engineering: real-time instrument tracking, galvanometer modelling, self-supervised OCT denoising, a physics-based OCT simulator.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsIndex() {
  return <SiteDocument scope="projects" />;
}
