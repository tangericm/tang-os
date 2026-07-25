"use client";

import { useState } from "react";
import Window from "./Window";
import SelfFusionSchematic from "./SelfFusionSchematic";
import TrackingSchematic from "./TrackingSchematic";
import ScannerSchematic from "./ScannerSchematic";
import SpectralSchematic from "./SpectralSchematic";
import { CalibSchematic, ClassifySchematic, TangosSchematic } from "./MiniSchematics";
import { GROUPS, PROJECTS, type Project } from "../data/projects";

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

/* The hero for the denoising project: a raw frame resolving into its
   denoised version. These are REAL images from my own data, a single raw
   frame underneath and a registered average of a 50-frame repeat stack
   revealed left-to-right by an animated clip. */
function DenoiseHero() {
  return (
    <div className="denoise" aria-label="A real noisy scan resolving into a denoised one">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="denoise-img" src="/oct-raw.jpg" alt="Raw single-frame retinal cross-section, heavy speckle" width={1100} height={455} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="denoise-img denoise-clean" src="/oct-clean.jpg" alt="Denoised cross-section, layers and choroid clearly resolved" width={1100} height={455} />
      <span className="denoise-scan" aria-hidden="true" />
      <div className="denoise-tags" aria-hidden="true">
        <span>raw</span>
        <span className="denoise-tag-clean">denoised</span>
      </div>
    </div>
  );
}

/* The tracking hero: one moment, three ways of seeing it. The microscope
   view is what an operator sees, the en face frame is the detector input,
   and the volume is what the tracking produces. The two volume renderings
   are different viewpoints of the same tracked volume, NOT successive time
   points; an earlier version cross-faded them while claiming motion, which
   was simply wrong. Labelled as viewpoints now. */
function TrackingHero() {
  return (
    <figure className="denoise-figure">
      <div className="trio">
        <div className="trio-cell trio-wl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/track-wl.jpg" alt="Surgical microscope view of ILM forceps at the surface of an ex vivo porcine eye" width={403} height={400} />
          <span className="trio-label">microscope</span>
        </div>
        {/* Twelve consecutive frames of real detector output, laid out as a
            sprite and stepped with a transform. A sprite plus steps() rather
            than an animated image format, because that way
            prefers-reduced-motion can actually stop it. */}
        <div className="trio-cell trio-detect">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="detect-strip"
            src="/track-detect.webp"
            alt="Twelve consecutive en face frames with the YOLOv4 bounding box tracking the instrument across the field"
            width={3600}
            height={300}
          />
          <span className="trio-label trio-label-accent">live detection</span>
        </div>
        <div className="trio-cell trio-oct">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/track-oct-a.jpg" alt="Volumetric OCT rendering of the forceps at the corneal surface" width={440} height={440} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="trio-oct-b" src="/track-oct-b.jpg" alt="The same tracked volume rendered from a second viewpoint" width={440} height={440} />
          <span className="trio-label trio-label-accent">OCT volume · 2 views</span>
        </div>
      </div>
      <figcaption>
        Three views of the system: the surgical microscope image an operator sees,
        <strong> twelve consecutive frames of real detector output</strong> with the
        bounding box tracking the instrument, and the tracked OCT volume rendered
        from two viewpoints. The microscope and volume panels are ILM forceps in an
        ex vivo porcine eye; the detection sequence is from a separate acquisition.
      </figcaption>
    </figure>
  );
}

/* The spectral denoiser's own before and after, deliberately built in the
   same frame and with the same wipe as the self-fusion hero so the two
   denoising projects are visually comparable. Both frames were windowed
   with ONE shared percentile range: windowing them separately would have
   flattered the prediction. */
function SpectralHero() {
  return (
    <figure className="denoise-figure">
      <div className="denoise" aria-label="Full-bandwidth reference resolving into the network prediction">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="denoise-img" src="/spectral-ref.jpg" alt="Full-bandwidth reference reconstruction of a fovea, speckle throughout" width={1100} height={455} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="denoise-img denoise-clean" src="/spectral-pred.jpg" alt="Network prediction, speckle suppressed with layer boundaries and choroidal texture preserved" width={1100} height={455} />
        <span className="denoise-scan" aria-hidden="true" />
        <div className="denoise-tags" aria-hidden="true">
          <span>full-band reference</span>
          <span className="denoise-tag-clean">prediction</span>
        </div>
      </div>
      <figcaption>
        Validation frame from the trained model. Both panels use a{" "}
        <strong>single shared display window</strong>. On this frame the prediction
        measures <strong>SNR 100.95 dB</strong> against 93.76 dB for the
        full-bandwidth reference, and <strong>CNR 60.46 dB</strong> against 53.83 dB:
        the output is quantitatively cleaner than its own training target.
      </figcaption>
    </figure>
  );
}

function Visual({ kind }: { kind: NonNullable<Project["visual"]> }) {
  if (kind === "tracking")
    return (
      <>
        <TrackingHero />
        <TrackingSchematic />
      </>
    );
  if (kind === "scanner") return <ScannerSchematic />;
  if (kind === "spectral")
    return (
      <>
        <SpectralHero />
        <SpectralSchematic />
      </>
    );
  if (kind === "calib") return <CalibSchematic />;
  if (kind === "classify") return <ClassifySchematic />;
  if (kind === "tangos") return <TangosSchematic />;
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
