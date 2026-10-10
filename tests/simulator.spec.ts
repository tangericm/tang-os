import { expect, test } from "@playwright/test";

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 1050 }],
  ["mobile", { width: 390, height: 844 }],
] as const) {
  test.describe(name, () => {
    test.use({ viewport });

    for (const reducedMotion of ["no-preference", "reduce"] as const) {
      test(`layer map loads after project navigation (${reducedMotion})`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion });
        await page.goto("/projects/denoiser");
        await expect(page.locator(".proj-title")).toBeVisible();
        if (viewport.width <= 640) {
          await page.getByRole("combobox", { name: "Choose a project" }).selectOption("simulator");
        } else {
          await page.locator(".proj-sidebar button").filter({ hasText: "Physics-Based OCT Simulator" }).click();
        }

        const labels = page.locator(".simreal-labels");
        // The map begins completely clipped. Lazy loading can leave it
        // unrequested even as the compositor animates the wipe across it.
        await expect(labels).toHaveJSProperty("naturalWidth", 720);
        await expect(labels).toHaveJSProperty("complete", true);

        if (reducedMotion === "reduce") {
          await expect(labels).toHaveCSS("animation-name", "none");
          await expect(labels).toHaveCSS("clip-path", "none");
          await expect(page.locator(".simreal-edge")).toBeHidden();
        } else {
          await expect(labels).toHaveCSS("clip-path", "inset(0px)", { timeout: 10000 });
        }
      });
    }
  });
}
