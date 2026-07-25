import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eric M. Tang",
  description:
    "TangOS, the OS-style personal site of Eric M. Tang. Booting soon at ericmtang.com.",
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
