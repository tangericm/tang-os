# Chess refinement and live Coach

The user approved building directly, then requested live move feedback, colored notation badges, calmer engine pacing, clearer pieces, simpler controls, and postgame review. Preserve TangOS's warm graphite desktop and `/play` route.

## Evidence and decisions

- [Chess.com Game Review](https://support.chess.com/en/articles/8584089-how-does-game-review-work) separates postgame statistics and key moves from play and supports arrow navigation. Adopt that separation: one compact Coach during play, a focused review after the game.
- [Chess.com classifications](https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc) consider expected points, exceptional sacrifices, critical moves, and missed opportunities. TangOS uses its own conservative rules over Stockfish self-play WDL estimates, without claiming Chess.com's human-rating model or accuracy score.
- [Duolingo Chess](https://blog.duolingo.com/chess-course/) emphasizes active learning, essentials, and short feedback. Design inference: keep the board dominant and put setup choices behind a deliberate New game action.
- Apply Impeccable 4.8.0, upstream `9fadc41729c38fd47d7ae622b501558653f9d2e9`, and Taste 2.1.5, upstream `12af471f627f866411b4bd785b19646d3672784c`, fetched from official repositories on November 3, 2026. This is an existing app component: preserve palette/type and use app-screen rules, without a new marketing-page direction or stock imagery.

## Screen and data

The main question is: what should I play, and what can I learn from my last move? The largest element is the board. The data comes entirely from the current chess.js game: 64 squares, 32 starting pieces, legal moves, captured material, SAN history, result, and selected review position. Six approximate opponent levels range from 600 to 2600. Each analyzed ply has one grade, expected-score loss, depth, and best alternative. Missing analysis stays pending or unavailable; never synthesize a grade.

The incumbent OS frame identifies Chess. During play, a four-action toolbar provides New game, undo, flip, and more. New game protects focus and confirms clearing an existing game. More exposes an apply-only opponent-level change, review, resign, and help. The side panel contains Coach and move history. On phones it follows the complete board; short landscape uses a smaller board beside a scrolling panel.

## Motion and feedback

The focal moment is a meaningful colored notation badge on a graded move. Original rounded Staunton SVG pieces travel for 240 ms; captured pieces fade and shrink over 220 ms. Castling animates the rook and king; en passant removes the bypassed pawn; promotion travels as a pawn. Reduced motion keeps final positions and static badges. Opponent search runs concurrently with a 1.25-second minimum pause. All search and pacing work cancels on pause, reset, undo, and navigation.

Coach retains the latest human move for reading; history selects either side's feedback. The board badge follows the displayed ply, never a captured human piece. An optional alternative shows the position before that move and an arrow. Review preserves the live game, supports keyboard and move-list navigation, shows key moments and per-side move precision, and upgrades quick grades with deeper searches. Its summaries use only graded moves and viewed capture history.

## Acceptance

Verify legal play at every preset; White/Black; undo and stale worker cancellation; all promotions; castling/en-passant motion; compact setup; live grades; slow-device queue progress; shared-depth numerical comparisons; capture/badge ownership in review; stop/retry analysis; desktop, phone, short landscape, manual resize, keyboard and reduced motion. Run typecheck, production build, crawlability checks, browser suite, dependency audit, then verify deployment and real-engine behavior. Keep account audit details outside the public repository.
