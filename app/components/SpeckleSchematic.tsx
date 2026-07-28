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

const NC = 248;
const GAP = 60;
const ENC_R = NC - GAP;
const DEC_L = NC + GAP;

/* Enough runway between stages, and a real gap above the middle so E4→middle
   is a visible link into the block rather than a stub into empty space. */
const SCALE_Y = [40, 86, 132, 178];
const MID_Y = 248;

function StageStack({
  x,
  y,
  w,
  stage,
  align,
  boxH,
}: {
  x: number;
  y: number;
  w: number;
  stage: Stage;
  align: "right" | "left" | "center";
  /** Outer frame height; content is vertically centered when taller than the units. */
  boxH?: number;
}) {
  const contentH = stageH(stage.blocks);
  const h = boxH ?? contentH;
  const left = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
  const cx = left + w / 2;
  const unitTop = y + (h - contentH) / 2 + STAGE_PAD;
  const units = Array.from({ length: stage.blocks }, (_, i) => (
    <rect
      key={i}
      className="spc-unit"
      x={left + STAGE_PAD}
      y={unitTop + i * (UNIT_H + UNIT_GAP)}
      width={w - STAGE_PAD * 2}
      height={UNIT_H}
      rx={1.5}
    />
  ));
  return (
    <g>
      <rect className="spc-block" x={left} y={y} width={w} height={h} rx={3} />
      {units}
      <text className="spc-ch" x={cx} y={y + h / 2} textAnchor="middle" dominantBaseline="middle">
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
      <text key={`t${i}`} className="spc-call-label" x={x + s.w / 2} y={y + 9} textAnchor="middle" dominantBaseline="middle">
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
    <text key="trail" className="sfs-sub sfs-sub-accent" x={x + 14} y={y + 9} dominantBaseline="middle">
      {trail}
    </text>,
  );
  return <g>{nodes}</g>;
}

function NetPanel() {
  const encW = [70, 60, 50, 44];
  const decW = [...encW];
  const midW = 58;
  const midH = stageH(MID.blocks);
  const outX = 448;
  const outW = 100;
  const outMid = outX + outW / 2;

  /* Deepest scale shares one frame height so E4/D4 sit as mirrors despite 2 vs 1 blocks. */
  const deepH = Math.max(stageH(ENC[3].blocks), stageH(DEC[3].blocks));
  const deepBottom = SCALE_Y[3] + deepH;
  const e4Cx = ENC_R - encW[3] / 2;
  const d4Cx = DEC_L + decW[3] / 2;
  const d1Right = DEC_L + decW[0];
  const d1MidY = SCALE_Y[0] + stageH(DEC[0].blocks) / 2;
  const midLeft = NC - midW / 2;
  const midRight = NC + midW / 2;
  const midMidY = MID_Y + midH / 2;
  const endChipX = d1Right + 14;
  const endChipW = 46;
  const endChipR = endChipX + endChipW;
  const gutterY = (SCALE_Y[0] + stageH(ENC[0].blocks) + SCALE_Y[1]) / 2 + 3;

  return (
    <svg
      className="sfs-svg sfs-svg-dense"
      viewBox="0 0 560 388"
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

      <rect className="trk-frame spc-view-1" x={8} y={34} width={42} height={26} rx={2.5} />
      <Speckle x={10} y={36} w={38} h={22} n={10} seed={5} />
      <text className="sfs-cap" x={29} y={76} textAnchor="middle">
        frame p
      </text>
      <text className="sfs-sub" x={29} y={88} textAnchor="middle">
        1 ch
      </text>

      <path className="spc-flow" d="M52 47 H68" markerEnd="url(#spc-arrowhead)" />
      <rect className="spc-io" x={70} y={38} width={34} height={18} rx={3} />
      <text className="spc-io-label" x={87} y={47} textAnchor="middle" dominantBaseline="middle">
        3×3
      </text>
      <text className="sfs-sub" x={87} y={72} textAnchor="middle">
        intro
      </text>
      <path className="spc-flow" d={`M106 47 H${ENC_R - encW[0] - 4}`} markerEnd="url(#spc-arrowhead)" />

      <text className="sfs-tower" x={ENC_R - 34} y={18} textAnchor="middle">
        encoder
      </text>
      <text className="sfs-tower" x={DEC_L + 34} y={18} textAnchor="middle">
        decoder
      </text>
      <text className="sfs-sub" x={DEC_L + 34} y={30} textAnchor="middle">
        PixelShuffle
      </text>
      <text className="sfs-sub sfs-sub-accent" x={NC} y={18} textAnchor="middle">
        skip +
      </text>

      <text className="sfs-sub" x={e4Cx - 18} y={gutterY} textAnchor="end">
        ↓ ×2
      </text>
      <text className="sfs-sub" x={d4Cx + 18} y={gutterY}>
        ↑ ×2
      </text>

      {ENC.map((stage, i) => {
        const y = SCALE_Y[i];
        const eh = i === 3 ? deepH : stageH(stage.blocks);
        const dw = decW[i];
        const dh = i === 3 ? deepH : stageH(DEC[i].blocks);
        const ey = y + eh / 2;
        const dy = y + dh / 2;
        return (
          <g key={stage.label}>
            <StageStack
              x={ENC_R}
              y={y}
              w={encW[i]}
              stage={stage}
              align="right"
              boxH={i === 3 ? deepH : undefined}
            />
            <StageStack
              x={DEC_L}
              y={y}
              w={dw}
              stage={DEC[i]}
              align="left"
              boxH={i === 3 ? deepH : undefined}
            />
            <path
              className="sfs-skip"
              d={`M${ENC_R} ${ey} C${ENC_R + 24} ${ey - 14} ${DEC_L - 24} ${dy - 14} ${DEC_L} ${dy}`}
              markerEnd="url(#spc-arrowhead)"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
            {i < ENC.length - 1 && (
              <>
                <path
                  className="spc-flow"
                  d={`M${ENC_R - encW[i] / 2} ${y + eh + 1} V${SCALE_Y[i + 1] - 1}`}
                  markerEnd="url(#spc-arrowhead)"
                />
                <path
                  className="spc-flow"
                  d={`M${DEC_L + decW[i + 1] / 2} ${SCALE_Y[i + 1] - 1} V${y + dh + 1}`}
                  markerEnd="url(#spc-arrowhead)"
                />
              </>
            )}
          </g>
        );
      })}

      {/* Symmetric bottleneck: drop to middle height, in left / out right, climb back. */}
      <path
        className="spc-flow"
        d={`M${e4Cx} ${deepBottom + 1} V${midMidY} H${midLeft - 1}`}
        markerEnd="url(#spc-arrowhead)"
      />
      <StageStack x={NC} y={MID_Y} w={midW} stage={MID} align="center" />
      <text className="sfs-sub sfs-sub-accent" x={NC} y={MID_Y + midH + 12} textAnchor="middle">
        middle
      </text>
      <path
        className="spc-flow"
        d={`M${midRight + 1} ${midMidY} H${d4Cx} V${deepBottom}`}
        markerEnd="url(#spc-arrowhead)"
      />

      <path className="spc-flow" d={`M${d1Right + 1} ${d1MidY} H${endChipX - 1}`} />
      <rect className="spc-io" x={endChipX} y={d1MidY - 9} width={endChipW} height={18} rx={3} />
      <text className="spc-io-label" x={endChipX + endChipW / 2} y={d1MidY} textAnchor="middle" dominantBaseline="middle">
        3×3
      </text>
      <text className="sfs-sub" x={endChipX + endChipW / 2} y={d1MidY + 20} textAnchor="middle">
        ending
      </text>
      <path
        className="spc-flow"
        d={`M${endChipR + 1} ${d1MidY} H${outX - 1}`}
        markerEnd="url(#spc-arrowhead)"
      />

      <rect className="trk-frame spc-out" x={outX} y={d1MidY - 18} width={outW} height={36} rx={3} />
      <Structure x={outX + 10} y={d1MidY - 6} w={outW - 20} />
      <text className="sfs-cap sfs-cap-accent" x={outMid} y={d1MidY + 30} textAnchor="middle">
        prediction
      </text>
      <text className="sfs-sub" x={outMid} y={d1MidY + 42} textAnchor="middle">
        22.4 ms · 27.11M
      </text>

      <line className="spc-loss" x1={outMid} y1={d1MidY + 46} x2={outMid} y2={d1MidY + 56} />
      <rect className="spc-loss-pill" x={outX + 12} y={d1MidY + 56} width={outW - 24} height={18} rx={9} />
      <text
        className="spc-loss-label"
        x={outMid}
        y={d1MidY + 65}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        loss
      </text>
      <line className="spc-loss" x1={outMid} y1={d1MidY + 74} x2={outMid} y2={d1MidY + 86} />

      <rect className="trk-frame spc-target" x={outX} y={d1MidY + 86} width={outW} height={36} rx={3} />
      <Speckle x={outX + 3} y={d1MidY + 88} w={outW - 6} h={32} n={12} seed={41} />
      <Structure x={outX + 10} y={d1MidY + 98} w={outW - 20} />
      <text className="sfs-cap" x={outMid} y={d1MidY + 138} textAnchor="middle">
        frame p + 1
      </text>
      <text className="sfs-sub" x={outMid} y={d1MidY + 150} textAnchor="middle">
        as target
      </text>

      <rect className="spc-callout" x={8} y={306} width={544} height={72} rx={6} />
      <text className="sfs-cap sfs-cap-accent" x={20} y={324}>
        one NAFBlock
      </text>
      <text className="sfs-sub" x={118} y={324}>
        nonlinearity is a gate, not an activation · SimpleGate = split × multiply
      </text>

      <CalloutRow
        y={334}
        steps={[
          { label: "LN", w: 34 },
          { label: "1×1 ↑", w: 44 },
          { label: "DW 3×3", w: 54 },
          { label: "Gate", w: 46, key: true },
          { label: "SCA", w: 42, key: true },
          { label: "1×1 ↓", w: 44 },
        ]}
        trail="+ β residual"
      />
      <CalloutRow
        y={356}
        steps={[
          { label: "LN", w: 34 },
          { label: "1×1 ↑", w: 44 },
          { label: "Gate", w: 46, key: true },
          { label: "1×1 ↓", w: 44 },
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
