"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import Window from "./Window";
import ResumeDocument from "./ResumeDocument";

/**
 * ResumeWindow, a pseudo-document viewer for THE resume (one
 * document, one unmistakable download; simplicity won). The page is
 * selectable HTML mirroring the PDF; each download fires an
 * Analytics event and the email ping.
 *
 * The document body itself lives in ResumeDocument, a server component, so
 * the resume exists in the server-rendered HTML whether or not this window
 * is ever opened. What is left here is only the part that genuinely needs
 * the browser: zoom state, the toolbar and the download instrumentation.
 */

type Passthrough = {
  onClose: () => void;
  onMinimize: () => void;
  motion?: "minimizing" | "closing";
  minimizeTarget?: string;
  zIndex?: number;
  onFocus?: () => void;
};

const ZOOMS = [0.85, 1, 1.15, 1.3];

function notifyDownload(file: "resume-1p") {
  track("resume_download", { file });
  fetch("/api/ping-download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file }),
    keepalive: true,
  }).catch(() => {});
}

/* ---------- the window ---------- */

export default function ResumeWindow(props: Passthrough) {
  const [zoom, setZoom] = useState(1);
  const zoomIdx = ZOOMS.indexOf(zoom);

  return (
    <Window title="Eric Tang Resume" frameClassName="window-doc" {...props}>
      <div className="doc">
        <div className="doc-toolbar">
          <span className="doc-filename">Eric-Tang-Resume.pdf</span>

          <div className="doc-tools">
            <div className="doc-zoom">
              <button
                aria-label="Zoom out"
                disabled={zoomIdx === 0}
                onClick={() => setZoom(ZOOMS[zoomIdx - 1])}
              >
                −
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                aria-label="Zoom in"
                disabled={zoomIdx === ZOOMS.length - 1}
                onClick={() => setZoom(ZOOMS[zoomIdx + 1])}
              >
                +
              </button>
            </div>
            <a
              className="btn btn-primary"
              href="/Eric-Tang-Resume.pdf"
              download
              onClick={() => notifyDownload("resume-1p")}
            >
              Download Resume
              <span className="btn-sub">1 page · PDF</span>
            </a>
          </div>
        </div>

        <div className="doc-scroll">
          <article className="doc-page" style={{ zoom }}>
            <ResumeDocument />
          </article>
        </div>
      </div>
    </Window>
  );
}
