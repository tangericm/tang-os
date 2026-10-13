import { expect, test, type Page } from "@playwright/test";

async function swipe(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const input = await page.context().newCDPSession(page);
  await input.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
  for (let step = 1; step <= 8; step++) {
    await input.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: from.x + (to.x - from.x) * step / 8, y: from.y + (to.y - from.y) * step / 8 }],
    });
    await page.waitForTimeout(16); // Deliver a gesture across compositor frames.
  }
  await input.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await input.detach();
}

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`touch navigation and window geometry (${viewport.width}×${viewport.height})`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto("/");
    const power = page.getByRole("button", { name: "Power", exact: true });
    const powerBox = (await power.boundingBox())!;
    expect(powerBox.width).toBeGreaterThanOrEqual(44);
    expect(powerBox.height).toBeGreaterThanOrEqual(44);
    expect(powerBox.y).toBeGreaterThanOrEqual(0);
    await power.tap();
    const menu = page.getByRole("menu");
    expect((await menu.boundingBox())!.x).toBeGreaterThanOrEqual(0);
    expect((await menu.boundingBox())!.y).toBeGreaterThanOrEqual(powerBox.y + powerBox.height);
    await page.getByRole("menuitem", { name: "Sleep", exact: true }).tap();
    const veil = (await page.locator(".sleep-veil").boundingBox())!;
    expect(veil).toEqual({ x: 0, y: 0, ...viewport });
    await page.touchscreen.tap(viewport.width / 2, viewport.height / 2);
    await expect(page.locator(".sleep-veil")).toBeHidden();
    const launcher = page.locator('.dock-button[data-app="projects"]');
    await launcher.locator(".dock-label").tap();
    await expect(page.locator(".proj-title")).toHaveText("Real-Time Instrument Tracking & 4D Imaging");
    await expect(page).toHaveURL(/\/projects\/tracking$/);
    const projectUrl = page.url();
    const projects = page.getByRole("region", { name: "Projects", exact: true });
    const dock = page.locator(".dock ul");
    if (viewport.width <= 640) {
      const box = (await dock.boundingBox())!;
      for (let attempt = 0; attempt < 3; attempt++) {
        await swipe(page, { x: box.x + box.width - 35, y: box.y + 25 }, { x: box.x + 35, y: box.y + 25 });
      }
      await expect.poll(() => dock.evaluate(el => el.scrollLeft)).toBeGreaterThan(150);
      const mail = (await dock.getByRole("link", { name: "Email me" }).boundingBox())!;
      expect(mail.x + mail.width).toBeLessThanOrEqual(box.x + box.width);
      await expect(page).toHaveURL(projectUrl); // Swipes must not launch an app.
      for (let attempt = 0; attempt < 3; attempt++) {
        await swipe(page, { x: box.x + 35, y: box.y + 25 }, { x: box.x + box.width - 35, y: box.y + 25 });
      }
      await expect.poll(() => dock.evaluate(el => el.scrollLeft)).toBeLessThan(2);
    }
    const checkGeometry = async () => {
      const footer = (await page.locator(".dock").boundingBox())!;
      const bar = (await page.locator(".menubar").boundingBox())!;
      await expect.poll(async () => (await projects.boundingBox())!.y).toBeGreaterThanOrEqual(bar.y + bar.height);
      await expect.poll(async () => {
        const frame = (await projects.boundingBox())!;
        return frame.y + frame.height;
      }).toBeLessThanOrEqual(footer.y - 4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
      for (const button of await projects.locator(".light").all()) {
        await expect.poll(async () => (await button.boundingBox())!.width).toBeGreaterThanOrEqual(43.99);
        await expect.poll(async () => (await button.boundingBox())!.height).toBeGreaterThanOrEqual(43.99);
      }
    };
    await checkGeometry();
    await projects.getByRole("button", { name: "Zoom in", exact: true }).tap();
    await checkGeometry();
    await projects.getByRole("button", { name: "Zoom out", exact: true }).tap();
    await checkGeometry();
    await projects.getByRole("button", { name: "Minimize to Dock", exact: true }).tap();
    await expect(projects).toBeHidden();
    await launcher.tap();
    await expect(projects).toBeVisible();
    await context.close();
  });
}

test("touch tablet zoom keeps the taller menu bar clear after rotation", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto("/");
  const file = page.getByRole("button", { name: "Eric Tang Resume.pdf", exact: true });
  const fileBox = (await file.boundingBox())!;
  await swipe(page, { x: fileBox.x + fileBox.width / 2, y: fileBox.y + fileBox.height / 2 }, { x: fileBox.x + fileBox.width / 2, y: 5 });
  expect((await file.boundingBox())!.y).toBeGreaterThanOrEqual(46);
  await page.goto("/projects/rawforge");
  const projects = page.getByRole("region", { name: "Projects", exact: true });
  await projects.getByRole("button", { name: "Zoom in", exact: true }).tap();
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect.poll(async () => (await projects.boundingBox())!.y).toBeGreaterThanOrEqual(46);
  const power = page.getByRole("button", { name: "Power", exact: true });
  await power.tap();
  await expect(page.getByRole("menuitem", { name: "Restart", exact: true })).toBeVisible();
  await context.close();
});

test("touch comparison drags change the image, vertical swipes scroll the content", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto("/projects/denoiser");
  const slider = page.getByRole("slider");
  await slider.scrollIntoViewIfNeeded();
  const box = (await slider.boundingBox())!;
  const y = box.y + box.height / 2;
  await swipe(page, { x: box.x + box.width / 2, y }, { x: box.x + box.width * .8, y });
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(65);
  const value = await slider.inputValue();
  const detail = page.locator(".proj-detail");
  const before = await detail.evaluate(el => el.scrollTop);
  await swipe(page, { x: box.x + box.width * .8, y }, { x: box.x + box.width * .8, y: y - 130 });
  await expect.poll(() => detail.evaluate(el => el.scrollTop)).toBeGreaterThan(before + 40);
  await expect(slider).toHaveValue(value);
  await context.close();
});

test("every project visual stays within the narrow phone content pane", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  for (const id of ["tracking", "galvo", "denoise", "denoiser", "simulator", "optical-design", "rawforge", "frankie-town", "recipe-book", "tangos"]) {
    await page.goto(`/projects/${id}`);
    const detail = page.locator(".proj-detail");
    await expect(detail).toBeVisible();
    expect(await detail.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    for (const hero of await detail.locator(".proj-hero, .proj-artifact").all()) {
      await hero.scrollIntoViewIfNeeded();
      for (const image of await hero.locator("img").all()) {
        await expect.poll(() => image.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
        expect(await image.evaluate(el => el.clientWidth <= el.closest(".proj-detail")!.clientWidth)).toBe(true);
      }
    }
  }
  await context.close();
});
