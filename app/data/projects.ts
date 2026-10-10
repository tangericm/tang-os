/**
 * The project list, kept out of any component because two things read it:
 * the Projects window and the terminal's `ls` / `cat`. One copy means they
 * cannot drift apart.
 *
 * Register aims at a mixed audience: enough method and metric for a technical
 * reader, enough plain language and keywords for a recruiter skimming. Prefer
 * one clear claim and a few numbers over a full methods dump.
 *
 * Tags are the recruiter-facing surface: the skill a reader would search for
 * comes first and the specific tool second ("Object detection (YOLO)", not
 * "YOLOv4"), so a keyword filter and a human skimming both land somewhere.
 * Named tools stay only where the name is the skill — PyTorch, React, MATLAB.
 */

export type Group = "First-author research" | "Built independently" | "Co-authored research" | "Personal projects";

export type Visual =
  | "tracking"
  | "scanner"
  | "denoiser"
  | "denoise"
  | "simulator"
  | "tangos";

export type Project = {
  id: string;
  name: string;
  kind: string;
  group: Group;
  /** which animated explainer belongs to this project */
  visual?: Visual;
  blurb: string;
  tags: string[];
  links: { label: string; href: string }[];
};

/**
 * Section order in the Projects window and the document view. Independent work
 * leads: it is the most recent, it is the code a reader can actually open, and
 * it is the part that is wholly mine. Published research follows, first-author
 * ahead of co-authored.
 */
export const GROUPS: Group[] = [
  "Built independently",
  "First-author research",
  "Co-authored research",
  "Personal projects",
];

/**
 * Order within a group is this array's order, and PROJECTS[0] is what the
 * Projects window selects on open — so the first entry here is the landing
 * impression, not just the first row.
 */
export const PROJECTS: Project[] = [
  {
    id: "denoiser",
    name: "Self-Supervised Image Denoiser",
    kind: "NAFNet · frame-pair supervision",
    group: "Built independently",
    visual: "denoiser",
    blurb:
      "Self-supervised OCT denoising that never sees a clean image during training. Adjacent frames from a normal volume scan form the supervision pair: same anatomy, different speckle, so the network learns to keep structure and suppress noise. Built on NAFNet (27.11M parameters, 77 ms per frame on a native 660 × 1024 B-scan) and trained on 9 volumes / 4416 frames. Against registered multi-frame averages: PSNR 29.5 and SSIM 0.73, up from 12.1 and 0.12 on the noisy input, with speckle contrast down ~20% and fine texture preserved.",
    tags: [
      "Deep learning",
      "PyTorch",
      "Computer vision",
      "Self-supervised learning",
      "Image restoration",
      "Model evaluation",
    ],
    links: [{ label: "GitHub", href: "https://github.com/tangericm/OCT-Denoiser" }],
  },
  {
    id: "simulator",
    name: "Physics-Based OCT Simulator",
    kind: "forward model · synthetic training data",
    group: "Built independently",
    visual: "simulator",
    blurb:
      "Generates realistic retinal scans from optics, so models can be trained where real labeled data is scarce. Each image is built the way the hardware builds it (light source, noise, eye motion, tissue optics), so imaging tradeoffs emerge from the physics instead of being hand-tuned. Every image ships with a pixel-exact map of 13 retinal layers: training-ready ground truth that would otherwise cost an expert hours per scan. Validated against real clinical scans on a matched pixel grid.",
    tags: [
      "Python",
      "Scientific computing",
      "Physics simulation",
      "Synthetic data generation",
      "NumPy / SciPy",
      "Desktop GUI (Qt)",
    ],
    links: [{ label: "GitHub", href: "https://github.com/tangericm/OCT-Simulator" }],
  },
  {
    id: "tracking",
    name: "Real-Time Instrument Tracking & 4D Imaging",
    kind: "YOLOv4 · closed-loop scan control",
    group: "First-author research",
    visual: "tracking",
    blurb:
      "Closed-loop instrument tracking for video-rate 4D OCT imaging. A GPU YOLOv4 detector (OpenCV DNN, CUDA) finds instruments in en face frames and steers the scanners to keep them centered: 16 Hz volumes over a 25 × 25 mm field. Feeding the network a raw frame plus a short-window mean and variance reaches 99.98% mAP at 23 Hz, with localization holding through defocus and motion. Built as a multithreaded C++ pipeline for acquisition, inference, and scan control.",
    tags: [
      "Computer vision",
      "Object detection (YOLO)",
      "C++",
      "GPU acceleration (CUDA)",
      "Real-time systems",
      "Control systems",
    ],
    links: [
      {
        label: "Paper · Biomed. Opt. Express 2022",
        href: "https://pubmed.ncbi.nlm.nih.gov/35414968/",
      },
    ],
  },
  {
    id: "galvo",
    name: "Galvanometer Modeling & Scan Optimization",
    kind: "Gaussian process regression · controls",
    group: "First-author research",
    visual: "scanner",
    blurb:
      "Bayesian optimization of galvanometer PID tuning to cut scan dead time. Settling time is modeled with Gaussian process regression so each measurement goes where the model is least certain, instead of sweeping a full grid. Optimized tunings cut settling time by more than 50%, reclaiming budget for a wider usable field of view and higher SNR and CNR at the same scan rate, on stock controller firmware.",
    tags: [
      "Machine learning",
      "Bayesian optimization",
      "Control systems (PID)",
      "Signal processing",
      "Experimental design",
      "MATLAB",
    ],
    links: [
      {
        label: "Paper · Biomed. Opt. Express 2021",
        href: "https://opg.optica.org/boe/fulltext.cfm?uri=boe-12-11-6701",
      },
    ],
  },
  {
    id: "denoise",
    name: "Real-Time Self-Fusion Denoising",
    kind: "CNN · TorchScript deployment",
    group: "Co-authored research",
    visual: "denoise",
    blurb:
      "Speeding up self-fusion, a registration-based speckle-reduction method, for real-time use. Deformable registration limited the original to 0.42 fps, so a convolutional network was trained to reproduce the fused result from three raw frames and deployed with TorchScript / LibTorch in a C++ GPU pipeline. Inference hits 22 fps (~50× faster), roughly doubling contrast-to-noise over a raw frame and beating simple averaging on CNR and PSNR.",
    tags: [
      "Deep learning",
      "PyTorch",
      "Model deployment",
      "C++",
      "GPU acceleration",
      "Real-time inference",
    ],
    links: [
      {
        label: "Paper · Biomed. Opt. Express 2022",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8973187",
      },
    ],
  },
  {
    id: "optical-design",
    name: "Optical Design",
    kind: "Optiland · tools for AI agents",
    group: "Built independently",
    blurb:
      "An installable optical-design toolkit for AI coding agents. Inspect a lens prescription, calculate imaging limits, optimize supported designs, and generate a visual review with reproducible measurements. Includes a bundled Cooke triplet example, eleven starting lens forms, and workflows for Claude Code, Codex, and Cursor. Portable work uses Optiland; a licensed OpticStudio adapter is optional. Scalar, centered analyses and nominal optimization have explicit limits: a better simulated lens is not proof of manufacturing yield.",
    tags: ["Optical design", "Scientific computing", "Python", "AI agent tools", "Ray tracing"],
    links: [
      { label: "GitHub", href: "https://github.com/tangericm/optical-design" },
      { label: "Install from npm", href: "https://www.npmjs.com/package/optical-design" },
      { label: "Try the walkthrough", href: "https://github.com/tangericm/optical-design/blob/main/docs/quickstart.md" },
    ],
  },
  {
    id: "skillcrit",
    name: "Skillcrit",
    kind: "TypeScript · local CLI",
    group: "Built independently",
    blurb:
      "A local auditor for the instructions AI agents load. Finds structural problems, duplicate instructions, possible conflicts, risky commands, and estimated context costs across skill collections. Reports actionable source locations and supports baselines, recorded dismissals, GitHub annotations, and SARIF. Audits run without an API key, telemetry, or executing discovered scripts. Risk checks are heuristics and context figures are estimates; a clean report is not a safety certification.",
    tags: ["TypeScript", "Developer tools", "Static analysis", "AI agent tools", "CLI design"],
    links: [
      { label: "GitHub", href: "https://github.com/tangericm/skillcrit" },
      { label: "Install from npm", href: "https://www.npmjs.com/package/skillcrit" },
    ],
  },
  {
    id: "recipe-book",
    name: "Eric's Recipe Book",
    kind: "Astro · a personal cooking notebook",
    group: "Personal projects",
    blurb:
      "My cooking notebook, built as a dim sum order card. Browse recipes in English, Chinese, and pinyin; select dishes for a shopping list; then use a guided cooking mode with ingredient checklists, step timers, and saved progress. Recipes live in schema-validated YAML, with source credit and separate cooked, saved, and draft states. A static Astro site with browser-local state, self-hosted fonts, and no account or backend. Mostly Chinese home cooking, with braises, buns, breads, and a cake worked out over time.",
    tags: ["Astro", "TypeScript", "Interaction design", "Accessibility", "Cooking"],
    links: [
      { label: "Open the recipe book", href: "https://erics-kitchen.vercel.app" },
      { label: "GitHub", href: "https://github.com/tangericm/recipe-book" },
    ],
  },
  {
    id: "tangos",
    name: "TangOS",
    kind: "Next.js · this site",
    group: "Personal projects",
    visual: "tangos",
    blurb:
      "Desktop-metaphor portfolio built without a UI component library. Custom window manager with open, minimize, and maximize lifecycles, drag and resize, focus stacking, a dock, document viewer, terminal, and animated SVG explainers. Next.js App Router, React, and TypeScript, with shared design tokens and prefers-reduced-motion support.",
    tags: [
      "TypeScript",
      "React",
      "Next.js",
      "Frontend engineering",
      "UI animation",
      "Web accessibility",
    ],
    links: [{ label: "Source", href: "https://github.com/tangericm/tang-os" }],
  },
];
