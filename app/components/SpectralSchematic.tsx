/**
 * SpectralSchematic: getting two independent looks at one scene out of a
 * single acquisition, and then using them as their own supervision.
 *
 * The idea rests on one physical fact. Speckle is not additive noise
 * sprinkled on a picture, it is interference, and which interference
 * pattern you get depends on which part of the spectrum you kept. So if
 * the raw interferogram is split into two separated sub-bands and each is
 * reconstructed on its own, the two results show the same structure with
 * different speckle. Anything present in both is signal; anything that
 * moves between them is not.
 *
 * That makes the supervision free: the target is the reconstruction from
 * the whole spectrum, which was always available, so no clean reference
 * image and no repeat acquisition is needed.
 *
 * Panel 1 is the split. Panel 2 is the network that exploits it.
 */

/** A Gaussian, as an SVG path. Used for the source spectrum and the two
    sub-windows cut out of it. */
function gaussian(
  cx: number,
  amp: number,
  sigma: number,
  base: number,
  from: number,
  to: number,
  step = 4
) {
  const pts: string[] = [];
  for (let x = from; x <= to; x += step) {
    const y = base - amp * Math.exp(-((x - cx) ** 2) / (2 * sigma ** 2));
    pts.push(`${pts.length ? "L" : "M"}${x} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

const BASE = 92; // spectrum baseline
const SPEC_L = 24;
const SPEC_R = 194;
const SPEC_C = (SPEC_L + SPEC_R) / 2;
const GAP = 34; // separation between the two window centres
const W1 = SPEC_C - GAP / 2;
const W2 = SPEC_C + GAP / 2;

/* ============================================================
   Panel 1: one acquisition, two views
   ============================================================ */

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

/** The shared structure both views agree on: two steady layer curves. */
function Structure({ x, y, w }: { x: number; y: number; w: number }) {
  const h = w / 2;
  return (
    <g className="spc-structure">
      <path d={`M${x} ${y} q${h / 2} -5 ${h} 0 q${h / 2} 5 ${h} 0`} />
      <path d={`M${x} ${y + 13} q${h / 2} -5 ${h} 0 q${h / 2} 5 ${h} 0`} />
    </g>
  );
}

function SplitPanel() {
  return (
    <svg
      className="sfs-svg"
      viewBox="0 0 560 176"
      role="img"
      aria-label="The raw spectrum is split into two Gaussian sub-windows separated by a tunable gap. Each is reconstructed separately, giving two images with identical structure but independent speckle."
    >
      {/* --- the source spectrum, with two windows cut from it --- */}
      <path className="spc-envelope" d={gaussian(SPEC_C, 56, 42, BASE, SPEC_L, SPEC_R)} />
      <path className="spc-win spc-win-1" d={`${gaussian(W1, 40, 13, BASE, SPEC_L, SPEC_R, 3)} L${SPEC_R} ${BASE} L${SPEC_L} ${BASE} Z`} />
      <path className="spc-win spc-win-2" d={`${gaussian(W2, 40, 13, BASE, SPEC_L, SPEC_R, 3)} L${SPEC_R} ${BASE} L${SPEC_L} ${BASE} Z`} />
      <line className="spc-axis" x1={SPEC_L} y1={BASE} x2={SPEC_R} y2={BASE} />

      {/* the gap, which is the one knob that matters */}
      <line className="spc-gap" x1={W1} y1={104} x2={W2} y2={104} />
      <line className="spc-gap-tick" x1={W1} y1={99} x2={W1} y2={109} />
      <line className="spc-gap-tick" x1={W2} y1={99} x2={W2} y2={109} />
      <text className="sfs-sub sfs-sub-accent" x={SPEC_C} y={122} textAnchor="middle">
        gap
      </text>
      <text className="sfs-cap" x={SPEC_C} y={144} textAnchor="middle">
        one raw spectrum
      </text>
      <text className="sfs-sub" x={SPEC_C} y={157} textAnchor="middle">
        two sub-windows cut from it
      </text>

      <path className="sfs-arrow" d="M212 58 l6 5 l-6 5" />
      <text className="sfs-sub" x={236} y={40}>
        reconstruct each
      </text>

      {/* --- two reconstructions: same structure, different speckle --- */}
      <rect className="trk-frame spc-view-1" x={236} y={48} width={132} height={54} rx={3} />
      <Speckle x={238} y={50} w={128} h={50} n={22} seed={5} />
      <Structure x={246} y={66} w={112} />
      <text className="sfs-sub" x={302} y={116} textAnchor="middle">
        view from window 1
      </text>

      <rect className="trk-frame spc-view-2" x={388} y={48} width={132} height={54} rx={3} />
      <Speckle x={390} y={50} w={128} h={50} n={22} seed={41} />
      <Structure x={398} y={66} w={112} />
      <text className="sfs-sub" x={454} y={116} textAnchor="middle">
        view from window 2
      </text>

      <text className="sfs-cap sfs-cap-accent" x={410} y={144} textAnchor="middle">
        same structure, different speckle
      </text>
      <text className="sfs-sub" x={410} y={157} textAnchor="middle">
        the layers hold still, the grain does not
      </text>
    </svg>
  );
}

/* ============================================================
   Panel 2: the network, and where the target comes from
   ============================================================ */

const NB = 16; // block height
const LV = [
  { y: 40, w: 84 },
  { y: 76, w: 60 },
  { y: 112, w: 40 },
];
const NC = 268; // centre line
const NGAP = 52;
const NENC = NC - NGAP;
const NDEC = NC + NGAP;
const nmid = (i: number) => LV[i].y + NB / 2;

function NetPanel() {
  return (
    <svg
      className="sfs-svg"
      viewBox="0 0 560 186"
      role="img"
      aria-label="The two sub-band views enter a ResUNet as separate channels. It is trained to output the reconstruction from the full spectrum, so the supervision needs no clean reference image."
    >
      <defs>
        <linearGradient id="spc-blk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b7a63" />
          <stop offset="1" stopColor="#5b4e40" />
        </linearGradient>
      </defs>

      {/* --- the two views, stacked as channels --- */}
      <rect className="trk-frame spc-view-1" x={12} y={44} width={54} height={26} rx={2.5} />
      <rect className="trk-frame spc-view-2" x={12} y={76} width={54} height={26} rx={2.5} />
      <path className="spc-merge" d="M66 57 C86 57 86 73 100 73" />
      <path className="spc-merge" d="M66 89 C86 89 86 73 100 73" />
      <text className="sfs-cap" x={39} y={122} textAnchor="middle">
        2 channels
      </text>
      <text className="sfs-sub" x={39} y={135} textAnchor="middle">
        one acquisition
      </text>

      {/* --- encoder / decoder, mirrored about NC --- */}
      {LV.map((l, i) => (
        <g key={i}>
          <rect className="spc-block" x={NENC - l.w} y={l.y} width={l.w} height={NB} rx={3} />
          <rect className="spc-block" x={NDEC} y={l.y} width={l.w} height={NB} rx={3} />
          <path
            className="sfs-skip"
            d={`M${NENC} ${nmid(i)} C${NENC + 20} ${nmid(i) - 12} ${NDEC - 20} ${nmid(i) - 12} ${NDEC} ${nmid(i)}`}
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        </g>
      ))}
      <rect className="spc-block spc-latent" x={NC - 30} y={146} width={60} height={NB} rx={3} />
      <text className="sfs-sub" x={NC} y={142} textAnchor="middle">
        residual blocks
      </text>
      <text className="sfs-tower" x={NENC - 42} y={30} textAnchor="middle">
        encoder
      </text>
      <text className="sfs-tower" x={NDEC + 42} y={30} textAnchor="middle">
        decoder
      </text>

      {/* --- output, and the target it is scored against --- */}
      <rect className="trk-frame spc-out" x={412} y={38} width={112} height={44} rx={3} />
      <Structure x={422} y={54} w={92} />
      <text className="sfs-cap sfs-cap-accent" x={468} y={98} textAnchor="middle">
        prediction
      </text>

      <rect className="trk-frame spc-target" x={412} y={112} width={112} height={44} rx={3} />
      <Structure x={422} y={128} w={92} />
      <text className="sfs-cap" x={468} y={172} textAnchor="middle">
        full spectrum, kept as target
      </text>

      {/* the comparison, which is the whole trick */}
      <line className="spc-loss" x1={468} y1={82} x2={468} y2={112} />
      <text className="sfs-sub sfs-sub-accent" x={478} y={102}>
        loss
      </text>
    </svg>
  );
}

export default function SpectralSchematic() {
  return (
    <div className="sfs">
      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">1</span> Two views, one acquisition
          <span className="sfs-badge">no repeat frames</span>
        </h3>
        <div className="sfs-canvas">
          <SplitPanel />
        </div>
        <p className="sfs-note">
          Speckle is not dirt on the lens, it is interference, and the pattern you
          get depends on which slice of the spectrum you kept. So splitting the raw
          interferogram into two Gaussian sub-windows and reconstructing each
          separately buys two looks at the same scene: identical structure, because
          the sample did not move, and uncorrelated grain, because the physics that
          produced it changed. The separation between those windows is the one knob
          that really matters, and it is tuned with Optuna rather than by eye.
        </p>
      </section>

      <div className="sfs-bridge" aria-hidden="true">
        <span className="sfs-bridge-line" />
        <span className="sfs-bridge-text">now the supervision is free</span>
        <span className="sfs-bridge-line" />
      </div>

      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">2</span> Learning what they agree on
          <span className="sfs-badge sfs-badge-live">no clean reference</span>
        </h3>
        <div className="sfs-canvas">
          <NetPanel />
        </div>
        <p className="sfs-note">
          The two views go in as separate channels of a ResUNet, and the target is
          the reconstruction from the whole spectrum, which cost nothing extra
          because it was in the raw data all along. That is what makes this
          self-supervised in the useful sense: no clean ground truth was ever
          acquired, and nothing was averaged. A Charbonnier loss keeps outliers from
          dominating while a gradient term protects edges, which matters because the
          easiest way to win a denoising loss is to blur everything.
        </p>
      </section>
    </div>
  );
}
