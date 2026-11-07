import { describe, expect, it } from "vitest";
import { addHeadingIds } from "../src/lib/toc";

describe("addHeadingIds", () => {
  it("injects anchor ids into h2/h3 and returns the table of contents", () => {
    const { html, headings } = addHeadingIds("<h2>Actions</h2>\n<p>texte</p>\n<h3>Détaillée</h3>");
    expect(html).toContain('<h2 id="actions">Actions</h2>');
    expect(html).toContain('<h3 id="detaillee">Détaillée</h3>');
    expect(headings).toEqual([
      { id: "actions", text: "Actions", level: 2 },
      { id: "detaillee", text: "Détaillée", level: 3 },
    ]);
  });

  it("deduplicates identical titles", () => {
    const { headings } = addHeadingIds("<h2>Don</h2><h2>Don</h2>");
    expect(headings.map((h) => h.id)).toEqual(["don", "don-2"]);
  });

  it("keeps ids unique across blocks sharing the same map", () => {
    const used = new Map<string, number>();
    const first = addHeadingIds("<h2>Introduction</h2>", used);
    const second = addHeadingIds("<h2>Introduction</h2>", used);
    expect([...first.headings, ...second.headings].map((h) => h.id)).toEqual(["introduction", "introduction-2"]);
  });

  it("keeps existing ids untouched", () => {
    const { html, headings } = addHeadingIds('<h2 class="x" id="fixe">Titre</h2><h3 id="autre">A</h3>');
    expect(html).toBe('<h2 class="x" id="fixe">Titre</h2><h3 id="autre">A</h3>');
    expect(headings).toEqual([]);
  });

  it("strips nested tags for the TOC text", () => {
    const { headings } = addHeadingIds("<h2>Le <em>sort</em> final</h2>");
    expect(headings).toEqual([{ id: "le-sort-final", text: "Le sort final", level: 2 }]);
  });

  it("handles empty html", () => {
    expect(addHeadingIds("")).toEqual({ html: "", headings: [] });
  });
});
