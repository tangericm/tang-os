import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`project collections and deep links (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/projects/optical-design");
    await expect(page.locator(".proj-title")).toHaveText("Optical Design");
    await expect(page.getByRole("button", { name: "Professional work", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('.proj-artifact img')).toHaveJSProperty("naturalWidth", 1440);
    await page.getByRole("button", { name: "Personal projects", exact: true }).click();
    await expect(page).toHaveURL(/\/projects\/recipe-book$/);
    await expect(page.locator(".proj-title")).toHaveText("Eric's Recipe Book");
    await expect(page.locator('.proj-artifact img')).toHaveJSProperty("naturalWidth", 1200);
    await expect(page.locator('.proj-detail a').filter({ hasText: "Open the recipe book" })).toHaveAttribute("href", "https://erics-kitchen.vercel.app");
    await page.goBack();
    await expect(page.locator(".proj-title")).toHaveText("Optical Design");
    await page.goForward();
    await expect(page.getByRole("button", { name: "Personal projects", exact: true })).toHaveAttribute("aria-pressed", "true");
    if (width <= 640) {
      await expect(page.getByRole("combobox", { name: "Choose a project" })).toBeVisible();
      await expect(page.locator(".proj-sidebar")).toBeHidden();
    } else {
      await expect(page.locator(".proj-sidebar")).not.toContainText("Optical Design");
    }
    const detail = page.locator(".proj-detail");
    await expect(detail).toBeVisible();
    expect(await detail.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });
}

test("public catalog works without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/projects");
  await expect(page.locator(".desktop")).toBeHidden();
  await expect(page.locator(".sitedoc")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Projects · Personal projects", exact: true })).toBeVisible();
  for (const name of ["Optical Design", "Skillcrit", "Eric's Recipe Book"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await context.close();
});
