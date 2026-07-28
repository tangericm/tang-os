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
 *
 * Layout rule for panel 2: channel counts live INSIDE each stage so they
 * cannot collide with the down/up arrows, and annotations sit in the gutters.
 * The dense SVG also sets a min-width so the panel scrolls instead of crushing
 * labels when the projects window is narrow.
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

const UNIT_H = 10;
const UNIT_GAP = 2;
const STAGE_PAD = 4;
const stageH = (blocks: number) => STAGE_PAD * 2 + blocks * UNIT_H + Math.max(0, blocks - 1) * UNIT_GAP;

const NC = 250;
const GAP = 58;
const ENC_R = NC - GAP;
const DEC_L = NC + GAP;

/* Generous vertical rhythm so arrows have clear runway between stages. */
const SCALE_Y = [42, 88, 134, 180];
const MID_Y = 236;

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
      <text className="spc-ch" x={cx} y={y + h / 2 + 3.5} textAnchor="middle">
        {stage.blocks > 1 ? `${stage.ch}×${stage.blocks}` : stage.ch}
      </text>
    </g>
  );
}

type CallStep = { label: string; w: number; key?: boolean };

function CalloutRow({ y, steps, trail }: { y: number; steps: CallStep[]; trail: string }) {
  let x = 18;
  const nodes = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    nodes.push(
      <rect
        key={`b${i}`}
        className={s.key ? "spc-call-step spc-call-key" : "spc-call-step"}
        x={x}
        y={y}
        width={s.w}
        height={18}
        rx={3}
      />,
      <text key={`t${i}`} className="spc-call-label" x={x + s.w / 2} y={y + 12.5} textAnchor="middle">
        {s.label}
      </text>,
    );
    x += s.w;
    if (i < steps.length - 1) {
      nodes.push(
        <path
          key={`a${i}`}
          className="spc-flow"
          d={`M${x + 1} ${y + 9} H${x + 9}`}
          markerEnd="url(#spc-arrowhead)"
        />,
      );
      x += 12;
    }
  }
  nodes.push(
    <text key="trail" className="sfs-sub sfs-sub-accent" x={x + 8} y={y + 12.5}>
      {trail}
    </text>,
  );
  return <g>{nodes}</g>;
}

function NetPanel() {
  const encW = [72, 62, 52, 46];
  const decW = [...encW];
  const midW = 56;
  const outX = 438;
  const outW = 108;
  const outMid = outX + outW / 2;

  return (
    <svg
      className="sfs-svg sfs-svg-dense"
      viewBox="0 0 560 360"
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

      <rect className="trk-frame spc-view-1" x={10} y={36} width={44} height={28} rx={2.5} />
      <Speckle x={12} y={38} w={40} h={24} n={10} seed={5} />
      <text className="sfs-cap" x={32} y={80} textAnchor="middle">
        frame p
      </text>
      <text className="sfs-sub" x={32} y={92} textAnchor="middle">
        1 ch
      </text>

      <path className="spc-flow" d="M56 50 H74" markerEnd="url(#spc-arrowhead)" />
      <rect className="spc-io" x={76} y={41} width={34} height={18} rx={3} />
      <text className="spc-io-label" x={93} y={53} textAnchor="middle">
        3×3
      </text>
      <text className="sfs-sub" x={93} y={72} textAnchor="middle">
        intro
      </text>
      <path className="spc-flow" d={`M112 50 H${ENC_R - encW[0] - 4}`} markerEnd="url(#spc-arrowhead)" />

      <text className="sfs-tower" x={ENC_R - 36} y={24} textAnchor="middle">
        encoder
      </text>
      <text className="sfs-tower" x={DEC_L + 36} y={24} textAnchor="middle">
        decoder
      </text>
      <text className="sfs-sub sfs-sub-accent" x={NC} y={24} textAnchor="middle">
        skip +
      </text>

      <text className="sfs-sub" x={ENC_R - encW[0] - 10} y={SCALE_Y[0] + stageH(ENC[0].blocks) + 14} textAnchor="end">
        ↓ stride 2
      </text>
      <text className="sfs-sub" x={DEC_L + decW[0] + 10} y={SCALE_Y[0] + stageH(DEC[0].blocks) + 14}>
        ↑ PixelShuffle
      </text>

      {ENC.map((stage, i) => {
        const y = SCALE_Y[i];
        const eh = stageH(stage.blocks);
        const dw = decW[i];
        const dh = stageH(DEC[i].blocks);
        const ey = y + eh / 2;
        const dy = y + dh / 2;
        const downGap = (SCALE_Y[i + 1] ?? MID_Y) - (y + eh);
        return (
          <g key={stage.label}>
            <StageStack x={ENC_R} y={y} w={encW[i]} stage={stage} align="right" />
            <StageStack x={DEC_L} y={y} w={dw} stage={DEC[i]} align="left" />
            <path
              className="sfs-skip"
              d={`M${ENC_R} ${ey} C${ENC_R + 20} ${ey - 14} ${DEC_L - 20} ${dy - 14} ${DEC_L} ${dy}`}
              style={{ animationDelay: `${i * 0.18}s` }}
            />
            {i < ENC.length - 1 && downGap > 8 && (
              <>
                <path
                  className="spc-flow"
                  d={`M${ENC_R - encW[i] / 2} ${y + eh + 2} V${SCALE_Y[i + 1] - 2}`}
                  markerEnd="url(#spc-arrowhead)"
                />
                <path
                  className="spc-flow"
                  d={`M${DEC_L + decW[i + 1] / 2} ${SCALE_Y[i + 1] - 2} V${y + dh + 2}`}
                  markerEnd="url(#spc-arrowhead)"
                />
              </>
            )}
          </g>
        );
      })}

      <path
        className="spc-flow"
        d={`M${ENC_R - encW[3] / 2} ${SCALE_Y[3] + stageH(ENC[3].blocks) + 2} V${MID_Y - 3}`}
        markerEnd="url(#spc-arrowhead)"
      />
      <StageStack x={NC} y={MID_Y} w={midW} stage={MID} align="center" />
      <text className="sfs-sub sfs-sub-accent" x={NC + midW / 2 + 8} y={MID_Y + stageH(MID.blocks) / 2 + 3}>
        middle
      </text>
      <path
        className="spc-flow"
        d={`M${NC + midW / 2 + 2} ${MID_Y + stageH(MID.blocks) / 2} H${DEC_L + decW[3] / 2} V${SCALE_Y[3] + stageH(DEC[3].blocks) + 3}`}
        markerEnd="url(#spc-arrowhead)"
      />

      {/* Ending sits ABOVE the exit arrow so it cannot collide with PixelShuffle. */}
      <path
        className="spc-flow"
        d={`M${DEC_L + decW[0]} ${SCALE_Y[0] + stageH(DEC[0].blocks) / 2} H${outX - 8}`}
        markerEnd="url(#spc-arrowhead)"
      />
      <rect className="spc-io" x={outX - 78} y={SCALE_Y[0] - 22} width={52} height={18} rx={3} />
      <text className="spc-io-label" x={outX - 52} y={SCALE_Y[0] - 10} textAnchor="middle">
        3×3 ending
      </text>
      <path
        className="spc-flow"
        d={`M${outX - 52} ${SCALE_Y[0] - 4} V${SCALE_Y[0] + stageH(DEC[0].blocks) / 2 - 2}`}
      />

      <rect className="trk-frame spc-out" x={outX} y={28} width={outW} height={38} rx={3} />
      <Structure x={outX + 10} y={40} w={outW - 20} />
      <text className="sfs-cap sfs-cap-accent" x={outMid} y={80} textAnchor="middle">
        prediction
      </text>
      <text className="sfs-sub" x={outMid} y={92} textAnchor="middle">
        22.4 ms · 27.11M
      </text>

      <line className="spc-loss" x1={outMid} y1={96} x2={outMid} y2={108} />
      <rect className="spc-loss-pill" x={outX + 10} y={108} width={outW - 20} height={18} rx={9} />
      <text className="spc-loss-label" x={outMid} y={120} textAnchor="middle">
        loss
      </text>
      <line className="spc-loss" x1={outMid} y1={126} x2={outMid} y2={138} />

      <rect className="trk-frame spc-target" x={outX} y={138} width={outW} height={38} rx={3} />
      <Speckle x={outX + 3} y={140} w={outW - 6} h={34} n={12} seed={41} />
      <Structure x={outX + 10} y={150} w={outW - 20} />
      <text className="sfs-cap" x={outMid} y={192} textAnchor="middle">
        frame p + 1
      </text>
      <text className="sfs-sub" x={outMid} y={204} textAnchor="middle">
        as target
      </text>

      <rect className="spc-callout" x={8} y={278} width={544} height={72} rx={6} />
      <text className="sfs-cap sfs-cap-accent" x={20} y={296}>
        one NAFBlock
      </text>
      <text className="sfs-sub" x={118} y={296}>
        nonlinearity is a gate, not an activation · SimpleGate = split × multiply
      </text>

      <CalloutRow
        y={306}
        steps={[
          { label: "LN", w: 32 },
          { label: "1×1 ↑", w: 42 },
          { label: "DW 3×3", w: 52 },
          { label: "Gate", w: 44, key: true },
          { label: "SCA", w: 40, key: true },
          { label: "1×1 ↓", w: 42 },
        ]}
        trail="+ β residual"
      />
      <CalloutRow
        y={328}
        steps={[
          { label: "LN", w: 32 },
          { label: "1×1 ↑", w: 42 },
          { label: "Gate", w: 44, key: true },
          { label: "1×1 ↓", w: 42 },
        ]}
        trail="+ γ residual"
      />
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
