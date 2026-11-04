import { expect, test } from "@playwright/test";

test("review keeps its board navigation and return action visible on a shorter desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/play");
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  await chess.locator('[data-square="e2"]').click();
  await chess.locator('[data-square="e4"]').click();
  await expect(chess.locator(".chess-engine-state")).toHaveAttribute("data-state", "ready", { timeout: 20000 });
  await chess.getByRole("button", { name: "More options", exact: true }).click();
  await chess.getByRole("button", { name: "Review game", exact: true }).click();
  await expect(chess.getByText("2 / 2 refined", { exact: true })).toBeVisible({ timeout: 20000 });
  const body = await chess.locator(".window-body").boundingBox();
  const nav = await chess.getByRole("navigation", { name: "Review navigation", exact: true }).boundingBox();
  expect(nav!.y + nav!.height).toBeLessThanOrEqual(body!.y + body!.height);
  await chess.getByRole("button", { name: "Show best move", exact: true }).click();
  const back = await chess.getByRole("button", { name: "Back to game", exact: true }).boundingBox();
  expect(back!.y).toBeGreaterThanOrEqual(body!.y);
  expect(await chess.evaluate(el => el.scrollTop)).toBe(0);
});

test("opponent difficulty can change without clearing the game", async ({ page }) => {
  await page.goto("/play");
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  await chess.locator('[data-square="e2"]').click();
  await chess.locator('[data-square="e4"]').click();
  await expect(chess.locator(".chess-engine-state")).toHaveAttribute("data-state", "ready", { timeout: 20000 });
  await chess.getByRole("button", { name: "More options", exact: true }).click();
  await chess.getByRole("button", { name: "Opponent level", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Opponent level", exact: true });
  await dialog.getByRole("radio", { name: /Advanced/ }).check();
  await dialog.getByRole("button", { name: "Apply level", exact: true }).click();
  await expect(chess.locator(".chess-player small").first()).toContainText("Advanced");
  await expect(chess.locator('[data-square="e4"]')).toHaveAttribute("aria-label", "e4, white pawn");
  await expect(chess.locator(".chess-history li")).toHaveCount(1);
});

test("playing keeps setup out of the way and new game protects the current position", async ({ page }) => {
  await page.goto("/play");
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  await expect(chess.getByRole("combobox")).toHaveCount(0);
  await expect(chess.getByRole("region", { name: "Coach", exact: true })).toBeVisible();
  await chess.getByRole("button", { name: "New game", exact: true }).click();
  const setup = page.getByRole("dialog", { name: "New game", exact: true });
  await expect(setup).toBeVisible();
  await setup.getByRole("radio", { name: /Advanced/ }).check();
  await setup.getByRole("radio", { name: "Black", exact: true }).check();
  await setup.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(chess.locator('[data-square="e2"]')).toHaveAttribute("aria-label", "e2, white pawn");
  await expect(chess.locator(".chess-square").first()).toHaveAttribute("data-square", "a8");
});

test("Coach grades a human move during play and the opponent leaves time to see it", async ({ page }) => {
  await page.goto("/play");
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  await chess.locator('[data-square="e2"]').click();
  const start = Date.now();
  await chess.locator('[data-square="e4"]').click();
  await expect(chess.locator(".chess-moving-piece")).toHaveCount(1);
  await expect(chess.locator('[data-square="e7"]')).toHaveAttribute("aria-label", "e7, black pawn");
  await expect(chess.locator(".chess-history li").first().locator("span").last()).not.toHaveText("…", { timeout: 20000 });
  expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  await expect(chess.getByRole("region", { name: "Coach", exact: true }).locator("[data-grade]")).toBeVisible({ timeout: 20000 });
  await expect(chess.locator(".chess-move-badge")).toBeVisible();
});

test("resigning opens a separate navigable game review without changing the played moves", async ({ page }) => {
  await page.goto("/play");
  const chess = page.getByRole("region", { name: "Chess", exact: true });
  await chess.locator('[data-square="e2"]').click();
  await chess.locator('[data-square="e4"]').click();
  await expect(chess.locator(".chess-engine-state")).toHaveAttribute("data-state", "ready", { timeout: 20000 });
  await chess.getByRole("button", { name: "More options", exact: true }).click();
  await chess.getByRole("button", { name: "Resign", exact: true }).click();
  await page.getByRole("dialog", { name: "Resign game?", exact: true }).getByRole("button", { name: "Resign", exact: true }).click();
  await chess.getByRole("button", { name: "Review game", exact: true }).click();
  await expect(chess.getByRole("region", { name: "Game review", exact: true })).toBeVisible();
  await chess.getByRole("button", { name: "First position", exact: true }).click();
  await expect(chess.locator('[data-square="e2"]')).toHaveAttribute("aria-label", "e2, white pawn");
  await expect(chess.locator('[data-square="e2"]')).toHaveAttribute("aria-disabled", "true");
  await chess.getByRole("button", { name: "Back to game", exact: true }).click();
  await expect(chess.locator('[data-square="e4"]')).toHaveAttribute("aria-label", "e4, white pawn");
  await expect(chess.locator(".chess-history li")).toHaveCount(1);
});
