import type { Metadata } from "next";
import SiteDocument from "../../components/SiteDocument";

export const metadata: Metadata = {
  title: "Resume",
  description:
    "Eric M. Tang, PhD — resume. Real-time imaging software, deep learning for image restoration, edge deployment, and the hardware control that feeds them.",
  alternates: { canonical: "/resume" },
};

export default function ResumeRoute() {
  return <SiteDocument scope="resume" />;
}
