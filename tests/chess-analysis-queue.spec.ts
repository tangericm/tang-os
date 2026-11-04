import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // A review search takes longer than a complete opponent turn. Count actual root
  // searches so a restarted worker that eventually catches up cannot mask starvation.
  await page.addInitScript(() => {
    const starts: string[] = [];
    Object.assign(window, { reviewRoots: starts });
    const nativeWorker = window.Worker;
    window.Worker = new Proxy(nativeWorker, {
      construct(target, args) {
        if (!String(args[0]).includes("stockfish-19-lite-single.js")) return Reflect.construct(target, args);
        let analysis = false, position = "", disposed = false;
        const worker = {
          onmessage: null as ((event: MessageEvent) => void) | null,
          postMessage(command: string) {
            let reply = "", delay = 0;
            if (command === "uci") reply = "uciok";
            if (command === "isready") reply = "readyok";
            if (command.startsWith("setoption name UCI_ShowWDL")) analysis = command.endsWith("true");
            if (command.startsWith("position ")) position = command;
            if (command.startsWith("go ")) {
              if (analysis) {
                starts.push(position);
                delay = 2200;
                const [best, next] = position === "position startpos" ? ["e2e4","d2d4"] : ["e7e5","c7c5"];
                reply = `info depth 10 multipv 1 score cp 20 wdl 60 920 20 pv ${best}\ninfo depth 10 multipv 2 score cp 14 wdl 50 925 25 pv ${next}\nbestmove ${best}`;
              } else reply = `bestmove ${position.endsWith("g1f3") ? "b8c6" : "e7e5"}`;
            }
            if (reply) setTimeout(() => {
              if (!disposed) worker.onmessage?.({data:reply} as MessageEvent);
            }, delay);
          },
          terminate() { disposed = true; },
        };
        return worker;
      },
    });
  });
  await page.goto("/play");
  const chess = page.getByRole("region", {name:"Chess", exact:true});
  await expect(chess).toBeFocused();
  await chess.getByRole("button", {name:"New game", exact:true}).click();
  const setup = page.getByRole("dialog", {name:"New game", exact:true});
  await setup.getByRole("radio", {name:/Advanced/}).check();
  await setup.getByRole("button", {name:"Start game", exact:true}).click();
});

async function play(page: Page, from: string, to: string) {
  const chess = page.getByRole("region", {name:"Chess", exact:true});
  await chess.locator(`[data-square="${from}"]`).click();
  await chess.locator(`[data-square="${to}"]`).click();
}
function rootSearches(page: Page) {
  return page.evaluate(() => (window as unknown as {reviewRoots: string[]}).reviewRoots
    .filter(position => position === "position startpos").length);
}

test("a slow live review finishes the original ply while subsequent moves append", async ({ page }) => {
  const chess = page.getByRole("region", {name:"Chess", exact:true});
  await play(page,"e2","e4");
  await expect(chess.locator(".chess-history li").first()).toContainText("e5");
  await play(page,"g1","f3");
  await expect(chess.getByRole("button",{name:"1.e4 · Best",exact:true})).toBeVisible({timeout:10000});
  expect(await rootSearches(page)).toBe(1);
});

test("undoing an in-flight ply starts fresh analysis for its replacement", async ({ page }) => {
  const chess = page.getByRole("region", {name:"Chess", exact:true});
  await play(page,"e2","e4");
  await expect.poll(() => rootSearches(page)).toBe(1);
  await chess.getByRole("button", {name:"Undo turn", exact:true}).click();
  await play(page,"d2","d4");
  await expect(chess.getByRole("button",{name:"1.d4 · Excellent",exact:true})).toBeVisible({timeout:10000});
  expect(await rootSearches(page)).toBe(2);
});
