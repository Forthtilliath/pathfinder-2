import { expect, test } from "@playwright/test";

test("home shows section icons, the illustration and the book covers", async ({ page, request }) => {
  await page.goto("/");
  const icon = page.locator(".home-section .section-icon use").first();
  const href = await icon.getAttribute("href");
  expect(href).toMatch(/^\/icons\/sections\.svg#[a-z-]+$/);
  const sprite = await (await request.get(href!.split("#")[0])).text();
  expect(sprite).toContain(`<symbol id="${href!.split("#")[1]}"`);

  for (const img of await page.locator(".home-illustration img, .book-covers img").all()) {
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveJSProperty("complete", true);
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  }
  await expect(page.locator(".book-covers img")).toHaveCount(4);
});

test("a class with an illustration shows it", async ({ page }) => {
  await page.goto("/classes/guerrier/");
  const img = page.locator(".entry-illustration img");
  await expect(img).toBeVisible();
  expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
});
