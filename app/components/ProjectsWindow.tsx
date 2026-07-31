"use client";

import Window from "./Window";
import SelfFusionSchematic from "./SelfFusionSchematic";
import TrackingSchematic from "./TrackingSchematic";
import ScannerSchematic from "./ScannerSchematic";
import SpeckleSchematic from "./SpeckleSchematic";
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

/* The self-supervised denoiser's own before and after, deliberately built in
   the same frame and with the same wipe as the self-fusion hero so the two
   denoising projects are visually comparable.

   A raw single frame against the model's output on that frame. It is the
   qualitative claim only: the reported PSNR and SSIM are measured elsewhere,
   against registered 64-frame averages held out on the same instrument, and
   the caption states them as the separate measurement they are rather than
   letting them read as scores for this one image.

   Regenerate from the OCT-Denoiser checkout, which owns the one renderer:

     python -m octdenoiser.experiments.render_web_figure
       --ckpt runs/production_nafnet/base64_seed0/nafnet.pt
       --device-b-root <dir> --folder 9mm_1024Aline --base 64
       --col0 130 --col1 910 --row0 60 --row1 560
       --out-prefix <tang-os>/public/denoiser

   The committed JPEGs then get a light display pass (same geometry on both):
   trim ~8% from the top and ~16% from the bottom to clear vitreous-edge
   noise and empty floor, then raise the black point off the vitreous strip
   and apply a mild gamma so the background reads darker without retouching
   the tissue window separately on each frame.

   Two rules govern the display, and both are measured rather than assumed:

   1. ONE shared window for both frames. Windowing them separately would
      flatter the prediction and make the comparison worthless.
   2. The window is anchored to the RAW frame's 1st and 99.5th percentiles, not
      the prediction's. Anchoring on the prediction is the tempting choice --
      it guarantees the prediction keeps a visible noise floor -- but on this
      crop it clips 23% of the RAW frame to pure black, which flatters the
      model by destroying the very detail the comparison is about. Measured on
      this exact frame: anchored to the raw, 0.0% of the prediction is crushed
      and 1.0% of the raw is; anchored to the prediction, 1.0% and 23.0%. The
      raw anchor costs nothing here and cannot be accused of favouring the
      output.

   Source is a held-out repeat stack at 1024 A-lines, cropped to centre the
   fovea and stop short of the optic disc. It is held out of training entirely,
   so the figure shows generalisation rather than recall -- a hero frame cut
   from training data would look identical and mean nothing. */
function DenoiserHero() {
  return (
    <figure className="denoise-figure">
      <div className="denoise-tags" aria-hidden="true">
        <span>raw frame</span>
        <span className="denoise-tag-clean">prediction</span>
      </div>
      <div className="denoise" aria-label="A raw frame resolving into the network prediction">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="denoise-img" src="/denoiser-raw.jpg" alt="Raw single-frame reconstruction of a retinal cross-section, speckle throughout and layer boundaries barely separable" loading="lazy" decoding="async" width={1100} height={455} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="denoise-img denoise-clean" src="/denoiser-pred.jpg" alt="Network prediction of the same frame, speckle suppressed with retinal layers resolved and choroidal vessels visible" loading="lazy" decoding="async" width={1100} height={455} />
        <span className="denoise-scan" aria-hidden="true" />
      </div>
      <figcaption>
        A raw frame against the prediction under a{" "}
        <strong>single shared display window</strong> — taken from the raw frame
        and applied unchanged to both, so the difference is the model and not the
        contrast setting. The frame is from a stack{" "}
        <strong>held out of training entirely</strong>; speckle contrast falls
        18.2% on it while the vessel shadows survive. Measured against five
        registered 64-frame averages held out on the same instrument, over three
        seeds, the model scores{" "}
        <strong>29.518 &plusmn; 0.035 dB PSNR</strong> and{" "}
        <strong>0.7323 SSIM</strong>, against 12.059 dB and 0.1205 for the noisy
        input.
      </figcaption>
    </figure>
  );
}

/* The simulator's own validation: real device B-scans beside simulated ones
   at matched display contrast. This is the only claim that matters for a
   forward model, so it leads the project rather than sitting under the
   schematic.

   The pair is matched 1:1 rather than merely put side by side. The sim runs the
   Maestro3 instrument model, so it reconstructs onto the device's own axial grid
   — 3.870 um per pixel, the same crop — at the same 6 mm field and 1024 A-lines,
   so dx matches too. Both panels are then cut to one physical depth window
   around the detected RPE. Nothing is resampled on either side.

   The simulated panel is put through a display window matched to the device's.
   Raw, the sim reads as noise-dominated, but that is display processing rather
   than physics: measured, the sim background sat at 40-55 where the device sat
   at 0-24.

   One geometric parameter IS calibrated to this frame: scan_distortion_correction,
   the fraction of geometric sag surviving the vendor's distortion correction. The
   simulator treats it as device-specific scan geometry rather than anatomy and its
   own config says to calibrate it per corpus. Its Maestro3 default of 0.86 is a
   corpus average and bows the sim to a 476 um sag; this eye's RPE measures 269 um
   over the 6 mm field, which 0.53 reproduces to 269.5 um — inside one pixel.
   Nothing else is fitted.

   Two other fields were tried and dropped: a 12x9 mm wide field, because the
   fitted shape model only spans +-2.6 mm eccentricity and the macula scene draws
   no disc, so the sim cannot represent that frame at all; and the optic disc,
   because every draw of the parametric ONH gives a deep narrow cup where the
   real one is broad and shallow, and the real disc frames wrap at DC past
   4.3 mm. Regenerated by runs/portfolio_sim_real.py in the simulator repo. */
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
          alt="A real device B-scan on the left beside a simulated one on the right, both a 6 mm foveal cross-section at 1024 A-lines, on the same pixel grid at matched display contrast."
          width={1280}
          height={313}
          loading="lazy"
          decoding="async"
        />
      </div>
      <figcaption>
        A real device acquisition beside a synthetic one: the same 6 mm foveal
        cross-section, 1024 A-lines. The pair is{" "}
        <strong>matched 1:1</strong> — same instrument model, same field, same
        A-line count, and the same 3.870 µm axial pixel, so the panels share a
        pixel grid rather than merely a subject. The two pipelines apply different
        display processing, so the simulated panel is shown through a{" "}
        <strong>display window matched to the device&rsquo;s</strong>, and the scan
        curvature is calibrated to this eye — a device-specific distortion term the
        simulator asks to be set per corpus, here 269.5 µm of sag against a measured
        269 µm. The layer ordering, speckle statistics and depth falloff are not
        fitted: they come out of the forward model, which is the only test a physics
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
  if (kind === "denoiser")
    return (
      <>
        <DenoiserHero />
        <SpeckleSchematic />
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
   (/projects/denoiser). Holding it in local state as well would give two
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
