import SiteDocument from "../../components/SiteDocument";
import { routeMetadata } from "../../lib/metadata";

export const metadata = routeMetadata({
  title: "Projects",
  description:
    "Research and independent engineering in imaging, optical design, and AI tools, alongside personal projects including Eric's Recipe Book and TangOS.",
  path: "/projects",
});

export default function ProjectsIndex() {
  return <SiteDocument scope="projects" />;
}
