import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

type Fixture = {
  fen?: string; moves?: string[]; moving?: boolean; flipped?: boolean; disabled?: boolean;
  grade?: "Blunder"; arrow?: { from: string; to: string };
};
declare global { interface Window { drawBoard: (options: Fixture) => void } }

function moduleScript(name: string, filename: string, compile = false) {
  const raw = readFileSync(filename, "utf8");
  const source = compile ? ts.transpileModule(raw, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  }}).outputText : raw;
  return `modules[${JSON.stringify(name)}] = function(require, exports, module) {\n${source}\n};`;
}

/** Mount the production component with arbitrary legal positions, entirely in the test page. */
async function mount(page: Page) {
  await page.setContent('<div id="test-board"></div>');
  const packages = { react: "react", "react-dom": "react-dom", "react-dom/client": "react-dom-client",
    "react/jsx-runtime": "react-jsx-runtime", scheduler: "scheduler" };
  const bundled = Object.entries(packages).map(([name, file]) => {
    const pkg = name.split("/")[0];
    const dir = path.dirname(require.resolve(pkg));
    return moduleScript(name, path.join(dir, "cjs", `${file}.production.js`));
  });
  await page.addScriptTag({ content: `
    const modules={}, cache={};
    function require(name) { if (!cache[name]) { const m=cache[name]={exports:{}}; modules[name](require,m.exports,m); } return cache[name].exports; }
    ${bundled.join("\n")}
    ${moduleScript("chess.js", require.resolve("chess.js"))}
    ${moduleScript("./ChessPiece", "app/components/ChessPiece.tsx", true)}
    ${moduleScript("../lib/chess-grades", "app/lib/chess-grades.ts", true)}
    ${moduleScript("Board", "app/components/ChessBoard.tsx", true)}
    const root=require("react-dom/client").createRoot(document.querySelector("#test-board"));
    window.drawBoard=(opts)=>{
      const game=new (require("chess.js").Chess)(opts.fen);
      let last;
      for (const san of opts.moves ?? []) last=game.move(san);
      function paint(moving) {
        require("react-dom").flushSync(()=>root.render(require("react").createElement(require("Board").default,{
          game,player:"w",flipped:!!opts.flipped,disabled:!!opts.disabled,motion:moving?last:undefined,lastMove:last,
          badge: opts.grade && last && {square:last.to,grade:opts.grade,key:last.after},arrow:opts.arrow,
          onMove:(from,to,promotion)=>{last=game.move({from,to,promotion});paint(false)}
        })));
      }
      paint(opts.moving);
    };
  ` });
}

test.beforeEach(async ({ page }) => { await mount(page); });
const draw = (page: Page, opts: Fixture) => page.evaluate(options => window.drawBoard(options), opts);
const square = (page: Page, coord: string) => page.locator(`button[data-square="${coord}"]`);

test("flipped en passant animates from the pawn's original square and fades the bypassed pawn", async ({ page }) => {
  const opts = {moves:["e4","a6","e5","d5","exd6"], flipped:true, moving:true, grade:"Blunder" as const,
    arrow:{from:"e5",to:"d6"}};
  await draw(page,opts);
  const mover = page.locator(".chess-moving-piece");
  await expect(mover).toHaveAttribute("data-from","e5");
  expect(await mover.evaluate(el => (el as HTMLElement).style.getPropertyValue("--move-x"))).toBe("100%");
  expect(await mover.evaluate(el => (el as HTMLElement).style.getPropertyValue("--move-y"))).toBe("100%");
  await expect(page.locator(".chess-captured-piece")).toHaveAttribute("data-victim-square","d5");
  await expect(square(page,"d6").locator(".chess-piece")).toHaveCount(0);
  await expect(square(page,"d6").locator(".chess-move-badge")).toHaveAttribute("data-grade","blunder");
  await expect(page.locator("svg.chess-best-arrow")).toHaveAttribute("viewBox","0 0 8 8");
  await draw(page,{...opts,moving:false});
  await expect(square(page,"d6").locator(".chess-piece")).toHaveCount(1);
  await expect(page.locator(".chess-moving-piece,.chess-captured-piece")).toHaveCount(0);
});

test("castling animates both pieces; a promoting capture travels as a pawn", async ({ page }) => {
  await draw(page,{fen:"r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",moves:["O-O-O"],moving:true});
  await expect(page.locator(".chess-moving-piece")).toHaveCount(2);
  await expect(page.locator('.chess-moving-piece[data-from="a1"]')).toHaveAttribute("data-to","d1");
  await expect(square(page,"c1").locator(".chess-piece")).toHaveCount(0);
  await expect(square(page,"d1").locator(".chess-piece")).toHaveCount(0);
  await draw(page,{fen:"4k2r/6P1/8/8/8/8/8/4K3 w - - 0 1",moves:["gxh8=N"],moving:true});
  await expect(page.locator(".chess-moving-piece")).toHaveAttribute("data-piece","p");
  await expect(page.locator(".chess-captured-piece")).toHaveAttribute("data-victim-square","h8");
  await expect(square(page,"h8")).toHaveAttribute("aria-label","h8, white knight");
});

test("promotion offers all four pieces, Escape restores origin, and choice focuses destination", async ({ page }) => {
  await draw(page,{fen:"4k3/P7/8/8/8/8/8/4K3 w - - 0 1"});
  await square(page,"a7").click(); await square(page,"a8").click();
  const choice = page.getByRole("group",{name:"Choose promotion"});
  await expect(choice.getByRole("button",{name:/Promote to/})).toHaveCount(4);
  await expect(choice.getByRole("button",{name:"Promote to queen"})).toBeFocused();
  await page.keyboard.press("Escape"); await expect(square(page,"a7")).toBeFocused();
  await square(page,"a8").click(); await choice.getByRole("button",{name:"Promote to knight"}).click();
  await expect(square(page,"a8")).toHaveAttribute("aria-label","a8, white knight");
  await expect(square(page,"a8")).toBeFocused();
});

test("roving keys track visual orientation, and changing orientation or disabling clears selection", async ({ page }) => {
  await draw(page,{});
  await square(page,"e2").focus();await page.keyboard.press("Enter");
  await expect(square(page,"e4")).toHaveAttribute("aria-label",/legal move/);
  await draw(page,{flipped:true});
  await expect(square(page,"e2")).toHaveAttribute("aria-pressed","false");
  await square(page,"e2").focus();await page.keyboard.press("ArrowLeft");
  await expect(square(page,"f2")).toBeFocused();
  await page.keyboard.press("Enter");await draw(page,{flipped:true,disabled:true});
  await expect(square(page,"f2")).toHaveAttribute("aria-pressed","false");
  await expect(square(page,"f2")).toHaveAttribute("aria-disabled","true");
  await expect(page.locator('button[data-square][tabindex="0"]')).toHaveCount(1);
});
