/**
 * TrackingSchematic, the two halves of a closed loop.
 *
 * Panel 1 is detection. The interesting part is not that a detector finds
 * the tool, it is what the detector is fed: a grayscale frame carries no
 * colour, so the three channels of an RGB input are free real estate. The
 * last raw frame goes in one channel, a running 5 frame average in
 * another, and the 5 frame variance in the third. Variance is the trick:
 * anything moving lights up, anything static goes dark, so motion arrives
 * as colour and the detector gets temporal context for free.
 *
 * Panel 2 is control. The box coordinates become a scanner voltage offset,
 * written into a DAQ buffer that is deliberately run in a mode where it
 * can be rewritten mid-scan, and the scan pattern itself samples the
 * middle of the field four times denser than the edges. The dense patch
 * rides along with whatever is being tracked.
 *
 * Numbers are from Tang et al., Biomed. Opt. Express 13(4), 2022 and the
 * follow-on multi-instrument work in the dissertation.
 */

const CH = [
  { key: "raw", label: "last frame", tone: "sfs-ch-b" },
  { key: "avg", label: "5 frame mean", tone: "sfs-ch-g" },
  { key: "var", label: "5 frame variance", tone: "sfs-ch-r" },
];

function Arrow({ x, y }: { x: number; y: number }) {
  return <path className="sfs-arrow" d={`M${x} ${y - 5} l6 5 l-6 5`} />;
}

/** Speckle: a scatter of short ticks, so a frame reads as noisy. */
function Speckle({ x, y, w, h, n = 26, seed = 1 }: { x: number; y: number; w: number; h: number; n?: number; seed?: number }) {
  const pts = [];
  let s = seed * 9301;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const px = x + (s / 233280) * w;
    s = (s * 9301 + 49297) % 233280;
    const py = y + (s / 233280) * h;
    pts.push(`M${px.toFixed(1)} ${py.toFixed(1)} h1.6`);
  }
  return <path className="trk-speckle" d={pts.join(" ")} />;
}

/* ============================================================
   Panel 1: what the detector is fed
   ============================================================ */

function DetectPanel() {
  return (
    <svg
      className="sfs-svg"
      viewBox="0 0 560 168"
      role="img"
      aria-label="Detection: five consecutive frames are reduced to a last frame, a running mean and a running variance, packed into the three channels of one colour image, and passed to a YOLOv4 detector which returns a bounding box."
    >
      {/* --- stage 1: a rolling buffer of 5 frames --- */}
      <g className="trk-stack">
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={8 + i * 7}
            y={26 + i * 5}
            width={54}
            height={44}
            rx={2.5}
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </g>
      <text className="sfs-cap" x={48} y={106} textAnchor="middle">
        5 frames
      </text>
      <text className="sfs-sub" x={48} y={119} textAnchor="middle">
        FIFO buffer
      </text>

      <Arrow x={100} y={56} />

      {/* --- stage 2: the three channels, each a different reduction --- */}
      {CH.map((c, i) => (
        <g key={c.key}>
          <rect className={`trk-ch ${c.tone}`} x={124} y={22 + i * 34} width={62} height={28} rx={2.5} />
          {c.key === "raw" && <Speckle x={126} y={24} w={58} h={24} n={30} seed={3} />}
          {c.key === "avg" && <Speckle x={126} y={58} w={58} h={24} n={8} seed={7} />}
          {/* variance: dark everywhere the scene is static, bright on the mover */}
          {c.key === "var" && <rect className="trk-var-blob" x={150} y={96} width={13} height={16} rx={2} />}
          <text className="sfs-sub" x={192} y={40 + i * 34}>
            {c.label}
          </text>
        </g>
      ))}
      <text className="sfs-sub sfs-sub-accent" x={124} y={140}>
        variance isolates inter-frame motion
      </text>

      <Arrow x={296} y={56} />

      {/* --- stage 3: the three packed into one colour image. The fill is a
             faint three-stop wash so it reads as a composite of the tiles to
             its left rather than as another grayscale frame. --- */}
      <defs>
        <linearGradient id="trk-bgr" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(96,128,190,0.20)" />
          <stop offset="0.5" stopColor="rgba(104,168,112,0.18)" />
          <stop offset="1" stopColor="rgba(190,104,96,0.20)" />
        </linearGradient>
      </defs>
      <rect className="trk-frame trk-fused" x={318} y={30} width={80} height={56} rx={3} />
      <Speckle x={320} y={32} w={76} h={52} n={16} seed={11} />
      <rect className="trk-var-blob" x={352} y={50} width={14} height={18} rx={2} />
      <text className="sfs-cap" x={358} y={102} textAnchor="middle">
        3-channel input
      </text>
      <text className="sfs-sub" x={358} y={115} textAnchor="middle">
        no added inference cost
      </text>

      <Arrow x={412} y={56} />

      {/* --- stage 4: the detector and its box, drawn around something --- */}
      <rect className="trk-frame" x={434} y={30} width={80} height={56} rx={3} />
      <Speckle x={436} y={32} w={76} h={52} n={14} seed={13} />
      <rect className="trk-var-blob" x={468} y={50} width={14} height={18} rx={2} />
      <rect className="trk-box" x={462} y={44} width={26} height={30} rx={1.5} />
      <text className="sfs-cap sfs-cap-accent" x={474} y={102} textAnchor="middle">
        box
      </text>
      <text className="sfs-sub" x={474} y={115} textAnchor="middle">
        x, y, w, h
      </text>
    </svg>
  );
}

/* ============================================================
   Panel 2: what the box does
   ============================================================ */

/* The adaptive scan ramp, as mirror position against time. Where the line
   is shallow the mirror is crossing slowly, so samples bunch up: that is
   the dense middle. Steep at both edges means the periphery is crossed
   quickly and sampled sparsely. Getting this backwards, which is easy to
   do, would draw a scan that is dense exactly where it should be sparse. */
const RAMP = "M0 50 L20 34 L60 26 L80 10";
const LINEAR = "M0 50 L80 10";
/* measured points behind the calibration fit, so that stage does not read
   as a second copy of this one */
const CAL_PTS = [
  [128, 74],
  [144, 70],
  [160, 60],
  [176, 48],
  [192, 36],
];

function SteerPanel() {
  return (
    <svg
      className="sfs-svg"
      viewBox="0 0 560 136"
      role="img"
      aria-label="Control: box coordinates are calibrated into scanner voltage offsets, written into a buffer that can be rewritten mid-scan, shaping a scan pattern that samples the centre of the field four times denser than the edges, so the imaged field re-centres on the target every volume."
    >
      {/* --- stage 1: the box coordinates --- */}
      <rect className="trk-chip" x={10} y={40} width={72} height={30} rx={5} />
      <text className="sfs-cap sfs-cap-accent" x={46} y={60} textAnchor="middle">
        x, y, w, h
      </text>
      <text className="sfs-sub" x={46} y={92} textAnchor="middle">
        from panel 1
      </text>

      <Arrow x={96} y={55} />

      {/* --- stage 2: calibration, one axis nonlinear and one linear --- */}
      <rect className="trk-frame" x={118} y={26} width={86} height={58} rx={3} />
      <path className="trk-curve trk-curve-lin" d="M126 76 L196 42" />
      <path className="trk-curve" d="M126 76 C150 74 168 52 196 34" />
      {CAL_PTS.map(([cx, cy]) => (
        <circle key={`${cx}`} className="trk-pt" cx={cx} cy={cy} r={1.9} />
      ))}
      <text className="sfs-cap" x={161} y={100} textAnchor="middle">
        calibrate
      </text>
      <text className="sfs-sub" x={161} y={113} textAnchor="middle">
        higher-order fast-axis fit
      </text>

      <Arrow x={218} y={55} />

      {/* --- stage 3: the scan waveform, rewritten every volume --- */}
      <rect className="trk-frame" x={240} y={26} width={96} height={58} rx={3} />
      <g transform="translate(248, 30)">
        <path className="trk-curve trk-curve-lin" d={LINEAR} />
        <path className="trk-ramp" d={RAMP} />
      </g>
      <text className="sfs-cap" x={288} y={100} textAnchor="middle">
        adaptive sampling
      </text>
      <text className="sfs-sub" x={288} y={113} textAnchor="middle">
        centre 4&times; denser
      </text>

      <Arrow x={350} y={55} />

      {/* --- stage 4: the payoff, the field follows the target --- */}
      <rect className="trk-frame trk-field" x={372} y={20} width={172} height={70} rx={3} />
      <Speckle x={374} y={22} w={168} h={66} n={30} seed={17} />
      {/* the tracked thing, drifting */}
      <rect className="trk-target" x={402} y={44} width={12} height={22} rx={2} />
      {/* the imaged field, chasing it */}
      <rect className="trk-fov" x={386} y={30} width={44} height={50} rx={2} />
      <text className="sfs-cap sfs-cap-accent" x={458} y={106} textAnchor="middle">
        field re-centres per volume
      </text>
      <text className="sfs-sub" x={458} y={119} textAnchor="middle">
        16 Hz over 25 mm
      </text>
    </svg>
  );
}

/* ============================================================
   The pair
   ============================================================ */

export default function TrackingSchematic() {
  return (
    <div className="sfs">
      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">1</span> Multi-channel input encoding
          <span className="sfs-badge">99.98% mAP</span>
        </h3>
        <div className="sfs-canvas">
          <DetectPanel />
        </div>
        <p className="sfs-note">
          Source frames are single-channel, so the detector&rsquo;s other two inputs are free. Filling them with a short-window mean and variance gives the network motion evidence directly — the variance channel lights up where something moved — without changing the architecture or the cost.
        </p>
      </section>

      <div className="sfs-bridge" aria-hidden="true">
        <span className="sfs-bridge-line" />
        <span className="sfs-bridge-text">bounding box drives the scan waveform</span>
        <span className="sfs-bridge-line" />
      </div>

      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">2</span> Closed-loop scan control
          <span className="sfs-badge sfs-badge-live">closed loop</span>
        </h3>
        <div className="sfs-canvas">
          <SteerPanel />
        </div>
        <p className="sfs-note">
          Bounding boxes map to galvanometer drive voltages, with a calibrated offset on the fast axis. A writable DAQ lets the scan waveform update mid-acquisition, so corrections land on the next volume. Sampling densifies toward the center, where the instrument is.
        </p>
      </section>
    </div>
  );
}
