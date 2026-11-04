import { expect, test, type Page } from "@playwright/test";

type Stats = { analysisWorkers: number[]; terminated: number[]; roots: string[]; liveDelay: number; deepDelay: number };
declare global { interface Window { continuityStats: Stats } }

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const stats: Stats = window.continuityStats = { analysisWorkers: [], terminated: [], roots: [], liveDelay: 10, deepDelay: 1800 };
    const NativeWorker = window.Worker;
    let id = 0;
    window.Worker = new Proxy(NativeWorker, {
      construct(target, args) {
        if (!String(args[0]).includes("/engine/")) return Reflect.construct(target, args);
        const workerId = ++id;
        let analysis = false, position = "", count = 2;
        const worker = {
          onmessage: null as ((event: MessageEvent) => void) | null,
          onerror: null as ((event: ErrorEvent) => void) | null,
          postMessage(command: string) {
            let reply = "", delay = 0;
            if (command === "uci") reply = "uciok";
            if (command === "isready") reply = "readyok";
            if (command.startsWith("setoption name MultiPV")) count = Number(command.split(" ").at(-1));
            if (command.startsWith("setoption name UCI_ShowWDL")) {
              analysis = command.endsWith("true");
              if (analysis && !stats.analysisWorkers.includes(workerId)) stats.analysisWorkers.push(workerId);
            }
            if (command.startsWith("position ")) position = command;
            if (command.startsWith("go ")) {
              const history = position.split(" moves ")[1] ?? "";
              const candidates = history === "" ? ["e2e4", "d2d4"]
                : history === "e2e4" ? ["e7e5", "c7c5"]
                : history.endsWith("e7e5") ? ["g1f3", "f1c4"]
                : history.endsWith("g1f3") ? ["b8c6", "g8f6"]
                : history === "d2d4" ? ["d7d5", "g8f6"] : ["f1c4", "d2d4"];
              if (analysis) {
                stats.roots.push(position);
                delay = command.includes("movetime 350") ? stats.deepDelay : stats.liveDelay;
                const selected = command.includes(" searchmoves ") ? command.split(" searchmoves ")[1].split(" ") : candidates;
                const tails: Record<string, string> = { e2e4: "e7e5 g1f3 b8c6", d2d4: "d7d5 c2c4", e7e5: "g1f3 b8c6 f1b5", c7c5: "g1f3 b8c6", g1f3: "b8c6 f1b5", f1c4: "g8f6 d2d3", b8c6: "f1b5 a7a6", g8f6: "f1c4" };
                reply = selected.slice(0, count).map((move, i) => `info depth 10 multipv ${i + 1} score cp ${20 - i * 5} wdl ${60 - i * 10} 920 ${20 + i * 10} pv ${move}${tails[move] ? ` ${tails[move]}` : ""}`).join("\n") + `\nbestmove ${selected[0]}`;
              } else reply = `bestmove ${candidates[0]}`;
            }
            if (reply) {
              const handler = worker.onmessage;
              // Captured handlers deliberately survive terminate to exercise late-result guards.
              setTimeout(() => handler?.({ data: reply } as MessageEvent), delay);
            }
          },
          terminate() { if (!stats.terminated.includes(workerId)) stats.terminated.push(workerId); },
        };
        return worker;
      },
    });
  });
  await page.goto("/play");
  await expect(chess(page)).toBeFocused();
  await chess(page).getByRole("button", { name: "New game", exact: true }).click();
  const setup = page.getByRole("dialog", { name: "New game", exact: true });
  await setup.getByRole("radio", { name: /Advanced/ }).check();
  await setup.getByRole("button", { name: "Start game", exact: true }).click();
});

const chess = (page: Page) => page.getByRole("region", { name: "Chess", exact: true });
async function play(page: Page, from: string, to: string) {
  await chess(page).locator(`[data-square="${from}"]`).click();
  await expect(chess(page).locator(`[data-square="${from}"]`)).toHaveAttribute("aria-pressed", "true");
  await chess(page).locator(`[data-square="${to}"]`).click();
}
async function firstTurn(page: Page) {
  await play(page, "e2", "e4");
  await expect(chess(page).getByRole("button", { name: "1…e5 · Best", exact: true })).toBeVisible();
}
async function openReview(page: Page) {
  await chess(page).getByRole("button", { name: "More options", exact: true }).click();
  await chess(page).getByRole("button", { name: "Review game", exact: true }).click();
}

test("one analysis worker survives drained queues and compatible live/review jobs", async ({ page }) => {
  await firstTurn(page);
  expect(await page.evaluate(() => window.continuityStats.analysisWorkers.length)).toBe(1);
  await play(page, "g1", "f3");
  await expect(chess(page).getByRole("button", { name: "2…Nc6 · Best", exact: true })).toBeVisible();
  await openReview(page);
  await expect(chess(page).getByText("4 / 4 refined", { exact: true })).toBeVisible({ timeout: 15000 });
  expect(await page.evaluate(() => window.continuityStats.analysisWorkers.length)).toBe(1);
});

test("review preserves quick grades and precision while upgrades stop and resume", async ({ page }) => {
  await firstTurn(page);
  await openReview(page);
  const selected = chess(page).getByLabel("Selected move", { exact: true });
  await expect(selected.locator("[data-grade]")).toHaveText("Best");
  await expect(selected).toContainText("Quick estimate");
  await expect(chess(page).locator(".chess-review-summary")).not.toContainText("—");
  await chess(page).getByRole("button", { name: "Stop", exact: true }).click();
  await expect(selected.locator("[data-grade]")).toHaveText("Best");
  await chess(page).getByRole("button", { name: "First position", exact: true }).click();
  await chess(page).getByRole("button", { name: "Next move", exact: true }).click();
  await expect(selected.locator("[data-grade]")).toHaveText("Best");
  await chess(page).getByRole("button", { name: "Resume", exact: true }).click();
  await expect(chess(page).getByText("2 / 2 refined", { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(selected).not.toContainText("Quick estimate");
});

test("disabling analysis disposes its ready worker and reopening cannot reuse a cancelled job", async ({ page }) => {
  await firstTurn(page);
  const before = await page.evaluate(() => window.continuityStats.analysisWorkers.at(-1)!);
  await chess(page).getByRole("button", { name: "New game", exact: true }).click();
  expect(await page.evaluate(id => window.continuityStats.terminated.includes(id), before)).toBe(true);
  await page.getByRole("dialog", { name: "New game", exact: true }).getByRole("button", { name: "Cancel", exact: true }).click();
  await play(page, "g1", "f3");
  await expect(chess(page).getByRole("button", { name: "2…Nc6 · Best", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.continuityStats.analysisWorkers.length)).toBe(2);
});

test("continuation stepping and returning preserve the recorded board and history", async ({ page }) => {
  await firstTurn(page);
  const original = await chess(page).getByLabel("Move history", { exact: true }).textContent();
  await chess(page).getByRole("button", { name: "Show line", exact: true }).click();
  const lesson = chess(page).getByRole("region", { name: "Continuation", exact: true });
  await expect(lesson.locator('[data-square="e2"]')).toHaveAttribute("aria-label", "e2, white pawn");
  await lesson.getByRole("button", { name: "Next continuation move", exact: true }).click();
  await expect(lesson.locator('[data-square="e4"]')).toHaveAttribute("aria-label", "e4, white pawn");
  await lesson.getByRole("button", { name: "Next continuation move", exact: true }).click();
  await expect(lesson.locator('[data-square="e5"]')).toHaveAttribute("aria-label", "e5, black pawn");
  await lesson.getByRole("navigation").press("ArrowLeft");
  await expect(lesson.locator('[data-square="e7"]')).toHaveAttribute("aria-label", "e7, black pawn");
  await lesson.getByRole("button", { name: "Return to move", exact: true }).click();
  await expect(chess(page).locator('[data-square="e5"]')).toHaveAttribute("aria-label", "e5, black pawn");
  await expect(chess(page).getByLabel("Move history", { exact: true })).toHaveText(original!);
});

test("practice has escalating hints and accepts a verified good alternative without rewriting the game", async ({ page }) => {
  await firstTurn(page);
  const original = await chess(page).getByLabel("Move history", { exact: true }).textContent();
  await chess(page).getByRole("button", { name: "Try again", exact: true }).click();
  const practice = chess(page).getByRole("region", { name: "Practice position", exact: true });
  await practice.getByRole("button", { name: "Hint", exact: true }).click();
  await expect(practice).toContainText("Look for a pawn move");
  await practice.getByRole("button", { name: "Show suggested move", exact: true }).click();
  await expect(practice.locator(".chess-best-arrow")).toHaveCount(1);
  await expect(practice.getByRole("status")).toContainText("e2 to e4");
  await expect(practice.locator('[data-square="e2"]')).toBeFocused();
  await play(page, "d2", "d4");
  await expect(practice).toContainText("Another good move");
  await practice.getByRole("button", { name: "Return to move", exact: true }).click();
  await expect(chess(page).locator('[data-square="d2"]')).toHaveAttribute("aria-label", "d2, white pawn");
  await expect(chess(page).getByLabel("Move history", { exact: true })).toHaveText(original!);
});

test("selecting a recorded move cancels autoplay and keeps its final position", async ({ page }) => {
  await firstTurn(page);
  await chess(page).getByRole("button", { name: "Show line", exact: true }).click();
  await chess(page).getByRole("button", { name: "Play continuation", exact: true }).click();
  await chess(page).getByRole("button", { name: "1…e5 · Best", exact: true }).click();
  await expect(chess(page).getByRole("region", { name: "Continuation", exact: true })).toHaveCount(0);
  await page.waitForTimeout(1100);
  await expect(chess(page).locator('[data-square="e5"]')).toHaveAttribute("aria-label", "e5, black pawn");
  await expect(chess(page).getByLabel("Move history", { exact: true }).locator("li")).toHaveCount(1);
});

test("leaving a pending practice check disposes it and cannot overwrite a reopened lesson", async ({ page }) => {
  await firstTurn(page);
  await chess(page).getByRole("button", { name: "Try again", exact: true }).click();
  const practice = chess(page).getByRole("region", { name: "Practice position", exact: true });
  await play(page, "d2", "d4");
  await expect(practice.getByRole("status")).toHaveText("Checking your idea…");
  await expect.poll(() => page.evaluate(() => window.continuityStats.analysisWorkers.length)).toBe(2);
  const worker = await page.evaluate(() => window.continuityStats.analysisWorkers.at(-1)!);
  await practice.getByRole("button", { name: "Return to move", exact: true }).click();
  expect(await page.evaluate(id => window.continuityStats.terminated.includes(id), worker)).toBe(true);
  await chess(page).getByRole("button", { name: "Try again", exact: true }).click();
  await page.waitForTimeout(2100);
  await expect(practice.getByRole("status")).toHaveText("Find a good move for White.");
  await expect(practice.locator('[data-square="d2"]')).toHaveAttribute("aria-label", "d2, white pawn");
});

test("evaluation timeline keyboard navigation stays synchronized with the board", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await firstTurn(page);
  await openReview(page);
  const timeline = chess(page).getByRole("slider", { name: "Review position", exact: true });
  await expect(timeline).toBeVisible();
  await timeline.press("Home");
  await expect(chess(page).locator('[data-square="e2"]')).toHaveAttribute("aria-label", "e2, white pawn");
  await timeline.press("ArrowRight");
  await expect(timeline).toHaveAttribute("aria-valuetext", /1\.e4/);
  await expect(chess(page).locator('[data-square="e4"]')).toHaveAttribute("aria-label", "e4, white pawn");
  await timeline.press("End");
  await expect(chess(page).locator('[data-square="e5"]')).toHaveAttribute("aria-label", "e5, black pawn");
  await expect(chess(page).getByText("2 / 2 refined", { exact: true })).toBeVisible({ timeout: 10000 });
  const shot = testInfo.outputPath("chess-review.png");
  await page.screenshot({ path: shot });
  await testInfo.attach("chess-review", { path: shot, contentType: "image/png" });
});

test("animation Off applies to both play and manual teaching steps", async ({ page }) => {
  await firstTurn(page);
  await chess(page).getByRole("button", { name: "More options", exact: true }).click();
  await chess(page).getByRole("button", { name: "Board settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Board settings", exact: true });
  await settings.getByRole("radio", { name: "Off", exact: true }).check();
  await settings.getByRole("button", { name: "Close", exact: true }).click();
  await play(page, "g1", "f3");
  await expect(chess(page).locator(".chess-moving-piece")).toHaveCount(0);
  await expect(chess(page).getByRole("button", { name: "2…Nc6 · Best", exact: true })).toBeVisible();
  await chess(page).getByRole("button", { name: "Show line", exact: true }).click();
  await chess(page).getByRole("button", { name: "Next continuation move", exact: true }).click();
  await expect(chess(page).locator(".chess-moving-piece")).toHaveCount(0);
});

for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`teaching controls fit the window at ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await firstTurn(page);
    await chess(page).getByRole("button", { name: "Show line", exact: true }).click();
    const lesson = chess(page).getByRole("region", { name: "Continuation", exact: true });
    const body = await chess(page).locator(".window-body").boundingBox();
    const nav = await lesson.getByRole("navigation").boundingBox();
    expect(nav!.y + nav!.height).toBeLessThanOrEqual(body!.y + body!.height);
    await expect(lesson.getByRole("button", { name: "Return to move", exact: true })).toBeInViewport();
    const shot = testInfo.outputPath("chess-continuation.png");
    await page.screenshot({ path: shot });
    await testInfo.attach("chess-continuation", { path: shot, contentType: "image/png" });
  });
}
