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

/* Boot once per session.
   The boot sequence is a nice first impression and a two-and-a-half second
   toll on every visit after that. This runs synchronously in <head>, before
   the first paint, so a returning visitor never sees the overlay at all
   rather than seeing it flash and disappear, which is what a React effect
   would have given us. The overlay itself stays server-rendered, so a
   first-time visitor gets it with no JS round-trip.

   Nothing about WHICH document is visible depends on this script, and that
   is deliberate. A previous revision added a `js` class here that decided
   between the desktop and the plain .sitedoc mirror. On a phone where the
   inline script never ran — a content blocker is enough — the class never
   landed, and the visitor was served the fallback document permanently with
   no desktop at all. Correct rendering must not be contingent on a script
   executing; it is a stylesheet's job, and stylesheets are what decide it
   now. */
const BOOT_ONCE = `try{if(sessionStorage.getItem('tangos-booted')){document.documentElement.classList.add('booted')}else{sessionStorage.setItem('tangos-booted','1')}}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_ONCE }} />
        {/* Fetched only when scripting is disabled — a browser does not
            parse <noscript> contents otherwise, so this costs a scripted
            visitor nothing, not even a request. It promotes the mirror to
            the whole page and hides the desktop.

            A <link> rather than an inline <style> so the promoted rules
            exist in exactly one place. Inlining them would mean a second
            copy of every rule in public/no-js.css, and the copy nobody
            loads is the one that rots. */}
        <noscript>
          <link rel="stylesheet" href="/no-js.css" />
        </noscript>
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
