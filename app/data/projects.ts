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
      "Multimodal imaging system for automated instrument tracking and video-rate 4D visualization. A GPU-accelerated YOLOv4 detector (OpenCV DNN, CUDA) localizes 25-gauge instruments in en face spectrally encoded reflectometry frames, inherently co-registered with cross-sectional OCT through a shared swept-source path at a 400 kHz A-scan rate. Detected bounding-box coordinates drive a calibrated galvanometer voltage offset via non-regenerative DAQ buffering, re-centering the imaging field on the instrument at a 16 Hz volume rate across a 25 x 25 mm range. Multi-channel temporal encoding, packing the raw frame with a 5-frame running mean and variance into a single 3-channel input, reached 99.98% mAP, 97% precision, 99% recall and an F1 of 0.98 at 23 Hz inference. Resolution-limited localization accuracy of 2.95 px held across 9 mm of defocus and instrument velocities to 10 mm/s. Acquisition, inference and scan generation implemented as multithreaded C++.",
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
      "System-identification and Bayesian-optimization approach to reducing galvanometer settling time, the dominant source of dead time in point-scanning instruments. Step responses were characterized electronically and optically across scan amplitudes, and settling time was modeled as a function of closed-loop PID controller parameters using Gaussian process regression, which yields a predictive surface with calibrated uncertainty and so directs sampling toward informative parameter combinations. Optimized tunings reduced settling time by over 50% relative to factory configurations. The recovered temporal budget was reinvested in custom scan waveforms, measurably increasing linear field of view, SNR and CNR (p < 0.001) at fixed acquisition rate. All tuning applies through stock controller firmware, requiring no custom electronics.",
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
      "Self-supervised speckle reduction that derives its supervision from image-formation physics, requiring no clean reference and no repeat acquisition. The raw interferogram is DC-subtracted, resampled to linear wavenumber by cubic spline, then decomposed into two Gaussian sub-bands separated by a tunable gap; each is independently reconstructed by IFFT, log-compression and z-score normalization. Because speckle realization depends on the spectral support retained, the two reconstructions share identical structure while carrying statistically independent speckle, and the full-bandwidth reconstruction serves as the training target. A ResUNet with a pseudo-3D input stem, a 3D convolution across the sub-band axis collapsed to 2D features, encodes 64 to 512 channels over four scales using residual blocks, SiLU activations, batch normalization, strided-convolution downsampling and transposed-convolution upsampling with concatenated skips. Trained with AdamW under a composite Charbonnier and gradient-L1 objective under mixed precision, with Optuna search over window width and gap; evaluated by SNR and CNR in the physical domain.",
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
      "Monocular and stereo camera calibration carried through to metric 3D reconstruction. Pinhole intrinsics and radial-tangential distortion coefficients are estimated from planar checkerboard correspondences, followed by stereo extrinsics, epipolar rectification and disparity-based triangulation. Calibration quality is quantified by RMS reprojection error at each stage rather than assumed, and rectification is validated against epipolar alignment. Implemented with OpenCV in Python.",
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
      "Reusable supervised classification framework built for reproducibility rather than a single result. Provides dataset abstraction with stratified splits, configurable augmentation, a registry for interchangeable CNN backbones, and a training loop with checkpointing, early stopping, seed control and per-epoch metric logging. Evaluation reports accuracy, precision, recall and confusion matrices, and a lightweight inference application runs predictions from a saved checkpoint. Implemented in PyTorch.",
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
      "Desktop-metaphor portfolio implemented without a UI framework or component library. Includes a window manager with an explicit per-application lifecycle state machine, pointer-capture drag and resize, true maximize and restore, focus-order z-indexing, dock magnification, a document viewer, an interactive terminal and the animated SVG explainers on this page. Built with the Next.js App Router, React and TypeScript; design tokens are centralized so the theme is a single-file change, and all motion respects prefers-reduced-motion.",
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
      "Neural-network acceleration of self-fusion, a registration-based speckle-reduction method adapted from multi-atlas label fusion. Self-fusion deformably registers a frame's neighbors onto it and fuses them by local patch similarity, suppressing speckle while preserving edges, but symmetric-normalization registration limits throughput to roughly 0.42 fps. A convolutional encoder-decoder is instead trained to regress the 7-frame fused result from three raw adjacent frames, then serialized with TorchScript and executed from C++ through LibTorch inside a GPU-accelerated acquisition pipeline. Inference reaches approximately 22 fps, a 50x speedup over the method it distills, roughly doubling contrast-to-noise relative to a raw frame and outperforming frame averaging on both CNR and PSNR.",
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
