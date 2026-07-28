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
 * Panel 2 draws the production NAFNet (base 64) as it is built in
 * octdenoiser.networks.nafnet: intro 3×3, four encoder stages with
 * (1, 1, 1, 2) NAFBlocks at 64/128/256/512 channels, a middle of two
 * NAFBlocks at 1024, four PixelShuffle decoder stages with (1, 1, 1, 1)
 * blocks and additive skips, then an ending 3×3. The NAFBlock callout is
 * the same path: LayerNorm → expanded DW conv → SimpleGate → simplified
 * channel attention → residual, then a gated FFN residual. Counts and
 * channel widths come from the architecture defaults, not from a measured
 * table — do not invent other numbers here.
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
        dispersion compensated
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

   Production defaults from octdenoiser.networks.nafnet.NAFNet:
     enc_blocks=(1, 1, 1, 2), middle_blocks=2, dec_blocks=(1, 1, 1, 1)
     base=64 → channels 64 / 128 / 256 / 512 / 1024
   ============================================================ */

type Stage = { ch: number; blocks: number; label: string };

const ENC: Stage[] = [
  { ch: 64, blocks: 1, label: "E1" },
  { ch: 128, blocks: 1, label: "E2" },
  { ch: 256, blocks: 1, label: "E3" },
  { ch: 512, blocks: 2, label: "E4" },
];
const MID: Stage = { ch: 1024, blocks: 2, label: "M" };
/* Decoder listed shallow→deep so index i pairs with ENC[i] on the same skip. */
const DEC: Stage[] = [
  { ch: 64, blocks: 1, label: "D1" },
  { ch: 128, blocks: 1, label: "D2" },
  { ch: 256, blocks: 1, label: "D3" },
  { ch: 512, blocks: 1, label: "D4" },
];

const UNIT_H = 9; // one NAFBlock strip
const UNIT_GAP = 2;
const STAGE_PAD = 3;
const stageH = (blocks: number) => STAGE_PAD * 2 + blocks * UNIT_H + (blocks - 1) * UNIT_GAP;

/* Horizontal layout of the U: encoder left of centre, decoder right. */
const NC = 248;
const GAP = 52;
const ENC_R = NC - GAP;
const DEC_L = NC + GAP;

/* Vertical positions for the four paired scales, then the middle below.
   Leave room under each stack for the channel label (spc-ch). */
const SCALE_Y = [36, 74, 112, 150];
const MID_Y = 200;

function StageStack({
  x,
  y,
  w,
  stage,
  align,
}: {
  x: number;
  y: number;
  w: number;
  stage: Stage;
  align: "right" | "left" | "center";
}) {
  const h = stageH(stage.blocks);
  const left = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
  const cx = left + w / 2;
  const units = Array.from({ length: stage.blocks }, (_, i) => (
    <rect
      key={i}
      className="spc-unit"
      x={left + STAGE_PAD}
      y={y + STAGE_PAD + i * (UNIT_H + UNIT_GAP)}
      width={w - STAGE_PAD * 2}
      height={UNIT_H}
      rx={1.5}
    />
  ));
  return (
    <g>
      <rect className="spc-block" x={left} y={y} width={w} height={h} rx={3} />
      {units}
      <text className="spc-ch" x={cx} y={y + h + 10} textAnchor="middle">
        {stage.ch}
        {stage.blocks > 1 ? ` · ×${stage.blocks}` : ""}
      </text>
    </g>
  );
}

function NetPanel() {
  const encW = [78, 66, 54, 44];
  const decW = [...encW];
  const midW = 50;
  const outX = 422;
  const outW = 118;
  const outMid = outX + outW / 2;

  return (
    <svg
      className="sfs-svg"
      viewBox="0 0 560 332"
      role="img"
      aria-label="One raw B-scan enters a NAFNet: a 3 by 3 intro convolution, four encoder stages of NAF blocks at 64, 128, 256 and 512 channels, a middle of two NAF blocks at 1024, four PixelShuffle decoder stages with additive skip connections, and a 3 by 3 ending convolution that leaves as a denoised prediction scored against the adjacent frame."
    >
      <defs>
        <linearGradient id="spc-blk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b7a63" />
          <stop offset="1" stopColor="#5b4e40" />
        </linearGradient>
        <linearGradient id="spc-unit" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c4a882" />
          <stop offset="1" stopColor="#8b7355" />
        </linearGradient>
        <marker id="spc-arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 Z" className="spc-marker" />
        </marker>
      </defs>

      {/* --- input --- */}
      <rect className="trk-frame spc-view-1" x={8} y={28} width={48} height={30} rx={2.5} />
      <Speckle x={10} y={30} w={44} h={26} n={12} seed={5} />
      <text className="sfs-cap" x={32} y={72} textAnchor="middle">
        frame p
      </text>
      <text className="sfs-sub" x={32} y={84} textAnchor="middle">
        1 ch
      </text>

      {/* intro 3×3 */}
      <path className="spc-flow" d="M58 43 H78" markerEnd="url(#spc-arrowhead)" />
      <rect className="spc-io" x={80} y={34} width={36} height={18} rx={3} />
      <text className="spc-io-label" x={98} y={46} textAnchor="middle">
        3×3
      </text>
      <text className="sfs-sub" x={98} y={64} textAnchor="middle">
        intro
      </text>

      <path className="spc-flow" d={`M116 43 H${ENC_R - encW[0] - 2}`} markerEnd="url(#spc-arrowhead)" />

      <text className="sfs-tower" x={ENC_R - 40} y={22} textAnchor="middle">
        encoder
      </text>
      <text className="sfs-tower" x={DEC_L + 40} y={22} textAnchor="middle">
        decoder
      </text>
      <text className="sfs-sub sfs-sub-accent" x={NC} y={22} textAnchor="middle">
        skip +
      </text>

      {ENC.map((stage, i) => {
        const y = SCALE_Y[i];
        const eh = stageH(stage.blocks);
        const dw = decW[i];
        const dh = stageH(DEC[i].blocks);
        const ey = y + eh / 2;
        const dy = y + dh / 2;
        return (
          <g key={stage.label}>
            <StageStack x={ENC_R} y={y} w={encW[i]} stage={stage} align="right" />
            <StageStack x={DEC_L} y={y} w={dw} stage={DEC[i]} align="left" />
            <path
              className="sfs-skip"
              d={`M${ENC_R} ${ey} C${ENC_R + 18} ${ey - 12} ${DEC_L - 18} ${dy - 12} ${DEC_L} ${dy}`}
              style={{ animationDelay: `${i * 0.18}s` }}
            />
            {i < ENC.length - 1 && (
              <>
                <path
                  className="spc-flow"
                  d={`M${ENC_R - encW[i] / 2} ${y + eh} V${SCALE_Y[i + 1]}`}
                  markerEnd="url(#spc-arrowhead)"
                />
                <path
                  className="spc-flow"
                  d={`M${DEC_L + decW[i + 1] / 2} ${SCALE_Y[i + 1]} V${y + dh}`}
                  markerEnd="url(#spc-arrowhead)"
                />
              </>
            )}
          </g>
        );
      })}

      <text className="sfs-sub" x={DEC_L + decW[0] + 6} y={SCALE_Y[0] + 11}>
        PixelShuffle ↑
      </text>
      <text className="sfs-sub" x={ENC_R - encW[0] - 6} y={SCALE_Y[1] - 4} textAnchor="end">
        stride-2 ↓
      </text>

      {/* deepest encoder → middle → deepest decoder */}
      <path
        className="spc-flow"
        d={`M${ENC_R - encW[3] / 2} ${SCALE_Y[3] + stageH(ENC[3].blocks) + 1} V${MID_Y - 2}`}
        markerEnd="url(#spc-arrowhead)"
      />
      <StageStack x={NC} y={MID_Y} w={midW} stage={MID} align="center" />
      <text className="sfs-sub sfs-sub-accent" x={NC} y={MID_Y + stageH(MID.blocks) + 12} textAnchor="middle">
        middle · 2 × NAFBlock @ 1024
      </text>
      <path
        className="spc-flow"
        d={`M${NC + midW / 2 + 2} ${MID_Y + stageH(MID.blocks) / 2} H${DEC_L + decW[3] / 2} V${SCALE_Y[3] + stageH(DEC[3].blocks) + 2}`}
        markerEnd="url(#spc-arrowhead)"
      />

      {/* shallowest decoder → ending → prediction */}
      <path
        className="spc-flow"
        d={`M${DEC_L + decW[0]} ${SCALE_Y[0] + stageH(DEC[0].blocks) / 2} H${outX - 44}`}
        markerEnd="url(#spc-arrowhead)"
      />
      <rect className="spc-io" x={outX - 40} y={SCALE_Y[0] + 4} width={36} height={18} rx={3} />
      <text className="spc-io-label" x={outX - 22} y={SCALE_Y[0] + 16} textAnchor="middle">
        3×3
      </text>
      <text className="sfs-sub" x={outX - 22} y={SCALE_Y[0] + 34} textAnchor="middle">
        ending
      </text>
      <path className="spc-flow" d={`M${outX - 4} ${SCALE_Y[0] + 13} H${outX + 2}`} markerEnd="url(#spc-arrowhead)" />

      <rect className="trk-frame spc-out" x={outX} y={28} width={outW} height={40} rx={3} />
      <Structure x={outX + 10} y={42} w={outW - 20} />
      <text className="sfs-cap sfs-cap-accent" x={outMid} y={82} textAnchor="middle">
        prediction
      </text>
      <text className="sfs-sub" x={outMid} y={94} textAnchor="middle">
        22.4 ms · 27.11M
      </text>

      <line className="spc-loss" x1={outMid} y1={96} x2={outMid} y2={108} />
      <rect className="spc-loss-pill" x={outX + 8} y={108} width={outW - 16} height={18} rx={9} />
      <text className="spc-loss-label" x={outMid} y={120} textAnchor="middle">
        loss
      </text>
      <line className="spc-loss" x1={outMid} y1={126} x2={outMid} y2={138} />

      <rect className="trk-frame spc-target" x={outX} y={138} width={outW} height={40} rx={3} />
      <Speckle x={outX + 3} y={140} w={outW - 6} h={36} n={14} seed={41} />
      <Structure x={outX + 10} y={152} w={outW - 20} />
      <text className="sfs-cap" x={outMid} y={192} textAnchor="middle">
        frame p + 1, as target
      </text>

      {/* --- NAFBlock anatomy callout --- */}
      <rect className="spc-callout" x={8} y={250} width={400} height={72} rx={6} />
      <text className="sfs-cap sfs-cap-accent" x={20} y={268}>
        one NAFBlock
      </text>
      <text className="sfs-sub" x={108} y={268}>
        nonlinearity is a gate, not an activation
      </text>

      <rect className="spc-call-step" x={20} y={278} width={34} height={16} rx={2} />
      <text className="spc-call-label" x={37} y={289} textAnchor="middle">
        LN
      </text>
      <path className="spc-flow" d="M56 286 H64" markerEnd="url(#spc-arrowhead)" />
      <rect className="spc-call-step" x={66} y={278} width={38} height={16} rx={2} />
      <text className="spc-call-label" x={85} y={289} textAnchor="middle">
        1×1 ↑
      </text>
      <path className="spc-flow" d="M106 286 H114" markerEnd="url(#spc-arrowhead)" />
      <rect className="spc-call-step" x={116} y={278} width={42} height={16} rx={2} />
      <text className="spc-call-label" x={137} y={289} textAnchor="middle">
        DW 3×3
      </text>
      <path className="spc-flow" d="M160 286 H168" markerEnd="url(#spc-arrowhead)" />
      <rect className="spc-call-step spc-call-key" x={170} y={278} width={48} height={16} rx={2} />
      <text className="spc-call-label" x={194} y={289} textAnchor="middle">
        Gate
      </text>
      <path className="spc-flow" d="M220 286 H228" markerEnd="url(#spc-arrowhead)" />
      <rect className="spc-call-step spc-call-key" x={230} y={278} width={36} height={16} rx={2} />
      <text className="spc-call-label" x={248} y={289} textAnchor="middle">
        SCA
      </text>
      <path className="spc-flow" d="M268 286 H276" markerEnd="url(#spc-arrowhead)" />
      <rect className="spc-call-step" x={278} y={278} width={38} height={16} rx={2} />
      <text className="spc-call-label" x={297} y={289} textAnchor="middle">
        1×1 ↓
      </text>
      <text className="sfs-sub sfs-sub-accent" x={328} y={289}>
        + β residual
      </text>

      <rect className="spc-call-step" x={20} y={300} width={34} height={16} rx={2} />
      <text className="spc-call-label" x={37} y={311} textAnchor="middle">
        LN
      </text>
      <path className="spc-flow" d="M56 308 H64" markerEnd="url(#spc-arrowhead)" />
      <rect className="spc-call-step" x={66} y={300} width={38} height={16} rx={2} />
      <text className="spc-call-label" x={85} y={311} textAnchor="middle">
        1×1 ↑
      </text>
      <path className="spc-flow" d="M106 308 H114" markerEnd="url(#spc-arrowhead)" />
      <rect className="spc-call-step spc-call-key" x={116} y={300} width={48} height={16} rx={2} />
      <text className="spc-call-label" x={140} y={311} textAnchor="middle">
        Gate
      </text>
      <path className="spc-flow" d="M166 308 H174" markerEnd="url(#spc-arrowhead)" />
      <rect className="spc-call-step" x={176} y={300} width={38} height={16} rx={2} />
      <text className="spc-call-label" x={195} y={311} textAnchor="middle">
        1×1 ↓
      </text>
      <text className="sfs-sub sfs-sub-accent" x={226} y={311}>
        + γ residual
      </text>
      <text className="sfs-sub" x={320} y={311}>
        SimpleGate = split × multiply
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
          Speckle is coherent interference, not additive noise, so the realization is fixed by which scatterers the beam illuminates. Two B-scans one position apart resolve the same structure from a different scatterer distribution: the structure repeats and the speckle does not. Neither frame is derived from the other, which is the property a self-supervised pair lives or dies on.
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
          One raw frame in, one denoised frame out; the paired frame is only ever a target, never an input. NAFNet at base width 64: a 3×3 intro, four encoder stages of NAFBlocks (1 / 1 / 1 / 2) at 64→128→256→512, a middle of two blocks at 1024, then four PixelShuffle decoder stages (1 each) with additive skips and a 3×3 ending — 27.11M parameters, 22.4 ms per frame. Each NAFBlock gets its nonlinearity from SimpleGate (split channels and multiply) plus a simplified channel attention, not from ReLU or GELU. Volumes are split into contiguous blocks rather than shuffled, because a shuffled split puts a frame&rsquo;s own neighbour on the other side of it.
        </p>
      </section>
    </div>
  );
}
