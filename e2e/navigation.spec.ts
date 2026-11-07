import { expect, test } from "./fixtures";

test.describe("navigation", () => {
  test("home lists the sections and the conditions", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("PF2 en français");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Pathfinder 2");
    const sections = page.getByRole("region", { name: "Parcourir" }).getByRole("link");
    expect(await sections.count()).toBeGreaterThan(10);
    await expect(page.getByRole("region", { name: "États" }).getByRole("link", { name: "Effrayé" })).toBeVisible();
  });

  test("main navigation leads to a list and marks it as current", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Sorts" }).click();
    await expect(page).toHaveURL(/\/sorts\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Sorts" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Sorts" })).toHaveAttribute("aria-current", "page");
  });

  test("entry page shows the rule text", async ({ page }) => {
    await page.goto("/sorts/boule-de-feu/");
    await expect(page).toHaveTitle("Boule de feu · PF2 en français");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Boule de feu/);
    await expect(page.locator(".rule-text").first()).toContainText("dégâts de feu");
  });

  test("class page shows its stats and progression", async ({ page }) => {
    await page.goto("/classes/guerrier/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Guerrier/);
    await expect(page.getByText("Points de vie").first()).toBeVisible();
  });

  test("unknown pages answer 404", async ({ page }) => {
    const response = await page.goto("/cette-page-n-existe-pas/");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("link", { name: /accueil/i }).first()).toBeVisible();
  });

  test("skip link targets the main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Aller au contenu" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page).toHaveURL(/#content$/);
  });
});
