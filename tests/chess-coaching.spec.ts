import { expect, test } from "@playwright/test";
import { Chess } from "chess.js";
import { reviewMove } from "../app/lib/chess-review";
import type { AnalysisLine } from "../app/lib/chess-engine";
import { continuationMoves, describeMove } from "../app/lib/chess-coach";

const line = (pv: string, points: number): AnalysisLine => ({ pv: pv.split(" "), points, depth: 12, score: { type: "cp", value: 0 } });
const source = (...calls: AnalysisLine[][]) => ({ analyze: async () => calls.shift()! });

test("coaching retains both legal continuations and explains a concrete opening move", async () => {
  const move = new Chess().move("e4");
  const review = await reviewMove(source([line("e2e4 e7e5 g1f3 b8c6", .55), line("d2d4 d7d5", .53)]), move, [], "live");
  expect(review).toMatchObject({ bestLine: ["e2e4", "e7e5", "g1f3", "b8c6"], playedLine: ["e2e4", "e7e5", "g1f3", "b8c6"] });
  expect(review.explanation).toContain("e4");
  expect(review.explanation).toContain("center");
});

test("a material-losing continuation names the captured piece and square without inventing a tactic", async () => {
  const game = new Chess();
  game.move("e4"); game.move("e5");
  const move = game.move("Ba6");
  const review = await reviewMove(source(
    [line("g1f3 b8c6", .56), line("f1c4 g8f6", .54)],
    [line("g1f3 b8c6", .56), line("f1c4 g8f6", .54), line("f1a6 b7a6 g1f3 b8c6", .30)],
  ), move, ["e2e4", "e7e5"], "review");
  expect(review.playedLine[0]).toBe(move.lan);
  expect(review.bestLine[0]).toBe(review.bestLan);
  expect(review.explanation).toContain("a6");
  expect(review.explanation).toContain("bishop");
  expect(review.explanation).not.toMatch(/fork|forced|wins the queen/i);
});

test("terminal continuations include the actual move even when absent from the ranked pair", async () => {
  const game = new Chess();
  ["f3", "e5", "g4"].forEach(san => game.move(san));
  const move = game.move("Qh4#");
  const review = await reviewMove(source([line("b8c6", .6), line("g8f6", .58)]), move, ["f2f3", "e7e5", "g2g4"], "review");
  expect(review.playedLine).toEqual(["d8h4"]);
  expect(review.bestLine).toEqual(["d8h4"]);
  expect(review.explanation).toMatch(/checkmate/i);
});

test("short continuations stay bounded without losing promotion suffixes", async () => {
  const game = new Chess("7k/P7/8/8/8/8/8/6K1 w - - 0 1");
  const move = game.move("a8=Q+");
  const review = await reviewMove(source([line("a7a8q h8h7", .8), line("a7a8r h8h7", .7)]), move, [], "review");
  expect(review.bestLine).toEqual(["a7a8q", "h8h7"]);
  expect(review.explanation).toMatch(/promot.*queen/i);
});

test("continuations cap at eight plies and discard an illegal line instead of showing a partial result", () => {
  const fen = new Chess().fen();
  const line = "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7".split(" ");
  expect(continuationMoves(fen, line)).toHaveLength(8);
  expect(continuationMoves(fen, ["e2e4", "e7e4"])).toEqual([]);
});

test("en passant explanations name the captured pawn's square", () => {
  const game = new Chess();
  ["e4", "a6", "e5", "d5"].forEach(san => game.move(san));
  expect(describeMove(game.move("exd6"))).toContain("pawn on d5 en passant");
});
