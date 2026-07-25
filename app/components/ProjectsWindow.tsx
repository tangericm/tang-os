"use client";

import { useState } from "react";
import Window from "./Window";
import SelfFusionSchematic from "./SelfFusionSchematic";
import TrackingSchematic from "./TrackingSchematic";
import ScannerSchematic from "./ScannerSchematic";
import SpectralSchematic from "./SpectralSchematic";
import SimulatorSchematic from "./SimulatorSchematic";
import { TangosSchematic } from "./MiniSchematics";
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
    <>
      <div className="denoise-tags" aria-hidden="true">
        <span>raw</span>
        <span className="denoise-tag-clean">denoised</span>
      </div>
      <div className="denoise" aria-label="A real noisy scan resolving into a denoised one">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="denoise-img" src="/oct-raw.jpg" alt="Raw single-frame retinal cross-section, heavy speckle" width={1100} height={455} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="denoise-img denoise-clean" src="/oct-clean.jpg" alt="Denoised cross-section, layers and choroid clearly resolved" width={1100} height={455} />
        <span className="denoise-scan" aria-hidden="true" />
      </div>
    </>
  );
}

/* The tracking hero.
   Twenty-four consecutive frames from one acquisition, each a composite of
   the surgical microscope view, the en face reflectometry frame and the
   tracked OCT volume, recomposed side by side from the source video. They
   are temporally correlated by construction: every column of the sprite is
   the same instant seen three ways, which is the whole argument. The
   microscope is a top-down 2D view and cannot show what the instrument is
   doing to the tissue underneath; the volume can.

   Twenty-four frames sampled over an eight-second window: ten frames spread
   across the whole clip read as a slideshow, because smoothness comes from
   how little moves between frames, not from playback rate alone.

   Stepped with a transform on a 2400%-wide strip rather than an animated
   image format, so prefers-reduced-motion can actually stop it. */
function TrackingHero() {
  return (
    <figure className="denoise-figure">
      <div className="seq" aria-label="Twenty-four consecutive frames showing the microscope view, the en face frame and the tracked OCT volume at the same instants">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="seq-strip"
          src="/track-seq.webp"
          alt="Twenty-four consecutive time points of an instrument at the eye surface, each showing the surgical microscope view, the en face reflectometry frame, and the tracked OCT volume"
          width={14136}
          height={300}
        />
      </div>
      <div className="seq-labels" aria-hidden="true">
        <span style={{ flex: "300 1 0" }}>microscope</span>
        <span style={{ flex: "77 1 0" }}>en face</span>
        <span className="seq-label-accent" style={{ flex: "212 1 0" }}>tracked OCT volume</span>
      </div>
      <figcaption>
        Twenty-four consecutive time points from one acquisition, each frame the same
        instant three ways, so the panels are correlated rather than merely adjacent.
        The microscope view is top-down and 2D and cannot show what the instrument is
        doing below the surface, which is what the <strong>tracked volume</strong>
        resolves.
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

   Volume is the 2048 A-line line scan, chosen because at 1024 columns the
   crop was already at maximum field for this aspect, so zooming out required
   a wider source. Framing is matched to the self-fusion hero (retina band at
   the same height and scale) so the two denoising results read as directly
   comparable. A shared gamma of 1.5 rides on top of the shared window; it is
   applied identically to both frames. */
function SpectralHero() {
  return (
    <figure className="denoise-figure">
      <div className="denoise-tags" aria-hidden="true">
        <span>full-bandwidth reference</span>
        <span className="denoise-tag-clean">prediction</span>
      </div>
      <div className="denoise" aria-label="Full-bandwidth reference resolving into the network prediction">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="denoise-img" src="/spectral-ref.jpg" alt="Full-bandwidth reference reconstruction of a retinal cross-section, speckle throughout and layer boundaries barely separable" width={1100} height={455} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="denoise-img denoise-clean" src="/spectral-pred.jpg" alt="Network prediction of the same frame, speckle suppressed with retinal layers resolved and choroidal vessels visible" width={1100} height={455} />
        <span className="denoise-scan" aria-hidden="true" />
      </div>
      <figcaption>
        Reference against prediction under a{" "}
        <strong>single shared display window</strong>, anchored so the prediction
        keeps its own noise floor: the difference is the model, not the contrast
        setting. <strong>+13.7 dB SNR</strong> and <strong>+8.3 dB CNR</strong> on
        this volume. One model spanning four acquisitions holds{" "}
        <strong>+9.5 to +13.8 dB SNR</strong> across all of them, and a run
        dedicated to a single volume reaches <strong>+16.5 dB</strong>.
      </figcaption>
    </figure>
  );
}

/* The simulator's own validation: real device B-scans beside simulated ones
   at matched display contrast. This is the only claim that matters for a
   forward model, so it leads the project rather than sitting under the
   schematic. Two anatomies, because matching one is luck. */
function SimulatorHero() {
  return (
    <figure className="denoise-figure">
      <div className="simreal">
        <div className="simreal-tags" aria-hidden="true">
          <span>real device</span>
          <span className="simreal-tag-accent">simulated</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sim-real.jpg"
          alt="Two rows comparing real device B-scans on the left with simulated B-scans on the right, a macula and an optic disc, at matched display contrast."
          width={1046}
          height={750}
          loading="lazy"
          decoding="async"
        />
      </div>
      <figcaption>
        Real device acquisitions beside synthetic ones at{" "}
        <strong>matched display contrast</strong>, macula above and optic disc
        below. Layer ordering, speckle statistics and depth falloff come out of the
        forward model rather than being tuned to match, which is the only test a
        physics simulator can meaningfully pass.
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
  if (kind === "simulator")
    return (
      <>
        <SimulatorHero />
        <SimulatorSchematic />
      </>
    );
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
