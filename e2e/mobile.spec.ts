import { devices } from "@playwright/test";
import { expect, test } from "./fixtures";

// Phone-sized Chromium (Android): the site must stay usable without horizontal scrolling.
test.use({ ...devices["Pixel 7"] });

const noHorizontalScroll = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

for (const path of ["/", "/sorts/", "/sorts/boule-de-feu/", "/classes/guerrier/", "/creatures/"]) {
  test(`${path} fits the screen width`, async ({ page }) => {
    await page.goto(path);
    expect(await noHorizontalScroll(page)).toBe(true);
  });
}

test("facets open from the Filtres button", async ({ page }) => {
  await page.goto("/sorts/");
  const toggle = page.getByRole("button", { name: /^Filtres/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("group", { name: "Rang" })).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("group", { name: "Rang" })).toBeVisible();
});

test("menu opens below the header, fits the screen and closes", async ({ page }) => {
  await page.goto("/regles/");
  await page.getByRole("button", { name: "Parcourir" }).click();
  const menu = page.locator("#site-menu");
  await expect(menu).toBeVisible();
  const header = await page.locator(".site-header").boundingBox();
  const box = await menu.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1);
  expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(await noHorizontalScroll(page)).toBe(true);
  await expect(menu.getByRole("link", { name: /^Règles/ })).toHaveAttribute("aria-current", "page");
  await menu.getByRole("button", { name: "Fermer le menu" }).click();
  await expect(menu).toBeHidden();
});

test("search button keeps its name when only the icon shows", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Rechercher" })).toBeVisible();
});
