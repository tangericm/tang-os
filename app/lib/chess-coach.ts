import { Chess, type Move, type PieceSymbol } from "chess.js";

const names: Record<PieceSymbol, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

/** An independent board for a short, legal teaching line. Never mutate the played game. */
export function continuationMoves(fen: string, line: readonly string[]): Move[] {
  const game = new Chess(fen);
  try {
    return line.slice(0, 8).map(lan => game.move({ from: lan.slice(0, 2), to: lan.slice(2, 4), promotion: lan[4] }));
  } catch { return []; }
}

export function describeMove(move: Move): string {
  if (move.san.endsWith("#")) return `${move.san} delivers checkmate.`;
  if (move.promotion) return `${move.san} promotes the pawn to a ${names[move.promotion]} on ${move.to}.`;
  if (move.isKingsideCastle() || move.isQueensideCastle()) return `${move.san} castles ${move.isKingsideCastle() ? "kingside" : "queenside"}, bringing the king to ${move.to} and the rook into play.`;
  if (move.captured) return `${move.san} captures the ${names[move.captured]} on ${move.isEnPassant() ? `${move.to[0]}${move.from[1]}` : move.to}${move.isEnPassant() ? " en passant" : ""}.`;
  if (move.san.endsWith("+")) return `${move.san} checks the ${move.color === "w" ? "black" : "white"} king.`;
  if ((move.piece === "n" || move.piece === "b") && move.from[1] === (move.color === "w" ? "1" : "8") && Number(move.before.split(" ")[5]) <= 12) {
    return `${move.san} develops the ${names[move.piece]} from ${move.from} to ${move.to}.`;
  }
  if (move.piece === "p" && ["d4", "e4", "d5", "e5"].includes(move.to)) return `${move.san} places a pawn in the center on ${move.to}.`;
  return `${move.san} moves the ${names[move.piece]} from ${move.from} to ${move.to}.`;
}

export function explainMove(move: Move, played: readonly string[], best: readonly string[], loss: number, fallback: string): string {
  const playedMoves = continuationMoves(move.before, played);
  const bestMove = continuationMoves(move.before, best)[0];
  if (loss >= .05) {
    const mate = playedMoves.find(reply => reply.color !== move.color && reply.san.endsWith("#"));
    if (mate) return `${move.san} allows ${mate.san} in the engine’s continuation. ${bestMove ? `${bestMove.san} is stronger here.` : fallback}`;
    const capture = playedMoves.find(reply => reply.color !== move.color && reply.captured);
    if (capture) {
      const sequence = playedMoves.slice(0, playedMoves.indexOf(capture) + 1).map(reply => reply.san).join(" ");
      return `In the engine line ${sequence}, ${capture.color === "w" ? "White" : "Black"} captures the ${names[capture.captured!]} on ${capture.isEnPassant() ? `${capture.to[0]}${capture.from[1]}` : capture.to}. ${bestMove ? `${bestMove.san} scores better here.` : fallback}`;
    }
    return `${fallback}${bestMove ? ` ${describeMove(bestMove)}` : ""}`;
  }
  return `${describeMove(move)}${bestMove && bestMove.lan !== move.lan ? ` ${bestMove.san} is another strong option.` : ""}`;
}

export function moveHint(move: Move): string {
  if (move.isKingsideCastle() || move.isQueensideCastle()) return "Consider getting your king to safety by castling.";
  if (move.promotion) return "Look for a pawn promotion.";
  return `Look for a ${names[move.piece]} move${move.captured ? " that makes a capture" : ""}.`;
}
