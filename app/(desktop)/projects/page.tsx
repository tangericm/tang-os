import SiteDocument from "../../components/SiteDocument";
import { routeMetadata } from "../../lib/metadata";

export const metadata = routeMetadata({
  title: "Projects",
  description:
    "Peer-reviewed imaging research, independent projects in denoising and optical design, and hobbies including Frankie Town and Eric's Recipe Book.",
  path: "/projects",
});

export default function ProjectsIndex() {
  return <SiteDocument scope="projects" />;
}
