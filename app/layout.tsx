import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  /* metadataBase is what lets Next turn the generated card and any other
     relative asset into the absolute URLs that crawlers and chat apps
     require; without it they silently resolve against localhost. */
  metadataBase: new URL("https://ericmtang.com"),
  title: {
    default: "Eric M. Tang · High-Speed Imaging, Machine Learning & Computer Vision",
    template: "%s · Eric M. Tang",
  },
  /* This string is what Google and every pasted link render, so it leads on
     the capabilities rather than on the individual projects. Ordering is
     deliberate: high-speed imaging, machine learning, computer vision.
     Computational imaging is the field, not the pitch. */
  description:
    "High-speed imaging systems, machine learning and computer vision. PhD in biomedical engineering building real-time GPU vision pipelines, deep learning for image restoration, and the hardware control that feeds them.",
  openGraph: {
    type: "website",
    url: "https://ericmtang.com",
    siteName: "Eric M. Tang",
    title: "Eric M. Tang · High-Speed Imaging, Machine Learning & Computer Vision",
    description:
      "High-speed imaging, machine learning and computer vision, presented as a desktop you can click around.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eric M. Tang · High-Speed Imaging, Machine Learning & Computer Vision",
    description:
      "High-speed imaging, machine learning and computer vision, presented as a desktop you can click around.",
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

/* Two decisions that must be made before the first paint, so both run
   synchronously here rather than from a React effect, which would let the
   wrong state flash first.

   `js` swaps which of the page's two documents is visible: the desktop, or
   the plain .sitedoc mirror that carries the same content for crawlers and
   for anyone with scripting off (see globals.css and page.tsx). It is added
   first and outside the try, because if sessionStorage throws — Safari in
   private mode has historically done exactly that — the desktop must still
   appear. Getting this backwards shows every visitor the fallback document.

   `booted` skips the boot sequence, a nice first impression and a
   two-and-a-half second toll on every visit after that. The overlay itself
   stays server-rendered, so a first-time visitor gets it with no JS
   round-trip. */
const HEAD_ONCE = `document.documentElement.classList.add('js');try{if(sessionStorage.getItem('tangos-booted')){document.documentElement.classList.add('booted')}else{sessionStorage.setItem('tangos-booted','1')}}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_ONCE }} />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
