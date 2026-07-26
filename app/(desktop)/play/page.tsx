import SiteDocument from "../../components/SiteDocument";
import { routeMetadata } from "../../lib/metadata";

export const metadata = routeMetadata({
  title: "Runner",
  description:
    "A dinosaur runner hidden inside Eric M. Tang's desktop portfolio. Jump the cacti, duck the birds.",
  path: "/play",
  index: false,
});

export default function PlayRoute() {
  return <SiteDocument scope="home" />;
}
