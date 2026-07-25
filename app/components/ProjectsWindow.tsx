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

/* The tracking hero.
   Ten consecutive frames from one acquisition, each frame a composite of
   the surgical microscope view, the en face reflectometry frame and the
   tracked OCT volume, recomposed side by side from the source video. They
   are temporally correlated by construction: every column of the sprite is
   the same instant seen three ways, which is the whole argument. The
   microscope is a top-down 2D view and cannot show what the instrument is
   doing to the tissue underneath; the volume can.

   Stepped with a transform on a 1000%-wide strip rather than an animated
   image format, so prefers-reduced-motion can actually stop it. */
function TrackingHero() {
  return (
    <figure className="denoise-figure">
      <div className="seq" aria-label="Ten consecutive frames showing the microscope view, the en face frame and the tracked OCT volume at the same instants">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="seq-strip"
          src="/track-seq.webp"
          alt="Ten time points of an instrument at the eye surface, each showing the surgical microscope view, the en face reflectometry frame, and the tracked OCT volume rendered from two angles"
          width={5890}
          height={300}
        />
        <div className="seq-labels" aria-hidden="true">
          <span style={{ flex: "300 1 0" }}>microscope</span>
          <span style={{ flex: "75 1 0" }}>en face</span>
          <span className="seq-label-accent" style={{ flex: "206 1 0" }}>tracked OCT volume</span>
        </div>
      </div>
      <figcaption>
        Ten consecutive time points from a single acquisition. Each frame shows the
        same instant three ways, so the panels are correlated rather than merely
        adjacent. The microscope view is top-down and 2D: it cannot show what the
        instrument is doing below the surface, which is what the{" "}
        <strong>tracked volume</strong> resolves.
      </figcaption>
    </figure>
  );
}

/* The spectral denoiser's own before and after, deliberately built in the
   same frame and with the same wipe as the self-fusion hero so the two
   denoising projects are visually comparable.

   This is the full-bandwidth reference against the prediction, which is the
   comparison the reported metrics are actually computed over, so figure and
   number describe the same thing.

   Two rules govern the display, and both matter:

   1. ONE shared window for both frames. Windowing them separately would
      flatter the prediction and make the comparison worthless.
   2. The black point is anchored to the PREDICTION's 1st percentile, not the
      reference's. Anchoring it to the reference put the floor above the
      prediction's noise, crushing 39% of it to pure black. A denoised B-scan
      with no speckle floor at all does not read as an image, it reads as a
      mask, and the earlier version of this figure looked fake for exactly
      that reason. At this anchor the prediction retains its floor (1.0% at
      zero) and, counter-intuitively, reference-to-prediction separation is
      almost unchanged: crushing harder pushes both toward the same black and
      makes the improvement LESS visible, not more.

   Volume is the macula centre acquisition, from the model trained across all
   four datasets at once. */
function SpectralHero() {
  return (
    <figure className="denoise-figure">
      <div className="denoise" aria-label="Full-bandwidth reference resolving into the network prediction">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="denoise-img" src="/spectral-ref.jpg" alt="Full-bandwidth reference reconstruction of a retinal cross-section, speckle throughout and layer boundaries barely separable" width={1100} height={455} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="denoise-img denoise-clean" src="/spectral-pred.jpg" alt="Network prediction of the same frame, speckle suppressed with retinal layers resolved and choroidal vessels visible" width={1100} height={455} />
        <span className="denoise-scan" aria-hidden="true" />
        <div className="denoise-tags" aria-hidden="true">
          <span>full-bandwidth reference</span>
          <span className="denoise-tag-clean">prediction</span>
        </div>
      </div>
      <figcaption>
        Reference against prediction under a{" "}
        <strong>single shared display window</strong>, anchored so the prediction
        keeps its own noise floor: the difference is the model, not the contrast
        setting. <strong>+9.9 dB SNR</strong> and <strong>+5.4 dB CNR</strong> on
        this volume. One model spanning four acquisitions (fovea, macula, optic
        disc, 2048 A-line line scan) holds{" "}
        <strong>+9.5 to +13.8 dB SNR</strong> across all of them, and a run
        dedicated to a single volume reaches <strong>+16.5 dB</strong>.
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
