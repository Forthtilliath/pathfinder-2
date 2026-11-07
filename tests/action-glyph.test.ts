import { describe, expect, it } from "vitest";
import { ACTION_LABELS, actionGlyphHtml, actionGlyphSvg } from "../src/lib/action-glyph.ts";
import type { ActionCost } from "../src/lib/types.ts";

const COSTS = Object.keys(ACTION_LABELS) as ActionCost[];
const countPaths = (svg: string) => svg.match(/<path /g)?.length ?? 0;

describe("action glyphs", () => {
  it("draws one diamond per action", () => {
    expect(countPaths(actionGlyphSvg("1"))).toBe(1);
    expect(countPaths(actionGlyphSvg("2"))).toBe(2);
    expect(countPaths(actionGlyphSvg("3"))).toBe(3);
  });

  it("draws a hollow diamond for a free action", () => {
    expect(actionGlyphSvg("free")).toContain('fill="none"');
  });

  it("joins ranges with a French separator", () => {
    expect(actionGlyphSvg("1-3")).toContain('<span class="cost-glyph-sep">à</span>');
    expect(actionGlyphSvg("1-2")).toContain('<span class="cost-glyph-sep">ou</span>');
    expect(countPaths(actionGlyphSvg("2-3"))).toBe(5);
  });

  it("labels every glyph for screen readers", () => {
    for (const cost of COSTS) {
      const html = actionGlyphHtml(cost);
      expect(html).toContain(`role="img"`);
      expect(html).toContain(`aria-label="${ACTION_LABELS[cost]}"`);
      expect(html).toContain('aria-hidden="true"');
    }
  });
});
