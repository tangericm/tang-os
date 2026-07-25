"use client";

import { useState } from "react";
import Window from "./Window";
import SelfFusionSchematic from "./SelfFusionSchematic";
import TrackingSchematic from "./TrackingSchematic";
import ScannerSchematic from "./ScannerSchematic";
import SpectralSchematic from "./SpectralSchematic";
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

/* The tracking hero: one moment, three ways of seeing it. The microscope
   view is what a person sees, the en face view is what the detector is
   given, and the volume is what the tracking buys you. All three come from
   the same row of the same figure, deliberately: the needle is the one
   instrument whose en face view actually shows the tool, and this panel
   claims to be the view the detector works from, so it had better. The
   volume alternates between two real time points, which is what makes the
   fourth dimension something you see rather than something asserted. */
function TrackingHero() {
  return (
    <figure className="denoise-figure">
      <div className="trio">
        <div className="trio-cell trio-wl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/track-wl.jpg" alt="Microscope view of a needle at the surface of an ex vivo porcine eye" width={356} height={400} />
          <span className="trio-label">microscope</span>
        </div>
        <div className="trio-cell trio-ser">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/track-ser.jpg" alt="En face reflectometry image of the same scene, the view the detector is given" width={231} height={400} />
          <span className="trio-label">en face</span>
        </div>
        <div className="trio-cell trio-oct">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/track-oct-a.jpg" alt="Volumetric render of a 30-gauge needle at the corneal surface" width={440} height={440} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="trio-oct-b" src="/track-oct-b.jpg" alt="The same volume moments later, the needle having moved across the surface" width={440} height={440} />
          <span className="trio-label trio-label-accent">4D volume</span>
        </div>
      </div>
      <figcaption>
        One moment in an <strong>ex vivo porcine eye</strong>, three ways: the
        microscope view, the en face image the detector actually works from, and
        the tracked volume. The volume alternates between two real time points, so
        the motion you are watching is the needle&rsquo;s, not an animation.
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
  if (kind === "spectral") return <SpectralSchematic />;
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
