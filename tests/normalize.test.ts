import { describe, expect, it } from "vitest";
import { normalize, slugify } from "../src/lib/normalize.ts";

describe("normalize", () => {
  it("lowercases and strips accents", () => {
    expect(normalize("Électricité ÂGÉE Œil")).toBe("electricite agee œil");
    expect(normalize("Boule de FEU")).toBe("boule de feu");
  });

  it("keeps non-accented text unchanged", () => {
    expect(normalize("abc 123")).toBe("abc 123");
  });
});

describe("slugify", () => {
  it("builds a URL fragment from a French title", () => {
    expect(slugify("Dons de niveau 1")).toBe("dons-de-niveau-1");
    expect(slugify("À jamais parmi l'humanité")).toBe("a-jamais-parmi-l-humanite");
  });

  it("trims separators at both ends", () => {
    expect(slugify("  — Rang 3 ! ")).toBe("rang-3");
    expect(slugify("")).toBe("");
  });
});
