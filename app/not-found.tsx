import Link from "next/link";
import MenuBar from "./components/MenuBar";

/**
 * 404, staged as an OS alert rather than a web page.
 *
 * The default Next.js 404 drops the visitor out of the illusion entirely,
 * which is the one thing this site is trading on. So a bad URL gets the
 * same desktop, the same menu bar, and a dialog on top of it, deliberately
 * borrowing the window chrome without the traffic lights: there is nothing
 * to minimise or resize here, only a way back.
 */
export const metadata = {
  title: "Not Found · Eric M. Tang",
};

export default function NotFound() {
  return (
    <main className="desktop">
      <MenuBar />

      <section className="alert" role="alertdialog" aria-labelledby="nf-title">
        <div className="alert-mark" aria-hidden="true">
          <svg viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="20" />
            <path d="M22 12v14M22 31.5v.5" />
          </svg>
        </div>

        <h1 className="alert-title" id="nf-title">
          That file isn&rsquo;t on this disk
        </h1>
        <p className="alert-body">
          The address you followed does not point anywhere in TangOS. It may have
          been renamed, or it may never have existed.
        </p>

        <Link className="pill-link" href="/">
          Back to the desktop
        </Link>

        <p className="alert-code" aria-hidden="true">
          error 404 · path not found
        </p>
      </section>
    </main>
  );
}
