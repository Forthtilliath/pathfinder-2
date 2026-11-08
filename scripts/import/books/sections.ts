/**
 * Bookmarks → sections of a book. A section runs from its bookmark page to
 * the next bookmark; when the next section starts in the middle of a page,
 * the page is cut at its title.
 */
import { buildBlocks, compoundWords, type Block } from "./blocks.ts";
import { blocksHtml, caseDictionary } from "./html.ts";
import { pageLines, runsText, type Line } from "./lines.ts";
import type { BookText } from "./pdf-text.ts";
import { roleOf } from "./roles.ts";

export interface Section {
  title: string;
  /** Title of the chapter it belongs to ("Chapitre 8 : Jouer une partie"). */
  chapter: string;
  /** First and last PDF pages. */
  from: number;
  to: number;
  /** Next section title (cut point on its first page). */
  next?: string;
  /** The previous section starts on the same page: what comes before our title is its text. */
  sharesFirstPage?: boolean;
}

const key = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();

/** "Chapitre 1 :Diriger le jeu" → "Chapitre 1 : Diriger le jeu". */
export const cleanTitle = (t: string) =>
  t
    .replace(/\s*:\s*/g, " : ")
    .replace(/‑/g, "-")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Sections from the bookmarks: depth 1 entries are chapters, depth 2 entries their
 * sections. A chapter's own pages (before its first section) form a section named after it.
 */
export function sectionsOf(text: BookText): Section[] {
  const marks = text.bookmarks.filter((b) => b.depth >= 1 && b.depth <= 2 && !/^Table des matières|^PAIZO/i.test(b.title));
  const out: Section[] = [];
  let chapter = "";
  marks.forEach((m, i) => {
    const title = cleanTitle(m.title);
    if (m.depth === 1) chapter = title;
    const next = marks[i + 1];
    const to = next ? Math.max(m.page, next.page) : text.pages.length;
    out.push({ title, chapter, from: m.page, to, next: next ? cleanTitle(next.title) : undefined, sharesFirstPage: i > 0 && marks[i - 1].page === m.page });
  });
  return out;
}

const isTitleLine = (l: Line) => ["title", "h2"].includes(roleOf(l));

/** Lines of a section, cut at its own title and at the next section's title. */
export function sectionLines(text: BookText, section: Section, pages: Map<number, Line[]>): Line[] {
  const linesOf = (n: number) => {
    let l = pages.get(n);
    if (!l) pages.set(n, (l = pageLines(n, text.pages[n - 1] ?? [])));
    return l;
  };
  const all: Line[] = [];
  for (let n = section.from; n <= section.to; n++) all.push(...linesOf(n));
  // Title of a section: one or several title lines whose joined text matches.
  const find = (title: string, page: number) => {
    const target = key(title.replace(/^Chapitre \d+ : /i, ""));
    for (let i = 0; i < all.length; i++) {
      if (all[i].page !== page || !isTitleLine(all[i])) continue;
      let joined = "";
      for (let j = i; j < all.length && j < i + 4 && isTitleLine(all[j]); j++) {
        joined += key(runsText(all[j].runs));
        if (joined === target || (target.length > 6 && joined.startsWith(target))) return { start: i, end: j + 1 };
      }
    }
    return null;
  };
  let end = all.length;
  if (section.next) {
    const cut = find(section.next, section.to);
    const pageStart = all.findIndex((l) => l.page === section.to);
    if (section.to === section.from) end = cut ? cut.start : all.length;
    // The next section's first page is its own, unless its title comes in the middle of the left column.
    else end = cut && cut.start > pageStart && all[cut.start].col === 0 ? cut.start : pageStart;
  }
  const own = find(section.title, section.from);
  if (!own) return all.slice(0, end);
  // Our title is dropped (the page shows its name). Before it: the previous section's end, when it shares the page.
  if (section.sharesFirstPage) return all.slice(own.end, Math.max(own.end, end));
  return [...all.slice(0, own.start), ...all.slice(own.end, Math.max(own.end, end))];
}

export interface PreparedBook {
  sections: Section[];
  blocks(section: Section): Block[];
  html(blocks: Block[]): string;
}

/** Lines of every page, then what the whole book tells: hyphenated words, case of words. */
export function prepareBook(text: BookText): PreparedBook {
  const pages = new Map<number, Line[]>();
  const every: Line[] = [];
  for (let n = 1; n <= text.pages.length; n++) {
    const l = pageLines(n, text.pages[n - 1]);
    pages.set(n, l);
    every.push(...l);
  }
  const compounds = compoundWords(every);
  const dict = caseDictionary(every.filter((l) => ["serif", "sans"].includes(roleOf(l))).map((l) => runsText(l.runs)));
  return {
    sections: sectionsOf(text),
    blocks: (section) => buildBlocks(sectionLines(text, section, pages), compounds),
    html: (blocks) => blocksHtml(blocks, dict),
  };
}

/** The blocks before a heading matching `until`, or before the first stat block. */
export function cutBlocks(blocks: Block[], until: RegExp | "stat" | undefined): Block[] {
  if (!until) return blocks;
  const i = blocks.findIndex((b) => (until === "stat" ? b.kind === "stat" : b.kind === "heading" && until.test(b.text)));
  return i < 0 ? blocks : blocks.slice(0, i);
}

/** Renders sections of a book (all of them when no filter is given): previews and tests. */
export function renderSections(text: BookText, keep: (s: Section) => boolean = () => true): { section: Section; html: string }[] {
  const book = prepareBook(text);
  return book.sections.filter(keep).map((section) => ({ section, html: book.html(book.blocks(section)) }));
}
