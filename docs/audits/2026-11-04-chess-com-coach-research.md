# Chess.com Coach benchmark for TangOS

Research date: November 4, 2026. Scope: Play Coach, Game Review, analysis, board interaction, motion, and practical performance parity.

Implementation follow-up: [coaching changes, browser measurements and verification](2026-11-04-chess-coaching.md).

The highest-value match is a fast, continuous learning loop: make a move, understand a concrete consequence, inspect a short continuation, and try an alternative. TangOS already has legal play, live grades, stronger alternatives, key moments, and conservative grading. Its largest gaps are position-specific explanations, variation playback, replaying a reviewed position, and continuity while deeper analysis runs. Adding more engine depth alone will not close those gaps.

## Evidence and limits

Exa searches requested 40 result slots across six angles: review flow, live coaching, speed/architecture, board design/motion, metrics, and 2026 rollout changes. The 40 returned hits deduplicated to 33 URLs; 21 first-party pages were fetched and read. Two nonprimary search results (a community forum and Stack Exchange) were excluded as evidence. Search hits are discovery candidates, not 40 independently validated sources.

Chess.com's interactive analysis page was blocked by the organization's Cato Networks Games policy during this session. No bypass was attempted. This comparison uses the text of accessible official documentation and product announcements; links to illustrated first-party references are included for visual follow-up. It does not claim a hands-on paid review, measured Chess.com latency, exact animation timings, or pixel-level inspection.

Confidence labels below describe evidence, not implementation quality:

- **High:** explicit current Help Center behavior, corroborated where possible.
- **Historical:** explicit first-party announcement about the implementation at that time.
- **Beta / unresolved:** first-party beta behavior conflicts with another official source or lacks confirmed universal rollout.
- **Recommendation:** a proposed TangOS decision or budget, not a Chess.com fact.

## Match the right product

| Experience | Documented purpose | Implication for TangOS |
|---|---|---|
| Play Coach | Training opponent that gives feedback after moves; first Hint supplies guidance, another reveals the best move. Undo, color/strength selection, suggestion/threat arrows, evaluation bar, and move feedback are available. Games can resume after leaving. | The live Coach should teach without blocking the next move. Separate an educational hint from revealing an answer. Preserve practice state. **High.** [Play Coach guide](https://support.chess.com/en/articles/10877257-how-do-i-play-against-the-coach) |
| Game Review | Guided postgame learning with a summary, critical moments, explanations, and exploration of improvements. | Keep the existing focused review surface. Make it useful immediately, then deepen it. **High.** [Game Review guide](https://support.chess.com/en/articles/8584089-how-does-game-review-work) |
| Self Analysis | Open-ended exploration with evaluations, lines, annotations, and optional cloud analysis. | Do not make a dense analysis workbench the default live-coaching interface. **High.** [Analysis guide](https://support.chess.com/en/articles/8583757-how-do-i-use-game-analysis) |

The launch announcement describes coaching that points out attacked pieces and strategic needs, encourages the player to find an answer, and permits taking back moves. Those concrete teaching interactions matter more than an avatar or celebratory wording. **Historical product intent.** [Play Coach launch](https://www.chess.com/news/view/announcing-play-coach)

## Speed: what Chess.com actually documents

1. The game-over modal performs quick analysis locally; full Game Review is processed on Chess.com's servers. The deeper result can change a move's classification. This is a documented two-stage experience, not evidence that quick results should disappear while a review loads. **High.** [Why classifications change](https://support.chess.com/en/articles/11845102-why-did-my-move-classification-change-in-game-review)
2. In July 2023, Chess.com attributed faster Game Review to an architecture change and a standardized number of analyzed nodes per move, alongside its engine update. It advertised a report in a few seconds and distinguished Fast from Standard. This is an old vendor claim, not a 2026 benchmark or service guarantee. **Historical.** [Engine and review-speed announcement](https://www.chess.com/news/view/stockfish-16-on-chesscom)
3. Deeper settings take longer. Self Analysis uses the user's device, while Game Review and Cloud Analysis are server-backed. **High.** [Analysis-depth guide](https://support.chess.com/en/articles/8708936-what-is-analysis-depth-what-does-it-mean)
4. The August 2026 engine guide describes server-side Stockfish 18 with full NNUE and a lighter browser default, citing download size as a constraint. Its observation about diminishing returns beyond low-twenties depth concerns broadcasts; it is not a universal Game Review depth prescription. **High for what the guide says; engine rollout qualified below.** [Engine guide](https://support.chess.com/en/articles/9462780-how-do-the-chess-engines-on-chess-com-work)

**Important source conflict:** a March 2026 beta announcement says Game Review switched to Torch Human, selecting a humanlike choice among strong moves; it explicitly excludes Play Coach and Self Analysis from that change. This conflicts with the later engine guide's broad Stockfish description. The research cannot determine which engine every account currently receives. Do not claim universal Stockfish parity, replicate an undocumented Torch model, or infer a cloud topology, worker count, cache policy, node budget, or latency from these pages. [Torch Human beta announcement](https://www.chess.com/announcements/view/update-game-review-now-more-human)

**TangOS recommendation:** optimize time to useful feedback and keep completed work visible. Reuse a ready analysis worker when measured startup costs justify it; retain cancellation and game/history ownership. Keep full-strength analysis independent of opponent strength. An optional server review would be a separate architectural/cost decision, not a prerequisite for better UX.

## Design and coaching interactions

The 2024 redesign moved results, evaluation graph, and performance information up front, with Coach persistently near the top of the review. It also emphasized revealing only the analysis tools the player needs. Adopt that hierarchy while retaining TangOS's warm graphite desktop visual language. **Historical design direction.** [Redesign with visual examples](https://www.chess.com/news/view/game-review-design-update)

| Area | Benchmark behavior and evidence | TangOS recommendation |
|---|---|---|
| Move feedback | Coach explains the selected move and key moments; context-specific actions include showing a fork, lost piece, mate, or idea. [Web review](https://support.chess.com/en/articles/8584089-how-does-game-review-work) | Put one concrete reason first: relevant piece, square, and consequence. A grade description alone does not explain this position. |
| Suggested continuation | Show plays a variation, its notation remains navigable, Hide returns to the reviewed game, and Best switches the candidate being explained. [Mobile review guide](https://support.chess.com/en/articles/10328363-how-do-i-use-game-review-on-the-app) | Store a validated PV with its root position. Provide play/pause, previous/next, and Return to game. Keep variation state separate from the actual game. |
| Active practice | The documented review can replay a position with feedback and optional guidance. [Mobile review guide](https://support.chess.com/en/articles/10328363-how-do-i-use-game-review-on-the-app) | Add a local practice branch for the selected position; never rewrite the saved game. Accept clearly equivalent good alternatives when verified, rather than treating one unstable PV as the only correct answer. |
| Navigation | The summary graph is clickable; guided review and deeper manual analysis are separate paths. [Game Review overview](https://www.chess.com/terms/game-review) | Add a compact evaluation timeline and next/previous key-moment actions. Keep board, selected ply, grade, captures, and navigation synchronized. |
| Board teaching marks | Green denotes a good option, red danger, orange the explained idea, and blue the opponent's response; important squares share these colors. Best-move arrows can be toggled separately. [Arrow-color guide](https://support.chess.com/en/articles/17665907-what-do-the-colored-arrows-in-game-review-mean) | Reserve green for recommended moves and separate it from orange teaching arrows. Use text and shapes as well as color. Show only annotations justified by the selected explanation. |
| Responsive controls | On mobile, navigation is below the board, swipe navigation is supported, and an oversized coach bubble can be moved out of the way. [Mobile review guide](https://support.chess.com/en/articles/10328363-how-do-i-use-game-review-on-the-app) | Keep primary navigation visible on short windows. Avoid a speech bubble that obscures the board or requires dragging to expose controls. |
| Personalization | Coach selection and voice can change in place; text remains the basic feedback surface. [Coach settings](https://support.chess.com/en/articles/10812255-how-do-i-manage-the-coach) | Optional voice/avatar can follow substantive coaching improvements. Avoid making audio a dependency of feedback delivery. |

**2026 beta distinction:** March's Explain experiment pauses after each suggested move and explains that step, replacing an earlier follow-up control and Retry. September Help Center documentation still describes Retry. Preserve practice and add stepwise explanation rather than assuming the beta removal represents every current account. **Beta / unresolved.** [Explain announcement](https://www.chess.com/announcements/view/update-game-reviews-coach-now-with-more-in-depth-line-explanation)

The September 2026 opening-course feature identifies deviations from owned course lines and links back to study. A small opening name/book lookup may be useful later; recreating an account-linked course ecosystem is outside the performance/coaching gap. **High for announced feature.** [Course-deviation announcement](https://www.chess.com/news/view/announcing-game-review-course-check)

## Motion and board feel

Chess.com documents Slow, Medium, Fast, Natural, and Arcade styles, drag/click preferences, legal-move dots, move highlighting, and coordinate settings. It does not publish millisecond durations or easing curves in these guides. **High.** [Board settings](https://support.chess.com/en/articles/8614003-how-do-i-manage-my-live-chess-settings)

Animation can be disabled. Chess.com explicitly warns that Arcade costs extra graphical resources. Matching an elaborate style is therefore not inherently matching performance. **High.** [Animation guide and settings examples](https://support.chess.com/en/articles/15880023-how-do-i-change-piece-animations)

Recommendations for TangOS:

- Keep movement transform-based and interruptible. Drag feedback should follow the pointer immediately; engine work and a captured-piece fade must not hold input hostage.
- Offer Normal, Fast, and Off, honoring reduced-motion preferences. Try 140–180 ms for Fast and retain the existing 240 ms Normal until actual interaction tests favor another value. These are proposed timings, not measured Chess.com values.
- Separate piece-travel duration, autoplay delay, and the opponent's intentional thinking pause. A slower teaching replay can be useful while a slower drag response is not.
- Test captures, castling, en passant, promotion, undo during travel, and rapid history navigation. Always land on the correct final board after interruption.

## Metrics: similar presentation, honest mathematics

Chess.com's standard classification uses expected points conditioned on player rating and engine evaluation. Brilliant additionally involves a good sacrifice, with viability and rating-dependent conditions; Great highlights critical finds, and Miss concerns an unpunished opportunity from the opponent. Static centipawn thresholds or merely selecting the engine's first move do not reproduce these special labels. **High.** [Classification model](https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc)

CAPS2 is a separate accuracy model whose score distribution was adjusted to be easier to interpret. Its full fitting/calibration formula is not provided in the sources reviewed. Do not rename TangOS's mean retained Stockfish expected score to Chess.com Accuracy. **High for described metric; formula unknown.** [CAPS2 explanation](https://support.chess.com/en/articles/8708970-how-is-accuracy-in-analysis-determined)

Single-game performance rating estimates move quality against rating expectations; it is not an updated playing rating, and bot rating gaps can make it inconsistent. TangOS should not invent an Elo-style performance number without a calibrated model. **High.** [Performance-rating guide](https://support.chess.com/en/articles/10773754-how-is-game-rating-calculated-in-game-review)

Keep TangOS's Move precision label and explanation. Retain common-depth comparisons and conservative exceptional grades. If deeper analysis revises a quick grade, communicate the upgrade and keep every number tied to the analysis that produced it. An evaluation graph is still useful without implying CAPS2 parity.

## Local parity audit and priorities

This is a source audit of the November 3 baseline, not a claim that every row was measured in a browser. Local references: [previous verification](2026-11-03-chess-polish.md), [review queue](../../app/components/useChessReview.ts), [review computation](../../app/lib/chess-review.ts), [review panel](../../app/components/ChessReviewPanel.tsx), [game surface](../../app/components/GameWindow.tsx), and [motion styles](../../app/components/chess.css).

| Priority | Baseline observation | Concrete improvement | Evidence of success |
|---|---|---|---|
| P0 | Analysis worker is created for a queue and disposed when it drains. | Measure startup separately from search; keep a ready worker across compatible batches if the measured win justifies it. | Worker count and move-to-grade p50/p95 improve without stale results after undo/reset/disable. |
| P0 | Switching to review hides live-quality entries until replaced. | Show quick results immediately with a clear upgrading state; replace atomically as deeper results arrive. | Review opens with usable feedback and no grade/summary flash to empty. |
| P0 | Review computes plies sequentially with 350 ms primary passes and sometimes another 350 ms pass. | Preserve chronological correctness while publishing progress. Evaluate Fast/Standard budgets after profiling. | Compare fixed-game total time, first useful result, and exceptional-grade stability. |
| P1 | Review retains only the preferred move; explanations are mainly grade templates. | Retain short legal played/best PVs and generate position-specific explanations from verified facts. | A user can see why a mistake loses something and follow the legal consequence. |
| P1 | Alternative shows the prior position and one arrow. | Add a reversible variation viewer with step controls and optional autoplay. | Returning restores exactly the same original game and selected ply. |
| P1 | No reviewed-position practice branch is exposed. | Add Try again with optional escalating guidance. | The practice attempt cannot alter original history, captures, or result. |
| P1 | Summary contains precision/counts and a severity-ranked key-moment list. | Add a clickable evaluation timeline and explicit next key moment. | Board, grade, timeline cursor, and explanation stay synchronized. |
| P2 | Travel is 240 ms, capture 220 ms; opponent has a 1.25-second minimum pause. | Test Fast/Off and configurable practice pacing. | Faster input response and no animation interruption defects. |

Prioritizing a selected position requires care: the current Miss rule reads the preceding move's review. Do not reorder analysis and silently lose or fabricate that context. Either preserve the dependency or make provisional classifications explicit.

With an 80-ply game, the current per-pass review budgets sum to roughly 28–56 seconds before other overhead if all plies need one or two passes. This is an accounting illustration, not a measured duration or guaranteed lower bound. It explains why instant access to existing results is valuable even before changing search quality.

## Proposed performance budgets and measurement protocol

All values below are **recommended starting targets**, not Chess.com measurements or guarantees. Confirm feasibility on the actual desktop and representative slower hardware before adopting them as release gates.

| Metric | Starting target | Measurement |
|---|---|---|
| Board selection / legal move feedback | p95 under 100 ms | Input timestamp to next rendered selected/final board. |
| Drag motion | Stable within a 16.7 ms frame budget at 60 Hz | Performance trace during drag with both engine activities running. |
| Warm live grade | p95 under 750 ms at the existing search quality | Human move commit to visible grade; distinguish first and fallback passes. |
| Opening existing review | Feedback appears within 100 ms | Click to showing cached selected grade, separately from upgrade completion. |
| Cached history navigation | p95 under 100 ms | Click/key to matching board and explanation; no redundant search. |
| Fast review first useful feedback | Under 1 second when prior results exist | Cold and warm cases reported separately. |
| Full fast review | Initially seek a measured 25% improvement at equivalent quality | Fixed PGN, same hardware/cache/quality, compare ten runs and variance. |
| Cancellation | No stale board or feedback at any point | Undo/reset, app close, mode changes, and rapid repeated navigation under slow analysis. |

Record worker initialization, search time, fallback frequency, time to first grade, full-review duration, UI long tasks, and memory. Use the same tactical/quiet/endgame positions, the same PGN, and the same engine budgets for before/after runs. Report p50/p95 and cold/warm conditions. A fast result with missing candidate searches, mixed depths, invalid PVs, or changed game state fails correctness regardless of its timing.

No new runtime library, cloud service, paid coach asset, or cloned visual theme is required for the first optimization pass. Worker continuity, progressive review, concrete explanations, and reversible variation playback are the strongest near-term route to a Chess.com-like coaching experience within the existing TangOS app.

## Session evidence: existing app and engine diagnostic

The source baseline is commit `973a65c`. The live site was opened at `/play`, a legal `1.e4 e5` was played, and the Coach displayed the human move's Best grade with the template explanation. The board dominated the layout, grade badges appeared on the board and move list, and the graphite/brown palette remained consistent with TangOS. This confirms the live learning surface, not measured input latency. Opening review subsequently encountered browser-control timeouts; the review behavior described above is grounded in source and existing tests, not a successfully timed review interaction this session.

The browser inspection API did not expose Performance timing in its read-only evaluation scope. A separate temporary localhost benchmark was prepared, but its browser tab could not attach. That server was stopped. No browser timing dataset was obtained. Neither failure establishes a TangOS application defect.

A completed **Node CLI diagnostic**, using the actual `ChessEngine` and `reviewMove` code with the bundled unmodified WASM engine, compared creating a fresh engine process for every ply with retaining one process. It used 12 Ruy Lopez plies, a warmup, and three alternating batches per scenario, keeping the 150 ms live-search budget. Each scenario contains 36 evaluated plies. Raw observations, including depth and grade, are in [the JSON dataset](2026-11-04-chess-engine-baseline.json); [the diagnostic script](2026-11-04-chess-engine-baseline.cjs) is reproducible with `node docs/audits/2026-11-04-chess-engine-baseline.cjs` from the repo root.

| Diagnostic metric | Fresh process per ply | Retained process per 12-ply batch |
|---|---:|---:|
| Engine processes over three batches | 36 | 3 |
| Median initialization, when needed | 890.2 ms | 1,055.5 ms (3 initializations) |
| Median ply analysis including initialization | 1,081.0 ms | 215.8 ms |
| p95 ply analysis including initialization | 2,519.8 ms | 1,275.2 ms |
| Median 12-ply batch | 13,125.1 ms | 4,131.6 ms |
| Median completed search depth | 9 | 9 |
| Observed completed-depth range | 7–14 | 4–12 |

**Interpretation and limits:** this isolates a reason to profile worker lifetime in the browser; it does not demonstrate a shipped optimization or estimate the browser-worker speedup. CLI process creation includes Node startup and Windows scheduling/security/file overhead absent from the same form in a browser worker. The current analysis hook already reuses a worker within a queued batch, so the fresh-per-ply comparator is a diagnostic worst case. Retained transposition tables affect lines, grades, fallback frequency, and attained depth; matching medians do not establish equivalent quality. Local OS load was uncontrolled, and typecheck/test startup overlapped part of the diagnostic session, so the timing variance is material. Do not call the ratio a measured end-user performance improvement.

A single retained-process deeper-review batch of the same 12 plies took 9,329.3 ms, including 2,447.1 ms initialization. This is one CLI sample, not a full-game estimate or a robust browser baseline. Deeper review and live analysis also compete for CPU differently in the actual app.

Fresh verification of the existing numerical/cancellation behavior: the 20 tests in `tests/chess-engine.spec.ts` and `tests/chess-review.spec.ts` passed. They cover UCI initialization and disposal, repetition/checkmate outcomes, shared-iteration analysis, restricted candidate validation, exceptional-grade safeguards, and score/recommendation consistency. This was a targeted baseline check; the complete browser suite and a new production build were not run for this research-only change.

## Concrete next implementation pass

Start with a bounded speed-and-continuity change, preserving the current visual system and engine budgets:

1. In `useChessReview.ts`, give a ready analysis worker a lifetime tied to the active chess session rather than the drained queue. Keep one analysis search in flight. Preserve explicit ownership checks on history/mode/epoch, disposal on cancellation/errors/unmount, and clean state after undo/reset. Profile separate opponent-worker reuse in `GameWindow.tsx` as a follow-up; do not change both lifetimes before measuring the first.
2. Expose cached quick results separately from the count of completed deep upgrades. Review should open with the existing board, grades, and summary, mark the analysis as deepening, and replace each entry atomically. Stop/Resume must distinguish stopping upgrades from losing already completed feedback. Preserve chronological context for Miss classification.
3. Extend the existing queue regressions with a fast worker that drains between turns, a late reply after undo/reset, and quick-to-deep transitions. Verify zero stale results, bounded worker count, identical game history, useful feedback on review entry, and the measured browser move-to-grade distribution. Keep the existing common-depth and legal-PV checks.

This pass addresses a measured diagnostic lead and a directly observable source-level continuity problem. It deliberately leaves search-depth tuning until startup and feedback visibility are measured independently.

Then add the teaching interactions in small independent increments: retain short validated best/played continuations; generate explanations from concrete supported consequences; let the user step through the line and return to the original board; and add a separate Try again branch. A compact evaluation timeline can follow. Manual stepping must work without autoplay, and speculative tactical text must fall back to honest evaluation-based wording.

Further parity items from Play Coach are a two-stage Hint (idea, then answer), optional threat/suggestion marks, drag-and-drop alongside the current click/keyboard controls, and game recovery after refresh. These are separate product capabilities rather than prerequisites for the first performance pass. Fast/Normal/Off motion and optional opponent pacing belong after interaction measurements; the existing 1.25-second pause was an intentional previously approved reading interval.

Avoid a server review migration for the first pass. It adds operations, cost, and an external dependency without fixing generic explanations, variation navigation, or discarded visible results. Revisit only if measured browser computation cannot meet a chosen review budget at the required quality. Treat an exact Chess.com engine, accuracy, artwork, or latency match as unverified; the practical target is comparable learning behavior and responsive interaction.
