import SiteDocument from "../../components/SiteDocument";
import { routeMetadata } from "../../lib/metadata";

export const metadata = routeMetadata({
  title: "Chess",
  description:
    "Play chess against Stockfish inside TangOS. Choose from six difficulty levels, from Beginner to Grandmaster.",
  path: "/play",
  index: false,
});

export default function PlayRoute() {
  return <SiteDocument scope="home" />;
}
