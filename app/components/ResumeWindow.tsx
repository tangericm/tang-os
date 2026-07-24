"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import Window from "./Window";

/**
 * ResumeWindow — a pseudo-document viewer, like opening a file in a
 * word processor: toolbar up top, white page below, downloads always
 * one click away (no gates — every field between a recruiter and a
 * PDF costs real downloads; Vercel Analytics counts them instead).
 *
 * The page is real HTML, not an image: selectable, searchable,
 * crawlable, and always razor-sharp regardless of zoom.
 */

type Passthrough = {
  onClose: () => void;
  onMinimize: () => void;
  motion?: "minimizing" | "closing";
  zIndex?: number;
  onFocus?: () => void;
};

const ZOOMS = [0.85, 1, 1.15, 1.3];

export default function ResumeWindow(props: Passthrough) {
  const [zoom, setZoom] = useState(1); // index 1 of ZOOMS
  const zoomIdx = ZOOMS.indexOf(zoom);

  return (
    <Window title="Tang-Eric-Resume" frameClassName="window-doc" {...props}>
      <div className="doc">
        <div className="doc-toolbar">
          <div className="doc-zoom">
            <button
              aria-label="Zoom out"
              disabled={zoomIdx === 0}
              onClick={() => setZoom(ZOOMS[zoomIdx - 1])}
            >
              −
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              aria-label="Zoom in"
              disabled={zoomIdx === ZOOMS.length - 1}
              onClick={() => setZoom(ZOOMS[zoomIdx + 1])}
            >
              +
            </button>
          </div>
          <div className="doc-downloads">
            <a
              className="btn btn-primary"
              href="/Tang-Eric-Resume.pdf"
              download
              onClick={() => track("resume_download", { file: "resume-1p" })}
            >
              Download PDF
            </a>
            <a
              className="btn"
              href="/Tang-Eric-CV.pdf"
              download
              onClick={() => track("resume_download", { file: "cv-full" })}
            >
              Full CV
            </a>
          </div>
        </div>

        <div className="doc-scroll">
          <article className="doc-page" style={{ zoom }}>
            <h1>Eric M. Tang, Ph.D.</h1>
            <p className="doc-contact">
              San Jose, CA · <a href="mailto:eric.tang22@gmail.com">eric.tang22@gmail.com</a> ·{" "}
              <a href="https://ericmtang.com">ericmtang.com</a> ·{" "}
              <a href="https://www.linkedin.com/in/eric-tang-a09524ab/" target="_blank" rel="noreferrer">LinkedIn</a> ·{" "}
              <a href="https://scholar.google.com/citations?user=LV0RaF8AAAAJ" target="_blank" rel="noreferrer">Google Scholar</a>
            </p>

            <h2>Summary</h2>
            <p>
              Imaging research scientist with eight years of experience building medical
              imaging systems end to end — optical hardware, real-time acquisition
              software, and deep learning. Ph.D. in Biomedical Engineering; first-author
              publications in Biomedical Optics Express.
            </p>

            <h2>Technical Skills</h2>
            <p><strong>Programming:</strong> Python, C/C++ (multithreaded, real-time), MATLAB; PyTorch, TensorFlow, OpenCV</p>
            <p><strong>Machine Learning:</strong> CNNs (U-Net, YOLO) and GANs for detection, segmentation, tracking, denoising, and super-resolution; dataset curation and annotation QC; model training, evaluation, and optimization</p>
            <p><strong>Edge Deployment:</strong> PyTorch model export via ONNX, TensorRT optimization for latency-constrained real-time inference on embedded hardware (NVIDIA Jetson Orin Nano); integration into low-latency C++ runtimes (LibTorch)</p>
            <p><strong>Computer Vision &amp; Imaging:</strong> Camera calibration, stereo vision, 3D reconstruction; signal and image processing; multimodal fusion; OCT, photoacoustic, and visible-light systems</p>
            <p><strong>Hardware:</strong> Camera and sensor integration, DAQ/FPGA programming, control systems, optical system design</p>

            <h2>Experience</h2>
            <div className="doc-job">
              <div className="doc-job-head">
                <strong>Topcon Healthcare — San Jose, CA</strong>
                <span>May 2023 – Present</span>
              </div>
              <em>Senior Research Scientist</em>
              <ul>
                <li>Manage and optimize real-time image acquisition software (C++) for device control, high-throughput data capture at 2 gigasamples/second, and flexible customization of imaging workflows via multithreaded programming</li>
                <li>Designed a physics-informed deep learning model (PyTorch) for image super-resolution and denoising, integrating the optical system&apos;s PSF and acquisition parameters; achieved a 2× improvement in resolution and signal quality, presented to executives and stakeholders</li>
                <li>Deployed deep learning imaging models to embedded edge hardware by exporting PyTorch models via ONNX and optimizing with TensorRT for real-time inference on an NVIDIA Jetson Orin Nano</li>
                <li>Led cross-organizational collaborations between vendors and engineering teams to co-develop a novel compact imaging sensor and scale it from development to production, achieving a 2× reduction in device size</li>
              </ul>
            </div>
            <div className="doc-job">
              <div className="doc-job-head">
                <strong>Diagnostic Imaging &amp; Image-Guided Interventions Lab — Nashville, TN</strong>
                <span>May 2022 – May 2023</span>
              </div>
              <em>Postdoctoral Research Fellow</em>
              <ul>
                <li>Extended a deep-learning pipeline for 4D surgical-instrument tracking with multi-channel inputs and data augmentation, reaching 99% sensitivity at 23 fps</li>
                <li>Supported development, training, and real-time deployment of a multi-scale U-Net denoising framework, improving image quality by 90% at video rate (22 fps)</li>
              </ul>
            </div>
            <div className="doc-job">
              <div className="doc-job-head">
                <strong>Vanderbilt University — Nashville, TN</strong>
                <span>May 2018 – May 2022</span>
              </div>
              <em>Graduate Research Assistant</em>
              <ul>
                <li>Optimized a high-speed multimodal OCT imaging system and managed its real-time acquisition codebase (C++, 4 GS/s) with GPU-accelerated CNN inference</li>
                <li>Integrated automated surgical-instrument tracking using a lightweight detector (YOLOv4) at 120 fps across multi-view inputs</li>
              </ul>
            </div>

            <h2>Education</h2>
            <p className="doc-edu"><strong>Vanderbilt University</strong> — Ph.D., Biomedical Engineering <span>2022</span></p>
            <p className="doc-edu"><strong>Duke University</strong> — B.S., Biomedical Engineering <span>2018</span></p>
            <p className="doc-edu"><strong>Duke University</strong> — B.A., Computer Science <span>2018</span></p>

            <h2>Publications</h2>
            <p>
              First-author work in Biomedical Optics Express — full list at{" "}
              <a href="https://scholar.google.com/citations?user=LV0RaF8AAAAJ" target="_blank" rel="noreferrer">Google Scholar</a>.
            </p>
          </article>
        </div>
      </div>
    </Window>
  );
}
