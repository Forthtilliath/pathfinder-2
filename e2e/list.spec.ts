import { expect, test } from "./fixtures";

import type { Page } from "@playwright/test";

const count = (page: Page) => page.locator(".result-count");
const resultNumber = async (page: Page) => Number((await count(page).textContent())!.match(/^(\d+) résultats?/)![1]);
// The accessible name also holds the action glyph ("Boule de feu 2 actions"): target the link by its URL.
const fireball = (page: Page) => page.locator('.results a[href="/sorts/boule-de-feu/"]');

test.describe("filterable list", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sorts/");
    // Long list: the full rows arrive as JSON after the first render.
    await expect(count(page)).toHaveText(/^\d+ résultats$/);
  });

  test("filters by name and keeps the query in the URL", async ({ page }) => {
    const total = await resultNumber(page);
    await page.getByRole("searchbox", { name: "Filtrer par nom" }).fill("boule de feu");
    await expect(page).toHaveURL(/\?q=boule\+de\+feu$/);
    await expect(fireball(page)).toBeVisible();
    expect(await resultNumber(page)).toBeLessThan(total);

    await page.reload();
    await expect(page.getByRole("searchbox", { name: "Filtrer par nom" })).toHaveValue("boule de feu");
    await expect(fireball(page)).toBeVisible();
  });

  test("ignores accents and case", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Filtrer par nom" }).fill("BOULE DE FÉU");
    await expect(fireball(page)).toBeVisible();
  });

  test("shows an empty state", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Filtrer par nom" }).fill("zzzzzzzz");
    await expect(count(page)).toHaveText("0 résultat");
    await expect(page.getByText("Aucun résultat.")).toBeVisible();
  });

  test("combines facets and clears them", async ({ page }) => {
    const total = await resultNumber(page);
    const rank = page.getByRole("group", { name: "Rang" }).getByRole("button", { name: "1", exact: true });
    await rank.click();
    await expect(rank).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/[?&]rank=1(&|$)/);
    const ranked = await resultNumber(page);
    expect(ranked).toBeLessThan(total);

    await page.getByRole("group", { name: "Rareté" }).getByRole("button", { name: "Rare", exact: true }).click();
    await expect.poll(() => resultNumber(page)).toBeLessThan(ranked);
    // Hidden on wide screens, where the facets are always shown.
    await expect(page.locator(".filters-toggle")).toHaveText("Filtres (2)");

    await page.getByRole("button", { name: "Effacer les filtres" }).click();
    await expect.poll(() => resultNumber(page)).toBe(total);
    await expect(page).toHaveURL(/\/sorts\/$/);
  });

  test("loads more rows on demand", async ({ page }) => {
    const rows = page.locator(".results li");
    await expect(rows).toHaveCount(200);
    await page.getByRole("button", { name: /^Afficher 200 de plus/ }).click();
    await expect(rows).toHaveCount(400);
  });

  test("restores facets from the URL", async ({ page }) => {
    await page.goto("/sorts/?rank=1&rarity=Rare");
    await expect(page.getByRole("group", { name: "Rang" }).getByRole("button", { name: "1", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("group", { name: "Rareté" }).getByRole("button", { name: "Rare", exact: true })).toHaveAttribute("aria-pressed", "true");
  });
});

test("short lists ship whole without fetching JSON", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/etats/");
  await expect(count(page)).toHaveText(/^\d+ résultats$/);
  expect(requests.filter((u) => u.includes("/listes/"))).toEqual([]);
});
