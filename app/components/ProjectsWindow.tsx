"use client";

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
  /** true while minimized; the window stays mounted but is display:none */
  hidden?: boolean;
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
        <img className="denoise-img" src="/oct-raw.jpg" alt="Raw single-frame retinal cross-section, heavy speckle" loading="lazy" decoding="async" width={1100} height={455} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="denoise-img denoise-clean" src="/oct-clean.jpg" alt="Denoised cross-section, layers and choroid clearly resolved" loading="lazy" decoding="async" width={1100} height={455} />
        <span className="denoise-scan" aria-hidden="true" />
      </div>
    </>
  );
}

/* The tracking hero.
   Thirty consecutive frames from one acquisition, each a composite of
   the surgical microscope view, the en face reflectometry frame and the
   tracked OCT volume, recomposed side by side from the source video. They
   are temporally correlated by construction: every column of the sprite is
   the same instant seen three ways, which is the whole argument. The
   microscope is a top-down 2D view and cannot show what the instrument is
   doing to the tissue underneath; the volume can.

   Thirty frames sampled from a 2.5s window and played back over 2.5s, so the
   motion runs at real speed at 12fps. Only one of the two volume viewpoints
   is kept: the second was another angle on the same instant, and dropping it
   gives the microscope and en face panels the width they need.

   Played by stepping BACKGROUND-POSITION rather than translating an <img>:
   the translated version built a ~16140px-wide layer on desktop, which is at
   the GPU texture ceiling, and the stepping degraded into a smooth slide. See
   the .seq-strip comment in globals.css. Still a CSS animation, so
   prefers-reduced-motion stops it.

   No detector overlay here on purpose. A box localised by differencing each
   frame against the temporal median tracked the wrong thing: the brightest
   moving region is the specular glint on the instrument shaft, not the tool
   tip, so the box sat well off target. A wrong box is worse than none on a
   page whose whole claim is tracking accuracy. Use the real YOLOv4 output
   (media9 / media10, which carry the detector's own magenta boxes) if this
   is wanted later. */
function TrackingHero() {
  return (
    <figure className="denoise-figure">
      <div
        className="seq"
        role="img"
        aria-label="Thirty consecutive frames showing the microscope view, the en face frame, and the tracked OCT volume at the same instants"
      >
        <div className="seq-strip" />
      </div>
      <div className="seq-labels" aria-hidden="true">
        <span style={{ flex: "300 1 0" }}>microscope</span>
        <span style={{ flex: "77 1 0" }}>en face</span>
        <span className="seq-label-accent" style={{ flex: "150 1 0" }}>tracked OCT volume</span>
      </div>
      <figcaption>
        Thirty consecutive time points from one acquisition, each frame the same
        instant three ways, so the panels are correlated rather than merely adjacent.
        The microscope view is top-down and 2D and cannot show what the instrument is
        doing below the surface, which is what the{" "}
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
        <img className="denoise-img" src="/spectral-ref.jpg" alt="Full-bandwidth reference reconstruction of a retinal cross-section, speckle throughout and layer boundaries barely separable" loading="lazy" decoding="async" width={1100} height={455} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="denoise-img denoise-clean" src="/spectral-pred.jpg" alt="Network prediction of the same frame, speckle suppressed with retinal layers resolved and choroidal vessels visible" loading="lazy" decoding="async" width={1100} height={455} />
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
   schematic. Two fields of view, because matching one is luck.

   The simulated panels are put through a display window matched to the
   device's. Raw, the sim reads as noise-dominated, but that is display
   processing rather than physics: measured, the sim background sat at 40-55
   where the device sat at 0-24. The optic disc row was dropped because the
   real frame in it wraps at DC. */
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
          alt="Two rows comparing real device B-scans on the left with simulated B-scans on the right, a 6 mm macula and a 12 by 9 mm wide field, at matched display contrast."
          width={1046}
          height={749}
          loading="lazy"
          decoding="async"
        />
      </div>
      <figcaption>
        Real device acquisitions beside synthetic ones, a 6 mm macula above and a
        12x9 mm wide field below. The two pipelines apply different display
        processing, so the simulated panels are shown through a{" "}
        <strong>display window matched to the device&rsquo;s</strong>; the underlying
        layer ordering, speckle statistics and depth falloff come out of the forward
        model rather than being tuned to match, which is the only test a physics
        simulator can meaningfully pass.
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

/* Controlled by WindowLayer, because the selected project IS the URL now
   (/projects/spectral). Holding it in local state as well would give two
   sources of truth for one fact, and the one that loses is the one a shared
   link restores. */
export default function ProjectsWindow({
  selected,
  onSelect,
  ...props
}: Passthrough & { selected: string; onSelect: (id: string) => void }) {
  const sel = selected;
  /* A project id that survives parseRoute is always real, but a stale link or
     a hand-edited URL can still miss; fall back rather than crash the window. */
  const project = PROJECTS.find((p) => p.id === sel) ?? PROJECTS[0];

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
                  onClick={() => onSelect(p.id)}
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
