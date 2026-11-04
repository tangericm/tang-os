# Chess 0.32 verification

The board now leads the playing view. Setup lives in a dialog; opponent strength can also change during a game without clearing it. Coach gives quick feedback on the latest human move, with colored notation badges, stronger alternatives, and history selection for either side. Separate review provides deeper grades, key moments, move precision, and position navigation.

Stockfish analyzes at full strength independently of the opponent preset. Grades compare expected scores from a common completed search iteration. If the played move falls outside the leading pair, a second search compares all three candidates together. This is a bounded estimate from Stockfish self-play WDL, not a fitted human model or Chess.com accuracy. Brilliant requires an accepted, viable piece sacrifice; Great requires a substantially worse alternative; Miss requires a winning opportunity from the opponent's previous mistake. A deeper review may revise quick grades.

## Checks

- `npm run verify`: typecheck, production build, and 183/183 crawlability checks passed.
- Full browser suite: 71/71 passed on the development server and 71/71 against the production build. Includes real bundled-engine replies at all six strengths, touch play, White/Black, promotion, terminal results, cancellation, undo, retry, live Coach, review, keyboard, responsive layouts, and reduced motion.
- Component tests cover castling, en passant, promoting captures, focus restoration, and an analysis queue deliberately slower than opponent play. Numerical tests reject cross-depth comparisons and keep suggestions consistent with scores.
- Independent review reproduced and fixed inconsistent candidate searches, analysis starvation, incorrect badge ownership after capture, capture counts from future moves, and missing apply-only difficulty changes. The bundled engine distinguished a winning queen sacrifice from a losing control position.
- The portfolio focus test now waits for the initial routed-window focus before moving focus to another window. The original failure and synchronized pass were reproduced on the exact previous production commit; its original z-index assertions remain.
- `npm audit`: zero known vulnerabilities across the full dependency graph.
- Impeccable 4.8.0 mechanical detector: no findings. Taste 2.1.5 app lint: zero failures. Its six shadow warnings concern floating menus/dialogs/badges/arrows and inset selection/focus indicators; these have a specific interaction purpose.
- Inspected the rendered desktop, narrow phone, manually resized, and short landscape layouts. The final coordinate colors meet 4.5:1 contrast on both square colors and selection/check backgrounds. Browser inspection used the available CUA controls and exported browser-test captures rather than Taste's separate browser launcher.

The feature retains the existing browser security policies and engine license/source links. Private Vercel and registrar audit records are stored outside this public repository. No production email was sent as a test.
