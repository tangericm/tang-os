/**
 * The project list, kept out of any component because two things read it:
 * the Projects window and the terminal's `ls` / `cat`. One copy means they
 * cannot drift apart.
 *
 * Register is deliberately technical. Every entry front-loads the
 * frameworks, architectures, methods and validation metrics a reader (or a
 * keyword filter) would look for, and states numbers rather than
 * describing them.
 */

export type Group = "First-author research" | "Built independently" | "Co-authored research";

export type Visual =
  | "tracking"
  | "scanner"
  | "spectral"
  | "denoise"
  | "calib"
  | "classify"
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

export const GROUPS: Group[] = [
  "First-author research",
  "Built independently",
  "Co-authored research",
];

export const PROJECTS: Project[] = [
  {
    id: "tracking",
    name: "Real-Time Instrument Tracking & 4D Imaging",
    kind: "YOLOv4 · closed-loop scan control",
    group: "First-author research",
    visual: "tracking",
    blurb:
      "Closed-loop instrument tracking for video-rate 4D imaging. A GPU-accelerated YOLOv4 detector (OpenCV DNN, CUDA) localizes instruments in en face frames co-registered with cross-sectional OCT, and drives calibrated galvanometer offsets that re-center the imaging field at a 16 Hz volume rate over 25 x 25 mm. Packing the current frame with a 5-frame running mean and variance into three input channels gave 99.98% mAP, 97% precision, 99% recall, F1 0.98 at 23 Hz. Localization held to the 2.95 px resolution limit through 9 mm defocus and 10 mm/s. Multithreaded C++ acquisition, inference and scan generation.",
    tags: [
      "YOLOv4",
      "CUDA",
      "OpenCV DNN",
      "C++ multithreading",
      "Closed-loop control",
      "Object detection",
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
      "Bayesian optimization of galvanometer controller tuning to recover scan dead time. Settling time was modeled against closed-loop PID parameters using Gaussian process regression, whose posterior variance directs sampling instead of an exhaustive sweep. Optimized tunings cut settling time by over 50% versus factory configurations, and the recovered budget extended the linear scan region, raising field of view, SNR and CNR (p < 0.001) at fixed acquisition rate. Applied entirely through stock controller firmware.",
    tags: [
      "Gaussian process regression",
      "Bayesian optimization",
      "PID tuning",
      "System identification",
      "MATLAB",
      "Signal processing",
    ],
    links: [
      {
        label: "Paper · Biomed. Opt. Express 2021",
        href: "https://opg.optica.org/boe/fulltext.cfm?uri=boe-12-11-6701",
      },
    ],
  },
  {
    id: "spectral",
    name: "Spectral-Split Self-Supervised Denoising",
    kind: "ResUNet · physics-informed learning",
    group: "Built independently",
    visual: "spectral",
    blurb:
      "Self-supervised speckle reduction supervised by image-formation physics: no clean reference, no repeat acquisition. The raw interferogram is split into two Gaussian sub-bands separated by a tunable gap, each reconstructed independently to give two views with identical structure but uncorrelated speckle, with the full-bandwidth reconstruction as target. ResUNet with a pseudo-3D stem convolving across the sub-band axis, 64 to 512 channels over four scales. AdamW, Charbonnier plus gradient-L1, Optuna over window width and gap. One model across four acquisitions holds +9.5 to +13.8 dB SNR and +4.7 to +8.3 dB CNR over the reference; a single-volume run reaches +16.5 dB SNR and +12.3 dB CNR. Mirror-phantom PSF measurement confirms resolution is preserved.",
    tags: [
      "PyTorch",
      "ResUNet",
      "Self-supervised learning",
      "Optuna",
      "Mixed precision",
      "Fourier-domain processing",
    ],
    links: [{ label: "GitHub", href: "https://github.com/tangericm/OCT-Denoiser" }],
  },
  {
    id: "calib",
    name: "Stereo Calibration & 3D Reconstruction",
    kind: "OpenCV · multi-view geometry",
    group: "Built independently",
    visual: "calib",
    blurb:
      "Monocular and stereo calibration carried through to metric 3D reconstruction. Pinhole intrinsics and radial-tangential distortion are estimated from planar checkerboard correspondences, then stereo extrinsics, epipolar rectification and disparity triangulation. RMS reprojection error is reported at every stage and rectification is validated against epipolar alignment. OpenCV, Python, NumPy.",
    tags: [
      "OpenCV",
      "Camera calibration",
      "Epipolar geometry",
      "Triangulation",
      "NumPy",
      "Python",
    ],
    links: [{ label: "GitHub", href: "https://github.com/tangericm" }],
  },
  {
    id: "classify",
    name: "CNN Image Classification Pipeline",
    kind: "PyTorch · training infrastructure",
    group: "Built independently",
    visual: "classify",
    blurb:
      "Reusable supervised classification framework built for reproducibility rather than a single result. Dataset abstraction with stratified splits, configuration-driven augmentation, a registry for interchangeable CNN backbones, and a training loop with checkpointing, early stopping, seed control and per-epoch metric logging. Evaluation reports accuracy, precision, recall and confusion matrices; a small application runs inference from a checkpoint. PyTorch.",
    tags: [
      "PyTorch",
      "CNNs",
      "Transfer learning",
      "Data augmentation",
      "Model evaluation",
      "Python",
    ],
    links: [{ label: "GitHub", href: "https://github.com/tangericm" }],
  },
  {
    id: "tangos",
    name: "TangOS",
    kind: "Next.js · this site",
    group: "Built independently",
    visual: "tangos",
    blurb:
      "Desktop-metaphor portfolio built without a UI framework or component library. Window manager with an explicit per-application lifecycle state machine, pointer-capture drag and resize, true maximize and restore, focus-order z-indexing, a magnifying dock, a document viewer, an interactive terminal, a playable game, and the animated SVG explainers on this page. Next.js App Router, React, TypeScript; centralized design tokens and full prefers-reduced-motion support.",
    tags: [
      "Next.js",
      "React",
      "TypeScript",
      "SVG animation",
      "CSS architecture",
      "Accessibility",
    ],
    links: [{ label: "Source", href: "https://github.com/tangericm/tang-os" }],
  },
  {
    id: "denoise",
    name: "Real-Time Self-Fusion Denoising",
    kind: "CNN · TorchScript deployment",
    group: "Co-authored research",
    visual: "denoise",
    blurb:
      "Neural acceleration of self-fusion, a registration-based speckle-reduction method adapted from multi-atlas label fusion. Deformable registration limits the original to roughly 0.42 fps, so a convolutional encoder-decoder was trained to regress its 7-frame fused output from three raw frames, then serialized with TorchScript and executed from C++ via LibTorch in a GPU acquisition pipeline. Inference reaches about 22 fps, a 50x speedup, roughly doubling contrast-to-noise over a raw frame and beating frame averaging on CNR and PSNR.",
    tags: [
      "PyTorch",
      "LibTorch",
      "TorchScript",
      "C++ / CUDA",
      "Image registration",
      "Real-time inference",
    ],
    links: [
      {
        label: "Paper · Biomed. Opt. Express 2022",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8973187",
      },
    ],
  },
];
