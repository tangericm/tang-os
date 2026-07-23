"use client";

import { useState } from "react";
import Window from "./Window";

/**
 * AboutWindow — a loving parody of macOS's "About This Mac",
 * except the hardware being described is Eric.
 *
 * All the CONTENT lives in plain data constants below; the JSX just
 * renders whichever tab is active. Changing your bio never means
 * touching component logic — edit the data, done.
 */

const TABS = ["Overview", "Experience", "Education"] as const;
type Tab = (typeof TABS)[number];

const SPECS: Array<[string, string]> = [
  ["Role", "Senior Research Scientist, Topcon Healthcare"],
  ["Focus", "Image processing · Computer vision · Machine learning"],
  ["Stack", "Python · PyTorch · C++ · OpenCV · MATLAB"],
  ["Location", "San Jose, California"],
  ["Memory", "8 years of software & hardware development"],
  ["Graphics", "Optical coherence tomography · Computational imaging · Photoacoustics"],
  ["Pets", "1 × Frankie (see wallpaper)"],
];

const EXPERIENCE: Array<{ role: string; org: string; when: string; line: string }> = [
  {
    role: "Senior Research Scientist",
    org: "Topcon Healthcare · San Jose, CA",
    when: "2023 – present",
    line: "Real-time image acquisition software in C++, deep learning for image enhancement (super-resolution and denoising), and bringing those models into real-time use on device — plus collaborating across teams to carry new imaging hardware from prototype toward production.",
  },
  {
    role: "Postdoctoral Research Fellow",
    org: "Diagnostic Imaging & Image-Guided Interventions Lab · Nashville, TN",
    when: "2022 – 2023",
    line: "4D surgical-instrument tracking at 99% sensitivity / 23 fps and a U-Net denoising framework running at video rate.",
  },
  {
    role: "Graduate Research Assistant",
    org: "Vanderbilt University · Nashville, TN",
    when: "2018 – 2022",
    line: "Built and optimized a high-speed multimodal OCT system (C++, 4 GS/s) with GPU-accelerated CNNs and 120 fps YOLOv4 instrument detection.",
  },
];

const EDUCATION: Array<{ degree: string; school: string; year: string }> = [
  { degree: "Ph.D., Biomedical Engineering", school: "Vanderbilt University", year: "2022" },
  { degree: "B.S., Biomedical Engineering", school: "Duke University", year: "2018" },
  { degree: "B.A., Computer Science", school: "Duke University", year: "2018" },
];

const LINKS: Array<{ label: string; href: string }> = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/eric-tang-a09524ab/" },
  { label: "Google Scholar", href: "https://scholar.google.com/citations?user=LV0RaF8AAAAJ" },
  { label: "Email", href: "mailto:eric.tang22@gmail.com" },
];

export default function AboutWindow({
  onClose,
  onMinimize,
}: {
  onClose: () => void;
  onMinimize: () => void;
}) {
  // A "controlled" tab bar: which tab is showing is just a piece of
  // state, and clicking a tab is just setState. No routing needed.
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <Window title="About Me" onClose={onClose} onMinimize={onMinimize}>
      <div className="about">
        <div className="about-avatar" aria-hidden="true">
          ET
        </div>
        <h1 className="about-name">Eric M. Tang, Ph.D.</h1>
        <p className="about-tagline">
          I&apos;m a research scientist who likes building things end-to-end from hardware 
          to real-time software development and machine learning deployment. Outside of work I like 
          to cook, ski, swim, travel, and lift (all to enjoy my favorite hobby: eating).
        </p>

        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? "tab tab-active" : "tab"}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" && (
          <dl className="specs">
            {SPECS.map(([label, value]) => (
              <div className="spec-row" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}

        {tab === "Experience" && (
          <ul className="xp">
            {EXPERIENCE.map((job) => (
              <li className="xp-item" key={job.role}>
                <div className="xp-head">
                  <strong>{job.role}</strong>
                  <span className="xp-when">{job.when}</span>
                </div>
                <div className="xp-org">{job.org}</div>
                <p className="xp-line">{job.line}</p>
              </li>
            ))}
          </ul>
        )}

        {tab === "Education" && (
          <ul className="edu">
            {EDUCATION.map((e) => (
              <li className="edu-item" key={e.degree}>
                <strong>{e.degree}</strong>
                <span className="edu-school">{e.school}</span>
                <span className="edu-year">{e.year}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="about-links">
          {LINKS.map((l) => (
            <a className="pill" key={l.label} href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </Window>
  );
}
