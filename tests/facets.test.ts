import { describe, expect, it } from "vitest";
import { activeCount, toggleValue, visibleOptions } from "../src/components/FacetPanel.tsx";

describe("folded facets", () => {
  const facet = { key: "book", label: "Livre", options: ["A", "B", "C", "D", "E"], collapseAfter: 2 };

  it("shows the first options and the selected ones until expanded", () => {
    expect(visibleOptions(facet, [], false)).toEqual(["A", "B"]);
    expect(visibleOptions(facet, ["D"], false)).toEqual(["A", "B", "D"]);
    expect(visibleOptions(facet, [], true)).toEqual(facet.options);
  });

  it("shows everything when the facet does not fold", () => {
    expect(visibleOptions({ ...facet, collapseAfter: undefined }, [], false)).toEqual(facet.options);
  });
});
import { compareFacetValues } from "../src/lib/collections.ts";

describe("facet value order", () => {
  it("puts listed values first, then the others alphabetically", () => {
    const sort = compareFacetValues({ key: "book", label: "Livre", order: ["Livre des joueurs", "Livre du MJ"] });
    expect(
      ["Pathfinder Howl of the Wild", "Livre du MJ", "Pathfinder Battlecry!", "Livre des joueurs"].sort(sort),
    ).toEqual(["Livre des joueurs", "Livre du MJ", "Pathfinder Battlecry!", "Pathfinder Howl of the Wild"]);
  });

  it("sorts numeric facets by value", () => {
    expect(["10", "2", "1"].sort(compareFacetValues({ key: "level", label: "Niveau", numeric: true }))).toEqual([
      "1",
      "2",
      "10",
    ]);
  });
});

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
