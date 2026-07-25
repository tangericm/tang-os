/**
 * Single-panel explainers for the three smaller projects.
 *
 * Deliberately one panel each, where the research projects get two. The
 * hierarchy is the point: a reader should be able to tell at a glance which
 * work carried a paper and which was built to be useful, without that
 * having to be spelled out.
 */

function Arrow({ x, y }: { x: number; y: number }) {
  return <path className="sfs-arrow" d={`M${x} ${y - 5} l6 5 l-6 5`} />;
}

/* ============================================================
   Stereo calibration: correspondences to metric depth
   ============================================================ */

/** A checkerboard, drawn as alternating squares under a slight perspective. */
function Board({
  x,
  y,
  cols = 6,
  rows = 4,
  s = 11,
  skew = 0.28,
}: {
  x: number;
  y: number;
  cols?: number;
  rows?: number;
  s?: number;
  skew?: number;
}) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2) continue;
      const dx = x + c * s + r * s * skew;
      const dy = y + r * s * 0.82;
      cells.push(<rect key={`${r}-${c}`} x={dx} y={dy} width={s} height={s * 0.82} />);
    }
  }
  return <g className="cal-board">{cells}</g>;
}

export function CalibSchematic() {
  return (
    <div className="sfs">
      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">1</span> Calibration to metric reconstruction
          <span className="sfs-badge">RMS reprojection error</span>
        </h3>
        <div className="sfs-canvas">
          <svg
            className="sfs-svg"
            viewBox="0 0 560 150"
            role="img"
            aria-label="Planar checkerboard correspondences give intrinsics and distortion, stereo extrinsics give rectification with aligned epipolar lines, and disparity between rectified views triangulates to metric depth."
          >
            {/* --- stage 1: correspondences --- */}
            <rect className="trk-frame" x={12} y={22} width={104} height={70} rx={3} />
            <Board x={22} y={30} />
            <text className="sfs-cap" x={64} y={110} textAnchor="middle">
              correspondences
            </text>
            <text className="sfs-sub" x={64} y={123} textAnchor="middle">
              planar target, many poses
            </text>

            <Arrow x={128} y={57} />

            {/* --- stage 2: intrinsics and distortion --- */}
            <rect className="trk-frame" x={150} y={22} width={104} height={70} rx={3} />
            {/* a barrel-distorted grid straightening out */}
            <path className="cal-warp" d="M162 34 C186 42 218 42 242 34" />
            <path className="cal-warp" d="M162 57 H242" />
            <path className="cal-warp" d="M162 80 C186 72 218 72 242 80" />
            <path className="cal-grid" d="M172 30 V84 M202 28 V86 M232 30 V84" />
            <text className="sfs-cap" x={202} y={110} textAnchor="middle">
              intrinsics, distortion
            </text>
            <text className="sfs-sub" x={202} y={123} textAnchor="middle">
              radial and tangential
            </text>

            <Arrow x={266} y={57} />

            {/* --- stage 3: rectified pair, epipolar lines aligned --- */}
            <rect className="trk-frame" x={288} y={22} width={70} height={32} rx={3} />
            <rect className="trk-frame" x={288} y={60} width={70} height={32} rx={3} />
            <path className="cal-epi" d="M292 32 H354 M292 42 H354" />
            <path className="cal-epi" d="M292 70 H354 M292 80 H354" />
            <circle className="cal-pt" cx={318} cy={32} r={2.4} />
            <circle className="cal-pt" cx={332} cy={70} r={2.4} />
            <text className="sfs-cap" x={323} y={110} textAnchor="middle">
              rectified pair
            </text>
            <text className="sfs-sub" x={323} y={123} textAnchor="middle">
              epipolar lines aligned
            </text>

            <Arrow x={370} y={57} />

            {/* --- stage 4: triangulation --- */}
            <rect className="trk-frame" x={392} y={22} width={150} height={70} rx={3} />
            {/* two centres of projection and rays meeting at a point */}
            <circle className="cal-cam" cx={410} cy={80} r={3.2} />
            <circle className="cal-cam" cx={444} cy={80} r={3.2} />
            <path className="cal-ray" d="M410 80 L498 38" />
            <path className="cal-ray" d="M444 80 L498 38" />
            <circle className="cal-target" cx={498} cy={38} r={3.6} />
            <path className="cal-baseline" d="M410 80 H444" />
            <text className="sfs-sub sfs-sub-accent" x={427} y={95} textAnchor="middle">
              baseline
            </text>
            <text className="sfs-cap sfs-cap-accent" x={484} y={110} textAnchor="middle">
              metric depth
            </text>
            <text className="sfs-sub" x={484} y={123} textAnchor="middle">
              disparity to millimetres
            </text>
          </svg>
        </div>
        <p className="sfs-note">
          Intrinsics and radial-tangential distortion coefficients are estimated from
          planar checkerboard correspondences across many poses, then stereo
          extrinsics rectify the pair so that corresponding points lie on the same
          image row. Disparity between rectified views triangulates to metric depth
          against the calibrated baseline. RMS reprojection error is reported at each
          stage, because a calibration whose error is never measured cannot be
          trusted downstream.
        </p>
      </section>
    </div>
  );
}

/* ============================================================
   Classification pipeline: the loop, not the model
   ============================================================ */

const STAGES = [
  { label: "dataset", sub: "stratified splits" },
  { label: "augment", sub: "configurable" },
  { label: "backbone", sub: "registry" },
  { label: "train", sub: "checkpoint, early stop" },
  { label: "evaluate", sub: "accuracy, P/R, confusion" },
];

export function ClassifySchematic() {
  return (
    <div className="sfs">
      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">1</span> Reproducible training loop
          <span className="sfs-badge">seed-controlled</span>
        </h3>
        <div className="sfs-canvas">
          <svg
            className="sfs-svg"
            viewBox="0 0 560 132"
            role="img"
            aria-label="A pipeline from dataset with stratified splits through configurable augmentation, an interchangeable backbone registry, a training loop with checkpointing and early stopping, to evaluation reporting accuracy, precision, recall and confusion matrices, with metrics fed back to the training loop."
          >
            {STAGES.map((s, i) => {
              const x = 10 + i * 110;
              return (
                <g key={s.label}>
                  <rect className={i === 2 ? "cls-box cls-box-model" : "cls-box"} x={x} y={30} width={92} height={34} rx={5} />
                  <text className="sfs-cap" x={x + 46} y={51} textAnchor="middle">
                    {s.label}
                  </text>
                  <text className="sfs-sub" x={x + 46} y={78} textAnchor="middle">
                    {s.sub}
                  </text>
                  {i < STAGES.length - 1 && <Arrow x={x + 96} y={47} />}
                  {/* a packet moving down the pipeline, staggered per stage */}
                  <rect
                    className="cls-pulse"
                    x={x}
                    y={30}
                    width={92}
                    height={34}
                    rx={5}
                    style={{ animationDelay: `${i * 0.36}s` }}
                  />
                </g>
              );
            })}

            {/* the feedback edge: metrics inform the next run */}
            <path className="cls-feedback" d="M496 68 C496 104 300 112 56 104 C30 100 26 84 26 68" />
            <text className="sfs-sub sfs-sub-accent" x={272} y={122} textAnchor="middle">
              logged metrics drive the next configuration
            </text>
          </svg>
        </div>
        <p className="sfs-note">
          The scaffolding is the deliverable rather than any single trained model.
          Datasets are abstracted behind stratified splits, augmentation is
          configuration rather than code, and backbones are swapped through a
          registry, so a new problem changes a config file and not the training loop.
          Seeds, checkpoints, early stopping and per-epoch metric logging make runs
          comparable to each other, which is the property that actually determines
          whether an experiment result means anything.
        </p>
      </section>
    </div>
  );
}

/* ============================================================
   TangOS: the window lifecycle
   ============================================================ */

const PHASES = [
  { id: "closed", x: 30, y: 96 },
  { id: "open", x: 168, y: 44 },
  { id: "minimizing", x: 316, y: 44 },
  { id: "minimized", x: 464, y: 44 },
  { id: "closing", x: 316, y: 112 },
];
const byId = (id: string) => PHASES.find((p) => p.id === id)!;

function Edge({ from, to, label, dip = 0 }: { from: string; to: string; label?: string; dip?: number }) {
  const a = byId(from);
  const b = byId(to);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 + dip;
  return (
    <g>
      <path className="tos-edge" d={`M${a.x + 26} ${a.y} Q${mx} ${my} ${b.x - 26} ${b.y}`} />
      {label && (
        <text className="sfs-sub" x={mx} y={my - 6} textAnchor="middle">
          {label}
        </text>
      )}
    </g>
  );
}

export function TangosSchematic() {
  return (
    <div className="sfs">
      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">1</span> Window lifecycle state machine
          <span className="sfs-badge">no UI framework</span>
        </h3>
        <div className="sfs-canvas">
          <svg
            className="sfs-svg"
            viewBox="0 0 560 152"
            role="img"
            aria-label="Each application is a state machine: closed to open, then either minimizing to minimized or closing back to closed. The transient states keep the window mounted so an exit animation can play before unmount."
          >
            <Edge from="closed" to="open" label="launch" dip={-26} />
            <Edge from="open" to="minimizing" label="minimize" />
            <Edge from="minimizing" to="minimized" />
            <Edge from="open" to="closing" label="close" dip={18} />

            {PHASES.map((p) => {
              const transient = p.id === "minimizing" || p.id === "closing";
              return (
                <g key={p.id}>
                  <rect
                    className={transient ? "tos-node tos-node-transient" : "tos-node"}
                    x={p.x - 26}
                    y={p.y - 13}
                    width={52}
                    height={26}
                    rx={13}
                  />
                  <text className="tos-label" x={p.x} y={p.y + 4} textAnchor="middle">
                    {p.id}
                  </text>
                </g>
              );
            })}

            <text className="sfs-sub sfs-sub-accent" x={316} y={20} textAnchor="middle">
              transient: still mounted, animation playing
            </text>
            <text className="sfs-sub" x={470} y={90} textAnchor="middle">
              flies to its dock icon
            </text>
            <text className="sfs-sub" x={430} y={128} textAnchor="middle">
              unmounted on timer
            </text>
          </svg>
        </div>
        <p className="sfs-note">
          Animating an unmount in React requires the parent to keep the child mounted
          while the exit animation plays, so each application carries an explicit
          phase rather than a boolean. The two transient phases exist purely to hold
          a window alive for the duration of its exit, and the timer that retires
          them collapses to zero under prefers-reduced-motion, which makes the
          animation a courtesy and never a delay. Focus order is a single value in the
          same reducer, which is all a z-index stack actually requires.
        </p>
      </section>
    </div>
  );
}
