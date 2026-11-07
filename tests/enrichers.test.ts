import { describe, expect, it } from "vitest";
import { enrich, protect, restore, tokenize, type RenderContext } from "../scripts/import/enrichers.ts";
import { translateCastingTime, translateDuration, translateRange } from "../scripts/import/rules.ts";
import { DAMAGE_TYPES, STATISTICS } from "../scripts/import/terms.ts";

const ctx: RenderContext = {
  resolve: (pack, key) => (pack === "conditionitems" && key === "Frightened" ? { collection: "conditions", id: "effraye", name: "Effrayé" } : null),
  resolveAction: (slug) => (slug === "seek" ? { collection: "actions", id: "chercher", name: "Chercher" } : null),
  statistic: (s) => STATISTICS[s] ?? null,
  damageType: (s) => (s in DAMAGE_TYPES ? DAMAGE_TYPES[s] : null),
  localize: () => null,
  report: () => {},
};

describe("tokenize", () => {
  it("handles nested brackets and labels", () => {
    const s = tokenize("A @Damage[(2d6+4)[fire]]{feu} B [[/r {1d4}[fire]]] C");
    expect(s).toHaveLength(5);
    expect(s[1]).toMatchObject({ name: "Damage", params: "(2d6+4)[fire]", label: "feu" });
    expect(s[3]).toMatchObject({ kind: "command", name: "r", params: "{1d4}[fire]" });
  });
});

describe("enrich", () => {
  it("resolves links to French paths and keeps the label", () => {
    expect(enrich("@UUID[Compendium.pf2e.conditionitems.Item.Frightened]{effrayé 2}", ctx)).toBe(
      '<a href="/etats/effraye/" data-preview="etats/effraye">effrayé 2</a>',
    );
  });
  it("uses the French name when unlabeled", () => {
    expect(enrich("@UUID[Compendium.pf2e.conditionitems.Item.Frightened]", ctx)).toContain(">Effrayé</a>");
  });
  it("drops unlabeled links to content not imported", () => {
    expect(enrich("<p>@UUID[Compendium.pf2e.spell-effects.Item.Spell Effect: X]</p>", ctx)).toBe("");
  });
  it("renders checks and damage", () => {
    expect(enrich("@Check[reflex|dc:20|basic]", ctx)).toBe('<span class="roll">Réflexes basique DD 20</span>');
    expect(enrich("@Check[flat|dc:5]", ctx)).toBe('<span class="roll">test nu DD 5</span>');
    expect(enrich("infligeant @Damage[6d6[fire]] dégâts", ctx)).toBe('infligeant <span class="roll">6d6 dégâts de feu</span>');
    expect(enrich("@Damage[1d6[persistent,bleed]]", ctx)).toBe('<span class="roll">1d6 dégâts de saignement persistants</span>');
  });
  it("renders templates and actions", () => {
    expect(enrich("@Template[type:burst|distance:20]", ctx)).toBe("explosion de 6 m");
    expect(enrich("[[/act seek]]", ctx)).toContain(">Chercher</a>");
  });
});

describe("protect / restore", () => {
  it("round-trips with translated labels", () => {
    const source = "You are @UUID[Compendium.pf2e.conditionitems.Item.Frightened]{frightened 1} and take @Damage[2d6[fire]] damage.";
    const p = protect(source);
    expect(p.text).toBe('You are <ref id="0">frightened 1</ref> and take <ref id="1"/> damage.');
    expect(restore('Vous êtes <ref id="0">effrayé 1</ref> et subissez <ref id="1"/> dégâts.', p.tokens)).toBe(
      "Vous êtes @UUID[Compendium.pf2e.conditionitems.Item.Frightened]{effrayé 1} et subissez @Damage[2d6[fire]] dégâts.",
    );
  });
  it("rejects a lost reference", () => {
    const p = protect("A @Check[will] B");
    expect(() => restore("A B", p.tokens)).toThrow();
  });
});

describe("rules", () => {
  it("converts units and durations", () => {
    expect(translateRange("500 feet")).toBe("150 m");
    expect(translateRange("5 feet")).toBe("1,5 m");
    expect(translateDuration("1 minute", true)).toBe("maintenu jusqu'à 1 minute");
    expect(translateCastingTime("1 to 3")).toEqual({ actions: "1-3" });
    expect(translateCastingTime("10 minutes")).toEqual({ text: "10 minutes" });
  });
});

describe("action glyphs", () => {
  it("replaces Foundry glyph spans with symbols", () => {
    expect(enrich('<span class="action-glyph">2</span>', ctx)).toBe(
      '<span class="cost-glyph-text" title="2 actions" aria-label="2 actions">◆◆</span>',
    );
  });
});
