"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import Window from "./Window";

/**
 * ResumeWindow, a pseudo-document viewer for THE resume (one
 * document, one unmistakable download; simplicity won). The page is
 * selectable HTML mirroring the PDF; each download fires an
 * Analytics event and the email ping.
 */

type Passthrough = {
  onClose: () => void;
  onMinimize: () => void;
  motion?: "minimizing" | "closing";
  minimizeTarget?: string;
  zIndex?: number;
  onFocus?: () => void;
};

const ZOOMS = [0.85, 1, 1.15, 1.3];

function notifyDownload(file: "resume-1p") {
  track("resume_download", { file });
  fetch("/api/ping-download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file }),
    keepalive: true,
  }).catch(() => {});
}

/* ---------- document building blocks ---------- */

const Contact = () => (
  <p className="doc-contact">
    <a href="mailto:eric.tang22@gmail.com">eric.tang22@gmail.com</a> ·{" "}
    <a href="https://ericmtang.com">ericmtang.com</a> ·{" "}
    <a href="https://www.linkedin.com/in/eric-tang-a09524ab/" target="_blank" rel="noreferrer">LinkedIn</a> ·{" "}
    <a href="https://github.com/tangericm" target="_blank" rel="noreferrer">GitHub</a> ·{" "}
    <a href="https://scholar.google.com/citations?user=LV0RaF8AAAAJ" target="_blank" rel="noreferrer">Google Scholar</a>
  </p>
);

const Education = () => (
  <>
    <h2>Education</h2>
    <p className="doc-edu"><span><strong>Vanderbilt University</strong>, <em>Ph.D. in Biomedical Engineering</em></span><span className="doc-edu-year">2022</span></p>
    <p className="doc-edu"><span><strong>Duke University</strong>, <em>B.S. in Biomedical Engineering &amp; B.A. in Computer Science</em></span><span className="doc-edu-year">2018</span></p>
  </>
);

const Experience = () => (
  <>
    <h2>Work Experience</h2>
    <div className="doc-job">
      <div className="doc-job-head">
        <strong>Topcon Healthcare</strong>
        <span>San Jose, CA</span>
      </div>
      <div className="doc-job-head">
        <em>Senior Research Scientist</em>
        <span>May 2023 – Present</span>
      </div>
      <ul>
        <li>Managed and optimized real-time image acquisition software (C++) for high-throughput data capture at 2 gigasamples/second and flexible customization of imaging workflows via multithreaded programming</li>
        <li>Designed a physics-informed deep learning model (PyTorch) for image super-resolution and denoising, integrating the optical system&apos;s PSF and acquisition parameters, achieving a 2× improvement in resolution and signal quality; results were presented to company executives and stakeholders</li>
        <li>Deployed deep learning imaging models to embedded edge hardware by exporting PyTorch models via ONNX and optimizing with TensorRT for real-time inference on an NVIDIA Jetson Orin Nano</li>
        <li>Led cross-organizational collaborations between vendors and engineering teams to co-develop a novel compact imaging sensor and scale it from development to production, achieving a 2× reduction in device size</li>
        <li>Evaluated and enhanced third-party analysis software by identifying algorithmic limitations, technical problem solving, providing performance feedback, and iterating improvements</li>
      </ul>
    </div>
    <div className="doc-job">
      <div className="doc-job-head">
        <strong>Diagnostic Imaging and Image-Guided Interventions Laboratory</strong>
        <span>Nashville, TN</span>
      </div>
      <div className="doc-job-head">
        <em>Postdoctoral Research Fellow</em>
        <span>May 2022 – May 2023</span>
      </div>
      <ul>
        <li>Extended and adapted a deep-learning-based pipeline for 4D surgical instrument tracking by implementing multi-channel inputs and data augmentation, achieving 99% sensitivity at 23 fps</li>
        <li>Investigated advanced machine learning models (MATLAB/Python: multiscale context aggregation networks, pix2pix, cGANs) to improve neural network input quality by up to 4× under challenging surgical conditions</li>
        <li>Supported development, training, and real-time deployment of a self-fusion denoising network, improving image quality by 90% at video rate (22 fps)</li>
      </ul>
      <div className="doc-job-head">
        <em>Graduate Research Assistant</em>
        <span>May 2018 – May 2022</span>
      </div>
      <ul>
        <li>Optimized a high-speed multimodal imaging system and managed its acquisition codebase (C++) supporting real-time processing, live preview of reflectance and 3D images, and GPU-accelerated CNN architectures at 4 gigasamples/second</li>
        <li>Integrated an automated deep-learning-based framework for surgical instrument tracking using multi-view inputs via a lightweight model (YOLOv4) at 120 fps</li>
      </ul>
    </div>
  </>
);

const Publications = () => (
  <>
    <h2>Selected Publications</h2>
    <ol className="doc-pubs">
      <li><strong>Tang, E. M.</strong>, El-Haddad, M. T., Patel, S. N., and Tao, Y. K., &ldquo;Automated instrument-tracking for 4D video-rate imaging of ophthalmic surgical maneuvers,&rdquo; Biomedical Optics Express 13(3), 1471–1484 (2022).</li>
      <li>Rico-Jimenez, J. J., Hu, D., <strong>Tang, E. M.</strong>, Oguz, I., and Tao, Y. K., &ldquo;Real-Time OCT Image Denoising Using Self-Fusion Neural Network,&rdquo; Biomedical Optics Express 13(3), 1398–1409 (2022).</li>
      <li><strong>Tang, E. M.</strong> and Tao, Y. K., &ldquo;Modeling and optimization of galvanometric point-scanning temporal dynamics,&rdquo; Biomedical Optics Express 12(11), 6701–6716 (2021).</li>
    </ol>
    <p>
      Full list at{" "}
      <a href="https://scholar.google.com/citations?user=LV0RaF8AAAAJ" target="_blank" rel="noreferrer">Google Scholar</a>.
    </p>
  </>
);

/* ---------- the document ---------- */

const ResumePage = () => (
  <>
    <h1>Eric Ming Tang, Ph.D.</h1>
    <Contact />
    <h2>Technical Skills</h2>
    <p><strong>Programming Languages (8 years):</strong> Python, C/C++ (multithreaded, real-time), MATLAB, Java</p>
    <p><strong>Machine Learning &amp; AI (6 years):</strong> Deep learning (PyTorch/LibTorch, TensorFlow); CNNs (U-Net, YOLOv4, Noise2Noise), GANs; real-time object detection, segmentation, and tracking; ML automation for image-quality testing and calibration; model training, evaluation, and optimization</p>
    <p><strong>Edge Deployment:</strong> PyTorch model export via ONNX, TensorRT optimization for real-time GPU-accelerated inference on embedded hardware (NVIDIA Jetson Orin Nano); low-latency C++ runtimes (LibTorch)</p>
    <p><strong>Computer Vision (8 years):</strong> Signal and image processing (filtering, Fourier-domain reconstruction, correlation), denoising, super-resolution, multimodal image fusion, optical flow, stereo vision, camera calibration, 3D reconstruction; image-quality (IQ) tuning and benchmarking</p>
    <p><strong>Hardware &amp; Imaging Systems (8 years):</strong> Multimodal imaging (OCT, photoacoustic, visible-light, microscopy); camera sensor characterization and ISP-pipeline evaluation; optical system design and alignment (ZEMAX); DAQ/FPGA programming, control systems</p>
    <p><strong>Software Tools (8 years):</strong> Microsoft Visual Studio, VS Code, Qt Creator, LabView, OpenCV, Scikit-learn</p>
    <Education />
    <Experience />
    <Publications />
  </>
);

/* ---------- the window ---------- */

export default function ResumeWindow(props: Passthrough) {
  const [zoom, setZoom] = useState(1);
  const zoomIdx = ZOOMS.indexOf(zoom);

  return (
    <Window title="Eric Tang Resume" frameClassName="window-doc" {...props}>
      <div className="doc">
        <div className="doc-toolbar">
          <span className="doc-filename">Eric-Tang-Resume.pdf</span>

          <div className="doc-tools">
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
            <a
              className="btn btn-primary"
              href="/Eric-Tang-Resume.pdf"
              download
              onClick={() => notifyDownload("resume-1p")}
            >
              Download Resume
              <span className="btn-sub">1 page · PDF</span>
            </a>
          </div>
        </div>

        <div className="doc-scroll">
          <article className="doc-page" style={{ zoom }}>
            <ResumePage />
          </article>
        </div>
      </div>
    </Window>
  );
}
