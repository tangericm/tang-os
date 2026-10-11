import { expect, test } from "@playwright/test";

for (const width of [1440, 768, 390]) {
  test(`collections, project navigation, and history (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/projects");
    await expect(page.locator(".proj-title")).toHaveText("Real-Time Instrument Tracking & 4D Imaging");
    await expect(page.getByRole("button", { name: "Research", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".proj-detail")).toHaveCSS("background-color", "rgb(34, 29, 24)");
    await page.getByRole("button", { name: "Engineering", exact: true }).click();
    await expect(page).toHaveURL(/\/projects\/denoiser$/);
    const choose = async (id: string, name: string) => {
      if (width <= 640) await page.getByRole("combobox", { name: "Choose a project" }).selectOption(id);
      else await page.locator(".proj-sidebar button").filter({ hasText: name }).click();
    };
    await choose("optical-design", "Optical Design");
    await expect(page.locator(".proj-title")).toHaveText("Optical Design");
    await expect(page.locator(".proj-artifact img")).toHaveJSProperty("naturalWidth", 1440);
    await page.getByRole("button", { name: "Engineering", exact: true }).click();
    await expect(page).toHaveURL(/\/projects\/optical-design$/);
    await page.getByRole("button", { name: "Hobbies", exact: true }).press("Enter");
    await expect(page).toHaveURL(/\/projects\/frankie-town$/);
    await expect(page.locator(".proj-artifact img")).toHaveJSProperty("naturalWidth", 400);
    await expect(page.locator(".proj-detail").getByRole("link", { name: "Play Frankie Town", exact: true })).toHaveAttribute("href", "https://frankie-town.vercel.app");
    await expect(page.locator(".proj-detail").getByRole("link", { name: "GitHub", exact: true })).toHaveAttribute("href", "https://github.com/tangericm/frankie-town");
    await choose("recipe-book", "Eric's Recipe Book");
    await expect(page.locator(".proj-title")).toHaveText("Eric's Recipe Book");
    await expect(page.locator(".proj-artifact img")).toHaveJSProperty("naturalWidth", 1200);
    await page.goBack();
    await expect(page.locator(".proj-title")).toHaveText("Frankie Town");
    await page.goForward();
    await expect(page.getByRole("button", { name: "Hobbies", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.locator(".proj-technical summary").click();
    await expect(page.locator(".proj-technical p")).toBeVisible();
    if (width <= 640) {
      await expect(page.getByRole("combobox", { name: "Choose a project" })).toBeVisible();
      await expect(page.locator(".proj-sidebar")).toBeHidden();
    } else {
      await expect(page.locator(".proj-sidebar")).not.toContainText("Optical Design");
    }
    const detail = page.locator(".proj-detail");
    expect(await detail.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect((await page.request.get("/projects/skillcrit")).status()).toBe(404);
  });
}

test("image comparison and sequence controls work with the keyboard", async ({ page }) => {
  await page.goto("/projects/denoiser");
  const slider = page.getByRole("slider");
  await expect(slider).toHaveValue("50");
  await slider.press("Home");
  await expect(slider).toHaveValue("0");
  await slider.press("End");
  await expect(slider).toHaveValue("100");
  await expect(page.locator(".denoise-clean")).toHaveCSS("animation-name", "none");
  await page.goto("/projects/tracking");
  await page.getByRole("button", { name: "Pause sequence", exact: true }).press("Enter");
  await expect(page.locator(".seq-strip")).toHaveCSS("animation-play-state", "paused");
  await page.getByRole("button", { name: "Resume sequence", exact: true }).click();
  await expect(page.locator(".seq-strip")).toHaveCSS("animation-play-state", "running");
});

test("public catalog and technical details work without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/projects");
  await expect(page.locator(".desktop")).toBeHidden();
  await expect(page.locator(".sitedoc")).toBeVisible();
  for (const group of ["Research", "Engineering", "Hobbies"]) {
    await expect(page.getByRole("heading", { name: `Projects · ${group}`, exact: true })).toBeVisible();
  }
  for (const name of ["Optical Design", "Frankie Town", "Eric's Recipe Book"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.locator(".sitedoc")).not.toContainText("Skillcrit");
  await page.locator(".sitedoc details").first().locator("summary").click();
  await expect(page.locator(".sitedoc details").first().locator("p")).toBeVisible();
  await context.close();
});
