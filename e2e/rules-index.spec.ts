import { expect, test } from "./fixtures";

test.describe("rules table of contents", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/regles/");
  });

  test("lists the chapters in book order, introduction first", async ({ page }) => {
    const chapters = page.locator('[data-rules-book]:has(h2#livre-des-joueurs) [data-rules-chapter] h3');
    await expect(chapters.first()).toHaveText(/Chapitre 1\s*Introduction/);
    await expect(chapters.last()).toHaveText(/Chapitre 8\s*Jouer une partie/);
    await expect(page.locator("#livre-du-mj-introduction")).toBeVisible();
  });

  test("the side column links to the chapters, it does not filter", async ({ page }) => {
    const toc = page.getByRole("navigation", { name: "Sommaire" });
    await toc.getByRole("link", { name: "4. Sous-systèmes" }).click();
    await expect(page).toHaveURL(/#livre-du-mj-sous-systemes$/);
    await expect(page.locator("#livre-du-mj-sous-systemes")).toBeInViewport();
    await expect(page.locator("#livre-des-joueurs")).toBeAttached();
  });

  test("narrows the pages by title, ignoring accents, and keeps the query in the URL", async ({ page }) => {
    const search = page.getByRole("searchbox", { name: "Chercher une page de règles" });
    await search.fill("DEGATS");
    await expect(page).toHaveURL(/\?q=DEGATS$/);
    await expect(page.getByRole("link", { name: "Jets de dégâts" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Absalom et l’Île de la Pierrétoile" })).toBeHidden();
    await expect(page.locator("[data-rules-count]")).toHaveText(/^\d+ pages? sur \d+$/);

    await search.fill("zzzzzz");
    await expect(page.getByText("Aucun titre ne correspond.")).toBeVisible();
  });

  test("a chapter title match shows the whole chapter", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Chercher une page de règles" }).fill("sous-systemes");
    await expect(page.getByRole("link", { name: "Poursuites" }).first()).toBeVisible();
  });
});

test("a rules page leads back to its chapter", async ({ page }) => {
  await page.goto("/regles/poursuites/");
  const crumbs = page.getByRole("navigation", { name: "Fil d'Ariane" });
  await expect(crumbs.getByRole("link", { name: "Écran du MJ" })).toHaveAttribute("href", "/regles/#ecran-du-mj");
  await expect(crumbs.getByRole("link", { name: "Sous-systèmes" })).toHaveAttribute("href", "/regles/#ecran-du-mj-sous-systemes");
});
