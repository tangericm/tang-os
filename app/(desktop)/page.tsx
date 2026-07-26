import SiteDocument from "../components/SiteDocument";
import { routeMetadata } from "../lib/metadata";

/* The canonical lives here, per route, and NOT in the root layout. A
   `canonical: "/"` in app/layout.tsx is inherited by every descendant, so
   every project page and the resume would have self-canonicalised to "/",
   Google would have dropped them from the index, and the whole routing effort
   would have produced nothing while looking like it worked. */
export const metadata = routeMetadata({
  title: "Eric M. Tang · High-Speed Imaging, Machine Learning & Computer Vision",
  description:
    "High-speed imaging systems, machine learning and computer vision. PhD in biomedical engineering building real-time GPU vision pipelines, deep learning for image restoration, and the hardware control that feeds them.",
  path: "/",
});

export default function Home() {
  return <SiteDocument scope="home" />;
}
