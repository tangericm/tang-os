# Chess coaching implementation and verification

Implemented on `feature/chess-coach-continuity`, from `973a65c`, following the [Chess.com research](2026-11-04-chess-com-coach-research.md) and the approved [implementation plan](../superpowers/plans/2026-11-04-chess-coach.md). No deployment was performed.

## Result

- A ready analysis worker survives drained queues and compatible idle live/review transitions. In-flight incompatible work, undo/reset, disable, stop, errors and unmount still dispose it. Late results cannot publish into a replacement job.
- Review opens with cached quick grades and precision still visible. Deeper results replace entries individually, and progress counts **refined** moves. Stop/Resume preserves completed and quick results. Previous-ply context remains chronological for Miss grading.
- Coaching names concrete moves, pieces and squares, captures, promotions, development, central pawns, checks and mate continuations. Unsupported tactical claims fall back to the existing grade/evaluation explanation. Exceptional grades retain their safeguards.
- Both best and played lines retain up to eight legal plies. The independent continuation board supports stepping, keyboard navigation, notation selection and cancellable autoplay. A line is held stable while deeper grades update elsewhere.
- Try again uses an independent practice board. Hints first suggest a piece/idea, then expose the move as both a board arrow and accessible SAN/from/to text. A fresh common-depth comparison can accept a good alternative rather than rejecting every non-identical move. Original game moves, captures and result remain intact.
- Review includes an accessible evaluation timeline and previous/next key moments. The graph is Stockfish's expected score for White, not calibrated human winning chances or Chess.com CAPS2.
- Normal (240 ms), Fast (160 ms) and Off motion settings respect reduced motion. Teaching autoplay has a separate 900 ms step interval. Short landscape places the board and teaching controls side by side; the return action and navigation remain inside the window.

The original opponent search budgets and intentional 1.25-second minimum reading pause remain. No backend, dependency, external coaching API, paid artwork, engine binary or browser security policy was added or changed. Coaching is derived from supported move facts and engine continuations; it does not reproduce Chess.com's proprietary explanation or accuracy models.

## Measured worker improvement

The production-build browser comparison used the real bundled WASM engine and actual baseline/current review hooks, with the same current grading code. Three alternating batches of six Ruy Lopez plies per version deliberately let each queue drain. There was no opponent worker or piece animation in this isolated fixture. Latency is move append to published grade, not field INP or click-to-paint. Initializations are included.

| Metric | Baseline | Retained analysis worker |
|---|---:|---:|
| Evaluated plies | 18 | 18 |
| Worker creations | 18 | 3 |
| Median grade publication | 662.4 ms | 171.0 ms |
| p95 grade publication | 971.0 ms | 615.4 ms |
| Median initialization, when needed | 441.2 ms | 400.4 ms |
| Median completed depth | 9 | 11 |
| Completed-depth range | 6–14 | 8–13 |

Per-batch median publication times were 690.2 / 662.4 / 613.3 ms before and 170.8 / 172.4 / 171.0 ms after. The improvement is larger than the observed between-batch variation on this machine. Keep the worker-lifetime change.

[Raw browser measurements](2026-11-04-chess-browser-performance.json) include per-ply latency, depth and grades. Retained hash state can change PVs, grades and attained depth. This is fixed-time-budget evidence, not proof of identical analysis quality, broad device coverage or Chess.com latency parity. OS load was uncontrolled; cache/network/CPU throttling was not standardized. First loading still costs time, and the actual game also runs the opponent engine. A separate earlier development-server run showed the same direction (971.7 → 180.0 ms median), with different machine load. Do not mix either browser dataset with the earlier [Node CLI diagnostic](2026-11-04-chess-engine-baseline.json).

Reproduce with `npx playwright test tests/chess-performance.spec.ts --reporter=line`. The historical comparison explicitly skips when Git object `973a65c` is unavailable. The lifecycle regressions do not depend on that historical object.

## Verification

- `npm run verify`: typecheck, production build and **183/183 crawlability checks passed**.
- `npm run test:browser -- --reporter=line`, reusing `npm run start`: **95/95 passed**, zero skipped, on the production build.
- Coverage includes all six real-engine strengths, White/Black, loading/retry, delayed/stale results, undo/reset/minimize/restore, live feedback, deep refinement, stop/resume, numerical grading, castling/en passant/promoting captures, underpromotion, independent practice and alternative acceptance, pending-practice cancellation, autoplay cancellation, timeline keyboard input, Off/reduced motion and responsive window geometry. Existing portfolio, no-JavaScript, security and simulator regressions also passed.
- Independent reviews found no worker ownership or source-game mutation defect. The review's accessible-hint issue was reproduced by a failing assertion, then corrected and tested. The missing historical-object case and ambiguous progress wording were also addressed. A requested pending-practice cancellation test passed in the full suite.
- The short-landscape control regression first reproduced a navigation bottom at y=376 against a body bottom at y=285. After the layout change, the desktop, phone and landscape control-bound tests passed.
- `git diff --check` and syntax checking of the diagnostic script passed. No new dependency audit was needed because the dependency graph is unchanged.

The screenshots use deterministic legal opening positions and mocked engine replies for repeatable UI inspection; real-engine behavior is tested separately. [Desktop review](2026-11-04-chess-review-desktop.png), [desktop continuation](2026-11-04-chess-continuation-desktop.png), [phone continuation](2026-11-04-chess-continuation-mobile.png), and [short landscape](2026-11-04-chess-continuation-landscape.png). The timeline test also passed separately at 1440×1000 after adding the final review capture; the application code was unchanged from the 95-test production run.
