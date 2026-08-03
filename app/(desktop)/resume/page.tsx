import SiteDocument from "../../components/SiteDocument";
import { routeMetadata } from "../../lib/metadata";

export const metadata = routeMetadata({
  title: "Resume",
  description:
    "Eric M. Tang, PhD. Resume: real-time imaging software in C++, deep learning for image restoration, edge deployment on Jetson, and the hardware control that feeds them.",
  path: "/resume",
});

export default function ResumeRoute() {
  return <SiteDocument scope="resume" />;
}
