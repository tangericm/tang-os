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

export const GROUPS = ["Research", "Engineering", "Hobbies"] as const;
export type Group = (typeof GROUPS)[number];

export type Visual =
  | "tracking"
  | "scanner"
  | "denoiser"
  | "denoise"
  | "simulator";

export type Project = {
  id: string;
  name: string;
  kind: string;
  group: Group;
  /** which animated explainer belongs to this project */
  visual?: Visual;
  blurb: string;
  details?: string;
  workflow?: { title: string; text: string }[];
  figures?: { src: string; width: number; height: number; alt: string; caption: string }[];
  tags: string[];
  links: { label: string; href: string }[];
};

/**
 * Order within a group is this array's order, and PROJECTS[0] is what the
 * Projects window selects on open — so the first entry here is the landing
 * impression, not just the first row.
 */
export const PROJECTS: Project[] = [
  {
    id: "tracking",
    name: "Real-Time Instrument Tracking & 4D Imaging",
    kind: "First author · Peer-reviewed research, 2022",
    group: "Research",
    visual: "tracking",
    blurb:
      "An imaging system that tracks moving instruments in real time and reveals what happens beneath the tissue surface in 3D.",
    details:
      "First author · Biomedical Optics Express, 2022. A multithreaded C++ pipeline combines acquisition, OpenCV DNN/CUDA detection, and scan control. Raw, mean, and variance frames feed YOLOv4: 99.98% mAP at 23 Hz, with 16 Hz volumes over a 25 × 25 mm field. See the paper for experimental conditions.",
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
    kind: "First author · Peer-reviewed research, 2021",
    group: "Research",
    visual: "scanner",
    blurb:
      "Faster scans through better mirror control. Bayesian optimization cuts settling time by more than 50%, recovering usable imaging time.",
    details:
      "First author · Biomedical Optics Express, 2021. Gaussian process regression models settling time over PID settings and guides the next measurement. The optimized scan uses the recovered time for a wider linear sweep, improving field of view and image quality on stock controller firmware.",
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
    kind: "Co-author · Peer-reviewed research, 2022",
    group: "Research",
    visual: "denoise",
    blurb:
      "Cleaner retinal images at video rate. A deployed neural network processes three frames at 22 fps, about 50 times faster than image fusion.",
    details:
      "Co-author · Biomedical Optics Express, 2022. A CNN learns to approximate a registration-based self-fusion target, replacing a 0.42 fps process. TorchScript/LibTorch deploys it in a C++ GPU pipeline. Contrast-to-noise roughly doubles over a raw frame; CNR and PSNR improve over simple averaging. The displayed figure is a repeat-average reference, not the network output.",
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
    id: "denoiser",
    name: "Self-Supervised Image Denoiser",
    kind: "Self-directed · Learning from noisy images",
    group: "Engineering",
    visual: "denoiser",
    blurb:
      "Clearer retinal scans without clean training images. A neural network learns from neighboring noisy frames to reduce speckle while preserving tissue structure.",
    details:
      "Adjacent scan frames supply similar anatomy with different speckle. A NAFNet model has 27.11M parameters and takes 77 ms per native 660 × 1024 frame. Training used 9 volumes / 4,416 frames. Evaluation against registered repeat averages: PSNR 29.5 dB and SSIM 0.73, versus 12.1 dB and 0.12 for noisy input. These are research results, not clinical validation.",
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
    kind: "Self-directed · Synthetic retinal scans",
    group: "Engineering",
    visual: "simulator",
    blurb:
      "Synthetic retinal scans built from light, tissue, and instrument physics, with pixel-level labels for 13 retinal layers.",
    details:
      "The forward model includes source characteristics, noise, eye motion, and tissue optics. The displayed real/synthetic comparison uses a matched 6 mm field, pixel grid, and display contrast. Scan curvature was calibrated to that eye; this is one illustrative comparison, not validation across every anatomy or instrument.",
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
    id: "optical-design",
    name: "Optical Design",
    kind: "Self-directed · AI tools for lens design",
    group: "Engineering",
    blurb:
      "Tools for AI coding agents to inspect and optimize lens designs, with reproducible ray traces and a bundled Cooke triplet example.",
    details:
      "Portable workflows use Optiland; licensed OpticStudio support is optional. The toolkit includes eleven starting lens forms and workflows for Claude Code, Codex, and Cursor. Scalar, centered analyses and nominal optimization have explicit limits: an improved simulated lens does not establish manufacturing yield.",
    tags: ["Optical design", "Scientific computing", "Python", "AI agent tools", "Ray tracing"],
    links: [
      { label: "GitHub", href: "https://github.com/tangericm/optical-design" },
      { label: "Install from npm", href: "https://www.npmjs.com/package/optical-design" },
      { label: "Try the walkthrough", href: "https://github.com/tangericm/optical-design/blob/main/docs/quickstart.md" },
    ],
  },
  {
    id: "rawforge",
    name: "RAWForge",
    kind: "Self-directed · iPhone RAW capture instrument",
    group: "Engineering",
    blurb:
      "An iPhone app for repeatable RAW capture. Define exposure recipes, capture undemosaiced Bayer frames, and keep the settings and motion record beside every Take.",
    details:
      "In production hardening. SwiftUI and AVFoundation execute versioned Recipes across physical cameras, with Burst or Sequential firing. Requested exposure, device readback, photo metadata, and DNG tags provide four witnesses to achieved exposure. A Take is banked completely or discarded; earlier Takes survive a failure. iPhone 15 Pro measurements establish 12 MP Bayer output, requests of up to eight bracketed frames, and a 100 Hz motion stream. These are device-specific findings, not a guarantee for every iPhone. DNGs and capture records export together from app-local storage.",
    workflow: [
      { title: "Define a Recipe", text: "Choose a camera, shutter and ISO values, and Burst or Sequential firing for each ordered Step." },
      { title: "Capture a Take", text: "Run every Step at one pose. Record exposure, focus, timing and motion; bank the complete Take or discard it." },
      { title: "Export the Run", text: "Transfer DNGs with the Recipe snapshot and capture records so later analysis can trace how each frame was made." },
    ],
    figures: [
      { src: "/rawforge-recipe.webp", width: 480, height: 1044, alt: "RAWForge Recipe editor showing a single frame followed by a 16-frame Burst repeat, each with explicit shutter and ISO settings", caption: "Author an ordered Recipe: one frame, then a 16-frame repeat. Simulator UI, September 5, 2026." },
      { src: "/rawforge-shoot.webp", width: 480, height: 1044, alt: "RAWForge Shoot screen with the selected Recipe, focus control, time and storage estimates, Capture action, and Shoot and Library tabs", caption: "Review the Recipe, focus and capture. The simulator viewfinder is idle; this is interface evidence, not a RAW capture." },
    ],
    tags: ["Swift", "SwiftUI", "AVFoundation", "Camera systems", "RAW imaging", "Sensor characterization"],
    links: [
      { label: "GitHub", href: "https://github.com/tangericm/RAWForge" },
      { label: "Capture findings", href: "https://github.com/tangericm/RAWForge#what-the-sensors-actually-do" },
    ],
  },
  {
    id: "frankie-town",
    name: "Frankie Town",
    kind: "Frankie's Adventure · a playable hobby game",
    group: "Hobbies",
    blurb:
      "A cozy pixel-art adventure about a dog on a birthday-cake quest. Explore the neighborhood, meet its characters, and solve puzzles.",
    details:
      "Built with Phaser 4, TypeScript, and Vite. Keyboard, mouse, and touch controls support neighborhood puzzles, while browser-local saves preserve progress. The public game is titled Frankie's Adventure.",
    tags: ["Phaser", "TypeScript", "Game design", "Pixel art"],
    links: [
      { label: "Play Frankie Town", href: "https://frankie-town.vercel.app" },
      { label: "GitHub", href: "https://github.com/tangericm/frankie-town" },
    ],
  },
  {
    id: "recipe-book",
    name: "Eric's Recipe Book",
    kind: "Personal · Bilingual cooking notebook",
    group: "Hobbies",
    blurb:
      "A bilingual cooking notebook styled as a dim sum order card, with shopping lists, step-by-step recipes, timers, and saved progress.",
    details:
      "Recipes are schema-validated YAML with source credit and honest cooked, saved, and draft states. This static Astro app stores progress in your browser, without an account or backend. Browser timers and wake lock have device-dependent limits.",
    tags: ["Astro", "TypeScript", "Interaction design", "Accessibility", "Cooking"],
    links: [
      { label: "Open the recipe book", href: "https://erics-kitchen.vercel.app" },
      { label: "GitHub", href: "https://github.com/tangericm/recipe-book" },
    ],
  },
  {
    id: "tangos",
    name: "TangOS",
    kind: "Personal · This portfolio",
    group: "Hobbies",
    blurb:
      "A playful desktop you can explore as a portfolio: move windows, launch projects from the dock, or browse the same work through a working terminal.",
    details:
      "Built with Next.js, React, and TypeScript, without a UI component library. The window manager preserves position, size and terminal history across navigation. Project URLs open the right collection and detail pane, with browser Back and Forward support. The same project data supplies the desktop, terminal, metadata and server-rendered HTML catalog, so visitors without JavaScript can still read the work. A custom stylesheet provides the warm dark palette, keyboard focus and reduced-motion behavior.",
    workflow: [
      { title: "Open a project URL", text: "A link selects the project and its collection. Back and Forward restore the selection without resetting the desktop." },
      { title: "Read one shared catalog", text: "Project descriptions and links live in one TypeScript data module, shared by the windows and terminal." },
      { title: "Render for each visitor", text: "JavaScript adds the desktop interactions. Server-rendered HTML keeps the same work readable without scripting and indexable by search engines." },
    ],
    figures: [
      { src: "/tangos-desktop.webp", width: 1280, height: 720, alt: "TangOS desktop with the About Me window, document shortcuts, and dock for Projects, Resume, Terminal and Runner", caption: "The actual TangOS desktop. Familiar window controls and a dock turn the portfolio into a place to explore." },
    ],
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
