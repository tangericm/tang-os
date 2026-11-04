import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { browserModule, reactBrowserRuntime } from "./helpers/react-browser";

type Fixture = { fen?: string; setup?: string[]; move: string; line: string[]; kind?: "best" | "practice"; flipped?: boolean; motionStyle?: "normal" | "fast" | "off" };
declare global { interface Window { drawLesson: (fixture: Fixture) => void } }

test.beforeEach(async ({ page }) => {
  await page.setContent('<div class="chess" style="width:360px"><div id="lesson-test"></div></div>');
  await page.addStyleTag({ content: readFileSync("app/components/chess.css", "utf8") });
  const modules = {
    "./ChessPiece": "app/components/ChessPiece.tsx", "./ChessBoard": "app/components/ChessBoard.tsx",
    "../lib/chess-grades": "app/lib/chess-grades.ts", "../lib/chess-engine": "app/lib/chess-engine.ts",
    "../lib/chess-coach": "app/lib/chess-coach.ts", "../lib/chess-review": "app/lib/chess-review.ts",
    Lesson: "app/components/ChessLesson.tsx",
  };
  await page.addScriptTag({ content: `(()=>{
    ${reactBrowserRuntime()}
    ${Object.entries(modules).map(([name, file]) => browserModule(name, file)).join("\n")}
    modules["./chess-coach"]=modules["../lib/chess-coach"];
    const React=require("react"),DOM=require("react-dom"),root=require("react-dom/client").createRoot(document.querySelector("#lesson-test"));
    let key=0;
    window.drawLesson=opts=>{
      const game=new (require("chess.js").Chess)(opts.fen);
      for(const san of opts.setup??[])game.move(san);
      const move=game.move(opts.move);
      const best=require("../lib/chess-coach").continuationMoves(move.before,opts.line)[0];
      const result={grade:"Best",bestLan:best?.lan??move.lan,bestSan:best?.san??move.san,playedSan:move.san,bestLine:opts.line,playedLine:opts.line,depth:12,loss:0,bestPoints:.6,playedPoints:.6,explanation:"Test position"};
      DOM.flushSync(()=>root.render(React.createElement(require("Lesson").default,{key:++key,lesson:{kind:opts.kind??"best",move,result,history:[]},flipped:!!opts.flipped,active:true,motionStyle:opts.motionStyle??"normal",onClose:()=>DOM.flushSync(()=>root.render(null))})));
    };
  })();` });
});
const draw = (page: Page, fixture: Fixture) => page.evaluate(options => window.drawLesson(options), fixture);
const next = (page: Page) => page.getByRole("button", { name: "Next continuation move", exact: true }).click();

test("continuation castling moves both pieces and can step back without stale overlays", async ({ page }) => {
  await draw(page, { fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", move: "O-O", line: ["e1g1", "e8c8"] });
  await next(page);
  await expect(page.locator(".chess-moving-piece")).toHaveCount(2);
  await expect(page.locator('[data-square="g1"]')).toHaveAttribute("aria-label", "g1, white king");
  await next(page);
  await expect(page.locator('[data-square="c8"]')).toHaveAttribute("aria-label", "c8, black king");
  await expect(page.locator('[data-square="d8"]')).toHaveAttribute("aria-label", "d8, black rook");
  await page.getByRole("button", { name: "Previous continuation move", exact: true }).click();
  await expect(page.locator(".chess-moving-piece")).toHaveCount(0);
  await expect(page.locator('[data-square="e8"]')).toHaveAttribute("aria-label", "e8, black king");
});

test("flipped en passant and promoting captures preserve the correct animation pieces", async ({ page }) => {
  await draw(page, { setup: ["e4", "a6", "e5", "d5"], move: "exd6", line: ["e5d6", "e7d6"], flipped: true });
  await next(page);
  await expect(page.locator(".chess-captured-piece")).toHaveAttribute("data-victim-square", "d5");
  await expect(page.locator('[data-square="d6"]')).toHaveAttribute("aria-label", "d6, white pawn");
  await draw(page, { fen: "4k2r/6P1/8/8/8/8/8/4K3 w - - 0 1", move: "gxh8=N", line: ["g7h8n", "e8e7"] });
  await next(page);
  await expect(page.locator(".chess-moving-piece")).toHaveAttribute("data-piece", "p");
  await expect(page.locator('[data-square="h8"]')).toHaveAttribute("aria-label", "h8, white knight");
});

test("Black can practice a reviewed position and find the suggested move", async ({ page }) => {
  await draw(page, { setup: ["e4"], move: "e5", line: ["e7e5", "g1f3"], kind: "practice", flipped: true });
  await page.locator('[data-square="e7"]').click();
  await page.locator('[data-square="e5"]').click();
  await expect(page.getByRole("status")).toContainText("You found the suggested move");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator('[data-square="e7"]')).toHaveAttribute("aria-label", "e7, black pawn");
});

test("reduced motion keeps manual playback static and closing stops autoplay", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await draw(page, { move: "e4", line: ["e2e4", "e7e5", "g1f3"] });
  await next(page);
  await expect(page.locator(".chess-moving-piece")).toHaveCount(0);
  await expect(page.locator('[data-square="e4"]')).toHaveAttribute("aria-label", "e4, white pawn");
  await page.getByRole("button", { name: "Play continuation", exact: true }).click();
  await page.getByRole("button", { name: "Return to move", exact: true }).click();
  await page.waitForTimeout(1000);
  await expect(page.getByRole("region", { name: "Continuation", exact: true })).toHaveCount(0);
});
