import SiteDocument from "../../components/SiteDocument";
import { routeMetadata } from "../../lib/metadata";

export const metadata = routeMetadata({
  title: "Projects",
  description:
    "Research and independent engineering: real-time instrument tracking, galvanometer modelling, self-supervised OCT denoising, and a physics-based OCT simulator.",
  path: "/projects",
});

export default function ProjectsIndex() {
  return <SiteDocument scope="projects" />;
}
