import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const PAGES = ["/", "/sorts/", "/sorts/boule-de-feu/", "/classes/guerrier/", "/creatures/", "/etats/effraye/", "/sources/"];
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function violations(page: Page, include?: string) {
  const builder = new AxeBuilder({ page }).withTags(WCAG);
  if (include) builder.include(include);
  const { violations } = await builder.analyze();
  return violations.map((v) => `${v.impact} ${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")}`);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    for (const path of PAGES) {
      test(`${path} has no accessibility violation`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator("main")).toBeVisible();
        expect(await violations(page)).toEqual([]);
      });
    }

    test("mega menu has no accessibility violation", async ({ page }) => {
      await page.goto("/sorts/");
      await page.getByRole("button", { name: "Parcourir" }).click();
      await expect(page.locator("#site-menu")).toBeVisible();
      expect(await violations(page, "#site-menu")).toEqual([]);
    });

    test("search dialog has no accessibility violation", async ({ page }) => {
      await page.goto("/");
      await page.keyboard.press("Control+k");
      await expect(page.locator(".pagefind-ui__search-input")).toBeVisible();
      await page.locator(".pagefind-ui__search-input").fill("boule de feu");
      await expect(page.locator(".pagefind-ui__result-link").first()).toBeVisible();
      expect(await violations(page, "dialog.search-dialog")).toEqual([]);
    });
  });
}
