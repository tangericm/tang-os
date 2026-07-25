/**
 * The single-panel explainer for TangOS itself.
 *
 * One panel where the research projects get two. The hierarchy is the point:
 * a reader should be able to tell at a glance which work carried a paper,
 * without that having to be spelled out.
 */

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
          Animating an unmount means the parent must keep the child mounted while the exit animation plays, so every window carries an explicit phase rather than a boolean. Minimize and close animate to different places and must stay distinguishable, focus reorders z-index, and maximize has to remember the geometry it replaced.
        </p>
      </section>
    </div>
  );
}
