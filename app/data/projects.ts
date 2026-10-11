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
  details?: string;
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
    kind: "First author · Biomedical Optics Express, 2022",
    group: "Research",
    visual: "tracking",
    blurb:
      "An imaging system that follows a moving instrument and reveals what happens beneath the tissue surface. My first-author research connects real-time detection to scanner control and 3D optical coherence tomography (OCT).",
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
    kind: "First author · Biomedical Optics Express, 2021",
    group: "Research",
    visual: "scanner",
    blurb:
      "Faster scans by reducing the time a scanning mirror needs to settle. My first-author research uses Bayesian optimization to tune the controller, cutting settling time by more than 50% and recovering usable imaging time.",
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
    kind: "Co-author · Biomedical Optics Express, 2022",
    group: "Research",
    visual: "denoise",
    blurb:
      "Cleaner retinal images at video rate. As a co-author, I helped turn a slow image-fusion method into a deployed neural network that processes three frames at 22 fps—about 50 times faster.",
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
    kind: "NAFNet · frame-pair supervision",
    group: "Engineering",
    visual: "denoiser",
    blurb:
      "Clearer retinal scans, without clean training images. This self-directed project learns from neighboring noisy frames to reduce speckle while preserving tissue structure.",
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
    kind: "forward model · synthetic training data",
    group: "Engineering",
    visual: "simulator",
    blurb:
      "Synthetic retinal scans built from light, tissue, and instrument physics. Each scan includes a pixel-level map of 13 retinal layers, making it useful for developing imaging methods when labeled data is scarce.",
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
    kind: "Optiland · tools for AI agents",
    group: "Engineering",
    blurb:
      "A self-directed toolkit that helps AI coding agents inspect, optimize, and review lens designs. Start with a bundled Cooke triplet and get reproducible optical measurements and figures.",
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
    id: "frankie-town",
    name: "Frankie Town",
    kind: "Frankie's Adventure · a playable hobby game",
    group: "Hobbies",
    blurb:
      "A cozy pixel-art adventure starring Frankie, a dog on a birthday-cake quest. Explore the neighborhood and meet its characters in a game made for the joy of building a little world.",
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
    kind: "Astro · a personal cooking notebook",
    group: "Hobbies",
    blurb:
      "My bilingual cooking notebook, styled as a dim sum order card. Pick dishes, make a shopping list, and cook step by step with ingredient checklists, timers, and saved progress.",
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
    kind: "Next.js · this site",
    group: "Hobbies",
    visual: "tangos",
    blurb:
      "The desktop you are browsing: a portfolio built around windows, a dock, a terminal, and a few playful distractions. A personal experiment in making a website feel like an operating system.",
    details:
      "Built with Next.js, React, and TypeScript, without a UI component library. A custom window manager handles dragging, resizing, focus, and minimize/restore states. Shared data powers project links and a readable HTML catalog for visitors without JavaScript.",
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
