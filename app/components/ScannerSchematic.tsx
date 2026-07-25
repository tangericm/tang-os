/**
 * ScannerSchematic: why a mirror's settling time is the thing worth
 * attacking, and what happens when you get it back.
 *
 * Panel 1 is the problem, and it is a problem you can only see on a step
 * response. Command a scanner to jump and it overshoots, rings, and takes
 * a while to sit still. Every sample taken during that ringing is at a
 * position you cannot trust, so the ringing is not just ugly, it is field
 * of view and frame rate you paid for and cannot use.
 *
 * Panel 2 is the work: model the closed-loop controller, search its
 * parameter space with Gaussian process regression instead of turning
 * knobs, and then deliberately spend the recovered time on a scan that
 * stays linear across more of the sweep.
 *
 * From Tang & Tao, Biomed. Opt. Express 12(11), 6701-6716 (2021).
 */

/* ---------- panel 1: the step response ---------- */

const BASE = 118; // rest position
const TOP = 44; // commanded position
const EDGE = 120; // where the step is commanded

/* Overshoot, then two decaying rings, then flat. Drawn rather than
   simulated, but the shape is the real one: first swing biggest, each
   following one smaller and on the other side.

   Written as data and joined, not as a chain of concatenated template
   literals. The obvious version of this silently lost the last number of
   every piece, so the browser parsed a prefix, drew a plausible-looking
   curve, and only whispered about it in the console. Numbers in an array
   cannot go missing that way, and the shape is easier to read besides. */
const SWINGS: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [EDGE + 10, BASE, EDGE + 14, 26, EDGE + 30, 26], // overshoot, the big one
  [EDGE + 46, 26, EDGE + 48, 58, EDGE + 62, 58], // back under
  [EDGE + 76, 58, EDGE + 78, 37, EDGE + 92, 37], // and over again, smaller
  [EDGE + 104, 37, EDGE + 106, TOP, EDGE + 118, TOP], // settled
];
const RESPONSE = [
  `M20 ${BASE}`,
  `H${EDGE}`,
  ...SWINGS.map((s) => `C${s.join(" ")}`),
  "H520",
].join(" ");

const COMMANDED = `M20 ${BASE} H${EDGE} V${TOP} H520`;

function SettlePanel() {
  return (
    <svg
      className="sfs-svg"
      viewBox="0 0 560 168"
      role="img"
      aria-label="A commanded step versus the mirror's actual response: it overshoots and rings before settling, and every sample taken during that window is at an untrustworthy position."
    >
      {/* the settling window, the part you cannot use */}
      <rect className="scn-dead" x={EDGE} y={16} width={118} height={116} rx={2} />

      <path className="scn-cmd" d={COMMANDED} />
      <path className="scn-resp" d={RESPONSE} />

      {/* the target position, so overshoot is legible as overshoot */}
      <line className="scn-target-line" x1={EDGE} y1={TOP} x2={520} y2={TOP} />

      <text className="sfs-sub" x={26} y={BASE - 8}>
        commanded
      </text>
      <text className="sfs-sub sfs-sub-accent" x={EDGE + 34} y={20}>
        overshoot, then ringing
      </text>
      <text className="sfs-cap" x={EDGE + 59} y={148} textAnchor="middle">
        settling
      </text>
      <text className="sfs-sub" x={EDGE + 59} y={161} textAnchor="middle">
        position untrustworthy
      </text>
      <text className="sfs-cap sfs-cap-accent" x={380} y={148} textAnchor="middle">
        usable sweep
      </text>
      <text className="sfs-sub" x={380} y={161} textAnchor="middle">
        what you actually get to image with
      </text>
    </svg>
  );
}

/* ---------- panel 2: search, then spend ---------- */

/* A U-shaped response surface over one controller parameter, with the
   band widening where the model has not been sampled. */
const GP_MEAN = "M28 46 Q70 106 110 106 Q150 106 168 48";
const GP_HI = "M28 36 Q70 98 110 98 Q150 98 168 38";
const GP_LO = "M28 56 Q70 114 110 114 Q150 114 168 58";
const GP_BAND = `${GP_HI} L168 58 Q150 114 110 114 Q70 114 28 56 Z`;
const GP_PTS = [
  [40, 62],
  [66, 96],
  [96, 105],
  [124, 104],
  [152, 88],
];

/* tuned response: same step, barely any overshoot, settled early */
const TUNED = "M222 96 H250 C258 96 260 44 268 44 C276 44 278 50 286 50 C294 50 296 46 304 46 H352";
const ORIGINAL = "M222 96 H250 C258 96 262 30 274 30 C286 30 288 68 300 68 C312 68 314 42 326 42 C336 42 338 46 348 46 H352";

function TunePanel() {
  return (
    <svg
      className="sfs-svg"
      viewBox="0 0 560 172"
      role="img"
      aria-label="Gaussian process regression searches the controller parameter space for the tuning that minimises settling time, the tuned response settles far sooner than the original, and the recovered time is spent on a scan that stays linear across more of the sweep."
    >
      {/* --- stage 1: the search --- */}
      <rect className="trk-frame" x={20} y={26} width={156} height={96} rx={3} />
      <path className="scn-band" d={GP_BAND} />
      <path className="scn-gp" d={GP_MEAN} />
      {GP_PTS.map(([cx, cy]) => (
        <circle key={cx} className="trk-pt" cx={cx} cy={cy} r={2.1} />
      ))}
      {/* the chosen minimum */}
      <circle className="scn-min" cx={110} cy={106} r={3.4} />
      <line className="scn-min-tick" x1={110} y1={106} x2={110} y2={122} />
      <text className="sfs-cap" x={98} y={140} textAnchor="middle">
        search the tuning
      </text>
      <text className="sfs-sub" x={98} y={153} textAnchor="middle">
        Gaussian process, not knobs
      </text>

      <path className="sfs-arrow" d="M190 62 l6 5 l-6 5" />

      {/* --- stage 2: the tightened response --- */}
      <rect className="trk-frame" x={212} y={26} width={150} height={96} rx={3} />
      <path className="scn-cmd" d={ORIGINAL} />
      <path className="scn-resp" d={TUNED} />
      <rect className="scn-dead scn-dead-small" x={250} y={30} width={54} height={88} rx={2} />
      <text className="sfs-cap sfs-cap-accent" x={287} y={140} textAnchor="middle">
        settles in half the time
      </text>
      <text className="sfs-sub" x={287} y={153} textAnchor="middle">
        original dashed, tuned solid
      </text>

      <path className="sfs-arrow" d="M376 62 l6 5 l-6 5" />

      {/* --- stage 3: spend it on a wider linear sweep --- */}
      <rect className="trk-frame" x={398} y={26} width={144} height={96} rx={3} />
      {/* the old usable window, narrow */}
      <rect className="scn-linear scn-linear-old" x={444} y={32} width={52} height={84} rx={2} />
      {/* the new one, wider */}
      <rect className="scn-linear" x={414} y={32} width={112} height={84} rx={2} />
      <path className="scn-sweep" d="M404 112 L414 104 L526 40 L536 32" />
      <text className="sfs-cap sfs-cap-accent" x={470} y={140} textAnchor="middle">
        wider linear sweep
      </text>
      <text className="sfs-sub" x={470} y={153} textAnchor="middle">
        more field, more signal, faster
      </text>
    </svg>
  );
}

export default function ScannerSchematic() {
  return (
    <div className="sfs">
      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">1</span> Where the time goes
          <span className="sfs-badge">dead time</span>
        </h3>
        <div className="sfs-canvas">
          <SettlePanel />
        </div>
        <p className="sfs-note">
          Command a galvanometer to jump and it does not arrive, it overshoots and
          rings its way in. Anything sampled during that window sits at a position
          the controller cannot vouch for, so settling is not a cosmetic problem: it
          is field of view and frame rate that has already been paid for and cannot
          be used. Every line of every frame pays it again.
        </p>
      </section>

      <div className="sfs-bridge" aria-hidden="true">
        <span className="sfs-bridge-line" />
        <span className="sfs-bridge-text">so go and get it back</span>
        <span className="sfs-bridge-line" />
      </div>

      <section className="sfs-panel">
        <h3 className="sfs-head">
          <span className="sfs-step">2</span> Tune it, then spend it
          <span className="sfs-badge sfs-badge-live">&gt;50% faster</span>
        </h3>
        <div className="sfs-canvas">
          <TunePanel />
        </div>
        <p className="sfs-note">
          The controller is a model with parameters, so the tuning is a search
          rather than an afternoon with a screwdriver. Gaussian process regression
          fits a response surface over that space from a modest number of measured
          settling times and reports both a best guess and where it is still
          uncertain, which is what makes the next measurement worth taking. The
          tunings it finds cut settling time by more than half, and the recovered
          time is spent on scan waveforms that stay linear across more of the sweep:
          wider field, better signal-to-noise and contrast, higher rate. All on the
          stock controller, which is the part that makes it reproducible.
        </p>
      </section>
    </div>
  );
}
