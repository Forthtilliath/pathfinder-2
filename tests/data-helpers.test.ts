import { describe, expect, it } from "vitest";
import { describeProvenance, entryTexts, groupByProvenance, hasUnreviewedTranslation, listItem, plainText, preview } from "../src/lib/data.ts";
import type { Entry, ListRow, Provenance, Text } from "../src/lib/types.ts";

const HUMAN: Provenance = { source: "pathfinder-fr", sourceLanguage: "en", status: "current", method: "human" };
const AI: Provenance = { source: "site", sourceLanguage: "en", status: "unreviewed", method: "ai" };
const text = (value: string, provenance = HUMAN): Text => ({ value, provenance });

const entry = (overrides: Partial<Entry> = {}): Entry => ({
  id: "boule-de-feu",
  collection: "spells",
  name: text("Boule de feu"),
  description: text("<p>Un souffle de feu.</p>"),
  subtitle: "Sort 3",
  traits: [],
  rarity: "common",
  facts: [],
  filters: {},
  related: [],
  ...overrides,
});

describe("plainText", () => {
  it("removes tags, non-breaking spaces and extra whitespace", () => {
    expect(plainText("<p>Un&nbsp;souffle</p>\n<p><strong>de</strong>   feu</p>")).toBe("Un souffle de feu");
  });

  it("decodes entities, so excerpts do not show &gt; or &amp;", () => {
    expect(plainText("PV &gt; 0 &amp; &quot;tenace&quot; &#39;x&#x27; &eacute;")).toBe("PV > 0 & \"tenace\" 'x' &eacute;");
  });
});

describe("preview", () => {
  it("uses the description as excerpt", () => {
    expect(preview(entry())).toEqual({ name: "Boule de feu", subtitle: "Sort 3", excerpt: "Un souffle de feu." });
  });

  it("falls back to the facts when there is no description", () => {
    const e = entry({ description: text(""), facts: [{ label: "Portée", value: text("<em>36 m</em>") }, { label: "Cibles", value: text("1 créature") }] });
    expect(preview(e).excerpt).toBe("Portée : 36 m · Cibles : 1 créature");
  });

  it("cuts long excerpts on a word boundary", () => {
    const long = `<p>${"mot ".repeat(200)}</p>`;
    const { excerpt } = preview(entry({ description: text(long) }));
    expect(excerpt.length).toBeLessThanOrEqual(321);
    expect(excerpt).toMatch(/mot…$/);
  });
});

describe("listItem", () => {
  const row: ListRow = { id: "a", name: "A", subtitle: "Don 1", rarity: "rare", filters: { level: ["1"] }, search: "a" };

  it("keeps display fields only", () => {
    expect(listItem(row)).toEqual({ id: "a", name: "A", subtitle: "Don 1", rarity: "rare" });
    expect(Object.keys(listItem(row))).not.toContain("cost");
  });

  it("keeps the action cost when there is one", () => {
    expect(listItem({ ...row, cost: "2" }).cost).toBe("2");
  });
});

describe("provenance", () => {
  it("describes a community translation", () => {
    expect(describeProvenance(HUMAN)).toBe("traduction de la communauté Pathfinder-fr, depuis l'anglais");
  });

  it("flags unreviewed machine translations", () => {
    expect(describeProvenance(AI)).toBe("traduction du site, automatique, depuis l'anglais, non relue");
    expect(hasUnreviewedTranslation([text("x"), text("y", AI)])).toBe(true);
    expect(hasUnreviewedTranslation([text("x")])).toBe(false);
  });

  it("groups texts with the same provenance and skips empty ones", () => {
    const groups = groupByProvenance([
      ["nom", text("Boule de feu")],
      ["description", text("…", AI)],
      ["portée", text("36 m")],
      ["cibles", text("")],
      ["zone", undefined],
    ]);
    expect(groups).toEqual([
      { labels: ["nom", "portée"], provenance: HUMAN },
      { labels: ["description"], provenance: AI },
    ]);
  });

  it("lists every text of an entry", () => {
    const e = entry({ facts: [{ label: "Portée", value: text("36 m") }], chapters: [text("<h2>Jeu de rôle</h2>")] });
    expect(entryTexts(e).map(([label]) => label)).toEqual(["nom", "description", "jeu de rôle", "portée"]);
  });
});
