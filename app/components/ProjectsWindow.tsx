"use client";

import { useState } from "react";
import Window from "./Window";
import UNetFlow from "./UNetFlow";

/**
 * ProjectsWindow: a master/detail showcase (not a card grid). The
 * sidebar lists the work; the detail pane lets the selected project
 * lead. The featured project (real-time OCT denoising) opens with two
 * live visuals: a raw B-scan resolving into a denoised one, and the
 * denoising network with data flowing through it.
 */

type Passthrough = {
  onClose: () => void;
  onMinimize: () => void;
  motion?: "minimizing" | "closing";
  minimizeTarget?: string;
  zIndex?: number;
  onFocus?: () => void;
};

type Project = {
  id: string;
  name: string;
  kind: string;
  featured?: boolean;
  blurb: string;
  why: string;
  tags: string[];
  links: { label: string; href: string }[];
};

const PROJECTS: Project[] = [
  {
    id: "denoise",
    name: "Real-Time OCT Denoising",
    kind: "Research",
    featured: true,
    blurb:
      "Self-fusion denoises an OCT B-scan by deformably registering its neighboring frames and fusing them by structural similarity. It is motion-robust and edge-preserving, but at ~0.4 fps it is far too slow for live imaging. This work distills it into a multi-scale U-Net: three adjacent B-scans go in, and the network learns to reproduce a high-quality 7-frame self-fusion result, denoising at video rate for use during surgery.",
    why:
      "Denoising in real time lets a surgeon see thin retinal layers clearly during an operation, where raw speckle would hide them.",
    tags: ["PyTorch", "Multi-scale U-Net", "Self-fusion", "OCT", "Real-time"],
    links: [
      { label: "Paper · Biomed. Opt. Express 2022", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8973187" },
    ],
  },
  {
    id: "tracking",
    name: "4D Surgical Instrument Tracking",
    kind: "Research",
    blurb:
      "A lightweight YOLOv4 detector tracking surgical instruments across multi-view inputs at 120 fps, integrated with a high-speed OCT system for 4D video-rate imaging of ophthalmic maneuvers.",
    why:
      "Following the instrument against the tissue in real time helps a surgeon avoid contact with the fragile retina beneath it.",
    tags: ["YOLOv4", "Real-time", "C++", "Multi-view"],
    links: [
      { label: "Paper (BOE 2022)", href: "https://scholar.google.com/citations?user=LV0RaF8AAAAJ" },
    ],
  },
  {
    id: "calib",
    name: "Camera Calibration & Stereo Vision",
    kind: "Software",
    blurb:
      "Single- and stereo-camera calibration with 3D reconstruction: intrinsics, distortion, and rectification from checkerboard captures, built on OpenCV.",
    why:
      "Good calibration is what lets a camera measure real distances, so any 3D reconstruction built on it can be trusted.",
    tags: ["OpenCV", "Stereo vision", "Python"],
    links: [{ label: "GitHub", href: "https://github.com/tangericm" }],
  },
  {
    id: "classify",
    name: "Image Classification Pipeline",
    kind: "Software",
    blurb:
      "An end-to-end CNN image-classification pipeline covering dataset handling, model definitions, and training, with a small app to run inference.",
    why:
      "A clean, reusable pipeline like this is the starting point for jobs like flagging abnormal scans or sorting images by quality.",
    tags: ["PyTorch", "CNN", "Python"],
    links: [{ label: "GitHub", href: "https://github.com/tangericm" }],
  },
  {
    id: "tangos",
    name: "TangOS",
    kind: "This site",
    blurb:
      "The desktop you're using right now: draggable, resizable windows, a magnifying dock, and a document-style resume viewer, built from scratch with Next.js, React, and TypeScript. No UI framework.",
    why:
      "It shows I can build a polished interface end to end, not just wire up a framework.",
    tags: ["Next.js", "React", "TypeScript", "CSS"],
    links: [{ label: "Source", href: "https://github.com/tangericm/tang-os" }],
  },
];

/* The hero: a raw B-scan resolving into its denoised version. These are
   REAL images from my own OCT data: a single raw frame underneath, and a
   registered average of the 50-frame repeat stack revealed left-to-right
   by an animated clip, with an amber scan line riding the boundary. */
function DenoiseHero() {
  return (
    <div className="denoise" aria-label="A real noisy OCT scan resolving into a denoised one">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="denoise-img" src="/oct-raw.jpg" alt="Raw single-frame OCT B-scan of a fovea, heavy speckle" width={1500} height={620} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="denoise-img denoise-clean" src="/oct-clean.jpg" alt="Denoised OCT B-scan, retinal layers and choroid clearly resolved" width={1500} height={620} />
      <span className="denoise-scan" aria-hidden="true" />
      <div className="denoise-tags" aria-hidden="true">
        <span>raw</span>
        <span className="denoise-tag-clean">denoised</span>
      </div>
    </div>
  );
}

export default function ProjectsWindow(props: Passthrough) {
  const [sel, setSel] = useState<string>("denoise");
  const project = PROJECTS.find((p) => p.id === sel)!;

  return (
    <Window title="Projects" frameClassName="window-projects" {...props}>
      <div className="projects">
        <nav className="proj-sidebar" aria-label="Projects">
          {PROJECTS.map((p) => (
            <button
              key={p.id}
              className={p.id === sel ? "proj-item proj-item-active" : "proj-item"}
              onClick={() => setSel(p.id)}
              aria-current={p.id === sel}
            >
              <span className="proj-item-name">{p.name}</span>
              <span className="proj-item-kind">{p.kind}</span>
              {p.featured && <span className="proj-item-dot" aria-hidden="true" />}
            </button>
          ))}
        </nav>

        <div className="proj-detail" key={project.id}>
          {project.featured && (
            <div className="proj-hero">
              <figure className="denoise-figure">
                <DenoiseHero />
                <figcaption>
                  My own foveal OCT: one <strong>raw</strong> B-scan versus a
                  registered average of the same 50-frame stack. Fusing redundant
                  frames recovers the retinal layers; the network learns to match a
                  motion-robust version (self-fusion) from just three frames.
                </figcaption>
              </figure>
              <figure className="unet-figure">
                <UNetFlow />
                <figcaption>
                  Multi-scale U-Net: <strong>3 adjacent frames in</strong>, trained on a
                  7-frame self-fusion target (not an averaged &ldquo;clean&rdquo; image).
                </figcaption>
              </figure>
            </div>
          )}

          <h2 className="proj-title">{project.name}</h2>
          <p className="proj-blurb">{project.blurb}</p>
          <p className="proj-why">{project.why}</p>

          <div className="proj-tags">
            {project.tags.map((t) => (
              <span className="proj-tag" key={t}>{t}</span>
            ))}
          </div>

          <div className="proj-links">
            {project.links.map((l) => (
              <a className="pill-link" key={l.label} href={l.href} target="_blank" rel="noreferrer">
                {l.label} ↗
              </a>
            ))}
          </div>
        </div>
      </div>
    </Window>
  );
}
