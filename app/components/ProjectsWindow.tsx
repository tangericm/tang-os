"use client";

import { useState } from "react";
import Window from "./Window";
import UNetFlow from "./UNetFlow";

/**
 * ProjectsWindow — a master/detail showcase (not a card grid). The
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
      "A self-fusion / multi-scale U-Net that strips speckle from optical coherence tomography B-scans in real time — recovering clean retinal layers at video rate for use during surgery. Published in Biomedical Optics Express.",
    tags: ["PyTorch", "U-Net", "OCT", "Real-time", "C++"],
    links: [
      { label: "Paper (BOE 2022)", href: "https://scholar.google.com/citations?user=LV0RaF8AAAAJ" },
    ],
  },
  {
    id: "tracking",
    name: "4D Surgical Instrument Tracking",
    kind: "Research",
    blurb:
      "A lightweight YOLOv4 detector tracking surgical instruments across multi-view inputs at 120 fps, integrated with a high-speed OCT system for 4D video-rate imaging of ophthalmic maneuvers.",
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
      "Single- and stereo-camera calibration with 3D reconstruction — intrinsics, distortion, and rectification from checkerboard captures, built on OpenCV.",
    tags: ["OpenCV", "Stereo vision", "Python"],
    links: [{ label: "GitHub", href: "https://github.com/tangericm" }],
  },
  {
    id: "classify",
    name: "Image Classification Pipeline",
    kind: "Software",
    blurb:
      "An end-to-end CNN image-classification pipeline — dataset handling, model definitions, and training — with a small app to run inference.",
    tags: ["PyTorch", "CNN", "Python"],
    links: [{ label: "GitHub", href: "https://github.com/tangericm" }],
  },
  {
    id: "tangos",
    name: "TangOS — this website",
    kind: "This site",
    blurb:
      "The desktop you're using right now: draggable, resizable windows, a magnifying dock, and a document-style resume viewer — built from scratch with Next.js, React, and TypeScript. No UI framework.",
    tags: ["Next.js", "React", "TypeScript", "CSS"],
    links: [{ label: "Source", href: "https://github.com/tangericm/tang-os" }],
  },
];

/* The hero: a raw B-scan resolving into its denoised version. A clean
   image sits above the raw one, revealed left-to-right by an animated
   clip, with an amber scan line riding the boundary. */
function DenoiseHero() {
  return (
    <div className="denoise" aria-label="A noisy OCT scan resolving into a denoised one">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="denoise-img" src="/oct-raw.png" alt="" width={900} height={560} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="denoise-img denoise-clean" src="/oct-clean.png" alt="" width={900} height={560} />
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
              <DenoiseHero />
              <UNetFlow />
            </div>
          )}

          <h2 className="proj-title">{project.name}</h2>
          <p className="proj-blurb">{project.blurb}</p>

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
