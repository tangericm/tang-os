import { Fragment } from "react";
import { LINKS, PROFILE } from "../data/profile";
import { PUBLICATIONS, SELF } from "../data/publications";

/**
 * ResumeDocument, the resume body with no window, no zoom and no client
 * runtime. It was carved out of ResumeWindow so the same markup can be
 * rendered from the server tree (the crawler-facing document mirror) as
 * well as inside the draggable window, which is a client component.
 *
 * The deliberate absence of "use client" is the whole point of this file:
 * adding one would drag the entire resume back into the browser bundle and
 * make it invisible to anything that does not run JavaScript.
 *
 * Heading levels start at <h2> because the page-level <h1> belongs to
 * whatever renders this — previously the window shipped its own <h1> and
 * the site rendered two of them whenever Resume was open. The .doc-page
 * heading rules in globals.css were shifted down a level to match, so the
 * typography is unchanged.
 */

/* ---------- document building blocks ---------- */

/* Addresses come from data/profile.ts rather than being typed here. The
   mirror renders its own contact list from the same module a few hundred
   pixels above this one, inside the same document, so a URL edited in one
   place and not the other would put a page on the web that contradicts
   itself — and the stale half would be the half a crawler read. */
const Contact = () => (
  <p className="doc-contact">
    <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a> ·{" "}
    <a href={PROFILE.site}>{PROFILE.site.replace(/^https?:\/\//, "")}</a> ·{" "}
    <a href={LINKS.linkedin} target="_blank" rel="noreferrer">LinkedIn</a> ·{" "}
    <a href={LINKS.github} target="_blank" rel="noreferrer">GitHub</a> ·{" "}
    <a href={LINKS.scholar} target="_blank" rel="noreferrer">Google Scholar</a>
  </p>
);

const Education = () => (
  <>
    <h3>Education</h3>
    <p className="doc-edu"><span><strong>Vanderbilt University</strong>, <em>Ph.D. in Biomedical Engineering</em></span><span className="doc-edu-year">2022</span></p>
    <p className="doc-edu"><span><strong>Duke University</strong>, <em>B.S. in Biomedical Engineering &amp; B.A. in Computer Science</em></span><span className="doc-edu-year">2018</span></p>
  </>
);

const Experience = () => (
  <>
    <h3>Work Experience</h3>
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

/**
 * The separator that precedes author `index` in a list of `total` authors.
 *
 * Two authors read "A and B" — no comma. Three or more take the Oxford
 * comma, "A, B, and C". Those are two different strings, not one rule with
 * an optional comma, which is exactly why this is a named helper: the
 * tempting "simplification" is to always emit ", and " before the last
 * author, and that silently turns the two-author citation into
 * "A, and B" in the one place nobody re-reads.
 */
function separatorBefore(index: number, total: number) {
  if (index === 0) return "";
  if (index === total - 1) return total === 2 ? " and " : ", and ";
  return ", ";
}

/**
 * Citation punctuation lives in JS strings now rather than JSX text, so the
 * typographic quotes are written as literal U+201C/U+201D characters —
 * &ldquo;/&rdquo; are markup entities and would print verbatim here. The en
 * dash in the page range comes straight from the data.
 */
const authorList = (authors: string[]) =>
  authors.map((author, i) => (
    <Fragment key={author}>
      {separatorBefore(i, authors.length)}
      {author === SELF ? <strong>{author}</strong> : author}
    </Fragment>
  ));

const Publications = () => (
  <>
    <h3>Selected Publications</h3>
    <ol className="doc-pubs">
      {PUBLICATIONS.map((pub) => (
        <li key={pub.id}>
          {authorList(pub.authors)}
          {`, “${pub.title},” ${pub.journal} ${pub.volume}(${pub.issue}), ${pub.pages} (${pub.year}).`}
        </li>
      ))}
    </ol>
    <p>
      Full list at{" "}
      <a href={LINKS.scholar} target="_blank" rel="noreferrer">Google Scholar</a>.
    </p>
  </>
);

/* ---------- the document ---------- */

export default function ResumeDocument() {
  return (
    <>
      <h2>Eric Ming Tang, Ph.D.</h2>
      <Contact />
      <h3>Technical Skills</h3>
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
}
