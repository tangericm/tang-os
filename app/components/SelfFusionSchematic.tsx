/**
 * SelfFusionSchematic, the two things that make this project what it is,
 * drawn side by side rather than described.
 *
 * Panel 1 is where the training target comes from. Self-fusion takes a
 * frame's own neighbors, deformably registers each one onto it, and fuses
 * them with weights from local patch similarity. That is the idea borrowed
 * from multi-atlas label fusion: the neighboring B-scans play the part the
 * atlases usually play, so nothing outside the volume is needed. It is
 * edge preserving and tolerant of motion, and the registration makes it
 * far too slow to watch live.
 *
 * Panel 2 is what actually runs live. The network sees only three raw
 * frames and is trained to reproduce that slow fused result, which is the
 * whole trick: the quality of a seven frame registration at a frame rate
 * you can watch.
 *
 * Numbers on the panels come from the paper (Rico-Jimenez et al., Biomed.
 * Opt. Express 13(3), 2022). Deliberately no channel counts or layer
 * specifications, this is meant to explain the shape of the method.
 *
 * Chrome and prose are HTML because HTML renders text more crisply than
 * SVG at these sizes; only the diagrams themselves are SVG.
 */

/* ---------- shared drawing helpers ---------- */

/** A gentle S-curve, standing in for a retinal layer boundary. */
function layer(x: number, y: number, w: number) {
  const h = w / 2;
  return `M${x} ${y} q${h / 2} -5 ${h} 0 q${h / 2} 5 ${h} 0`;
}

/** Three stacked layer curves: the readable signature of a B-scan. */
function LayerStack({
  x,
  y,
  w,
  clean = false,
}: {
  x: number;
  y: number;
  w: number;
  clean?: boolean;
}) {
  return (
    <g className={clean ? "sfs-layers sfs-layers-clean" : "sfs-layers"}>
      {[0, 11, 22].map((dy) => (
        <path key={dy} d={layer(x, y + dy, w)} />
      ))}
    </g>
  );
}

/** A right-pointing chevron, used between stages. */
function Arrow({ x, y }: { x: number; y: number }) {
  return <path className="sfs-arrow" d={`M${x} ${y - 5} l6 5 l-6 5`} />;
}

/* ============================================================
   Panel 1: building the target
   ============================================================ */

const NEIGHBORS = [0, 1, 2, 3, 4, 5, 6]; // n-3 ... n+3

function TargetPanel() {
  return (
    <svg
      className="sfs-svg"
      viewBox="0 0 560 150"
      role="img"
      aria-label="Self-fusion: seven neighboring frames are deformably registered onto the center frame, weighted by local similarity, and fused into one high quality target image."
    >
      {/* --- stage 1: the seven neighbors --- */}
      <g className="sfs-stack">
        {NEIGHBORS.map((i) => (
          <rect
            key={i}
            className={i === 3 ? "sfs-slab sfs-slab-center" : "sfs-slab"}
            x={12 + i * 12}
            y={38}
            width={9}
            height={58}
            rx={1.5}
            style={{ animationDelay: `${i * 0.13}s` }}
          />
        ))}
      </g>
      <text className="sfs-cap" x={54} y={114} textAnchor="middle">
        7 neighbors
      </text>
      <text className="sfs-sub" x={54} y={128} textAnchor="middle">
        n−3 … n+3
      </text>

      <Arrow x={112} y={67} />

      {/* --- stage 2: deformable registration ---
          three layer traces starting out of register and sliding into
          alignment, on a loop */}
      <rect className="sfs-frame" x={132} y={34} width={112} height={66} rx={4} />
      <g clipPath="url(#sfs-clip-reg)">
        <g className="sfs-warp sfs-warp-a">
          <LayerStack x={142} y={54} w={92} />
        </g>
        <g className="sfs-warp sfs-warp-b">
          <LayerStack x={142} y={54} w={92} />
        </g>
        {/* frame n, the one everything else is being registered onto */}
        <g className="sfs-ref">
          <LayerStack x={142} y={54} w={92} />
        </g>
      </g>
      <text className="sfs-cap" x={188} y={114} textAnchor="middle">
        register onto frame n
      </text>
      <text className="sfs-sub" x={188} y={128} textAnchor="middle">
        symmetric normalization
      </text>

      <Arrow x={256} y={67} />

      {/* --- stage 3: similarity weights --- */}
      <rect className="sfs-frame" x={276} y={34} width={112} height={66} rx={4} />
      {NEIGHBORS.map((i) => {
        const h = [16, 26, 38, 48, 36, 24, 15][i];
        return (
          <rect
            key={i}
            className={i === 3 ? "sfs-weight sfs-weight-peak" : "sfs-weight"}
            x={288 + i * 13}
            y={92 - h}
            width={8}
            height={h}
            rx={1.5}
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        );
      })}
      <text className="sfs-cap" x={332} y={114} textAnchor="middle">
        similarity weighting
      </text>
      <text className="sfs-sub" x={332} y={128} textAnchor="middle">
        local patch similarity
      </text>

      <Arrow x={400} y={67} />

      {/* --- stage 4: the fused target --- */}
      <rect className="sfs-target" x={422} y={30} width={126} height={74} rx={4} />
      <LayerStack x={434} y={52} w={102} clean />
      <text className="sfs-cap sfs-cap-accent" x={485} y={118} textAnchor="middle">
        fused target
      </text>
      <text className="sfs-sub" x={485} y={132} textAnchor="middle">
        offline only
      </text>

      <defs>
        <clipPath id="sfs-clip-reg">
          <rect x={133} y={35} width={110} height={64} rx={4} />
        </clipPath>
      </defs>
    </svg>
  );
}

/* ============================================================
   Panel 2: the network that runs live
   ============================================================ */

/* The two towers really are symmetric in the architecture this is based
   on: three blocks down, three up, the same 64 channels throughout, three
   halvings against three doublings. The only asymmetry is in the dilation
   rates, which is not something a diagram at this level should show. So
   the drawing is built around a single centre line and mirrored about it,
   rather than eyeballed. */
const BH = 20; // block height
const CENTER = 275;
const HALF_GAP = 64; // encoder and decoder edges, equidistant from CENTER
const ENC_R = CENTER - HALF_GAP; // encoder blocks are right-aligned here
const DEC_L = CENTER + HALF_GAP; // decoder blocks are left-aligned here
const LEVELS = [
  { y: 40, w: 104 },
  { y: 82, w: 76 },
  { y: 124, w: 50 },
];
const LATENT = { x: CENTER - 42, y: 166, w: 84 }; // centred on CENTER too
const OUT = { x: 488, w: 66 };
const outMid = OUT.x + OUT.w / 2;

const mid = (i: number) => LEVELS[i].y + BH / 2;
const encMid = (i: number) => ENC_R - LEVELS[i].w / 2;
const decMid = (i: number) => DEC_L + LEVELS[i].w / 2;
const latMid = LATENT.y + BH / 2;

/* Drawn here: frames in, the two towers, the latent block, the skips, one
   frame out. Deliberately NOT drawn: the hierarchical unit that restores
   every encoder level to full size and concatenates it at the output. Two
   reasons. It is the part of the architecture this project is least about,
   and every honest way to draw it, one shared lane along the bottom or
   three nested ones, ends up looking like a border around the diagram
   rather than a signal path. It gets a clause in the prose instead. */

function NetworkPanel() {
  /* the path the data packet rides: three raw frames in, down the encoder,
     through the latent block, up the decoder, out as one denoised frame */
  const route =
    `M28 ${mid(0)} H${encMid(0)}` +
    ` L${encMid(1)} ${mid(1)} L${encMid(2)} ${mid(2)}` +
    ` C${encMid(2) + 22} ${mid(2)} ${LATENT.x - 4} ${latMid} ${LATENT.x} ${latMid}` +
    ` H${LATENT.x + LATENT.w}` +
    ` C${LATENT.x + LATENT.w + 22} ${latMid} ${decMid(2) - 22} ${mid(2)} ${decMid(2)} ${mid(2)}` +
    ` L${decMid(1)} ${mid(1)} L${decMid(0)} ${mid(0)} H${outMid}`;

  return (
    <svg
      className="sfs-svg"
      viewBox="0 0 560 196"
      role="img"
      aria-label="The self-fusion network: three raw adjacent B-scans enter an encoder, pass through a latent block and a decoder joined by skip connections, and leave as one denoised frame at 22 frames per second."
    >
      <defs>
        <linearGradient id="sfs-blk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b7a63" />
          <stop offset="1" stopColor="#5b4e40" />
        </linearGradient>
        <filter id="sfs-glow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <text className="sfs-tower" x={encMid(0)} y={14} textAnchor="middle">
        encoder, context
      </text>
      <text className="sfs-tower" x={decMid(0)} y={14} textAnchor="middle">
        decoder, texture
      </text>

      {/* the faint guide the packet follows */}
      <path id="sfs-route" className="sfs-route" d={route} />

      {/* --- skip connections, bowed up so they never read as part of the
             main route, dashes flowing encoder to decoder --- */}
      {LEVELS.map((_, i) => (
        <path
          key={`skip${i}`}
          className="sfs-skip"
          d={`M${ENC_R} ${mid(i)} C${ENC_R + 44} ${mid(i) - 15} ${DEC_L - 44} ${mid(i) - 15} ${DEC_L} ${mid(i)}`}
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}

      {/* --- the blocks --- */}
      {LEVELS.map((l, i) => (
        <g key={`lvl${i}`}>
          <rect className="sfs-block" x={ENC_R - l.w} y={l.y} width={l.w} height={BH} rx={3} />
          <rect className="sfs-block" x={DEC_L} y={l.y} width={l.w} height={BH} rx={3} />
        </g>
      ))}
      <rect
        className="sfs-block sfs-latent"
        x={LATENT.x}
        y={LATENT.y}
        width={LATENT.w}
        height={BH}
        rx={3}
      />
      <text className="sfs-sub" x={LATENT.x + LATENT.w / 2} y={LATENT.y - 7} textAnchor="middle">
        latent
      </text>

      {/* --- input: three raw frames. The speckled traces inside the front
             one are the whole before-and-after of this panel, they are the
             same motif the output frame draws clean. --- */}
      <g className="sfs-in">
        <rect x={16} y={mid(0) - 22} width={36} height={36} rx={2.5} />
        <rect x={11} y={mid(0) - 18} width={36} height={36} rx={2.5} />
        <rect className="sfs-in-front" x={6} y={mid(0) - 14} width={36} height={36} rx={2.5} />
      </g>
      <LayerStack x={11} y={mid(0) - 4} w={26} />
      {/* Anchored at 32, not at the stack's own centre of 28: centred on 28 the
          label ran 2.3 units past the left edge of the viewBox and clipped. */}
      <text className="sfs-cap" x={32} y={mid(0) + 38} textAnchor="middle">
        3 raw frames
      </text>
      <text className="sfs-sub" x={28} y={mid(0) + 51} textAnchor="middle">
        n−1, n, n+1
      </text>

      {/* --- output: one denoised frame --- */}
      <rect className="sfs-out" x={OUT.x} y={mid(0) - 26} width={OUT.w} height={54} rx={3} />
      <LayerStack x={OUT.x + 9} y={mid(0) - 12} w={OUT.w - 18} clean />
      <text className="sfs-cap sfs-cap-accent" x={outMid} y={mid(0) + 44} textAnchor="middle">
        fused estimate
      </text>
      <text className="sfs-sub" x={outMid} y={mid(0) + 57} textAnchor="middle">
        22 fps, LibTorch
      </text>

      <text className="sfs-sub sfs-sub-accent" x={CENTER} y={28} textAnchor="middle">
        skip connections
      </text>

      {/* the travelling packet */}
      <circle className="sfs-packet" r={4.5} filter="url(#sfs-glow)">
        <animateMotion
          dur="5s"
          repeatCount="indefinite"
          keyPoints="0;1"
          keyTimes="0;1"
          calcMode="spline"
          keySplines="0.45 0 0.55 1"
        >
          <mpath href="#sfs-route" />
        </animateMotion>
      </circle>
    </svg>
  );
}

/* ============================================================
   The pair, with the link between them spelled out
   ============================================================ */

export default function SelfFusionSchematic() {
  return (
    <div className="sfs">
      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">1</span> Self-fusion target generation
          <span className="sfs-badge">0.42 fps</span>
        </h3>
        <div className="sfs-canvas">
          <TargetPanel />
        </div>
        <p className="sfs-note">
          Inspired by multi-atlas label fusion: a frame&rsquo;s neighbors act as atlases. Deformable registration aligns a short window, and a weighted vote keeps structure that recurs while speckle cancels. Registration is why it works, and why it is slow (0.42 fps).
        </p>
      </section>

      <div className="sfs-bridge" aria-hidden="true">
        <span className="sfs-bridge-line" />
        <span className="sfs-bridge-text">used as the regression target below</span>
        <span className="sfs-bridge-line" />
      </div>

      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">2</span> Distilled network inference
          <span className="sfs-badge sfs-badge-live">22 fps</span>
        </h3>
        <div className="sfs-canvas">
          <NetworkPanel />
        </div>
        <p className="sfs-note">
          No registration at inference. Three raw adjacent frames map straight to the fused estimate, so the expensive deformable step is paid once when building training targets. Same output, about 50× faster.
        </p>
      </section>
    </div>
  );
}
