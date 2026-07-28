/**
 * SpeckleSchematic: where the supervision comes from, and the network that
 * consumes it.
 *
 * Panel 1 is the argument for the pair. Speckle is interference, not additive
 * noise, so the realization is fixed by which scatterers the beam illuminates.
 * Two B-scans one position apart resolve the same structure from a different
 * scatterer distribution, and — the part that actually decides whether a
 * self-supervised pair is worth anything — neither frame is derived from the
 * other, so the target carries no copy of the input.
 *
 * Panel 2 draws the production model: NAFNet at base width 64, 27.11M
 * parameters, 22.4 ms per frame, an encoder-decoder of NAF blocks joined by
 * skip connections. What is deliberately NOT drawn is block counts per scale
 * and the loss expression. Nothing here can verify either, and a diagram that
 * asserts a number it cannot check is exactly how the previous version of this
 * component ended up illustrating a method that had been retired.
 */

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

/** Layer boundaries: identical in both frames of the pair, which is the point. */
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
   Panel 1: the pair, drawn out of one volume
   ============================================================ */

/* Eleven B-scans in scan order. The two that form the pair are adjacent by
   construction: any wider spacing and the structure stops being the same
   structure, which is the constraint the whole method sits inside. */
const SLABS = 11;
const SL_X = 24; // left edge of the first slab
const SL_STEP = 14;
const SL_W = 10;
const PAIR = 4; // the pair is PAIR and PAIR + 1
const slabX = (i: number) => SL_X + i * SL_STEP;
const STACK_MID = (SL_X + slabX(SLABS - 1) + SL_W) / 2;
const PAIR_L = slabX(PAIR);
const PAIR_R = slabX(PAIR + 1) + SL_W;
const PAIR_MID = (PAIR_L + PAIR_R) / 2;

function PairPanel() {
  return (
    <svg
      className="sfs-svg"
      viewBox="0 0 560 176"
      role="img"
      aria-label="Two B-scans from adjacent positions in a single volume are used as a supervision pair: both show the same structure, while the speckle differs because a different set of scatterers is illuminated at each position."
    >
      {[...Array(SLABS)].map((_, i) => (
        <rect
          key={i}
          className={i === PAIR || i === PAIR + 1 ? "sfs-slab spc-pair" : "sfs-slab"}
          x={slabX(i)}
          y={48}
          width={SL_W}
          height={54}
          rx={1.5}
          style={{ animationDelay: `${i * 0.11}s` }}
        />
      ))}

      <line className="spc-gap" x1={PAIR_L} y1={110} x2={PAIR_R} y2={110} />
      <line className="spc-gap-tick" x1={PAIR_L} y1={105} x2={PAIR_L} y2={115} />
      <line className="spc-gap-tick" x1={PAIR_R} y1={105} x2={PAIR_R} y2={115} />
      <text className="sfs-sub sfs-sub-accent" x={PAIR_MID} y={126} textAnchor="middle">
        the pair
      </text>
      <text className="sfs-cap" x={STACK_MID} y={144} textAnchor="middle">
        one volume, in scan order
      </text>
      <text className="sfs-sub" x={STACK_MID} y={157} textAnchor="middle">
        no repeat acquisition
      </text>

      <path className="sfs-arrow" d="M212 58 l6 5 l-6 5" />
      <text className="sfs-sub" x={236} y={40}>
        adjacent B-scans
      </text>

      <rect className="trk-frame spc-view-1" x={236} y={48} width={132} height={54} rx={3} />
      <Speckle x={238} y={50} w={128} h={50} n={22} seed={5} />
      <Structure x={246} y={66} w={112} />
      <text className="sfs-sub" x={302} y={116} textAnchor="middle">
        frame p
      </text>

      <rect className="trk-frame spc-view-2" x={388} y={48} width={132} height={54} rx={3} />
      <Speckle x={390} y={50} w={128} h={50} n={22} seed={41} />
      <Structure x={398} y={66} w={112} />
      <text className="sfs-sub" x={454} y={116} textAnchor="middle">
        frame p + 1
      </text>

      <text className="sfs-cap sfs-cap-accent" x={410} y={144} textAnchor="middle">
        shared structure, independent speckle
      </text>
      <text className="sfs-sub" x={410} y={157} textAnchor="middle">
        a different scatterer distribution at each position
      </text>
    </svg>
  );
}

/* ============================================================
   Panel 2: the NAFNet, and what it is scored against
   ============================================================ */

const NB = 15; // block height
const NC = 268; // centre line, encoder and decoder mirrored about it
const NHALF = 56;
const NENC = NC - NHALF;
const NDEC = NC + NHALF;

/* Three scales and a bottom, drawn as a shape rather than as a channel table:
   the widths taper because the maps do, and no count is claimed. */
const LV = [
  { y: 34, w: 86 },
  { y: 70, w: 66 },
  { y: 106, w: 48 },
];
const BOT = { y: 142, w: 34 };
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
      aria-label="One raw B-scan enters a NAFNet encoder-decoder joined by skip connections and leaves as a denoised prediction, which is scored during training against the raw frame from the adjacent position."
    >
      <defs>
        <linearGradient id="spc-blk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b7a63" />
          <stop offset="1" stopColor="#5b4e40" />
        </linearGradient>
      </defs>

      {/* --- input: one raw frame, speckle and all --- */}
      <rect className="trk-frame spc-view-1" x={12} y={38} width={56} height={34} rx={2.5} />
      <Speckle x={14} y={40} w={52} h={30} n={14} seed={5} />
      <text className="sfs-cap" x={40} y={88} textAnchor="middle">
        frame p
      </text>
      <text className="sfs-sub" x={40} y={101} textAnchor="middle">
        one B-scan
      </text>
      <path className="sfs-arrow" d="M88 50 l6 5 l-6 5" />

      {/* --- contracting path, expanding path, mirrored --- */}
      {LV.map((l, i) => (
        <g key={i}>
          <rect className="spc-block" x={NENC - l.w} y={l.y} width={l.w} height={NB} rx={3} />
          <rect className="spc-block" x={NDEC} y={l.y} width={l.w} height={NB} rx={3} />
          <path
            className="sfs-skip"
            d={`M${NENC} ${nmid(i)} C${NENC + 22} ${nmid(i) - 13} ${NDEC - 22} ${nmid(i) - 13} ${NDEC} ${nmid(i)}`}
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        </g>
      ))}
      <rect className="spc-block spc-latent" x={NC - BOT.w / 2} y={BOT.y} width={BOT.w} height={NB} rx={3} />
      <text className="sfs-sub" x={NC} y={BOT.y + 30} textAnchor="middle">
        NAF blocks · base width 64 · 27.11M parameters
      </text>
      <text className="sfs-sub" x={NC} y={BOT.y + 43} textAnchor="middle">
        gating and channel attention in place of activations
      </text>
      <text className="sfs-tower" x={NENC - 44} y={20} textAnchor="middle">
        encoder
      </text>
      <text className="sfs-tower" x={NDEC + 44} y={20} textAnchor="middle">
        decoder
      </text>
      <text className="sfs-sub sfs-sub-accent" x={NC} y={30} textAnchor="middle">
        skip connections
      </text>

      {/* --- prediction, target, and the objective between them --- */}
      <rect className="trk-frame spc-out" x={OUTX} y={30} width={OUTW} height={46} rx={3} />
      <Structure x={OUTX + 10} y={46} w={OUTW - 20} />
      <text className="sfs-cap sfs-cap-accent" x={OUTMID} y={90} textAnchor="middle">
        prediction
      </text>
      <text className="sfs-sub" x={OUTMID} y={103} textAnchor="middle">
        22.4 ms / frame
      </text>

      {/* the objective gets its own pill so the label has room to breathe */}
      <line className="spc-loss" x1={OUTMID} y1={104} x2={OUTMID} y2={118} />
      <rect className="spc-loss-pill" x={OUTX + 2} y={118} width={OUTW - 4} height={20} rx={10} />
      <text className="spc-loss-label" x={OUTMID} y={132} textAnchor="middle">
        loss
      </text>
      <line className="spc-loss" x1={OUTMID} y1={138} x2={OUTMID} y2={152} />

      {/* The target keeps its speckle, and that is the whole idea rather than
          an oversight: the pair is two noisy frames, and only the structure
          they agree on survives the average the network is forced into. */}
      <rect className="trk-frame spc-target" x={OUTX} y={152} width={OUTW} height={46} rx={3} />
      <Speckle x={OUTX + 3} y={155} w={OUTW - 6} h={40} n={16} seed={41} />
      <Structure x={OUTX + 10} y={168} w={OUTW - 20} />
      <text className="sfs-cap" x={OUTMID} y={212} textAnchor="middle">
        frame p + 1, as target
      </text>
    </svg>
  );
}

export default function SpeckleSchematic() {
  return (
    <div className="sfs">
      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">1</span> Frame-pair supervision
          <span className="sfs-badge">single acquisition</span>
        </h3>
        <div className="sfs-canvas">
          <PairPanel />
        </div>
        <p className="sfs-note">
          OCT speckle is interference from scatterers in the beam, not ordinary camera noise. Two frames one position apart show the same anatomy with different speckle — and neither is derived from the other — which is what makes them a usable self-supervised pair.
        </p>
      </section>

      <div className="sfs-bridge" aria-hidden="true">
        <span className="sfs-bridge-line" />
        <span className="sfs-bridge-text">the adjacent frame supplies the target</span>
        <span className="sfs-bridge-line" />
      </div>

      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">2</span> NAFNet reconstruction
          <span className="sfs-badge sfs-badge-live">no clean reference</span>
        </h3>
        <div className="sfs-canvas">
          <NetPanel />
        </div>
        <p className="sfs-note">
          One raw frame in, one denoised frame out; the paired frame is only the training target. NAFNet (27.11M parameters, 22.4 ms per frame) uses gated NAF blocks instead of ReLU-style activations, keeping the reconstruction fast enough for interactive review.
        </p>
      </section>
    </div>
  );
}
