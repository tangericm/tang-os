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
  ["Focus", "Computational imaging · Real-time systems · Deep learning"],
  ["Stack", "C++ · Python · PyTorch · CUDA / TensorRT · OpenCV"],
  ["Location", "San Jose, California"],
  ["Memory", "8 years of imaging R&D"],
  ["Graphics", "OCT, photoacoustic & visible-light systems"],
  ["Pets", "1 × Frankie (see wallpaper)"],
];

const EXPERIENCE: Array<{ role: string; org: string; when: string; line: string }> = [
  {
    role: "Senior Research Scientist",
    org: "Topcon Healthcare · San Jose, CA",
    when: "2023 – present",
    line: "Real-time image acquisition software (C++, 2 GS/s), physics-informed deep learning for 2× super-resolution and denoising, and edge deployment via ONNX/TensorRT on Jetson — plus scaling a novel compact imaging sensor to production at half the size.",
  },
  {
    role: "Postdoctoral Research Fellow",
    org: "Diagnostic Imaging & Image-Guided Interventions Lab · Nashville, TN",
    when: "2022 – 2023",
    line: "4D surgical-instrument tracking at 99% sensitivity / 23 fps and a multi-scale U-Net denoising framework running at video rate.",
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

export default function AboutWindow({ onClose }: { onClose: () => void }) {
  // A "controlled" tab bar: which tab is showing is just a piece of
  // state, and clicking a tab is just setState. No routing needed.
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <Window title="About This Eric" onClose={onClose}>
      <div className="about">
        <div className="about-avatar" aria-hidden="true">
          ET
        </div>
        <h1 className="about-name">Eric M. Tang, Ph.D.</h1>
        <p className="about-tagline">
          I build imaging systems that see what people can&apos;t — from
          real-time OCT for eye surgery to physics-informed neural networks
          that sharpen what sensors capture.
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
