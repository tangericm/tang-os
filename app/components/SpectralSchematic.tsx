/**
 * SpectralSchematic: sub-band decomposition as a source of supervision, and
 * the network that consumes it.
 *
 * Panel 1 is the physical argument. Speckle is interference, not additive
 * noise, so the realization depends on which spectral support is retained.
 * Two separated Gaussian sub-windows reconstructed independently therefore
 * share structure and differ in speckle, and the full-bandwidth
 * reconstruction is available at no extra cost as a target.
 *
 * Panel 2 mirrors the actual implementation rather than a generic U-Net.
 * Verified against networks/resunet_pseudo3d.py: a pseudo-3D stem applies a
 * 3D convolution across the two-sub-band axis before collapsing to 2D
 * features, the contracting path runs 64 to 512 channels over four scales
 * with paired residual blocks, downsampling is strided convolution,
 * upsampling is transposed convolution, and skips are concatenated then
 * fused by a 3x3 convolution. Activations are SiLU throughout with batch
 * normalization; the head is a 1x1 convolution to a single channel.
 */

const BASE = 92; // spectrum baseline
const SPEC_L = 24;
const SPEC_R = 194;
const SPEC_C = (SPEC_L + SPEC_R) / 2;
const GAP = 34;
const W1 = SPEC_C - GAP / 2;
const W2 = SPEC_C + GAP / 2;

/** A Gaussian as an SVG path, for the source spectrum and its sub-windows. */
function gaussian(cx: number, amp: number, sigma: number, base: number, from: number, to: number, step = 4) {
  const pts: string[] = [];
  for (let x = from; x <= to; x += step) {
    const y = base - amp * Math.exp(-((x - cx) ** 2) / (2 * sigma ** 2));
    pts.push(`${pts.length ? "L" : "M"}${x} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

function Speckle({ x, y, w, h, n, seed }: { x: number; y: number; w: number; h: number; n: number; seed: number }) {
  const pts: string[] = [];
  let s = seed * 7919;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const px = x + (s / 233280) * w;
    s = (s * 9301 + 49297) % 233280;
    const py = y + (s / 233280) * h;
    pts.push(`M${px.toFixed(1)} ${py.toFixed(1)} h1.5`);
  }
  return <path className="trk-speckle" d={pts.join(" ")} />;
}

/** Layer boundaries: identical in both sub-band reconstructions. */
function Structure({ x, y, w }: { x: number; y: number; w: number }) {
  const h = w / 2;
  return (
    <g className="spc-structure">
      <path d={`M${x} ${y} q${h / 2} -5 ${h} 0 q${h / 2} 5 ${h} 0`} />
      <path d={`M${x} ${y + 13} q${h / 2} -5 ${h} 0 q${h / 2} 5 ${h} 0`} />
    </g>
  );
}

/* ============================================================
   Panel 1: sub-band decomposition
   ============================================================ */

function SplitPanel() {
  return (
    <svg
      className="sfs-svg"
      viewBox="0 0 560 176"
      role="img"
      aria-label="The raw interferogram is decomposed into two Gaussian sub-windows separated by a tunable gap and each is reconstructed independently, yielding two images with identical structure and statistically independent speckle."
    >
      <path className="spc-envelope" d={gaussian(SPEC_C, 56, 42, BASE, SPEC_L, SPEC_R)} />
      <path
        className="spc-win spc-win-1"
        d={`${gaussian(W1, 40, 13, BASE, SPEC_L, SPEC_R, 3)} L${SPEC_R} ${BASE} L${SPEC_L} ${BASE} Z`}
      />
      <path
        className="spc-win spc-win-2"
        d={`${gaussian(W2, 40, 13, BASE, SPEC_L, SPEC_R, 3)} L${SPEC_R} ${BASE} L${SPEC_L} ${BASE} Z`}
      />
      <line className="spc-axis" x1={SPEC_L} y1={BASE} x2={SPEC_R} y2={BASE} />

      <line className="spc-gap" x1={W1} y1={104} x2={W2} y2={104} />
      <line className="spc-gap-tick" x1={W1} y1={99} x2={W1} y2={109} />
      <line className="spc-gap-tick" x1={W2} y1={99} x2={W2} y2={109} />
      <text className="sfs-sub sfs-sub-accent" x={SPEC_C} y={122} textAnchor="middle">
        gap
      </text>
      <text className="sfs-cap" x={SPEC_C} y={144} textAnchor="middle">
        k-linearized spectrum
      </text>
      <text className="sfs-sub" x={SPEC_C} y={157} textAnchor="middle">
        two Gaussian sub-windows, &sigma; and gap tuned
      </text>

      <path className="sfs-arrow" d="M212 58 l6 5 l-6 5" />
      <text className="sfs-sub" x={236} y={40}>
        IFFT, log, z-score
      </text>

      <rect className="trk-frame spc-view-1" x={236} y={48} width={132} height={54} rx={3} />
      <Speckle x={238} y={50} w={128} h={50} n={22} seed={5} />
      <Structure x={246} y={66} w={112} />
      <text className="sfs-sub" x={302} y={116} textAnchor="middle">
        sub-band 1
      </text>

      <rect className="trk-frame spc-view-2" x={388} y={48} width={132} height={54} rx={3} />
      <Speckle x={390} y={50} w={128} h={50} n={22} seed={41} />
      <Structure x={398} y={66} w={112} />
      <text className="sfs-sub" x={454} y={116} textAnchor="middle">
        sub-band 2
      </text>

      <text className="sfs-cap sfs-cap-accent" x={410} y={144} textAnchor="middle">
        shared structure, independent speckle
      </text>
      <text className="sfs-sub" x={410} y={157} textAnchor="middle">
        speckle realization depends on spectral support
      </text>
    </svg>
  );
}

/* ============================================================
   Panel 2: the ResUNet, as implemented
   ============================================================ */

const NB = 15; // block height
const NC = 268; // centre line, encoder and decoder mirrored about it
const NHALF = 56;
const NENC = NC - NHALF;
const NDEC = NC + NHALF;

/* four scales, channel counts as implemented (base = 64) */
const LV = [
  { y: 34, w: 86, ch: "64" },
  { y: 70, w: 66, ch: "128" },
  { y: 106, w: 48, ch: "256" },
];
const BOT = { y: 142, w: 34, ch: "512" };
const nmid = (i: number) => LV[i].y + NB / 2;

/* clear of the widest decoder block, which ends at NDEC + 86 = 410 */
const OUTX = 420;
const OUTW = 116;
const OUTMID = OUTX + OUTW / 2;

function NetPanel() {
  return (
    <svg
      className="sfs-svg"
      viewBox="0 0 560 226"
      role="img"
      aria-label="The two sub-band reconstructions are stacked and mixed by a 3D convolution across the sub-band axis, then encoded from 64 to 512 channels over four scales with residual blocks, decoded with transposed convolutions and concatenated skips, and scored against the full-bandwidth reconstruction with a Charbonnier and gradient-L1 loss."
    >
      <defs>
        <linearGradient id="spc-blk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b7a63" />
          <stop offset="1" stopColor="#5b4e40" />
        </linearGradient>
      </defs>

      {/* --- input: two sub-bands stacked as a depth-2 volume --- */}
      <rect className="trk-frame spc-view-2" x={16} y={34} width={50} height={24} rx={2.5} />
      <rect className="trk-frame spc-view-1" x={10} y={44} width={50} height={24} rx={2.5} />
      <text className="sfs-sub" x={35} y={84} textAnchor="middle">
        2 sub-bands
      </text>

      {/* the pseudo-3D stem: a 3D kernel spanning the sub-band axis */}
      <rect className="spc-stem" x={80} y={34} width={44} height={34} rx={3} />
      <text className="spc-stem-label" x={102} y={55} textAnchor="middle">
        3D
      </text>
      <text className="sfs-sub sfs-sub-accent" x={102} y={84} textAnchor="middle">
        stem
      </text>
      <text className="sfs-sub" x={102} y={97} textAnchor="middle">
        conv across
      </text>
      <text className="sfs-sub" x={102} y={109} textAnchor="middle">
        sub-band axis
      </text>

      {/* --- contracting path, expanding path, mirrored --- */}
      {LV.map((l, i) => (
        <g key={i}>
          <rect className="spc-block" x={NENC - l.w} y={l.y} width={l.w} height={NB} rx={3} />
          <rect className="spc-block" x={NDEC} y={l.y} width={l.w} height={NB} rx={3} />
          <text className="spc-ch" x={NENC - l.w - 6} y={l.y + 11} textAnchor="end">
            {l.ch}
          </text>
          {/* skips are concatenated, then fused by a 3x3 convolution */}
          <path
            className="sfs-skip"
            d={`M${NENC} ${nmid(i)} C${NENC + 22} ${nmid(i) - 13} ${NDEC - 22} ${nmid(i) - 13} ${NDEC} ${nmid(i)}`}
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        </g>
      ))}
      <rect className="spc-block spc-latent" x={NC - BOT.w / 2} y={BOT.y} width={BOT.w} height={NB} rx={3} />
      <text className="spc-ch" x={NC - BOT.w / 2 - 6} y={BOT.y + 11} textAnchor="end">
        {BOT.ch}
      </text>
      <text className="sfs-sub" x={NC} y={BOT.y + 30} textAnchor="middle">
        residual blocks · SiLU · batch norm
      </text>
      <text className="sfs-tower" x={NENC - 44} y={20} textAnchor="middle">
        strided conv
      </text>
      <text className="sfs-tower" x={NDEC + 44} y={20} textAnchor="middle">
        transposed conv
      </text>
      <text className="sfs-sub sfs-sub-accent" x={NC} y={30} textAnchor="middle">
        concat skips
      </text>

      {/* --- prediction, target, and the objective between them --- */}
      <rect className="trk-frame spc-out" x={OUTX} y={30} width={OUTW} height={46} rx={3} />
      <Structure x={OUTX + 10} y={46} w={OUTW - 20} />
      <text className="sfs-cap sfs-cap-accent" x={OUTMID} y={90} textAnchor="middle">
        prediction
      </text>
      <text className="sfs-sub" x={OUTMID} y={103} textAnchor="middle">
        1&times;1 conv head
      </text>

      {/* the objective gets its own pill so the label has room to breathe */}
      <line className="spc-loss" x1={OUTMID} y1={104} x2={OUTMID} y2={118} />
      <rect className="spc-loss-pill" x={OUTX + 2} y={118} width={OUTW - 4} height={20} rx={10} />
      <text className="spc-loss-label" x={OUTMID} y={132} textAnchor="middle">
        Charbonnier + &nabla;L1
      </text>
      <line className="spc-loss" x1={OUTMID} y1={138} x2={OUTMID} y2={152} />

      <rect className="trk-frame spc-target" x={OUTX} y={152} width={OUTW} height={46} rx={3} />
      <Structure x={OUTX + 10} y={168} w={OUTW - 20} />
      <text className="sfs-cap" x={OUTMID} y={212} textAnchor="middle">
        full-bandwidth target
      </text>
    </svg>
  );
}

export default function SpectralSchematic() {
  return (
    <div className="sfs">
      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">1</span> Spectral sub-band decomposition
          <span className="sfs-badge">single acquisition</span>
        </h3>
        <div className="sfs-canvas">
          <SplitPanel />
        </div>
        <p className="sfs-note">
          Speckle is coherent interference, not additive noise, so its realization follows the spectral support used to reconstruct. Two Gaussian sub-windows separated by a gap give two images of identical structure whose speckle is decorrelated. Wider gap, less correlation, lower axial resolution: the gap is the knob.
        </p>
      </section>

      <div className="sfs-bridge" aria-hidden="true">
        <span className="sfs-bridge-line" />
        <span className="sfs-bridge-text">full-band reconstruction supplies the target</span>
        <span className="sfs-bridge-line" />
      </div>

      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">2</span> ResUNet reconstruction
          <span className="sfs-badge sfs-badge-live">no clean reference</span>
        </h3>
        <div className="sfs-canvas">
          <NetPanel />
        </div>
        <p className="sfs-note">
          The sub-bands are stacked and mixed by a 3D convolution spanning the sub-band axis before any 2D processing, so the network sees them as one volume rather than as stacked channels. A residual encoder-decoder then runs 64 to 512 channels over four scales with concatenated skips. Training targets the full-bandwidth reconstruction under Charbonnier plus a gradient term, the gradient term being what stops the result going smooth.
        </p>
      </section>
    </div>
  );
}
