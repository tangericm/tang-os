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
      "Closed-loop instrument tracking for video-rate 4D imaging. A GPU YOLOv4 detector (OpenCV DNN, CUDA) localizes instruments in en face frames co-registered with cross-sectional OCT and drives galvanometer offsets that re-center the field at 16 Hz volumes over 25 x 25 mm. Packing the current frame with a 5-frame running mean and variance into three channels: 99.98% mAP, F1 0.98, 23 Hz. Localization holds to the 2.95 px resolution limit through 9 mm defocus and 10 mm/s. Multithreaded C++ acquisition, inference and scan generation.",
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
      "Bayesian optimization of galvanometer tuning to recover scan dead time. Settling time is modeled against closed-loop PID parameters by Gaussian process regression, whose posterior variance directs sampling instead of an exhaustive sweep. Optimized tunings cut settling time by over 50%, and the recovered budget extends the linear scan region, raising field of view, SNR and CNR (p < 0.001) at fixed rate. Stock controller firmware throughout.",
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
    id: "denoiser",
    name: "Self-Supervised Image Denoiser",
    kind: "NAFNet · frame-pair supervision",
    group: "Built independently",
    visual: "denoiser",
    blurb:
      "Self-supervised image denoising with no clean reference anywhere in training. Supervision is a frame pair — two full-bandwidth reconstructions of one retinal position, taken from adjacent frames of an ordinary volume scan — so the structure is shared (0.958) while the speckle is independent (+0.017), and neither view is contained in the other. That last property is what an earlier spectral-split design lacked, and measuring it is what replaced it. NAFNet at base width 64, 27.11M parameters, 22.4 ms per frame. Trained on 9 volumes / 4416 frames, dispersion compensated, split into contiguous blocks, with early stopping and checkpoint selection driven by validation and never by the reported metric. Scored against five registered 64-frame averages on the same instrument over three seeds: PSNR 29.518 ± 0.035, SSIM 0.7323, against 12.059 and 0.1205 for the noisy input. Speckle contrast falls 19-22% with choroidal texture intact, so the gain is not blur.",
    tags: [
      "PyTorch",
      "NAFNet",
      "Self-supervised learning",
      "Image denoising",
      "Image registration",
      "Fourier-domain processing",
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
      "A forward model that generates OCT from physics rather than augmenting existing scans, built as the data backbone for training in sparse-data regimes. Each A-scan is synthesized as an interferometric spectrum, I(k) = P(k)·|a_ref + sum r·exp(i2kz)|², then DC-removed, windowed and inverse-transformed exactly as real hardware reconstructs it. Source bandwidth, sensitivity falloff, dispersion, integration time, correlated eye motion, shot/RIN/read noise and wavelength-dependent tissue optics are all modeled, so the speed-versus-SNR tradeoff emerges rather than being scripted. Every sample ships a per-pixel layer map, giving free ground truth for segmentation and denoising.",
    tags: [
      "Forward modeling",
      "Fourier optics",
      "Synthetic data",
      "NumPy",
      "PySide6",
      "Python",
    ],
    links: [{ label: "GitHub", href: "https://github.com/tangericm/OCT-Simulator" }],
  },
  {
    id: "tangos",
    name: "TangOS",
    kind: "Next.js · this site",
    group: "Built independently",
    visual: "tangos",
    blurb:
      "Desktop-metaphor portfolio with no UI framework or component library. Window manager with a per-application lifecycle state machine, pointer-capture drag and resize, true maximize and restore, focus-order z-indexing, a magnifying dock, a document viewer, an interactive terminal, a dinosaur runner, and the animated SVG explainers on this page. Next.js App Router, React, TypeScript; centralized design tokens and full prefers-reduced-motion support.",
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
      "Neural acceleration of self-fusion, a registration-based speckle-reduction method adapted from multi-atlas label fusion. Deformable registration caps the original at 0.42 fps, so a convolutional encoder-decoder was trained to regress its 7-frame fused output from three raw frames, serialized with TorchScript and run from C++ via LibTorch in a GPU acquisition pipeline. Inference reaches 22 fps, a 50x speedup, roughly doubling contrast-to-noise over a raw frame and beating frame averaging on CNR and PSNR.",
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
