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
 *
 * LAYOUT RULE, learned the hard way: every stage box and every connector
 * lives on the STAGES table below, and the arrows are derived from it. The
 * previous hand-placed version put the third arrow at x=360 while stage 4's
 * frame started at x=362, so that arrow was drawn underneath the next box
 * and simply vanished. Derive the connectors, never eyeball them.
 */

import type { CSSProperties } from "react";

/* ---------- shared geometry ---------- */

/* One row of stages, laid out end to end with an equal gap between each.
   16px of padding either side of a 560-unit canvas leaves 528 for content;
   three 18-unit gaps leave 474 for the four boxes. */
const PAD = 16;
const GAP = 18;
const BOX_Y = 20;
const BOX_H = 84;
const MID = BOX_Y + BOX_H / 2;

const STAGES = [
  { w: 100 },
  { w: 96 },
  { w: 86 },
  { w: 192 },
].reduce<{ x: number; w: number; cx: number }[]>((acc, s) => {
  const prev = acc[acc.length - 1];
  const x = prev ? prev.x + prev.w + GAP : PAD;
  acc.push({ x, w: s.w, cx: x + s.w / 2 });
  return acc;
}, []);

/* A connector sits in the gap AFTER stage i: a short rule plus a chevron,
   centred in the gap so it can never be overdrawn by either neighbour. */
function Connector({ after, y = MID }: { after: number; y?: number }) {
  const a = STAGES[after];
  const b = STAGES[after + 1];
  const x0 = a.x + a.w + 3;
  const x1 = b.x - 3;
  return (
    <g className="sim-conn">
      <line className="sfs-arrow" x1={x0} y1={y} x2={x1} y2={y} />
      <path className="sfs-arrow" d={`M${(x1 - 4).toFixed(1)} ${y - 4} l4 4 l-4 4`} />
      <circle className="sim-packet" cx={x0} cy={y} r={1.9} style={{ animationDelay: `${after * 0.28}s` }} />
    </g>
  );
}

/* The retinal contour both panels draw: one shared surface with a foveal
   depression, with each layer a closed ribbon between that surface offset by
   its own top and bottom depth. That is also how the simulator parameterises
   its own layer model — one surface, per-layer thickness — so the drawing and
   the thing it describes are built the same way. */
function bands(x0: number, x1: number, base: number, thick: number[], samples = 46) {
  const surface = (t: number) => {
    const arc = 3.2 * Math.sin(Math.PI * t);
    const dip = 5.0 * Math.exp(-Math.pow((t - 0.5) / 0.11, 2));
    return base - arc + dip;
  };
  const span = thick[thick.length - 1];
  const out: string[] = [];
  for (let b = 0; b < thick.length - 1; b++) {
    const top: string[] = [];
    const bot: string[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const x = x0 + t * (x1 - x0);
      /* the fovea is a surface feature: deeper layers flatten out under it */
      const damp = 1 - 0.72 * (thick[b] / span);
      const y = base - (base - surface(t)) * damp;
      top.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${(y + thick[b]).toFixed(1)}`);
      bot.push(`L${x.toFixed(1)} ${(y + thick[b + 1]).toFixed(1)}`);
    }
    out.push([...top, ...bot.reverse(), "Z"].join(" "));
  }
  return out;
}

/* ---------- panel 1: the forward model ---------- */

/* A Gaussian source envelope, drawn from data so the curve is a real
   Gaussian rather than a hand-guessed bezier. Built from an array and
   joined: never concatenate template literals into an SVG `d`. */
const GAUSS = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const x = STAGES[0].x + 8 + i * 2.1;
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
    const x = STAGES[1].x + 6 + i * 0.92;
    const t = (i - 45) / 20;
    const env = Math.exp(-0.5 * t * t);
    const y = 62 - 22 * env * Math.sin(i * 0.62);
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
})();

/* Stage 4 is one figure, not two: an A-scan and the B-scan it stacks into,
   sharing a depth axis so a peak and the band it produced sit on the same row.
   Depth therefore runs DOWN in both, and the A-scan's intensity runs right —
   the orientation an instrument displays, and the only one in which "stacking"
   means anything. Drawn with depth on the x-axis (as it was) the two halves
   were plotted on transposed axes and the correspondence was invisible.

   BS_BASE and the boundary depths below are shared by both, which is what
   guarantees the alignment rather than merely suggesting it. */
const ASCAN_X0 = STAGES[3].x + 8;
const BS_BASE = 44;
const BS_THICK = [0, 7, 13, 24, 30, 34];
/* Reflections happen at interfaces, so the peaks are the boundary depths. The
   RPE (the fourth boundary) is the brightest, as it is in a real A-scan. */
const ASCAN_PEAKS: [number, number][] = BS_THICK.map((t, i) => [
  BS_BASE + t,
  [13, 8, 9, 22, 11, 6][i],
]);
const ASCAN = (() => {
  const pts: string[] = [];
  for (let y = 26; y <= 100; y += 0.5) {
    let v = 0;
    for (const [pd, amp] of ASCAN_PEAKS) {
      const s = (y - pd) / 1.9;
      v += amp * Math.exp(-0.5 * s * s);
    }
    /* a floor that decays with depth: the falloff the instrument has too */
    v += 2.2 * Math.exp(-(y - 26) / 90);
    pts.push(`${y === 26 ? "M" : "L"}${(ASCAN_X0 + v).toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
})();

/* The mini B-scan the A-scans stack into. Greys, not the label palette: this
   is the measured image, and colour here would read as labels. */
const BS_X0 = STAGES[3].x + 52;
const BS_X1 = STAGES[3].x + STAGES[3].w - 6;
const BS_BANDS = bands(BS_X0, BS_X1, BS_BASE, BS_THICK);

function ForwardPanel() {
  return (
    <svg
      className="sfs-svg"
      viewBox="0 0 560 152"
      role="img"
      aria-label="A scene of scatterers produces an interferometric spectrum under a Gaussian source, which after DC removal, windowing and an inverse Fourier transform reconstructs an A-scan, and stacking A-scans across the lateral scan gives a B-scan."
    >
      <defs>
        <clipPath id="sim-bscan-clip">
          <rect className="sim-sweep-clip" x={BS_X0} y={22} width={BS_X1 - BS_X0} height={80} />
        </clipPath>
      </defs>

      {/* stage 1: source and scene */}
      <rect className="trk-frame" x={STAGES[0].x} y={BOX_Y} width={STAGES[0].w} height={BOX_H} rx={3} />
      <path className="sim-gauss" d={GAUSS} />
      <text className="sfs-sub" x={STAGES[0].x + STAGES[0].w - 7} y={34} textAnchor="end">
        P(k)
      </text>
      <g className="sim-scat">
        {[
          [40, 84],
          [58, 92],
          [76, 80],
          [96, 89],
        ].map(([cx, cy], i) => (
          <circle key={cx} cx={cx} cy={cy} r={2.2 + (i % 2) * 0.5} style={{ animationDelay: `${i * 0.35}s` }} />
        ))}
      </g>
      <text className="sfs-cap" x={STAGES[0].cx} y={122} textAnchor="middle">
        source + scene
      </text>
      <text className="sfs-sub" x={STAGES[0].cx} y={135} textAnchor="middle">
        Gaussian P(k)
      </text>

      <Connector after={0} />

      {/* stage 2: the interferogram */}
      <rect className="trk-frame" x={STAGES[1].x} y={BOX_Y} width={STAGES[1].w} height={BOX_H} rx={3} />
      <path className="sim-fringe" d={FRINGE} />
      <text className="sfs-cap sfs-cap-accent" x={STAGES[1].cx} y={122} textAnchor="middle">
        interferogram
      </text>
      <text className="sfs-sub" x={STAGES[1].cx} y={135} textAnchor="middle">
        what the detector sees
      </text>

      <Connector after={1} />

      {/* stage 3: reconstruction, the same one the hardware runs */}
      <rect className="trk-frame" x={STAGES[2].x} y={BOX_Y} width={STAGES[2].w} height={BOX_H} rx={3} />
      <text className="sim-op" x={STAGES[2].cx} y={46} textAnchor="middle">
        DC removal
      </text>
      <text className="sim-op" x={STAGES[2].cx} y={64} textAnchor="middle">
        window
      </text>
      <text className="sim-op sim-op-accent" x={STAGES[2].cx} y={82} textAnchor="middle">
        IFFT
      </text>
      <text className="sfs-cap" x={STAGES[2].cx} y={122} textAnchor="middle">
        reconstruction
      </text>
      <text className="sfs-sub" x={STAGES[2].cx} y={135} textAnchor="middle">
        same as instrument
      </text>

      <Connector after={2} />

      {/* stage 4: one A-scan, then the B-scan it stacks into */}
      <rect className="trk-frame" x={STAGES[3].x} y={BOX_Y} width={STAGES[3].w} height={BOX_H} rx={3} />
      <line className="sim-axis" x1={ASCAN_X0} y1={26} x2={ASCAN_X0} y2={100} />
      <path className="sim-ascan" d={ASCAN} />
      <path className="sfs-arrow" d={`M${BS_X0 - 12} ${MID - 4} l4 4 l-4 4`} />

      <g className="sim-bscan" clipPath="url(#sim-bscan-clip)">
        {BS_BANDS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <line
        className="sim-sweep"
        x1={BS_X0}
        y1={24}
        x2={BS_X0}
        y2={100}
        style={{ "--sim-sweep-x": `${BS_X1 - BS_X0}px` } as CSSProperties}
      />
      <text className="sfs-sub" x={ASCAN_X0 + 5} y={33}>
        A-scan
      </text>

      <text className="sfs-cap sfs-cap-accent" x={STAGES[3].cx} y={122} textAnchor="middle">
        B-scan, then volume
      </text>
      <text className="sfs-sub" x={STAGES[3].cx} y={135} textAnchor="middle">
        A-scans stacked across the scan
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

const CORE_X = 126;
const CORE_W = 148;
const CORE_Y = 122;
const CORE_H = 30;
const CORE_MID = CORE_Y + CORE_H / 2;

/* The payoff panel: the label map next to what it means, in one frame rather
   than two boxes joined by an arrow that had 16 units to live in. */
const OUT_X = 300;
const OUT_W = 244;
const LX0 = OUT_X + 10;
const LX1 = OUT_X + 118;
const LAYER_BANDS = bands(LX0, LX1, 128, [0, 6.5, 11, 20, 30]);

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
        const x = PAD + col * (CHIP_W + CHIP_GAP);
        const y = 18 + row * 40;
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
      <path className="sim-feed" d={`M74 98 C74 116 200 114 200 ${CORE_Y}`} />
      <path className="sim-feed" d={`M198 98 C198 112 200 114 200 ${CORE_Y}`} />
      <path className="sim-feed" d={`M322 98 C322 116 200 114 200 ${CORE_Y}`} />

      <rect className="sim-core" x={CORE_X} y={CORE_Y} width={CORE_W} height={CORE_H} rx={5} />
      <text className="sim-core-t" x={CORE_X + CORE_W / 2} y={CORE_Y + 19} textAnchor="middle">
        one forward model
      </text>

      {/* connector, centred in its own gap the same way panel 1 does it */}
      <line className="sfs-arrow" x1={CORE_X + CORE_W + 3} y1={CORE_MID} x2={OUT_X - 3} y2={CORE_MID} />
      <path className="sfs-arrow" d={`M${OUT_X - 7} ${CORE_MID - 4} l4 4 l-4 4`} />

      {/* the payoff: the label map and what it is worth, in one frame */}
      <rect className="sim-out" x={OUT_X} y={96} width={OUT_W} height={64} rx={5} />
      <g className="sim-layers">
        {LAYER_BANDS.map((d, i) => (
          <path key={i} d={d} style={{ animationDelay: `${i * 0.45}s` }} />
        ))}
      </g>
      <text className="sfs-sub sfs-sub-accent" x={(LX0 + LX1) / 2} y={112} textAnchor="middle">
        per-pixel layer map
      </text>
      <text className="sim-core-t" x={OUT_X + 130} y={124}>
        labels are an input
      </text>
      <text className="sfs-sub" x={OUT_X + 130} y={139}>
        13 layers, exact
      </text>
      <text className="sfs-sub" x={OUT_X + 130} y={152}>
        no annotation pass
      </text>
    </svg>
  );
}

export default function SimulatorSchematic() {
  return (
    <div className="sfs">
      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">1</span> How a scan is made
          <span className="sfs-badge">forward model</span>
        </h3>
        <div className="sfs-canvas">
          <ForwardPanel />
        </div>
        <p className="sfs-note">
          The image is computed from optics, not filtered from an existing scan — and it is
          reconstructed with the same steps the instrument runs, so synthetic data behaves like
          measured data.
        </p>
      </section>

      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">2</span> One model, free ground truth
          <span className="sfs-badge">labels included</span>
        </h3>
        <div className="sfs-canvas">
          <EffectsPanel />
        </div>
        <p className="sfs-note">
          Hardware and acquisition settings are knobs on that one model, so tradeoffs like
          speed against noise fall out of the physics. And because the scene is known before it
          is measured, every image ships with its own pixel-exact layer map.
        </p>
      </section>
    </div>
  );
}
