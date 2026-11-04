# Replace Runner with Chess

Approved for implementation on November 3, 2026: "Use your judgment and build it."

## Intent

Replace the dinosaur Runner in Eric M. Tang's desktop portfolio with a complete, casual chess game against an adjustable built-in engine. Keep Tang OS's window controls, desktop integration, warm dark palette, mobile support, and existing `/play` URL.

## Approaches

1. **Recommended: browser-local Stockfish and a native Tang OS board.** Use `chess.js` for rules and Stockfish's lite single-threaded WebAssembly build in a worker. This fits the existing React/TypeScript application, needs no backend or engine API, and allows full control over the board's appearance and accessibility.
2. **Embed an external chess game.** Quicker to integrate, but introduces another site's styling, availability, privacy behavior, and difficulty controls into the desktop. It provides less control over the requested experience.

Selected: browser-local Stockfish with a native Tang OS board.

## Proposed experience

- Rename Runner to Chess in the window, dock, desktop shortcut, terminal output, and route metadata. Retain the internal game application identifier and `/play` route.
- Show an ivory-and-warm-brown board with clear white and black pieces, coordinates, selected-square feedback, legal destinations, last-move highlights, and check indication.
- Support pointer, touch, and keyboard play. Announce the turn, check, and final result accessibly.
- Offer Beginner (~600), Novice (~1000), Intermediate (~1400), Advanced (~1800), Expert (~2200), and Grandmaster (~2600) as approximate difficulty presets. Default to Novice.
- Use Stockfish's supported strength settings for higher levels. Weaken the two lowest presets with bounded search and occasional weaker legal choices. Explain that displayed Elo values are estimates, not calibrated human ratings; validate supported option ranges against the exact engine build.
- Let visitors play White or Black. Include a new-game action, undo of the player's previous turn, board flip, and move history. Show legal destinations as hints.
- Enforce legal chess, including castling, en passant, and a promotion choice. Report checkmate, stalemate, insufficient material, repetition, and the fifty-move rule as supported by the rules library.
- Start a fresh game when changing side; require an explicit new-game action before discarding a game in progress. Difficulty changes apply to the next engine move.

## Implementation boundaries

Keep the existing Next.js/Vercel deployment. Add `chess.js` and a pinned Stockfish build; use the current window component and handwritten CSS instead of a new UI framework or board component library. Load the engine only when Chess opens. Keep searches off the UI thread, reject stale results after undo/reset, pause work while minimized, and terminate the worker when the app closes. Include a visible engine-load error with a retry action.

Keep the current game in memory across minimizing and navigation, matching the existing window manager. Persistent saved games, accounts, online multiplayer, clocks, lessons, and analysis tools are outside this replacement.

Preserve Stockfish's license and notices and provide access to the exact corresponding engine source. Do not modify the existing uncommitted `AGENTS.md` or `docs/agents/` changes.

## Validation

Run the repository's `npm run verify` checks and existing browser regression suite. Add focused coverage for legal and illegal moves, both player colors, actual engine replies, difficulty selection, undo/reset during a pending search, promotion, terminal states, loading failures/retry, minimize/restore, keyboard interaction, and mobile layout. Inspect the rendered game at desktop and phone sizes. Report deployment separately from local implementation and validation.
