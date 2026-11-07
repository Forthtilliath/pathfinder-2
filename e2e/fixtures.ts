import { expect, test as base, type Locator } from "@playwright/test";

/** Fails any test whose page logs a JavaScript error or a failed same-origin request. */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page, baseURL }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => {
        // Chrome rejects the page cross-fade (view transition) when it cannot run, e.g. a headless tab not shown under parallel load: browser-side, not a site error.
        if (!e.message.startsWith("Transition was aborted")) errors.push(e.message);
      });
      page.on("console", (m) => {
        // Failed requests are reported by the response handler below, with their URL.
        if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) errors.push(m.text());
      });
      page.on("response", (r) => {
        if (r.url().startsWith(baseURL!) && r.status() >= 400 && r.request().resourceType() !== "document") errors.push(`${r.status()} ${r.url()}`);
      });
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Scrolls the element into view and lets the scroll events fire first:
 * previews hide on scroll, so hovering while the page scrolls would cancel them.
 */
export async function settleInView(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.page().evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

export { expect };
