import { describe, expect, it } from "vitest";
import { entries } from "../src/lib/data";
import { CHAPTER_CATALOGUES, SCREEN_GROUPS } from "../src/lib/rules-index-config";
import { rulesIndex, rulesTrail, ruleSource, type RuleSource } from "../src/lib/rules-index";

const page = (n: number, name: string, chapter: string, book = "Livre des joueurs"): RuleSource => ({
  id: `p${n}`,
  name,
  foundryId: `bbe-${book === "Livre du MJ" ? "livre-du-mj" : "livre-des-joueurs"}-${String(n).padStart(3, "0")}`,
  book,
  chapter,
});

describe("rulesIndex", () => {
  const rows: RuleSource[] = [
    page(31, "Jouer une partie", "Chapitre 8 : Jouer une partie"),
    page(0, "Livre des joueurs : sommaire", "Sommaire"),
    page(13, "Classes", "Chapitre 3 : Classes"),
    page(2, "Qu’est-ce qu’un jeu de rôle ?", "Chapitre 1 : Introduction"),
    page(1, "Introduction", "Chapitre 1 : Introduction"),
    page(21, "Équipement", "Chapitre 6 : Équipement"),
    page(50, "Trésors", "Trésors", "Livre du MJ"),
    page(1, "Introduction", "Introduction", "Livre du MJ"),
    { id: "duels", name: "Duels", book: "Écran du MJ" },
    { id: "taille-et-allonge", name: "taille et allonge", book: "Écran du MJ" },
    { id: "ecran-du-mj", name: "Écran du MJ", book: "Écran du MJ" },
    { id: "nouveau", name: "Nouvelle fiche", book: "Écran du MJ" },
  ];
  const books = rulesIndex(rows);

  it("lists the books in reading order", () => {
    expect(books.map((b) => b.name)).toEqual(["Livre des joueurs", "Livre du MJ", "Écran du MJ"]);
  });

  it("orders chapters and pages as in the book, without the book's own contents page", () => {
    const [player] = books;
    expect(player.chapters.map((c) => [c.kicker, c.title])).toEqual([
      ["Chapitre 1", "Introduction"],
      ["Chapitre 3", "Classes"],
      ["Chapitre 5", "Dons"],
      ["Chapitre 6", "Équipement"],
      ["Chapitre 8", "Jouer une partie"],
    ]);
    expect(player.chapters[0].pages.map((p) => p.name)).toEqual(["Introduction", "Qu’est-ce qu’un jeu de rôle ?"]);
    expect(player.pageCount).toBe(5);
  });

  it("puts a catalogue-only chapter in its place, with its site lists", () => {
    const feats = books[0].chapters.find((c) => c.title === "Dons")!;
    expect(feats.pages).toEqual([]);
    expect(feats.catalogues.map((c) => c.path)).toContain("dons");
  });

  it("numbers the GM Core treasure chapter, after its unnumbered introduction", () => {
    expect(books[1].chapters.map((c) => [c.kicker, c.title])).toEqual([
      [undefined, "Introduction"],
      ["Chapitre 5", "Trésors"],
    ]);
  });

  it("groups the GM screen by theme, unknown pages last, index pages linked apart", () => {
    const screen = books[2];
    expect(screen.chapters.map((c) => c.title)).toEqual(["Règles du jeu", "Sous-systèmes", "Autres"]);
    expect(screen.chapters[0].pages.map((p) => p.name)).toEqual(["Taille et allonge"]);
    expect(screen.indexPages.map((p) => p.id)).toEqual(["ecran-du-mj"]);
  });

  it("gives unique anchors", () => {
    const anchors = books.flatMap((b) => [b.anchor, ...b.chapters.map((c) => c.anchor)]);
    expect(new Set(anchors).size).toBe(anchors.length);
  });
});

describe("rulesTrail", () => {
  it("links a book page to its book and chapter", () => {
    expect(rulesTrail(page(13, "Classes", "Chapitre 3 : Classes"))).toEqual([
      { label: "Livre des joueurs", href: "/regles/#livre-des-joueurs" },
      { label: "Classes", href: "/regles/#livre-des-joueurs-classes" },
    ]);
  });

  it("links a GM screen page to its theme", () => {
    expect(rulesTrail({ id: "duels", name: "Duels", book: "Écran du MJ" })[1]).toEqual({ label: "Sous-systèmes", href: "/regles/#ecran-du-mj-sous-systemes" });
  });
});

describe("rules index on the imported data", () => {
  const rules = entries("rules");
  const books = rulesIndex(rules.map(ruleSource));

  it("lists every rules page but the contents pages", () => {
    const listed = books.flatMap((b) => [...b.chapters.flatMap((c) => c.pages), ...b.indexPages]).length;
    expect(listed).toBe(rules.filter((e) => e.filters.chapter?.[0] !== "Sommaire").length);
  });

  it("knows every GM screen page", () => {
    const screen = books.find((b) => b.name === "Écran du MJ");
    expect(screen?.chapters.map((c) => c.title)).not.toContain("Autres");
  });

  it("only names known GM screen pages and site lists", () => {
    const ids = new Set(rules.map((e) => e.id));
    for (const g of SCREEN_GROUPS) for (const id of g.ids) expect(ids, id).toContain(id);
    const configured = Object.values(CHAPTER_CATALOGUES).flatMap((b) => Object.values(b).flat()).length;
    const resolved = books.flatMap((b) => b.chapters.flatMap((c) => c.catalogues)).length;
    expect(resolved).toBe(configured);
  });
});
