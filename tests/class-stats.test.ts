import { describe, expect, it } from "vitest";
import { classStats, parseItem } from "../src/lib/class-stats.ts";
import type { Fact } from "../src/lib/types.ts";

const fact = (label: string, value: string): Fact => ({ label, value: { value, provenance: { source: "site", sourceLanguage: "en", status: "current", method: "rule" } } });

describe("class stats", () => {
  it("reads a rank at the end or at the start of an item", () => {
    expect(parseItem("armes simples : qualifié")).toEqual({ html: "Armes simples", rank: "qualifié" });
    expect(parseItem("Vigueur expert")).toEqual({ html: "Vigueur", rank: "expert" });
    expect(parseItem('qualifié en <a href="/competences/artisanat/">Artisanat</a>')).toEqual({ html: '<a href="/competences/artisanat/">Artisanat</a>', rank: "qualifié" });
    expect(parseItem("3 compétences supplémentaires")).toEqual({ html: "3 compétences supplémentaires" });
  });

  it("splits lists and extracts key figures", () => {
    const stats = classStats([
      fact("Points de vie", "8 + modificateur de Constitution par niveau"),
      fact("Perception", "expert"),
      fact("Jets de sauvegarde", "Vigueur expert, Réflexes expert, Volonté qualifié"),
      fact("Défenses", "armure légère : qualifié ; sans armure : qualifié"),
    ]);
    expect(stats.keyFigures).toEqual([
      { label: "Points de vie", value: "8", note: "+ modificateur de Constitution par niveau" },
      { label: "Perception", value: "Expert", rank: "expert" },
    ]);
    expect(stats.lists.map((l) => l.items.length)).toEqual([3, 2]);
  });
});
