/**
 * Who Eric is, kept out of any component because four things read it:
 * the About window, the plain-document mirror, the JSON-LD builder, and
 * (eventually) the terminal. One copy means they cannot drift apart.
 *
 * Same contract as data/projects.ts: identity and prose live here, and
 * components only decide how to draw them.
 */

export const PROFILE = {
  /** the name used everywhere except the resume document, which spells it out */
  name: "Eric M. Tang",
  legalName: "Eric Ming Tang",
  honorific: "Ph.D.",
  jobTitle: "Senior Research Scientist",
  employer: "Topcon Healthcare",
  location: "San Jose, California",
  email: "eric.tang22@gmail.com",
  site: "https://ericmtang.com",
} as const;

/** Profile URLs. The dock, the resume and the structured data all point here. */
export const LINKS = {
  github: "https://github.com/tangericm",
  linkedin: "https://www.linkedin.com/in/eric-tang-a09524ab/",
  scholar: "https://scholar.google.com/citations?user=LV0RaF8AAAAJ",
} as const;

export const TAGLINE =
  "I'm a research scientist who likes building things end-to-end from hardware to real-time software development and machine learning deployment. Outside of work I like to cook, swim, travel, and lift (all to enjoy my favorite hobby: eating).";

/** The "About This Mac" spec sheet. Labels are the parody; values are real. */
export const SPECS: Array<[string, string]> = [
  ["Role", "Senior Research Scientist, Topcon Healthcare"],
  ["Focus", "Image processing · Computer vision · Machine learning"],
  ["Stack", "Python · PyTorch · C++ · OpenCV · MATLAB"],
  ["Location", "San Jose, California"],
  ["Memory", "8 years of software & hardware development"],
  ["Graphics", "Optical coherence tomography · Computational imaging · Photoacoustics"],
];

export type Job = { role: string; org: string; when: string; line: string };

export const EXPERIENCE: Job[] = [
  {
    role: "Senior Research Scientist",
    org: "Topcon Healthcare · San Jose, CA",
    when: "2023 – present",
    line: "Real-time image acquisition software in C++, deep learning for image enhancement (super-resolution and denoising), and bringing those models into real-time use on device, plus collaborating across teams to carry new imaging hardware from prototype toward production.",
  },
  {
    role: "Postdoctoral Research Fellow",
    org: "Diagnostic Imaging & Image-Guided Interventions Lab · Nashville, TN",
    when: "2022 – 2023",
    line: "4D surgical-instrument tracking at 99% sensitivity / 23 fps and a self-fusion denoising network running at video rate.",
  },
  {
    role: "Graduate Research Assistant",
    org: "Vanderbilt University · Nashville, TN",
    when: "2018 – 2022",
    line: "Built and optimized a high-speed multimodal OCT system (C++, 4 GS/s) with GPU-accelerated CNNs and 120 fps YOLOv4 instrument detection.",
  },
];

export type Degree = { degree: string; school: string; year: string };

export const EDUCATION: Degree[] = [
  { degree: "Ph.D., Biomedical Engineering", school: "Vanderbilt University", year: "2022" },
  { degree: "B.S., Biomedical Engineering", school: "Duke University", year: "2018" },
  { degree: "B.A., Computer Science", school: "Duke University", year: "2018" },
];

/**
 * Subject-matter keywords for structured data. Drawn from the resume's
 * skills section, trimmed to the terms that describe a field rather than
 * a tool, which is what schema.org's knowsAbout is for.
 */
export const KNOWS_ABOUT: string[] = [
  "Optical coherence tomography",
  "Computational imaging",
  "Computer vision",
  "Machine learning",
  "Deep learning",
  "Image denoising",
  "Super-resolution",
  "Real-time GPU pipelines",
  "Edge deployment",
  "Object detection and tracking",
  "Photoacoustic imaging",
  "Control systems",
];
