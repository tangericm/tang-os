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

/* Values are kept short enough to fit CHIP_W minus its padding. Measured, not
   eyeballed: three of the original strings ran past the chip edge, the worst by
   16 units. If you lengthen one, re-measure the text bbox against the rect. */
const CHIP_W = 116;
const CHIP_GAP = 8;

const EFFECTS = [
  { k: "source", v: "sets axial resolution" },
  { k: "falloff", v: "roll-off with depth" },
  { k: "dispersion", v: "stretch, signed chirp" },
  { k: "T_int", v: "SNR up, washout up" },
  { k: "motion", v: "drift, pulse, saccade" },
  { k: "noise", v: "shot, RIN, read floor" },
];

/* The label map, drawn with retinal geometry rather than as flat bars.
   Bands follow one shared contour with a foveal depression at the centre, so
   the thing that reads as "free ground truth" actually looks like the tissue
   it labels. Each band is a closed ribbon between the contour offset by its
   own top and bottom depth, which is also how the simulator's own layer model
   is parameterised: one surface, per-layer thickness. */
const LX0 = 314;
const LX1 = 406;
const LAYER_BANDS = (() => {
  const N = 46;
  // depth of the shared surface at each x: a gentle arc with a foveal dip
  const surface = (t: number) => {
    const arc = 3.2 * Math.sin(Math.PI * t); // overall curvature
    const dip = 5.0 * Math.exp(-Math.pow((t - 0.5) / 0.11, 2)); // fovea
    return 122 - arc + dip;
  };
  const thick = [0, 6.5, 11, 20, 30]; // cumulative depth of each boundary
  const bands: string[] = [];
  for (let b = 0; b < thick.length - 1; b++) {
    const top: string[] = [];
    const bot: string[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = LX0 + t * (LX1 - LX0);
      // the fovea is a surface feature: deeper layers flatten out under it
      const damp = 1 - 0.72 * (thick[b] / 30);
      const s = surface(t);
      const base = 122 - (122 - s) * damp;
      top.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${(base + thick[b]).toFixed(1)}`);
      bot.push(`L${x.toFixed(1)} ${(base + thick[b + 1]).toFixed(1)}`);
    }
    bands.push([...top, ...bot.reverse(), "Z"].join(" "));
  }
  return bands;
})();

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
        const x = 16 + col * (CHIP_W + CHIP_GAP);
        const y = 20 + row * 40;
        return (
          <g key={e.k}>
            <rect className="sim-chip" x={x} y={y} width={CHIP_W} height={30} rx={4} />
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
      <path className="sim-feed" d="M74 100 C74 118 200 118 200 124" />
      <path className="sim-feed" d="M198 100 C198 116 200 118 200 124" />
      <path className="sim-feed" d="M322 100 C322 118 200 118 200 124" />

      <rect className="sim-core" x={126} y={124} width={148} height={30} rx={5} />
      <text className="sim-core-t" x={200} y={143} textAnchor="middle">
        one forward model
      </text>

      <path className="sfs-arrow" d="M286 134 l6 5 l-6 5" />

      {/* the payoff */}
      <rect className="trk-frame" x={308} y={112} width={104} height={52} rx={3} />
      <g className="sim-layers">
        {LAYER_BANDS.map((d, i) => (
          <path key={i} d={d} />
        ))}
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
          The image comes from a measurement equation, not a filter on an existing scan. A scene of scatterers becomes an interferometric spectrum, then is reconstructed with the same steps the instrument runs — so synthetic data stays physically grounded.
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
          Faster acquisition shortens integration time: noise rises, and motion washout changes with it, so speed-versus-SNR tradeoffs emerge from the physics. Because the scene is known before it is measured, every sample ships a free layer map for training.
        </p>
      </section>
    </div>
  );
}
