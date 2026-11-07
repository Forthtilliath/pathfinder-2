import { describe, expect, it } from "vitest";
import { COLLECTION_BY_NAME, COLLECTION_BY_PATH, COLLECTIONS, entryPath, VIEWS } from "../src/lib/collections.ts";

const RESERVED = ["apercus", "listes", "sources", "pagefind", "_astro"];

describe("collections registry", () => {
  it("has unique names and URL paths", () => {
    const names = COLLECTIONS.map((c) => c.name);
    const paths = [...COLLECTIONS.map((c) => c.path), ...VIEWS.map((v) => v.path)];
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("uses URL-safe paths that do not clash with other routes", () => {
    for (const path of [...COLLECTIONS.map((c) => c.path), ...VIEWS.map((v) => v.path)]) {
      expect(path).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(RESERVED).not.toContain(path);
    }
  });

  it("defines each facet once per collection", () => {
    for (const c of COLLECTIONS) {
      const keys = c.facets.map((f) => f.key);
      expect(new Set(keys).size, c.name).toBe(keys.length);
    }
  });

  it("builds views on an existing collection and facet", () => {
    for (const v of VIEWS) {
      const base = COLLECTION_BY_NAME[v.base];
      expect(base, v.path).toBeDefined();
      expect(base.facets.map((f) => f.key)).toContain(v.filter.key);
    }
  });

  it("indexes collections by name and path", () => {
    expect(COLLECTION_BY_NAME.spells.path).toBe("sorts");
    expect(COLLECTION_BY_PATH.sorts.name).toBe("spells");
    expect(entryPath("spells", "boule-de-feu")).toBe("sorts/boule-de-feu");
  });
});
