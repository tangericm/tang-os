import { expect, test, type Page } from "@playwright/test";

async function mockEngine(page: Page, replies: string[], delay = 10) {
  await page.addInitScript(({ replies, delay }) => {
    const NativeWorker = window.Worker;
    window.Worker = class {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      constructor(url: string | URL, options?: WorkerOptions) {
        if (!String(url).includes("/engine/")) return new NativeWorker(url, options);
      }
      postMessage(command: string) {
        const reply = command === "uci" ? "uciok" : command === "isready" ? "readyok"
          : command.startsWith("go ") ? `bestmove ${replies.shift() ?? "e7e5"}` : null;
        if (reply) {
          const handler = this.onmessage;
          // Deliberately deliver late callbacks even after terminate, exercising cancellation.
          setTimeout(() => handler?.({ data: reply } as MessageEvent), command.startsWith("go ") ? delay : 0);
        }
      }
      terminate() {}
    } as unknown as typeof Worker;
  }, { replies, delay });
}

async function play(page: Page, from: string, to: string) {
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  await chess.locator(`[data-square="${from}"]`).click();
  await chess.locator(`[data-square="${to}"]`).click();
}

test("Chess replaces Runner and a real engine answers a legal move", async ({ page }) => {
  await page.goto("/play");
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  await expect(chess).toBeVisible();
  await expect(page).toHaveTitle(/Chess/);
  await expect(chess.getByLabel("Difficulty")).toHaveValue("novice");
  await chess.getByLabel("Difficulty").selectOption("advanced");
  await chess.getByRole("button", { name: "e2, white pawn", exact: true }).click();
  await expect(chess.getByRole("button", { name: "e4, empty, legal move", exact: true })).toBeVisible();
  await chess.getByRole("button", { name: "e4, empty, legal move", exact: true }).click();
  await expect(chess.locator(".chess-history li")).toHaveCount(1);
  await expect(chess.locator(".chess-history li").first()).toContainText("e4");
  await expect(chess.locator(".chess-history li").first().locator("span").last()).not.toHaveText("…", { timeout: 20000 });
  await expect(chess.getByRole("status")).toContainText("Your turn");
  await chess.getByRole("button", { name: "Undo turn", exact: true }).click();
  await expect(chess.locator(".chess-history li")).toHaveCount(0);
  await expect(chess.getByRole("button", { name: "e2, white pawn", exact: true })).toBeVisible();
});

test("Black gets an engine opening and undo preserves that opening", async ({ page }) => {
  await page.goto("/play");
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  await chess.getByLabel("Difficulty").selectOption("advanced");
  await chess.getByLabel("Play as").selectOption("b");
  await chess.getByRole("button", { name: "New game", exact: true }).click();
  await expect(chess.getByRole("status")).toContainText("Your turn", { timeout: 20000 });
  await expect(chess.getByRole("button", { name: "Undo turn", exact: true })).toBeDisabled();
  await expect(chess.locator(".chess-square").first()).toHaveAttribute("data-square", "h1");
  const opening = await chess.locator(".chess-history li span").nth(1).textContent();
  await play(page, "g8", "f6");
  await expect(chess.getByRole("status")).toContainText("Your turn", { timeout: 20000 });
  await chess.getByRole("button", { name: "Undo turn", exact: true }).click();
  await expect(chess.locator(".chess-history li")).toHaveCount(1);
  await expect(chess.locator(".chess-history li span").nth(1)).toHaveText(opening!);
  await expect(chess.locator(".chess-history li span").last()).toHaveText("…");
  await expect(chess.getByRole("button", { name: "g8, black knight", exact: true })).toBeVisible();
});

test("keyboard navigation highlights legal moves and rejects an illegal pawn move", async ({ page }) => {
  await mockEngine(page, ["e7e5"]);
  await page.goto("/play");
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  const pawn = chess.getByRole("button", { name: "e2, white pawn", exact: true });
  await pawn.focus();
  await pawn.press("Enter");
  await expect(chess.locator('[data-square="e4"]')).toHaveAttribute("aria-label", /legal move/);
  await pawn.press("ArrowUp");
  await expect(chess.locator('[data-square="e3"]')).toBeFocused();
  await chess.locator('[data-square="e3"]').press("ArrowUp");
  await chess.locator('[data-square="e4"]').press("ArrowUp");
  await chess.locator('[data-square="e5"]').press("Enter");
  await expect(chess.locator(".chess-history li")).toHaveCount(0);
  await play(page, "e2", "e4");
  await expect(chess.getByRole("status")).toContainText("Your turn");
  await expect(chess.locator(".chess-history li")).toHaveCount(1);
});

test("undo and new game reject replies from searches that already started", async ({ page }) => {
  await mockEngine(page, ["e7e5", "e7e5"], 700);
  await page.goto("/play");
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  await chess.getByLabel("Difficulty").selectOption("advanced");
  await play(page, "e2", "e4");
  await expect(chess.getByRole("status")).toContainText("thinking");
  await chess.getByRole("button", { name: "Undo turn", exact: true }).click();
  await expect(chess.locator(".chess-history li")).toHaveCount(0);
  await page.waitForTimeout(800);
  await expect(chess.locator(".chess-history li")).toHaveCount(0);
  await play(page, "e2", "e4");
  await expect(chess.getByRole("status")).toContainText("thinking");
  await chess.getByRole("button", { name: "New game", exact: true }).click();
  await chess.getByRole("button", { name: "Start game", exact: true }).click();
  await page.waitForTimeout(800);
  await expect(chess.locator(".chess-history li")).toHaveCount(0);
  await expect(chess.getByRole("status")).toContainText("Your turn");
});

test("minimize cancels a pending search and restore resumes the same game", async ({ page }) => {
  await mockEngine(page, ["e7e5", "e7e5"], 700);
  await page.goto("/play");
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  await chess.getByLabel("Difficulty").selectOption("advanced");
  await play(page, "e2", "e4");
  await expect(chess.getByRole("status")).toContainText("thinking");
  await chess.getByRole("button", { name: "Minimize to Dock", exact: true }).click();
  await expect(chess).toBeHidden();
  await page.waitForTimeout(800);
  await page.locator('.dock-button[data-app="game"]').click();
  await expect(chess).toBeVisible();
  await expect(chess.getByRole("status")).toContainText("Your turn");
  await expect(chess.locator(".chess-history li span").nth(1)).toHaveText("e4");
  await expect(chess.locator(".chess-history li span").last()).toHaveText("e5");
});

test("promotion offers all four pieces and supports underpromotion", async ({ page }) => {
  await mockEngine(page, ["b8c6", "h7h6", "h6h5", "h5h4", "a7a6"]);
  await page.goto("/play");
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  await chess.getByLabel("Difficulty").selectOption("advanced");
  for (const [from, to] of [["a2", "a4"], ["a4", "a5"], ["a5", "a6"], ["a6", "b7"]]) {
    await play(page, from, to);
    await expect(chess.getByRole("status")).toContainText("Your turn");
  }
  await play(page, "b7", "a8");
  const promotion = chess.getByRole("group", { name: "Choose promotion", exact: true });
  await expect(promotion.getByRole("button", { name: /Promote to/ })).toHaveCount(4);
  await expect(promotion.getByRole("button", { name: "Promote to queen" })).toBeFocused();
  await promotion.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(chess.locator('[data-square="b7"]')).toBeFocused();
  await chess.locator('[data-square="a8"]').click();
  await promotion.getByRole("button", { name: "Promote to knight" }).click();
  await expect(chess.getByRole("button", { name: "a8, white knight", exact: true })).toBeVisible();
  await expect(chess.locator(".chess-history")).toContainText("bxa8=N");
});

test("checkmate ends play and reports the winner", async ({ page }) => {
  await mockEngine(page, ["e7e5", "d8h4"]);
  await page.goto("/play");
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  await chess.getByLabel("Difficulty").selectOption("advanced");
  await play(page, "f2", "f3");
  await expect(chess.getByRole("status")).toContainText("Your turn");
  await play(page, "g2", "g4");
  await expect(chess.getByRole("status")).toHaveText("Checkmate — Stockfish wins");
  await expect(chess.locator('[data-square="e1"]')).toHaveClass(/chess-check/);
  await expect(chess.locator('[data-square="e1"]')).toHaveAttribute("aria-disabled", "true");
});

test("a blocked engine can be retried without losing the position", async ({ page }) => {
  await page.route("**/engine/stockfish-19-lite-single.js", (route) => route.abort());
  await page.goto("/play");
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  await play(page, "e2", "e4");
  await expect(chess.getByRole("alert")).toContainText("Could not load Stockfish");
  await page.unroute("**/engine/stockfish-19-lite-single.js");
  await chess.getByRole("button", { name: "Retry engine", exact: true }).click();
  await expect(chess.getByRole("status")).toContainText("Your turn", { timeout: 20000 });
  await expect(chess.locator(".chess-history li span").nth(1)).toHaveText("e4");
});

test("the engine only initializes for an opponent turn", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/engine/stockfish-19-lite-single.js")) requests.push(request.url()); });
  await page.goto("/play");
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  await expect(chess.locator(".chess-engine-state")).toHaveAttribute("data-state", "ready");
  expect(requests).toHaveLength(0);
  await play(page, "e2", "e4");
  await expect(chess.locator(".chess-engine-state")).toHaveAttribute("data-state", "ready", { timeout: 20000 });
  expect(requests).toHaveLength(1);
});

test("touch taps can select a piece and play a complete turn on a phone", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    await page.goto("/play");
    const chess = page.getByRole("region", { name: "Chess", exact: true });
    await chess.locator('[data-square="e2"]').tap();
    await chess.locator('[data-square="e4"]').tap();
    await expect(chess.getByRole("status")).toContainText("Your turn", { timeout: 20000 });
    await expect(chess.locator(".chess-history li span").nth(1)).toHaveText("e4");
    await expect(chess.locator(".chess-history li span").last()).not.toHaveText("…");
  } finally { await context.close(); }
});

test("resizing a desktop window stacks the board and controls", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/play");
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  const grip = await chess.locator(".window-resize").boundingBox();
  await page.mouse.move(grip!.x + grip!.width / 2, grip!.y + grip!.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip!.x + grip!.width / 2 - 404, grip!.y + grip!.height / 2, { steps: 10 });
  await page.mouse.up();
  const board = await chess.getByRole("group", { name: "Chessboard", exact: true }).boundingBox();
  expect(board!.width).toBeGreaterThan(260);
  await chess.getByLabel("Difficulty").selectOption("advanced");
});

test("all six presets produce a legal reply from the bundled engine", async ({ page }) => {
  await page.goto("/play");
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  for (const level of ["beginner", "novice", "intermediate", "advanced", "expert", "grandmaster"]) {
    await chess.getByLabel("Difficulty").selectOption(level);
    await play(page, "e2", "e4");
    await expect(chess.getByRole("status")).toContainText("Your turn", { timeout: 20000 });
    await expect(chess.locator(".chess-history li span").last()).not.toHaveText("…");
    await chess.getByRole("button", { name: "Undo turn", exact: true }).click();
    await expect(chess.locator(".chess-history li")).toHaveCount(0);
  }
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`board and controls remain usable at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);
    await page.goto("/play");
    const chess = page.getByRole("region", { name: "Chess", exact: true });
    await expect.poll(() => chess.evaluate((frame) => frame.getAnimations().filter((animation) => animation.playState === "running").length)).toBe(0);
    const board = await chess.getByRole("group", { name: "Chessboard", exact: true }).boundingBox();
    expect(board).not.toBeNull();
    expect(board!.x).toBeGreaterThanOrEqual(0);
    expect(board!.x + board!.width).toBeLessThanOrEqual(viewport.width);
    expect(Math.abs(board!.height - board!.width)).toBeLessThan(1);
    if (viewport.height < 500) {
      const body = await chess.locator(".window-body").boundingBox();
      expect(board!.y).toBeGreaterThanOrEqual(body!.y);
      expect(board!.y + board!.height).toBeLessThanOrEqual(body!.y + body!.height);
    }
    await chess.getByLabel("Difficulty").selectOption("grandmaster");
    await chess.getByRole("button", { name: "Flip board", exact: true }).click();
    await expect(chess.locator(".chess-square").first()).toHaveAttribute("data-square", "h1");
    if (viewport.width === 1440 || viewport.width === 390) {
      await chess.getByRole("group", { name: "Chessboard", exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/chess-${viewport.width}.png` });
    }
  });
}
