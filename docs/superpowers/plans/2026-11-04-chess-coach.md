# Chess coaching improvements

Approved scope: implement the November 4 research recommendations, beginning with worker continuity and progressive review, then concrete coaching and continuation playback. Preserve TangOS styling, local Stockfish, honest precision/grades, common-depth comparisons, and original game history.

1. Reproduce worker churn and quick-result disappearance with browser regressions. Retain the analysis worker between compatible jobs; dispose on incompatible ownership, cancellation, errors, disable and unmount. Keep quick results visible while separately counting deep upgrades.
2. Retain short legal best/played continuations and their root. Explain verifiable move consequences; use cautious engine-evaluation wording when a tactical claim cannot be supported. Unit-test normal, tactical, terminal, and malformed lines.
3. Add reversible manual/autoplay continuation controls and a separate retry branch with escalating guidance. Preserve board/history/captures/result; test navigation, promotions, special moves, interruption, reduced motion and both sides.
4. Add the compact evaluation timeline, semantic arrows and Normal/Fast/Off motion controls. Preserve keyboard support and visible controls on phones and short windows.
5. Run targeted regressions, the complete browser suite, `npm run verify`, and measured browser worker-lifetime checks. Request independent review, resolve findings and inspect final screenshots. Record evidence and limitations in the audit note. Do not deploy without a deployment request.
