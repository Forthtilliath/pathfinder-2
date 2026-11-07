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

test("current section stays visible in the scrollable menu", async ({ page }) => {
  await page.goto("/regles/");
  await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Règles" })).toBeInViewport();
});
