import { describe, expect, it } from "vitest";
import { COLLECTIONS, VIEWS } from "../src/lib/collections.ts";
import { NAV_GROUPS, navGroups } from "../src/lib/nav.ts";

describe("site menu", () => {
  it("lists every collection and view exactly once", () => {
    const listed = NAV_GROUPS.flatMap((g) => g.paths);
    const pages = [...COLLECTIONS, ...VIEWS].map((p) => p.path);
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual([...pages].sort());
  });

  it("resolves titles and drops empty pages and groups", () => {
    const groups = navGroups((path) => (path === "sorts" ? 12 : path === "creatures" ? 3 : 0));
    expect(groups).toEqual([
      { title: "Magie et équipement", links: [{ path: "sorts", href: "/sorts/", title: "Sorts", intro: expect.any(String), count: 12 }] },
      { title: "MJ et monstres", links: [{ path: "creatures", href: "/creatures/", title: "Créatures", intro: expect.any(String), count: 3 }] },
    ]);
  });
});
