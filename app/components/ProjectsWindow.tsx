"use client";

import Window from "./Window";
import { useState } from "react";
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
 * Peer-reviewed work leads; self-directed engineering and hobbies have
 * separate collections. Stable project URLs restore the right collection.
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
  frontmost?: boolean;
  /** true while minimized; the window stays mounted but is display:none */
  hidden?: boolean;
};

/* A manual reveal compares registered images without altering their pixels. */
function ScanComparison({ raw, processed, label }: { raw: string; processed: string; label: string }) {
  const [rawShare, setRawShare] = useState(50);
  return (
    <>
      <div className="denoise-tags" aria-hidden="true"><span>raw frame</span><span className="denoise-tag-clean">{label}</span></div>
      <div className="denoise denoise-manual" aria-label={`Raw frame compared with ${label}`}>
        <img className="denoise-img" src={raw} alt="Raw retinal cross-section with speckle" loading="lazy" decoding="async" width={1100} height={455} />
        <img className="denoise-img denoise-clean" style={{ clipPath: `inset(0 0 0 ${rawShare}%)` }} src={processed} alt={`${label} of the same retinal cross-section`} loading="lazy" decoding="async" width={1100} height={455} />
        <span className="denoise-divider" style={{ left: `${rawShare}%` }} aria-hidden="true" />
      </div>
      <label className="proj-compare">Compare images <span>{rawShare}% raw</span>
        <input type="range" aria-label={`Raw frame share compared with ${label}`} min="0" max="100" value={rawShare} onChange={(event) => setRawShare(Number(event.target.value))} />
      </label>
    </>
  );
}

function DenoiseHero() {
  return <ScanComparison raw="/oct-raw.jpg" processed="/oct-clean.jpg" label="repeat-average reference" />;
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
function TrackingHero({ paused, onToggle }: { paused: boolean; onToggle: () => void }) {
  return (
    <figure className="denoise-figure">
      <figcaption className="seq-caption-row">
        <span>Synchronized microscope, surface, and 3D tissue views.</span>
        <button className="proj-control seq-control" aria-label={paused ? "Resume sequence" : "Pause sequence"} aria-pressed={paused} onClick={onToggle}>{paused ? "Resume" : "Pause"}</button>
      </figcaption>
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
      <ScanComparison raw="/denoiser-raw.jpg" processed="/denoiser-pred.jpg" label="network prediction" />
      <figcaption>A held-out frame and its prediction, shown with the same contrast settings. The slider changes only which image is visible.</figcaption>
    </figure>
  );
}

/* The simulator's own validation: a real device B-scan beside a simulated one
   at matched display contrast, with the simulated frame's per-pixel layer map
   sweeping over it. This is the only claim that matters for a forward model, so
   it leads the project rather than sitting under the schematic.

   Three separate images on ONE geometry rather than one fused mosaic. The fused
   version could neither stack on a phone nor carry the label overlay; these are
   cropped from the same rows and columns by a single script, so "same pixel
   grid" is true of the delivered files and not just of the analysis.

   The pair is matched 1:1 rather than merely put side by side. The sim runs the
   same instrument model, so it reconstructs onto the device's own axial grid
   — 3.870 um per pixel, the same crop — at the same 6 mm field and 1024 A-lines,
   so dx matches too. Both panels are then cut to one physical depth window
   around the detected RPE. Nothing is resampled before the display resize, and
   the label map is resized NEAREST so an index is never interpolated into a
   layer that is not in the scene.

   The simulated panel is put through a display window matched to the device's.
   Raw, the sim reads as noise-dominated, but that is display processing rather
   than physics: measured, the sim background sat at 40-55 where the device sat
   at 0-24.

   One geometric parameter IS calibrated to this frame: scan_distortion_correction,
   the fraction of geometric sag surviving the vendor's distortion correction. The
   simulator treats it as device-specific scan geometry rather than anatomy and its
   own config says to calibrate it per corpus. Its default of 0.86 is a corpus
   average and bows the sim to a 476 um sag; this eye's RPE measures 269 um over
   the 6 mm field, which 0.53 reproduces to 269.5 um — inside one pixel. Nothing
   else is fitted.

   Two other fields were tried and dropped: a 12x9 mm wide field, because the
   fitted shape model only spans +-2.6 mm eccentricity and the macula scene draws
   no disc, so the sim cannot represent that frame at all; and the optic disc,
   because every draw of the parametric ONH gives a deep narrow cup where the
   real one is broad and shallow, and the real disc frames wrap at DC past
   4.3 mm. Regenerated by runs/portfolio_sim_real_labels.py in the simulator
   repo, which also prints the legend below (names and colours come from the
   simulator's own label vocabulary — it is not a fixed list, an optic-disc
   field inserts a canal layer and shifts every index below it). */
const SIM_LAYERS = [
  ["NFL", "232,178,102", "Nerve fiber layer"],
  ["GCL", "231,146,110", "Ganglion cell layer"],
  ["IPL", "224,120,120", "Inner plexiform layer"],
  ["INL", "208,110,150", "Inner nuclear layer"],
  ["OPL", "180,116,186", "Outer plexiform layer"],
  ["ONL", "146,130,210", "Outer nuclear layer"],
  ["ELM", "116,150,220", "External limiting membrane"],
  ["EZ", "102,176,214", "Ellipsoid zone"],
  ["OS", "100,190,186", "Outer segments"],
  ["IZ", "110,192,146", "Interdigitation zone"],
  ["RPE", "250,206,128", "Retinal pigment epithelium"],
  ["BMCC", "150,168,110", "Bruch membrane and choriocapillaris"],
  ["choroid", "196,110,96", "Choroid"],
];

function SimulatorHero() {
  const [showLabels, setShowLabels] = useState(false);
  return (
    <figure className="denoise-figure">
      <div className="simreal">
        <div className="simreal-cell">
          <span className="simreal-tag">real device</span>
          <div className="simreal-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sim-real-device.jpg"
              alt="A real device B-scan: a 6 mm foveal cross-section, retinal layers and choroid visible under speckle."
              width={720}
              height={353}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>

        <div className="simreal-cell">
          <span className="simreal-tag simreal-tag-accent">
            simulated <span className="simreal-tag-plus">+ layer map</span>
          </span>
          <div className="simreal-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sim-real-sim.jpg"
              alt="The simulated B-scan of the same field on the same pixel grid at matched display contrast."
              width={720}
              height={353}
              loading="lazy"
              decoding="async"
            />
            {/* Initially clipped to zero width: lazy loading can leave this
                unrequested even while the wipe moves across the scan. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={`simreal-labels ${showLabels ? "simreal-labels-visible" : "simreal-labels-hidden"}`}
              src="/sim-real-labels.png"
              alt=""
              aria-hidden="true"
              width={720}
              height={353}
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
      </div>

      <button className="proj-control" aria-pressed={showLabels} onClick={() => setShowLabels(!showLabels)}>{showLabels ? "Hide retinal layer map" : "Show retinal layer map"}</button>
      <ul className="simreal-legend" aria-label="Layers labelled in every simulated frame">
        {SIM_LAYERS.map(([name, rgb, fullName]) => (
          <li key={name}>
            <span className="simreal-swatch" style={{ background: `rgb(${rgb})` }} aria-hidden="true" />
            <abbr title={fullName} aria-label={fullName}>{name}</abbr>
          </li>
        ))}
      </ul>

      <figcaption>Real and simulated scans on a matched pixel grid and display contrast. Toggle the 13-layer map to inspect the synthetic labels. Scan curvature was calibrated to this eye.</figcaption>
    </figure>
  );
}

function Visual({ kind, paused, onToggle }: { kind: NonNullable<Project["visual"]>; paused: boolean; onToggle: () => void }) {
  if (kind === "tracking")
    return (
      <>
        <TrackingHero paused={paused} onToggle={onToggle} />
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
        <p className="proj-figure-label">Raw vs repeat-average reference</p>
        <DenoiseHero />
        <figcaption>
          Raw frame and a registered 50-frame repeat average of my own retinal data. This is a reference comparison, not the self-fusion network's output.
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
  /* A project id that survives parseRoute is always real, but a stale link or
     a hand-edited URL can still miss; fall back rather than crash the window. */
  const project = PROJECTS.find((p) => p.id === selected) ?? PROJECTS[0];

  const visibleProjects = PROJECTS.filter((p) => p.group === project.group);
  const [paused, setPaused] = useState(false);

  return (
    <Window title="Projects" frameClassName="window-projects" {...props}>
      <div className="proj-toolbar">
        <div className="proj-collections" role="group" aria-label="Project collections">
          {GROUPS.map((group) => (
            <button key={group} aria-pressed={group === project.group} onClick={() => {
              if (group !== project.group) onSelect(PROJECTS.find((p) => p.group === group)!.id);
            }}>
              {group}
            </button>
          ))}
        </div>
        <span className="proj-count">{project.group === "Research" ? "Peer-reviewed" : project.group === "Engineering" ? "Self-directed" : "Personal interests"} · {visibleProjects.length} projects</span>
        <select className="proj-picker" aria-label="Choose a project" value={project.id} onChange={(event) => onSelect(event.target.value)}>
          {visibleProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="projects">
        <nav className="proj-sidebar" aria-label="Projects">
          <h2 className="proj-group-title">{project.group}</h2>
          {visibleProjects.map((p) => (
            <button key={p.id} className={p.id === project.id ? "proj-item proj-item-active" : "proj-item"} onClick={() => onSelect(p.id)} aria-current={p.id === project.id}>
              <span className="proj-item-name">{p.name}</span>
              <span className="proj-item-kind">{p.kind}</span>
            </button>
          ))}
        </nav>

        <div className="proj-detail" key={project.id}>
          <header className="proj-heading">
            <h2 className="proj-title">{project.name}</h2>
            <p className="proj-kind">{project.kind}</p>
            <p className="proj-blurb">{project.blurb}</p>
            <div className="proj-links">
              {project.links.map((link) => (
                <a className="pill-link" key={link.href} href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
              ))}
            </div>
          </header>
          {project.visual && (
            <>
              <div className={`proj-hero ${paused ? "proj-motion-paused" : ""}`}><Visual kind={project.visual} paused={paused} onToggle={() => setPaused(!paused)} /></div>
            </>
          )}
          {project.id === "optical-design" && (
            <figure className="proj-artifact">
              <img src="/optical-design-cooke.webp" width={1440} height={1216} alt="Reproducible Cooke triplet ray layout and spot diagrams from Optical Design's bundled lens example" loading="lazy" decoding="async" />
              <figcaption>A real ray trace of the bundled Cooke triplet, with field-dependent spot diagrams against the Airy disk. Reproduce it with the repository's render-example.py script.</figcaption>
            </figure>
          )}
          {project.id === "frankie-town" && (
            <figure className="proj-artifact proj-pixel-art">
              <img src="https://frankie-town.vercel.app/assets/title/title-hero.png" width={400} height={300} alt="Frankie Town's pixel-art neighborhood, with a bakery and colorful storefronts" loading="lazy" decoding="async" />
              <figcaption>Title art from the playable Frankie's Adventure. A hobby game in progress.</figcaption>
            </figure>
          )}
          {project.id === "recipe-book" && (
            <figure className="proj-artifact">
              <img src="/recipe-book.webp" width={1200} height={900} alt="Eric's Recipe Book: bilingual recipe order card with cooked and draft states, and a meal-planning panel" loading="lazy" decoding="async" />
              <figcaption>My own cooking notebook. Pick dishes on the order card, make a shopping list, and open a recipe to cook one step at a time.</figcaption>
            </figure>
          )}
          {project.details && <details className="proj-technical"><summary>Technical details</summary><p>{project.details}</p></details>}
          <div className="proj-tags">
            {project.tags.map((tag) => <span className="proj-tag" key={tag}>{tag}</span>)}
          </div>
        </div>
      </div>
    </Window>
  );
}
