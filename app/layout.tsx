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
    default: "Eric M. Tang · Computational Imaging & Computer Vision",
    template: "%s · Eric M. Tang",
  },
  /* The old description still said "Booting soon", months after launch,
     and that string was what Google and every pasted link were showing. */
  description:
    "Computational imaging and computer vision: real-time denoising, closed-loop instrument tracking, and scanner control. An interactive desktop portfolio by Eric M. Tang.",
  openGraph: {
    type: "website",
    url: "https://ericmtang.com",
    siteName: "Eric M. Tang",
    title: "Eric M. Tang · Computational Imaging & Computer Vision",
    description:
      "Real-time denoising, closed-loop instrument tracking, and scanner control, presented as a desktop you can click around.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eric M. Tang · Computational Imaging & Computer Vision",
    description:
      "Real-time denoising, closed-loop instrument tracking, and scanner control, presented as a desktop you can click around.",
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
   first-time visitor gets it with no JS round-trip. */
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
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
