import type { Chess, Color } from "chess.js";

export const CHESS_LEVELS = [
  { id: "beginner", label: "Beginner", elo: 600, time: 120, depth: 1, mistakes: 0.6 },
  { id: "novice", label: "Novice", elo: 1000, time: 200, depth: 3, mistakes: 0.25 },
  { id: "intermediate", label: "Intermediate", elo: 1400, time: 350, depth: 0, mistakes: 0 },
  { id: "advanced", label: "Advanced", elo: 1800, time: 600, depth: 0, mistakes: 0 },
  { id: "expert", label: "Expert", elo: 2200, time: 900, depth: 0, mistakes: 0 },
  { id: "grandmaster", label: "Grandmaster", elo: 2600, time: 1400, depth: 0, mistakes: 0 },
] as const;

export type ChessLevel = (typeof CHESS_LEVELS)[number];

export function gameStatus(game: Chess, player: Color): string {
  if (game.isCheckmate()) return `Checkmate — ${game.turn() === player ? "Stockfish wins" : "you win"}`;
  if (game.isStalemate()) return "Draw — stalemate";
  if (game.isInsufficientMaterial()) return "Draw — insufficient material";
  if (game.isThreefoldRepetition()) return "Draw — threefold repetition";
  if (game.isDrawByFiftyMoves()) return "Draw — fifty-move rule";
  const turn = game.turn() === player ? "Your turn" : "Stockfish to move";
  return game.isCheck() ? `${turn} — check` : turn;
}

/** Undo a player's move and its reply, preserving an opening move by White's engine. */
export function undoTurn(game: Chess, player: Color): boolean {
  if (!game.history({ verbose: true }).some((move) => move.color === player)) return false;
  do { game.undo(); } while (game.history().length && game.turn() !== player);
  return true;
}
