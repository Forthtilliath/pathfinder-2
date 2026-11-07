import { expect, test } from "./fixtures";

test.describe("entry page", () => {
  test("has a breadcrumb back to its list", async ({ page }) => {
    await page.goto("/sorts/boule-de-feu/");
    const crumbs = page.getByRole("navigation", { name: "Fil d'Ariane" });
    await expect(crumbs.locator("[aria-current=page]")).toHaveText("Boule de feu");
    await crumbs.getByRole("link", { name: "Sorts" }).click();
    await expect(page).toHaveURL(/\/sorts\/$/);
  });

  test("table of contents links to the headings", async ({ page }) => {
    await page.goto("/actions/gagner-de-l-argent/");
    const toc = page.getByRole("navigation", { name: "Sommaire" });
    const first = toc.getByRole("link").first();
    const target = (await first.getAttribute("href"))!;
    await first.click();
    await expect(page).toHaveURL(new RegExp(`${target}$`));
    await expect(page.locator(target)).toBeInViewport();
  });

  test("table of contents also lists the progression and related lists, and stays in view", async ({ page }) => {
    await page.goto("/classes/franc-tireur/");
    const toc = page.getByRole("navigation", { name: "Sommaire" });
    await expect(toc.getByRole("link", { name: "Progression" })).toBeVisible();
    const lastLink = toc.getByRole("link").last();
    const target = (await lastLink.getAttribute("href"))!;
    await lastLink.click();
    await expect(page.locator(target)).toBeInViewport();
    // Sticky side column: still on screen far down the page.
    await expect(toc).toBeInViewport();
  });

  test("table of contents is collapsed above the content on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/classes/franc-tireur/");
    const toc = page.getByRole("navigation", { name: "Sommaire" });
    await expect(toc.getByRole("link", { name: "Progression" })).toBeHidden();
    await toc.getByText("Sommaire").click();
    await expect(toc.getByRole("link", { name: "Progression" })).toBeVisible();
  });

  test("copy link button is kept out of the search index", async ({ page }) => {
    await page.goto("/sorts/boule-de-feu/");
    await expect(page.getByRole("button", { name: "Copier le lien" })).toHaveAttribute("data-pagefind-ignore", "");
  });
});

test.describe("security", () => {
  test("every page carries a strict CSP (no unsafe-inline scripts)", async ({ page }) => {
    for (const path of ["/", "/sorts/", "/sorts/boule-de-feu/"]) {
      await page.goto(path);
      const csp = (await page.locator('meta[http-equiv="content-security-policy"]').getAttribute("content")) ?? "";
      expect(csp, path).toContain("default-src 'self'");
      expect(csp, path).toMatch(/script-src [^;]*'wasm-unsafe-eval'/);
      expect(csp, path).not.toContain("'unsafe-inline'");
    }
  });

  test("the list island still hydrates under the CSP", async ({ page }) => {
    await page.goto("/sorts/");
    await page.getByPlaceholder("Filtrer les sorts…").fill("boule de feu");
    // The accessible name also carries the action glyph ("Boule de feu Deux actions").
    await expect(page.locator(".results").getByRole("link", { name: /^Boule de feu\b/ }).first()).toBeVisible();
    await expect(page.locator(".result-count")).not.toContainText("chargement");
  });
});
