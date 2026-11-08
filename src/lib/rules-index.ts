/**
 * Rules index (/regles/): the rules pages as a table of contents, books in
 * reading order, chapters and pages in book order, the GM screen by theme.
 */
import { COLLECTION_BY_PATH, VIEWS } from "./collections.ts";
import { normalize, slugify } from "./normalize.ts";
import {
  CATALOGUE_CHAPTERS,
  CHAPTER_CATALOGUES,
  CHAPTER_RENAMES,
  RULES_BOOK_ORDER,
  SCREEN_GROUPS,
  SCREEN_INDEX_PAGES,
} from "./rules-index-config.ts";

/** What the index needs from a rules entry. */
export interface RuleSource {
  id: string;
  name: string;
  /** Book pages: "bbe-livre-du-mj-012", page order within the book. */
  foundryId?: string;
  book?: string;
  chapter?: string;
}

export interface RulesPageItem {
  id: string;
  name: string;
  /** Normalized name, for the client filter. */
  search: string;
}

export interface RulesCatalogue {
  path: string;
  label: string;
}

export interface RulesChapter {
  anchor: string;
  /** "Chapitre 3", when the chapter is numbered. */
  kicker?: string;
  title: string;
  pages: RulesPageItem[];
  catalogues: RulesCatalogue[];
  /** Normalized title and catalogue names: a match shows the whole chapter. */
  search: string;
}

export interface RulesBook {
  anchor: string;
  name: string;
  chapters: RulesChapter[];
  pageCount: number;
  /** Pages that only list other pages (GM screen): linked, not listed. */
  indexPages: RulesPageItem[];
}

const SCREEN = "Écran du MJ";
const OTHER_BOOK = "Autres règles";

export const bookAnchor = (book: string) => slugify(book);

/** "Chapitre 3 : Classes" → number and title; the display rename applies first. */
export function splitChapter(book: string, chapter: string): { number?: number; title: string; label: string } {
  const label = CHAPTER_RENAMES[book]?.[chapter] ?? chapter;
  const m = label.match(/^Chapitre (\d+) : (.+)$/);
  return m ? { number: Number(m[1]), title: m[2], label } : { title: label, label };
}

export const chapterAnchor = (book: string, chapterTitle: string) => `${bookAnchor(book)}-${slugify(chapterTitle)}`;

/** "taille et allonge" → "Taille et allonge". */
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const pageItem = (r: RuleSource): RulesPageItem => {
  const name = capitalize(r.name);
  return { id: r.id, name, search: normalize(name) };
};

function catalogues(book: string, title: string): RulesCatalogue[] {
  return (CHAPTER_CATALOGUES[book]?.[title] ?? []).flatMap((path) => {
    const label = COLLECTION_BY_PATH[path]?.title ?? VIEWS.find((v) => v.path === path)?.title;
    return label ? [{ path, label }] : [];
  });
}

function chapter(book: string, raw: string, pages: RulesPageItem[]): RulesChapter & { number?: number } {
  const { number, title } = splitChapter(book, raw);
  const links = catalogues(book, title);
  return {
    anchor: chapterAnchor(book, title),
    kicker: number === undefined ? undefined : `Chapitre ${number}`,
    number,
    title,
    pages,
    catalogues: links,
    search: normalize([title, ...links.map((l) => l.label)].join(" ")),
  };
}

const byName = (a: RulesPageItem, b: RulesPageItem) => a.name.localeCompare(b.name, "fr");

/** Book chapters in page order; the book's own table of contents ("Sommaire") is left out. */
function bookChapters(book: string, rows: RuleSource[]): RulesChapter[] {
  const sorted = rows.filter((r) => r.chapter && r.chapter !== "Sommaire").sort((a, b) => (a.foundryId ?? "").localeCompare(b.foundryId ?? ""));
  const order = [...new Set(sorted.map((r) => r.chapter!))];
  const chapters = order.map((c) => chapter(book, c, sorted.filter((r) => r.chapter === c).map(pageItem)));
  // Catalogue-only chapters go before the first chapter with a higher number.
  for (const raw of CATALOGUE_CHAPTERS[book] ?? []) {
    const extra = chapter(book, raw, []);
    const at = chapters.findIndex((c) => c.number !== undefined && extra.number !== undefined && c.number > extra.number);
    chapters.splice(at < 0 ? chapters.length : at, 0, extra);
  }
  return chapters;
}

/** The GM screen by theme; unknown pages in "Autres", names in alphabetical order. */
function screenChapters(rows: RuleSource[]): RulesChapter[] {
  const listed = rows.filter((r) => !SCREEN_INDEX_PAGES.includes(r.id));
  const groups = SCREEN_GROUPS.map((g) => ({ title: g.title, rows: listed.filter((r) => g.ids.includes(r.id)) }));
  const known = new Set(SCREEN_GROUPS.flatMap((g) => g.ids));
  groups.push({ title: "Autres", rows: listed.filter((r) => !known.has(r.id)) });
  return groups.filter((g) => g.rows.length).map((g) => chapter(SCREEN, g.title, g.rows.map(pageItem).sort(byName)));
}

export function rulesIndex(rows: RuleSource[]): RulesBook[] {
  const books = new Map<string, RuleSource[]>();
  for (const r of rows) {
    const book = r.book ?? OTHER_BOOK;
    books.set(book, [...(books.get(book) ?? []), r]);
  }
  const rank = (b: string) => {
    const i = RULES_BOOK_ORDER.indexOf(b);
    return i < 0 ? RULES_BOOK_ORDER.length : i;
  };
  return [...books.keys()]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "fr"))
    .map((name) => {
      const list = books.get(name)!;
      const chapters = name === SCREEN ? screenChapters(list) : list.some((r) => r.chapter) ? bookChapters(name, list) : [chapter(name, "Pages", list.map(pageItem).sort(byName))];
      return {
        anchor: bookAnchor(name),
        name,
        chapters,
        pageCount: chapters.reduce((n, c) => n + c.pages.length, 0),
        indexPages: name === SCREEN ? list.filter((r) => SCREEN_INDEX_PAGES.includes(r.id)).map(pageItem) : [],
      };
    });
}

/** Book and chapter of a rules page, as links into the index (breadcrumbs). */
export function rulesTrail(r: RuleSource): { label: string; href: string }[] {
  if (!r.book) return [];
  const trail = [{ label: r.book, href: `/regles/#${bookAnchor(r.book)}` }];
  const title = r.book === SCREEN ? SCREEN_GROUPS.find((g) => g.ids.includes(r.id))?.title : r.chapter && r.chapter !== "Sommaire" ? splitChapter(r.book, r.chapter).title : undefined;
  if (title) trail.push({ label: title, href: `/regles/#${chapterAnchor(r.book, title)}` });
  return trail;
}

/** Index fields of an entry: the book and chapter come from its list filters. */
export const ruleSource = (e: { id: string; name: { value: string }; foundryId?: string; filters: Record<string, string[]> }): RuleSource => ({
  id: e.id,
  name: e.name.value,
  foundryId: e.foundryId,
  book: e.filters.book?.[0],
  chapter: e.filters.chapter?.[0],
});
