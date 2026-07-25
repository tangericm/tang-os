/**
 * SimulatorSchematic: how synthetic OCT is generated from physics.
 *
 * Panel 1 is the forward model, and the point of drawing it as a chain is
 * that it is the SAME chain real hardware walks. A scene of scatterers
 * becomes an interferometric spectrum, the spectrum gets DC-removed,
 * windowed and inverse-transformed, and what falls out is a B-scan. Nothing
 * here is an image filter applied to an existing scan; the image is the
 * output of the measurement equation.
 *
 * Panel 2 is why that matters for training: because the scene is known
 * before it is measured, the per-pixel layer map is free. Labels are not
 * annotated afterwards, they are an input.
 */

/* ---------- panel 1: the forward model ---------- */

/* A Gaussian source envelope, drawn from data so the curve is a real
   Gaussian rather than a hand-guessed bezier. Built from an array and
   joined: never concatenate template literals into an SVG `d`. */
const GAUSS = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const x = 24 + i * 2.1;
    const t = (i - 20) / 8.5;
    const y = 62 - 26 * Math.exp(-0.5 * t * t);
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
})();

/* The fringe: a carrier modulated by the same Gaussian envelope. This is
   the thing the detector actually sees. */
const FRINGE = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 90; i++) {
    const x = 150 + i * 0.95;
    const t = (i - 45) / 20;
    const env = Math.exp(-0.5 * t * t);
    const y = 62 - 22 * env * Math.sin(i * 0.62);
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
})();

/* The reconstructed A-scan: a few peaks at depth, falling off with depth. */
const ASCAN = (() => {
  const peaks = [
    [18, 30],
    [30, 20],
    [42, 26],
    [54, 12],
    [70, 8],
  ];
  const pts = ["M366 92"];
  for (let d = 0; d <= 84; d++) {
    const x = 366 + d * 0.85;
    let v = 0;
    for (const [pd, amp] of peaks) {
      const s = (d - pd) / 2.4;
      v += amp * Math.exp(-0.5 * s * s);
    }
    pts.push(`L${x.toFixed(1)} ${(92 - v).toFixed(1)}`);
  }
  return pts.join(" ");
})();

function ForwardPanel() {
  return (
    <svg
      className="sfs-svg"
      viewBox="0 0 560 168"
      role="img"
      aria-label="A scene of scatterers produces an interferometric spectrum under a Gaussian source, which after DC removal, windowing and an inverse Fourier transform reconstructs an A-scan, and stacking A-scans across the lateral scan gives a B-scan."
    >
      {/* stage 1: source and scene */}
      <rect className="trk-frame" x={16} y={22} width={104} height={80} rx={3} />
      <path className="sim-gauss" d={GAUSS} />
      <text className="sfs-sub" x={68} y={38} textAnchor="middle">
        P(k)
      </text>
      {/* scatterers at depth */}
      <g className="sim-scat">
        <circle cx={40} cy={82} r={2.2} />
        <circle cx={58} cy={90} r={2.8} />
        <circle cx={76} cy={78} r={1.9} />
        <circle cx={96} cy={88} r={2.4} />
      </g>
      <text className="sfs-cap" x={68} y={120} textAnchor="middle">
        source and scene
      </text>
      <text className="sfs-sub" x={68} y={133} textAnchor="middle">
        Gaussian in k, scatterers at z
      </text>

      <path className="sfs-arrow" d="M132 58 l6 5 l-6 5" />

      {/* stage 2: the interferogram */}
      <rect className="trk-frame" x={148} y={22} width={96} height={80} rx={3} />
      <path className="sim-fringe" d={FRINGE} />
      <text className="sfs-cap sfs-cap-accent" x={196} y={120} textAnchor="middle">
        interferogram
      </text>
      <text className="sfs-sub" x={196} y={133} textAnchor="middle">
        I(k) = P(k)·|a+Σr·e^(i2kz)|²
      </text>

      <path className="sfs-arrow" d="M256 58 l6 5 l-6 5" />

      {/* stage 3: reconstruction, the same one the hardware runs */}
      <rect className="trk-frame" x={272} y={22} width={78} height={80} rx={3} />
      <text className="sim-op" x={311} y={48} textAnchor="middle">
        DC removal
      </text>
      <text className="sim-op" x={311} y={64} textAnchor="middle">
        window
      </text>
      <text className="sim-op sim-op-accent" x={311} y={80} textAnchor="middle">
        IFFT
      </text>
      <text className="sfs-cap" x={311} y={120} textAnchor="middle">
        reconstruction
      </text>
      <text className="sfs-sub" x={311} y={133} textAnchor="middle">
        identical to the instrument
      </text>

      <path className="sfs-arrow" d="M360 58 l6 5 l-6 5" />

      {/* stage 4: A-scan then B-scan */}
      <rect className="trk-frame" x={362} y={22} width={182} height={80} rx={3} />
      <path className="sim-ascan" d={ASCAN} />
      <line className="sim-axis" x1={366} y1={94} x2={528} y2={94} />
      <text className="sfs-sub" x={452} y={38} textAnchor="middle">
        one A-scan per lateral position
      </text>
      <text className="sfs-cap sfs-cap-accent" x={452} y={120} textAnchor="middle">
        B-scan, then volume
      </text>
      <text className="sfs-sub" x={452} y={133} textAnchor="middle">
        stacked across the scan
      </text>
    </svg>
  );
}

/* ---------- panel 2: what the physics buys you ---------- */

const EFFECTS = [
  { k: "source", v: "bandwidth sets axial resolution" },
  { k: "falloff", v: "sensitivity roll-off with depth" },
  { k: "dispersion", v: "axial stretch, signed chirp" },
  { k: "T_int", v: "SNR up, fringe washout up" },
  { k: "motion", v: "drift, pulse, microsaccade" },
  { k: "noise", v: "shot, RIN, read floor" },
];

function EffectsPanel() {
  return (
    <svg
      className="sfs-svg"
      viewBox="0 0 560 176"
      role="img"
      aria-label="Instrument and acquisition physics fold into the same forward model, and because the scene is known before it is measured, every sample carries a per-pixel layer map as free ground truth."
    >
      {EFFECTS.map((e, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 16 + col * 118;
        const y = 20 + row * 40;
        return (
          <g key={e.k}>
            <rect className="sim-chip" x={x} y={y} width={108} height={30} rx={4} />
            <text className="sim-chip-k" x={x + 8} y={y + 13}>
              {e.k}
            </text>
            <text className="sim-chip-v" x={x + 8} y={y + 24}>
              {e.v}
            </text>
          </g>
        );
      })}

      {/* they all feed one model */}
      <path className="sim-feed" d="M70 100 C70 118 200 118 200 124" />
      <path className="sim-feed" d="M188 100 C188 116 200 118 200 124" />
      <path className="sim-feed" d="M306 100 C306 118 200 118 200 124" />

      <rect className="sim-core" x={126} y={124} width={148} height={30} rx={5} />
      <text className="sim-core-t" x={200} y={143} textAnchor="middle">
        one forward model
      </text>

      <path className="sfs-arrow" d="M286 134 l6 5 l-6 5" />

      {/* the payoff */}
      <rect className="trk-frame" x={308} y={112} width={104} height={52} rx={3} />
      <g className="sim-layers">
        <rect x={314} y={122} width={92} height={7} />
        <rect x={314} y={131} width={92} height={5} />
        <rect x={314} y={138} width={92} height={9} />
        <rect x={314} y={149} width={92} height={9} />
      </g>
      <text className="sfs-sub sfs-sub-accent" x={360} y={106} textAnchor="middle">
        per-pixel layer map
      </text>

      <rect className="sim-core sim-core-out" x={428} y={124} width={116} height={30} rx={5} />
      <text className="sim-core-t" x={486} y={143} textAnchor="middle">
        labels are an input
      </text>
      <text className="sfs-sub" x={486} y={106} textAnchor="middle">
        not an annotation pass
      </text>
    </svg>
  );
}

export default function SimulatorSchematic() {
  return (
    <div className="sfs">
      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">1</span> Forward model, per A-scan
          <span className="sfs-badge">first-Born</span>
        </h3>
        <div className="sfs-canvas">
          <ForwardPanel />
        </div>
        <p className="sfs-note">
          The image is the output of the measurement equation, not a filter applied
          to an existing scan. A scene of scatterers becomes an interferometric
          spectrum, which is then DC-removed, windowed and inverse-transformed by the
          same reconstruction the instrument runs. Single-scattering throughout.
        </p>
      </section>

      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">2</span> Instrument physics and free labels
          <span className="sfs-badge">emergent tradeoffs</span>
        </h3>
        <div className="sfs-canvas">
          <EffectsPanel />
        </div>
        <p className="sfs-note">
          Acquisition speed sets integration time, which raises SNR and worsens
          fringe washout at once, so the tradeoff is emergent rather than scripted.
          Motion is one continuous trajectory sampled along the acquisition axis, so
          artifacts stay correlated across A-scans and across frames. Because the
          scene is known before it is measured, the layer map is free.
        </p>
      </section>
    </div>
  );
}
