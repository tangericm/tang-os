import MethodDiagram from "./MethodDiagram";

export default function ScannerSchematic() {
  return (
    <>
      <figure className="cann">
        <div className="cann-row">
          <span className="cann-tag">sinusoidal return</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/galvo-sine.jpg"
            alt="Three volume frames of a cannula acquired with a sinusoidal return waveform; the cannula shaft is broken across the frame and long dead intervals separate the volumes."
            width={1080}
            height={210}
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="cann-row cann-row-good">
          <span className="cann-tag">optimized return</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/galvo-opt.jpg"
            alt="Five volume frames of the same cannula over the same interval with the optimized return waveform; the shaft is continuous and the dead intervals are much shorter."
            width={1080}
            height={192}
            loading="lazy"
            decoding="async"
          />
        </div>
        <figcaption>
          Same cannula, same elapsed time, two return waveforms. The optimized
          return fits <strong>five volumes where the sinusoid fits three</strong>,
          and the shaft stays continuous instead of breaking up (red marks). Image
          strips from Tang &amp; Tao, Biomed. Opt. Express 12(11), 2021.
        </figcaption>
      </figure>
      <MethodDiagram steps={[
        { title: "Measure", text: "Record how long the scanning mirror takes to settle." },
        { title: "Model and tune", text: "Use a Gaussian process to guide the next controller setting to test." },
        { title: "Recover scan time", text: "Use the faster response for a wider, more linear imaging sweep." },
      ]} />
    </>
  );
}
