import { expect, settleInView, test } from "./fixtures";

test.describe("full-text search", () => {
  test("opens with Ctrl+K and finds an entry", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Recherche" });
    await expect(dialog).toBeVisible();
    const input = dialog.getByRole("textbox").or(dialog.getByRole("searchbox")).first();
    await expect(input).toBeFocused();
    await input.fill("boule de feu");
    await expect(dialog.locator(".pagefind-ui__result-link").first()).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Boule de feu/ }).first()).toBeVisible();
    await expect(dialog.locator(".search-unavailable")).toBeHidden();
  });

  test("opens from the header button and closes with Escape", async ({ page }) => {
    await page.goto("/sorts/");
    // The header button (the footer has its own "Rechercher" link).
    await page.locator(".site-header").getByRole("button", { name: /Rechercher/ }).click();
    const dialog = page.getByRole("dialog", { name: "Recherche" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("link previews", () => {
  test("shows a preview on hover", async ({ page }) => {
    await page.goto("/etats/");
    const link = page.locator(".results").getByRole("link", { name: "Effrayé", exact: true });
    await settleInView(link);
    await link.hover();
    const bubble = page.getByRole("tooltip");
    await expect(bubble).toBeVisible();
    await expect(bubble.locator(".preview-title strong")).toHaveText("Effrayé");
    await page.mouse.move(0, 0);
    await expect(bubble).toBeHidden();
  });

  test("shows a preview on keyboard focus and hides it with Escape", async ({ page }) => {
    await page.goto("/etats/");
    const link = page.locator(".results").getByRole("link", { name: "Effrayé", exact: true });
    await settleInView(link);
    await link.focus();
    const bubble = page.getByRole("tooltip");
    await expect(bubble).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(bubble).toBeHidden();
  });
});
