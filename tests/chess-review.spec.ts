import { expect, test } from "@playwright/test";
import { Chess } from "chess.js";
import { reviewMove, summarizeReviews } from "../app/lib/chess-review";
import type { AnalysisLine } from "../app/lib/chess-engine";

function line(pv: string, points: number, depth = 10): AnalysisLine {
  return { depth, points, score: { type: "cp", value: 0 }, pv: pv.split(" ") };
}
const source = (...calls: AnalysisLine[][]) => ({ analyze: async () => calls.shift()! });

test("a move outside MultiPV is searched separately from the same mover perspective", async () => {
  const game = new Chess();
  game.move("e4");
  const move = game.move("f6");
  const top = [line("e7e5", .6), line("c7c5", .58)];
  const engine = source(top, [...top, line("f7f6", .32)]);
  const review = await reviewMove(engine, move, ["e2e4"], "live");
  expect(review.grade).toBe("Blunder");
  expect(review.bestSan).toBe("e5");
  expect(review.loss).toBeCloseTo(.28);
  const summary = summarizeReviews([review], [move]);
  expect(summary.b.accuracy).toBe(27.3);
  expect(summary.w.accuracy).toBeNull();
  expect(summary.b.counts.Blunder).toBe(1);
});

test("repetition is scored as a draw, and checkmating moves as a win", async () => {
  const game = new Chess();
  for (const san of ["Nf3","Nf6","Ng1","Ng8","Nf3","Nf6","Ng1"]) game.move(san);
  const history = game.history({ verbose: true }).map(m => m.lan);
  const move = game.move("Ng8");
  const result = await reviewMove(source([line("b8c6", .8), line("f6g8", .9)]), move, history, "review");
  expect(result.playedPoints).toBe(.5);
  const mateGame = new Chess();
  ["f3","e5","g4"].forEach(san => mateGame.move(san));
  const mate = mateGame.move("Qh4#");
  const result2 = await reviewMove(source([line("d8h4", .99),line("b8c6",.7)]), mate, ["f2f3","e7e5","g2g4"], "review");
  expect(result2.playedPoints).toBe(1);
  expect(result2.grade).toBe("Best");
});

test("critical only move requires evidence; a quiet best move earns no sacrifice label", async () => {
  const move = new Chess().move("a3");
  expect((await reviewMove(source([line("a2a3", .58),line("d2d4", .25)]), move, [], "review")).grade).toBe("Great");
  expect((await reviewMove(source([line("a2a3", .58, 3),line("d2d4", .25, 3)]), move, [], "review")).grade).toBe("Best");
});

test("Brilliant requires an accepted sound sacrifice; a shallow or declined line falls back", async () => {
  const move = new Chess("6k1/5ppp/8/8/8/3B1N2/8/3Q2K1 w - - 0 1").move("Bxh7+");
  const accepted = "d3h7 g8h7 f3g5 h7g8 d1h5";
  const grade = (pv: string, points: number, depth = 10) => reviewMove(source([
    line(pv, points, depth), line("d1e2", points - .05, depth),
  ]), move, [], "review");
  const brilliant = await grade(accepted, .65);
  expect(brilliant.grade).toBe("Brilliant");
  expect(brilliant.sacrifice).toEqual({piece:"b", acceptedBy:"Kxh7"});
  expect((await grade("d3h7 g8h8", .65)).grade).toBe("Best");
  expect((await grade(accepted, .35)).grade).toBe("Best");
  expect((await grade(accepted, .95)).grade).toBe("Best");
  expect((await grade(accepted, .65, 4)).grade).toBe("Best");
});

test("Miss requires a new winning chance created by the immediately preceding move", async () => {
  const game = new Chess();
  const opponent = game.move("e4");
  const move = game.move("e5");
  const previous = await reviewMove(source([line("d2d4", .52), line("e2e4", .23)]), opponent, [], "review");
  const grade = (prior?: typeof previous) => reviewMove(source([line("c7c5", .78),line("e7e5", .52)]), move, ["e2e4"], "review", prior);
  expect((await grade(previous)).grade).toBe("Miss");
  expect((await grade()).grade).toBe("Blunder");
  expect((await grade({...previous, depth:3})).grade).toBe("Blunder");
  expect((await grade({...previous,bestPoints:.24,playedPoints:.10,loss:.14})).grade).toBe("Blunder");
});

test("Forced moves count toward the distribution but carry no accuracy weight", async () => {
  const move = new Chess("7k/7R/6K1/8/8/8/8/8 b - - 0 1").move("Kg8");
  const review = await reviewMove(source([line("h8g8", 0)]), move, [], "review");
  expect(review.grade).toBe("Forced");
  expect(summarizeReviews([review], [move]).b).toEqual({accuracy:null, counts:{Forced:1}});
});

test("grade bands include their lower bound and keep ties distinct from the first choice", async () => {
  const move = new Chess().move("a3");
  for (const [loss, grade] of [[0,"Excellent"], [.02,"Good"], [.05,"Inaccuracy"], [.1,"Mistake"], [.2,"Blunder"]] as const) {
    const result = await reviewMove(source([line("d2d4", .6), line("a2a3", .6-loss)]), move, [], "review");
    expect(result.grade).toBe(grade);
  }
});

test("unranked play and alternatives are rescored together, even if a singleton search would disagree", async () => {
  const move = new Chess().move("a3");
  const shortlist = [line("d2d4", .55, 8), line("g1f3", .53, 8)];
  const root = source(shortlist, [line("a2a3", .70, 13)]);
  const requests: string[][] = [];
  const engine = {
    analyze: async (fen: string, legal: readonly string[], history: readonly string[] | undefined,
      options: {multiPV: number; time: number; searchMoves?: readonly string[]}) => {
      if (options.searchMoves) {
        requests.push([...options.searchMoves]);
        expect(options.multiPV).toBe(3);
        return [line("a2a3", .62, 10), line("g1f3", .60, 10), line("d2d4", .55, 10)];
      }
      return root.analyze();
    },
  };
  const result = await reviewMove(engine, move, [], "live");
  expect(requests).toEqual([["d2d4","g1f3","a2a3"]]);
  expect(result).toMatchObject({grade:"Best",bestSan:"a3",depth:10,bestPoints:.62,playedPoints:.62,loss:0});
});

test("the shared iteration can promote the original runner-up over the original top candidate", async () => {
  const move = new Chess().move("e4");
  const result = await reviewMove(source(
    [line("d2d4",.55,8),line("g1f3",.53,8)],
    [line("g1f3",.68,10),line("d2d4",.56,10),line("e2e4",.43,10)],
  ), move, [], "review");
  expect(result).toMatchObject({grade:"Blunder",bestSan:"Nf3",depth:10,bestPoints:.68,playedPoints:.43,loss:.25});
});

test("the suggested move owns the reported best expected score", async () => {
  const move = new Chess().move("a3");
  const result = await reviewMove(source([line("d2d4", .55), line("a2a3", .57)]), move, [], "review");
  expect(result).toMatchObject({grade:"Best",bestSan:"a3",playedPoints:.57,bestPoints:.57,loss:0});
});

test("known opening moves are Book unless they give something away", async () => {
  const game = new Chess();
  game.move("e4"); game.move("e5"); game.move("Nf3"); game.move("Nc6");
  const move = game.move("Bb5");
  const history = ["e2e4", "e7e5", "g1f3", "b8c6"];
  const book = await reviewMove(source([line("f1b5", .56), line("f1c4", .55)]), move, history, "review");
  expect(book.grade).toBe("Book");
  expect(book.explanation).toContain("Ruy Lopez");
  const costly = await reviewMove(source([line("f1c4", .62), line("f1b5", .55)]), move, history, "review");
  expect(costly.grade).toBe("Inaccuracy");
});

test("accuracy follows the expected-score curve and blends in the harmonic mean", async () => {
  const { moveAccuracy } = await import("../app/lib/chess-review");
  expect(moveAccuracy({ bestPoints: .6, playedPoints: .6 })).toBeCloseTo(100, 0);
  expect(moveAccuracy({ bestPoints: .6, playedPoints: .5 })).toBeCloseTo(63.9, 0);
  expect(moveAccuracy({ bestPoints: .9, playedPoints: .1 })).toBeCloseTo(0, 1);
});
