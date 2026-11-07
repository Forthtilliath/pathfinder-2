import { describe, expect, it } from "vitest";
import { activeCount, toggleValue } from "../src/components/FacetPanel.tsx";

describe("facet selection", () => {
  it("adds then removes a value", () => {
    const one = toggleValue({}, "rank", "1");
    expect(one).toEqual({ rank: ["1"] });
    expect(toggleValue(one, "rank", "2")).toEqual({ rank: ["1", "2"] });
    expect(toggleValue(one, "rank", "1")).toEqual({});
  });

  it("does not mutate the previous selection", () => {
    const before = { rank: ["1"], rarity: ["Rare"] };
    toggleValue(before, "rank", "2");
    expect(before).toEqual({ rank: ["1"], rarity: ["Rare"] });
  });

  it("counts every selected value", () => {
    expect(activeCount({})).toBe(0);
    expect(activeCount({ rank: ["1", "2"], rarity: ["Rare"] })).toBe(3);
  });
});
