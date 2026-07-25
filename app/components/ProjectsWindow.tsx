"use client";

import { useState } from "react";
import Window from "./Window";
import SelfFusionSchematic from "./SelfFusionSchematic";
import TrackingSchematic from "./TrackingSchematic";

/**
 * ProjectsWindow: a master/detail showcase (not a card grid). The
 * sidebar lists the work; the detail pane lets the selected project
 * lead.
 *
 * Order is deliberate and grouped by what the work actually is: papers
 * where I am first author come first, then things I built on my own, then
 * work I contributed to as a co-author. Within a group, the ones with
 * something to look at come first.
 *
 * Copy aims at a reader who does computational imaging or CV but not
 * ophthalmology: the transferable engineering leads, the clinical setting
 * is context rather than the point, and "OCT" only appears where the
 * alternative would be vague.
 */

type Passthrough = {
  onClose: () => void;
  onMinimize: () => void;
  motion?: "minimizing" | "closing";
  minimizeTarget?: string;
  zIndex?: number;
  onFocus?: () => void;
};

type Group = "First-author research" | "Built independently" | "Co-authored research";

type Project = {
  id: string;
  name: string;
  kind: string;
  group: Group;
  /** which animated explainer, if any, belongs to this project */
  visual?: "tracking" | "denoise";
  blurb: string;
  tags: string[];
  links: { label: string; href: string }[];
};

const GROUPS: Group[] = [
  "First-author research",
  "Built independently",
  "Co-authored research",
];

const PROJECTS: Project[] = [
  {
    id: "tracking",
    name: "Real-Time Instrument Tracking",
    kind: "Closed-loop vision",
    group: "First-author research",
    visual: "tracking",
    blurb:
      "A detector and a scanner wired into a closed loop. Two imaging modes share one laser and one optical path, so a wide overhead view and a narrow cross-section are captured together and arrive already registered to each other. A YOLOv4 detector finds the tool in the overhead view, and its bounding box is converted into mirror voltages that re-aim the cross-sectional scan, so the imaged volume follows the tool across 25 mm of travel with nobody touching a control. Tracking holds to the resolution limit of the optics through 9 mm of defocus and up to 10 mm/s, about twenty times faster than the motion it was built for.",
    tags: ["YOLOv4", "Real-time C++", "Closed-loop control", "CUDA", "Multi-channel CNN"],
    links: [
      {
        label: "Paper · Biomed. Opt. Express 2022",
        href: "https://pubmed.ncbi.nlm.nih.gov/35414968/",
      },
    ],
  },
  {
    id: "galvo",
    name: "Scanner Modeling & Control",
    kind: "Controls, optimization",
    group: "First-author research",
    blurb:
      "Every point-scanning instrument wastes time waiting for its mirrors to settle, and that dead time caps both field of view and frame rate. This work models the closed-loop galvanometer controller, then searches its parameter space with Gaussian process regression to find tunings that cut settling time by more than half. The recovered response is then spent deliberately, on scan waveforms that widen the usable field and raise signal-to-noise, contrast, and speed together. It runs on stock controller hardware, with no custom electronics, which is what makes it worth reproducing.",
    tags: ["Control systems", "Gaussian process regression", "Bayesian optimization", "MATLAB", "DSP"],
    links: [
      {
        label: "Paper · Biomed. Opt. Express 2021",
        href: "https://opg.optica.org/boe/fulltext.cfm?uri=boe-12-11-6701",
      },
    ],
  },
  {
    id: "spectral",
    name: "Spectral-Split Denoiser",
    kind: "Physics-informed ML",
    group: "Built independently",
    blurb:
      "Denoising without ever collecting a clean reference, by using how the image is formed. The raw interferogram is split into two Gaussian sub-bands separated by a tunable gap, and each is reconstructed on its own. That gives two views of the same scene whose structure is identical but whose speckle is independent, because speckle depends on which part of the spectrum you keep. A ResUNet with a pseudo-3D stem takes those views as input channels and is trained to output the full-bandwidth reconstruction, so it learns to keep what the views agree on and discard what they do not. A Charbonnier loss with a gradient term stops edges being smoothed off, and the window width and gap are tuned with Optuna rather than guessed.",
    tags: ["PyTorch", "ResUNet", "Physics-informed", "Optuna", "Mixed precision"],
    links: [{ label: "GitHub", href: "https://github.com/tangericm/OCT-Denoiser" }],
  },
  {
    id: "calib",
    name: "Camera Calibration & Stereo",
    kind: "Classical vision",
    group: "Built independently",
    blurb:
      "Single and stereo camera calibration carried through to a usable 3D measurement: intrinsics, lens distortion, extrinsics, rectification, and triangulation from checkerboard captures, built on OpenCV. Reprojection error is tracked at each stage, because a calibration you cannot evaluate is a calibration you should not trust.",
    tags: ["OpenCV", "Stereo vision", "Camera geometry", "Python"],
    links: [{ label: "GitHub", href: "https://github.com/tangericm" }],
  },
  {
    id: "classify",
    name: "Image Classification Pipeline",
    kind: "Training infrastructure",
    group: "Built independently",
    blurb:
      "An end-to-end classification pipeline built to be reused rather than demonstrated once: dataset handling and splits, interchangeable model definitions, a training loop with checkpointing and metric logging, and a small app that runs inference from a saved checkpoint. The scaffolding is the point, since it is what gets rewritten on every new problem.",
    tags: ["PyTorch", "CNN", "Python"],
    links: [{ label: "GitHub", href: "https://github.com/tangericm" }],
  },
  {
    id: "tangos",
    name: "TangOS",
    kind: "This site",
    group: "Built independently",
    blurb:
      "The desktop you are reading this on. Draggable and resizable windows with real maximise and restore, a magnifying dock, a document viewer, and the animated schematics on this page, built from scratch with Next.js, React, and TypeScript. No UI framework and no component library, because the window manager was the interesting part.",
    tags: ["Next.js", "React", "TypeScript", "SVG animation"],
    links: [{ label: "Source", href: "https://github.com/tangericm/tang-os" }],
  },
  {
    id: "denoise",
    name: "Real-Time Image Denoising",
    kind: "Deep learning, real-time",
    group: "Co-authored research",
    visual: "denoise",
    blurb:
      "Self-fusion cleans up a frame using the frames on either side of it. Each neighbour is deformably registered onto the target and fused by local similarity, so speckle averages away while the edges the neighbours agree on stay sharp. It tolerates motion, and at roughly 0.42 fps it is far too slow to watch. This work trains a network to reproduce that fused result from three raw frames instead, reaching about 22 fps once exported through TorchScript and run from C++, which is the difference between a method and something you can put in front of a live feed.",
    tags: ["PyTorch", "Self-fusion network", "C++ / LibTorch", "TorchScript", "Real-time"],
    links: [
      {
        label: "Paper · Biomed. Opt. Express 2022",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8973187",
      },
    ],
  },
];

/* The hero for the denoising project: a raw frame resolving into its
   denoised version. These are REAL images from my own data, a single raw
   frame underneath and a registered average of a 50-frame repeat stack
   revealed left-to-right by an animated clip. */
function DenoiseHero() {
  return (
    <div className="denoise" aria-label="A real noisy scan resolving into a denoised one">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="denoise-img" src="/oct-raw.jpg" alt="Raw single-frame retinal cross-section, heavy speckle" width={1500} height={620} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="denoise-img denoise-clean" src="/oct-clean.jpg" alt="Denoised cross-section, layers and choroid clearly resolved" width={1500} height={620} />
      <span className="denoise-scan" aria-hidden="true" />
      <div className="denoise-tags" aria-hidden="true">
        <span>raw</span>
        <span className="denoise-tag-clean">denoised</span>
      </div>
    </div>
  );
}

function Visual({ kind }: { kind: NonNullable<Project["visual"]> }) {
  if (kind === "tracking") return <TrackingSchematic />;
  return (
    <>
      <figure className="denoise-figure">
        <DenoiseHero />
        <figcaption>
          My own retinal data: one <strong>raw</strong> frame versus a registered
          average of the same 50-frame stack. Fusing redundant frames recovers the
          layers; self-fusion gets there without the repeat acquisition, and the
          network gets there from three frames.
        </figcaption>
      </figure>
      <SelfFusionSchematic />
    </>
  );
}

export default function ProjectsWindow(props: Passthrough) {
  const [sel, setSel] = useState<string>("tracking");
  const project = PROJECTS.find((p) => p.id === sel)!;

  return (
    <Window title="Projects" frameClassName="window-projects" {...props}>
      <div className="projects">
        <nav className="proj-sidebar" aria-label="Projects">
          {GROUPS.map((g) => (
            <div className="proj-group" key={g}>
              <h2 className="proj-group-title">{g}</h2>
              {PROJECTS.filter((p) => p.group === g).map((p) => (
                <button
                  key={p.id}
                  className={p.id === sel ? "proj-item proj-item-active" : "proj-item"}
                  onClick={() => setSel(p.id)}
                  aria-current={p.id === sel}
                >
                  <span className="proj-item-name">{p.name}</span>
                  <span className="proj-item-kind">{p.kind}</span>
                  {p.visual && <span className="proj-item-dot" aria-hidden="true" />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="proj-detail" key={project.id}>
          {project.visual && (
            <div className="proj-hero">
              <Visual kind={project.visual} />
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
