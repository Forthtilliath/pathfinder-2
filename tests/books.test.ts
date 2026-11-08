import { describe, expect, it } from "vitest";
import { buildBlocks, type Block } from "../scripts/import/books/blocks.ts";
import { BOOKS } from "../scripts/import/books/config.ts";
import { blocksHtml, caseDictionary, normalCase } from "../scripts/import/books/html.ts";
import { linkPageRefs } from "../scripts/import/books/index.ts";
import { pageLines, runsText } from "../scripts/import/books/lines.ts";
import { isWatermark, type BookText, type Fragment } from "../scripts/import/books/pdf-text.ts";
import { cutBlocks, sectionLines, sectionsOf } from "../scripts/import/books/sections.ts";
import { tableModel } from "../scripts/import/books/tables.ts";

const SERIF = "SabonLTPro-Roman";
const SANS = "GoodOT";
/** A fragment; its width is estimated from its length. */
const frag = (t: string, x: number, y: number, f = SERIF, s = 8.5): Fragment => ({ t, x, y, s, f, w: Math.round(t.length * s * 0.45 * 10) / 10 });
const html = (fragments: Fragment[], compounds = new Set<string>()) => blocksHtml(buildBlocks(pageLines(1, fragments), compounds), new Map());

describe("book PDF watermarks", () => {
  it("drops the buyer's line and any e-mail or order number", () => {
    expect(isWatermark(frag("jean dupont - jean@exemple.fr - 202410/3535351/4100401", 200, 2, "Helvetica", 3))).toBe(true);
    expect(isWatermark(frag("écrivez à quelqu'un@exemple.com", 82, 400))).toBe(true);
    expect(isWatermark(frag("202410/3535351/4100401", 82, 400))).toBe(true);
    expect(isWatermark(frag("Les elfes accordent une grande valeur à la beauté.", 82, 400))).toBe(false);
  });
});

describe("book page lines", () => {
  it("reads the left column before the right one, whatever the drawing order", () => {
    const lines = pageLines(1, [frag("Colonne de droite.", 319, 700), frag("Colonne de gauche.", 82, 700)]);
    expect(lines.map((l) => runsText(l.runs))).toEqual(["Colonne de gauche.", "Colonne de droite."]);
  });

  it("drops running heads, page numbers and the chapter tabs", () => {
    const lines = pageLines(1, [
      frag("Livre des Joueurs", 162, 751, "Taroca", 12),
      frag("402402", 19, 20, "GoodOT-Bold", 12),
      frag("Introduction", 534, 600, "GoodOT-CondBold", 9),
      frag("Le texte.", 82, 600),
    ]);
    expect(lines.map((l) => runsText(l.runs))).toEqual(["Le texte."]);
  });
});

describe("book paragraphs", () => {
  it("joins the lines of a paragraph and the words cut at a line end", () => {
    const out = html([frag("Une curiosité intel", 82, 700), frag("‑", 154.7, 700), frag("lectuelle qui les caractérise.", 82, 689)]);
    expect(out).toBe("<p>Une curiosité intellectuelle qui les caractérise.</p>");
  });

  it("keeps the hyphen of a compound word written whole elsewhere", () => {
    const out = html([frag("Une cité‑", 82, 700), frag("état prospère.", 82, 689)], new Set(["cité-état"]));
    expect(out).toBe("<p>Une cité-état prospère.</p>");
  });

  it("starts a paragraph at a first-line indent after a full stop", () => {
    const out = html([frag("Première phrase finie.", 82, 700), frag("Nouveau paragraphe.", 91, 689)]);
    expect(out).toBe("<p>Première phrase finie.</p>\n<p>Nouveau paragraphe.</p>");
  });

  it("goes on across columns when the next line is not indented", () => {
    const out = html([frag("Une phrase qui continue", 82, 100), frag("dans la colonne suivante.", 319, 700)]);
    expect(out).toBe("<p>Une phrase qui continue dans la colonne suivante.</p>");
  });

  it("starts a stat block property at a bold label", () => {
    const out = html([
      frag("Succès. ", 82, 700, "GoodOT-Bold", 8.3),
      frag("Vous gagnez 1 point.", 115, 700, SANS, 8.3),
      frag("Échec. ", 82, 689, "GoodOT-Bold", 8.3),
      frag("Rien ne se passe.", 115, 689, SANS, 8.3),
    ]);
    expect(out).toContain('<p class="book-aside"><strong>Succès.</strong> Vous gagnez 1 point.</p>');
    expect(out).toContain('<p class="book-aside"><strong>Échec.</strong> Rien ne se passe.</p>');
  });

  it("turns bullets typed in a sidebar into a list, each item ending at its last short line", () => {
    const out = html([
      frag("Les objets sont regroupés par catégories.", 91, 700, SANS),
      frag("• La section consacrée aux armes inclut des règles pour graver", 91, 689, SANS),
      frag("des runes (p. 224).", 91, 678, SANS),
      frag("• Les objets issus de l’alchimie sont des consommables.", 91, 667, SANS),
    ]);
    expect(out).toBe(
      '<p class="book-aside">Les objets sont regroupés par catégories.</p>\n<ul class="book-aside"><li>La section consacrée aux armes inclut des règles pour graver des runes (p. 224).</li><li>Les objets issus de l’alchimie sont des consommables.</li></ul>',
    );
  });

  it("splits the properties of a stat block set with a hanging indent, then its description", () => {
    const B = "GoodOT-Bold";
    const out = html([
      frag("Divinités ", 82, 700, B, 8.3),
      frag("archidiables, Asmodeus, Dahak, Érécura, Général Susumu,", 120, 700, SANS, 8.3),
      frag("ducs infernaux, reines de la nuit", 91, 689, SANS, 8.3),
      frag("Habitants natifs ", 82, 678, B, 8.3),
      frag("diables, molosses infernaux, ombres (les damnés)", 150, 678, SANS, 8.3),
      frag("Les Enfers sont le royaume des diables, le siège multiversel de la tyran", 82, 667, SANS, 8.3),
      frag("nie et des lois malveillantes.", 82, 656, SANS, 8.3),
    ]);
    expect(out.split("\n")).toEqual([
      '<p class="book-aside"><strong>Divinités</strong> archidiables, Asmodeus, Dahak, Érécura, Général Susumu, ducs infernaux, reines de la nuit</p>',
      '<p class="book-aside"><strong>Habitants natifs</strong> diables, molosses infernaux, ombres (les damnés)</p>',
      '<p class="book-aside">Les Enfers sont le royaume des diables, le siège multiversel de la tyran nie et des lois malveillantes.</p>',
    ]);
  });

  it("starts a new line of dialogue at each speaker of a play example", () => {
    const B = "TimesNewRomanPS-BoldMT";
    const out = html([
      frag("Mérisiel (Shay) : ", 82, 700, B),
      frag("Les mineurs ont besoin d’une source de", 150, 700),
      frag("lumière pour travailler.", 150, 689),
      frag("Kyra (Jessica) : ", 82, 678, B),
      frag("J’en appelle à la lumière de Sarenrae.", 150, 678),
    ]);
    expect(out.split("\n")).toEqual([
      "<p><strong>Mérisiel (Shay) :</strong> Les mineurs ont besoin d’une source de lumière pour travailler.</p>",
      "<p><strong>Kyra (Jessica) :</strong> J’en appelle à la lumière de Sarenrae.</p>",
    ]);
  });

  it("renders the fiction of a chapter opening as a quote", () => {
    const out = html([frag("Il y a dix mille ans, le monde faillit périr.", 82, 700, "TimesNewRomanPS-BoldItalicMT", 12)]);
    expect(out).toBe('<blockquote class="book-fiction"><p>Il y a dix mille ans, le monde faillit périr.</p></blockquote>');
  });
});

describe("book tables", () => {
  it("builds the columns, with a header printed on two lines", () => {
    const lines = pageLines(1, [
      frag("Attaque", 371, 96.8, "GoodOT-Bold", 8),
      frag("Malus d’attaques", 452, 101.6, "GoodOT-Bold", 8),
      frag("multiples", 465, 92, "GoodOT-Bold", 8),
      frag("Agile", 517, 96.8, "GoodOT-Bold", 8),
      frag("Première", 371, 80.8, SANS),
      frag("Aucun", 469, 80.8, SANS),
      frag("Aucun", 514, 80.8, SANS),
      frag("Seconde", 371, 69.6, SANS),
      frag("−5", 476, 69.6, SANS),
      frag("−4", 521, 69.6, SANS),
    ]);
    const table = buildBlocks(lines, new Set()).find((b): b is Extract<Block, { kind: "table" }> => b.kind === "table")!;
    const model = tableModel(table.rows);
    const text = (cells: { t: string }[][]) => cells.map((c) => runsText(c as never).trim());
    expect(text(model.header[0])).toEqual(["Attaque", "Malus d’attaques multiples", "Agile"]);
    expect(model.body.map(text)).toEqual([
      ["Première", "Aucun", "Aucun"],
      ["Seconde", "−5", "−4"],
    ]);
  });
});

describe("book headings", () => {
  it("gives capitalized headings back the case words have in the text", () => {
    const dict = caseDictionary(["Les gens de Golarion vivent autour de la mer Intérieure, dit le MJ."]);
    expect(normalCase("GOLARION ET LA MER INTÉRIEURE", dict)).toBe("Golarion et la mer Intérieure");
    expect(normalCase("CONSEILS AU MJ", dict)).toBe("Conseils au MJ");
    expect(normalCase("Déjà en casse normale", dict)).toBe("Déjà en casse normale");
  });

  it("cuts a section at a heading or at its first stat block", () => {
    const blocks: Block[] = [
      { kind: "heading", level: 3, text: "Société", last: pageLines(1, [frag("x", 82, 700)])[0] },
      { kind: "heading", level: 2, text: "Héritages elfiques", last: pageLines(1, [frag("x", 82, 700)])[0] },
      { kind: "stat", name: "Délaissé", type: "DON 1" },
    ];
    expect(cutBlocks(blocks, /^Héritages\b/)).toHaveLength(1);
    expect(cutBlocks(blocks, "stat")).toHaveLength(2);
    expect(cutBlocks(blocks, undefined)).toHaveLength(3);
  });
});

describe("book sections", () => {
  const text: BookText = {
    watermarks: 0,
    bookmarks: [
      { title: "Livre", page: 1, depth: 0 },
      { title: "Chapitre 1 : Règles", page: 1, depth: 1 },
      { title: "Tests", page: 1, depth: 2 },
      { title: "Dégâts", page: 2, depth: 2 },
    ],
    pages: [
      [frag("RÈGLES", 82, 720, "Taroca", 18), frag("Présentation du chapitre.", 82, 700), frag("TESTS", 82, 600, "Taroca", 15), frag("Le texte des tests.", 82, 580)],
      [frag("DÉGÂTS", 82, 720, "Taroca", 15), frag("Le texte des dégâts.", 82, 700)],
    ],
  };
  const sections = sectionsOf(text);
  const lines = (title: string) => sectionLines(text, sections.find((s) => s.title === title)!, new Map()).map((l) => runsText(l.runs));

  it("splits a page shared by two sections at the second title", () => {
    expect(sections.map((s) => s.title)).toEqual(["Chapitre 1 : Règles", "Tests", "Dégâts"]);
    expect(lines("Chapitre 1 : Règles")).toEqual(["Présentation du chapitre."]);
    expect(lines("Tests")).toEqual(["Le texte des tests."]);
    expect(lines("Dégâts")).toEqual(["Le texte des dégâts."]);
  });
});

describe("book page references", () => {
  const [players, gm] = BOOKS;
  const owners = new Map([
    [players, [{ from: 200, id: "ldj-010" }, { from: 300, id: null }]],
    [gm, [{ from: 230, id: "lmj-020" }]],
  ]);

  it("links a page reference to the page holding it", () => {
    expect(linkPageRefs("voir (p. 215)", players, owners)).toBe(`voir (@UUID[Compendium.pf2e.${players.pack}.JournalEntryPage.ldj-010]{p.\u00a0215})`);
    expect(linkPageRefs("<em>Livre du MJ</em>, p. 236", players, owners)).toBe(`<em>Livre du MJ</em>, @UUID[Compendium.pf2e.${gm.pack}.JournalEntryPage.lmj-020]{p.\u00a0236}`);
  });

  it("leaves a reference to a page that is not on the site", () => {
    expect(linkPageRefs("les dons (p. 310)", players, owners)).toBe("les dons (p. 310)");
    expect(linkPageRefs("Livre des monstres, p. 212", players, owners)).toBe("Livre des monstres, p. 212");
    expect(linkPageRefs("<em>Livre des joueurs 2</em>, p. 212", players, owners)).toBe("<em>Livre des joueurs 2</em>, p. 212");
  });
});
