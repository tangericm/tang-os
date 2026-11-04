import { expect, test } from "@playwright/test";
import { Chess } from "chess.js";
import { CHESS_LEVELS, gameStatus, undoTurn } from "../app/lib/chess-game";
import { ChessEngine } from "../app/lib/chess-engine";

class TestWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  commands: string[] = [];
  terminated = false;
  postMessage(command: string) { this.commands.push(command); }
  terminate() { this.terminated = true; }
  emit(line: string) { this.onmessage?.({ data: line } as MessageEvent); }
}

test("six distinct difficulty presets include honest approximate Elo targets", () => {
  expect(CHESS_LEVELS.map((level) => level.elo)).toEqual([600, 1000, 1400, 1800, 2200, 2600]);
  expect(CHESS_LEVELS.map((level) => level.label)).toEqual(["Beginner", "Novice", "Intermediate", "Advanced", "Expert", "Grandmaster"]);
});

test("undo returns to the player's turn, including a pending reply and playing Black", () => {
  const game = new Chess();
  game.move("e4");
  expect(undoTurn(game, "b")).toBe(false); // The opening engine move is not the player's turn to undo.
  game.move("e5");
  game.move("Nf3");
  expect(undoTurn(game, "b")).toBe(true);
  expect(game.history()).toEqual(["e4"]);
  game.move("e5");
  expect(undoTurn(game, "b")).toBe(true);
  expect(game.turn()).toBe("b");
  game.reset();
  game.move("d4");
  expect(undoTurn(game, "w")).toBe(true);
  expect(game.history()).toEqual([]);
});

test("status distinguishes checkmate, stalemate, insufficient material, repetition, and fifty moves", () => {
  const mate = new Chess();
  ["f3", "e5", "g4", "Qh4#"].forEach((move) => mate.move(move));
  expect(gameStatus(mate, "w")).toBe("Checkmate — Stockfish wins");
  expect(gameStatus(new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"), "w")).toBe("Draw — stalemate");
  expect(gameStatus(new Chess("7k/8/6K1/8/8/8/8/8 w - - 0 1"), "w")).toBe("Draw — insufficient material");
  expect(gameStatus(new Chess("7k/8/6K1/8/8/8/8/R7 w - - 100 51"), "w")).toBe("Draw — fifty-move rule");
  const repeat = new Chess();
  ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"].forEach((move) => repeat.move(move));
  expect(gameStatus(repeat, "w")).toBe("Draw — threefold repetition");
});

test("worker handshake configures a real limited-strength search and returns its move", async () => {
  const worker = new TestWorker();
  const engine = new ChessEngine(() => worker as unknown as Worker);
  expect(worker.commands).toEqual(["uci"]);
  worker.emit("uciok");
  expect(worker.commands).toContain("isready");
  worker.emit("readyok");
  await engine.ready;
  const result = engine.move(new Chess().fen(), CHESS_LEVELS[3], ["e2e4"]);
  expect(worker.commands).toContain("setoption name UCI_LimitStrength value true");
  expect(worker.commands).toContain("setoption name UCI_Elo value 1800");
  expect(worker.commands.some((command) => command.startsWith("go movetime "))).toBe(true);
  worker.emit("info depth 4 score cp 22 pv e2e4 e7e5\nbestmove e2e4 ponder e7e5");
  expect(await result).toBe("e2e4");
  engine.dispose();
});

test("disposing rejects a pending search and ignores late replies", async () => {
  const worker = new TestWorker();
  const engine = new ChessEngine(() => worker as unknown as Worker);
  worker.emit("uciok"); worker.emit("readyok");
  await engine.ready;
  const result = engine.move(new Chess().fen(), CHESS_LEVELS[5], ["e2e4"]);
  const rejection = expect(result).rejects.toThrow(/cancel/i);
  engine.dispose();
  worker.emit("bestmove e2e4");
  await rejection;
  expect(worker.terminated).toBe(true);
});

test("engine sees the full move history when a third repetition is imminent", async () => {
  const worker = new TestWorker();
  const engine = new ChessEngine(() => worker as unknown as Worker);
  worker.emit("uciok"); worker.emit("readyok");
  await engine.ready;
  const game = new Chess();
  ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1"].forEach((move) => game.move(move));
  const history = game.history({ verbose: true }).map((move) => move.lan);
  const result = engine.move(game.fen(), CHESS_LEVELS[3], game.moves({ verbose: true }).map((move) => move.lan), history);
  expect(worker.commands).toContain("position startpos moves g1f3 g8f6 f3g1 f6g8 g1f3 g8f6 f3g1");
  worker.emit("bestmove f6g8");
  await result;
  engine.dispose();
});

test("worker load failures reject initialization without waiting forever", async () => {
  const worker = new TestWorker();
  const engine = new ChessEngine(() => worker as unknown as Worker);
  const rejection = expect(engine.ready).rejects.toThrow(/load/i);
  worker.onerror?.({ preventDefault() {} } as ErrorEvent);
  await rejection;
  expect(worker.terminated).toBe(true);
});

test("beginner can choose a weaker legal move without claiming a sub-minimum UCI Elo", async () => {
  const worker = new TestWorker();
  const engine = new ChessEngine(() => worker as unknown as Worker, () => 0);
  worker.emit("uciok"); worker.emit("readyok");
  await engine.ready;
  const result = engine.move(new Chess().fen(), CHESS_LEVELS[0], ["a2a3", "e2e4"]);
  expect(worker.commands).toContain("setoption name UCI_LimitStrength value false");
  expect(worker.commands).toContain("setoption name Skill Level value 0");
  expect(worker.commands).not.toContain("setoption name UCI_Elo value 600");
  worker.emit("bestmove e2e4");
  expect(await result).toBe("a2a3");
  engine.dispose();
});

test("analysis returns the deepest complete exact iteration and restores playing strength", async () => {
  const worker = new TestWorker();
  const engine = new ChessEngine(() => worker as unknown as Worker);
  worker.emit("uciok\nreadyok");
  await engine.ready;
  const game = new Chess();
  const legal = ["e2e4", "d2d4"];
  const result = engine.analyze(game.fen(), legal, [], { multiPV: 2, time: 150 });
  expect(worker.commands).toContain("setoption name Skill Level value 20");
  expect(worker.commands).toContain("setoption name UCI_ShowWDL value true");
  await expect(engine.move(game.fen(), CHESS_LEVELS[3], legal)).rejects.toThrow(/running/);
  worker.emit("info depth 6 multipv 1 score cp 10 wdl 30 960 10 pv e2e4 e7e5\ninfo depth 6 multipv 2 score cp 8 wdl 20 970 10 pv d2d4 d7d5\ninfo depth 7 multipv 1 score cp 22 wdl 70 920 10 pv d2d4 d7d5\ninfo depth 7 multipv 2 score cp 4 upperbound wdl 20 970 10 pv e2e4 e7e5\nbestmove d2d4");
  const lines = await result;
  expect(lines.map(line => [line.depth, line.pv[0], line.points])).toEqual([[6,"e2e4",0.51],[6,"d2d4",0.505]]);
  const move = engine.move(game.fen(), CHESS_LEVELS[0], legal);
  expect(worker.commands.slice(-6)).toContain("setoption name MultiPV value 1");
  worker.emit("bestmove e2e4");
  await move;
  engine.dispose();
});

test("restricted analysis rejects malformed evidence, and disposal cancels retry", async () => {
  const worker = new TestWorker();
  const engine = new ChessEngine(() => worker as unknown as Worker);
  worker.emit("uciok\nreadyok");
  await engine.ready;
  const analyze = () => engine.analyze(new Chess().fen(), ["e2e4"], [], {multiPV: 1, time: 200, searchMoves: ["e2e4"]});
  const result = analyze();
  expect(worker.commands.at(-1)).toBe("go movetime 200 searchmoves e2e4");
  worker.emit("info depth 9 multipv 1 score cp 16 pv e2e4\ninfo depth 9 multipv 1 score cp 16 wdl 100 800 100 pv e2e4 a9b3\nbestmove e2e4");
  await expect(result).rejects.toThrow(/analysis/i);
  const second = analyze();
  engine.dispose();
  await expect(second).rejects.toThrow(/cancel/i);
});
