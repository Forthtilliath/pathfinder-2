/**
 * Black Book Éditions books (see config.ts) → rules pages in French, the
 * presentation of some entries, page references turned into links, a
 * previous/next navigation and a table of contents per book.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import type { CollectionName, Provenance } from "../../../src/lib/types.ts";
import { ROOT } from "../config.ts";
import { extraDoc, simpleAdapter, type ExtraSource } from "../extra-sources.ts";
import { BOOKS, ruleFor, type BookSpec } from "./config.ts";
import { PERSONAL_DATA, readBookText, withoutFigures } from "./pdf-text.ts";
import { cutBlocks, prepareBook } from "./sections.ts";

export const PDF_DIR = path.join(ROOT, ".cache/pdf");
/** Official French text of the book. */
export const BBE: Provenance = { source: "bbe", sourceLanguage: "en", status: "current", method: "human" };

export interface BookDescription {
  collection: CollectionName;
  /** French name of the entry. */
  name: string;
  html: string;
}

export interface BookContent {
  pages: ExtraSource[];
  descriptions: BookDescription[];
  /** Publications read from a PDF: their Archives of Nethys rules pages are not needed. */
  publications: Set<string>;
}

interface Page {
  spec: BookSpec;
  id: string;
  title: string;
  chapter: string;
  html: string;
}

/** Section start pages of a book → page id (null: a section that is not a page). */
type Owners = { from: number; id: string | null }[];

const link = (spec: BookSpec, id: string, label: string) => `@UUID[Compendium.pf2e.${spec.pack}.JournalEntryPage.${id}]{${label}}`;
const shortChapter = (c: string) => c.replace(/^Chapitre \d+ : /, "");

/** "(p. 215)", "Livre du MJ, p. 236", "p. 146-155" → links to the page holding it. */
export function linkPageRefs(html: string, own: BookSpec, owners: Map<BookSpec, Owners>): string {
  return html.replace(
    /(?:(<em>)?(Livre des joueurs|Livre du MJ)(<\/em>)?,?\s+)?\b(p\.|pages?)\s?(\d{1,3})((?:\s?[-–]\s?\d{1,3})?)/gi,
    (all, em1 = "", book: string | undefined, em2 = "", word: string, page: string, range: string, offset: number, whole: string) => {
      // "Livre des monstres, p. 12", "Livre des joueurs 2 p. 40", "<em>Guide…</em>, p. 8": another book.
      if (!book && /(?:monstres|joueurs 2|<\/em>|\p{Lu}[\p{L}’']+)\s*,?\s*$/u.test(whole.slice(Math.max(0, offset - 40), offset))) return all;
      const spec = book ? BOOKS.find((b) => b.french.toLowerCase() === book.toLowerCase()) : own;
      const list = spec ? owners.get(spec) : undefined;
      if (!spec || !list) return all;
      const pdfPage = Number(page) + spec.pageOffset;
      const owner = [...list].reverse().find((o) => o.from <= pdfPage);
      if (!owner?.id) return all;
      const prefix = book ? `${em1}${book}${em2}, ` : "";
      // Non-breaking space: "p." never ends a line apart from its number.
      return `${prefix}${link(spec, owner.id, `${word}\u00a0${page}${range}`)}`;
    },
  );
}

export async function readBooks(warn: (message: string) => void): Promise<BookContent> {
  const out: BookContent = { pages: [], descriptions: [], publications: new Set() };
  const pages: Page[] = [];
  const owners = new Map<BookSpec, Owners>();

  for (const spec of BOOKS) {
    const file = path.join(PDF_DIR, spec.file);
    if (!existsSync(file)) {
      warn(`book PDF not found, its pages are skipped: ${spec.file}`);
      continue;
    }
    const book = prepareBook(withoutFigures(await readBookText(file), spec.figures));
    out.publications.add(spec.publication);
    const list: Owners = [];
    let n = 0;
    for (const section of book.sections) {
      const rule = ruleFor(spec, section.title);
      const entry = { from: section.from, id: null as string | null };
      list.push(entry);
      if (rule.action === "skip") continue;
      const html = book.html(cutBlocks(book.blocks(section), rule.until));
      // Chapter title pages and dividers.
      if (html.replace(/<[^>]*>/g, "").trim().length < 200) continue;
      // A chapter's own pages named like one of its sections ("Compétences"): told apart.
      const isChapter = section.title === section.chapter;
      const short = shortChapter(section.title);
      const title = isChapter && book.sections.some((s) => s !== section && shortChapter(s.title) === short) ? `${short} : présentation du chapitre` : short;
      if (rule.action === "describe") {
        out.descriptions.push({ collection: rule.collection, name: title, html });
        continue;
      }
      entry.id = `${spec.pack}-${String(++n).padStart(3, "0")}`;
      pages.push({ spec, id: entry.id, title, chapter: section.chapter, html });
    }
    owners.set(spec, list);
  }

  for (const spec of BOOKS) {
    const own = pages.filter((p) => p.spec === spec);
    if (!own.length) continue;
    const contentsId = `${spec.pack}-000`;
    const contentsTitle = `${spec.french} : sommaire`;
    own.forEach((p, i) => {
      const prev = own[i - 1];
      const next = own[i + 1];
      const nav = [
        prev ? `← ${link(spec, prev.id, prev.title)}` : "",
        link(spec, contentsId, "Sommaire"),
        next ? `${link(spec, next.id, next.title)} →` : "",
      ].filter(Boolean);
      const html = `${linkPageRefs(p.html, spec, owners)}\n<p class="book-nav">${nav.join(" · ")}</p>`;
      out.pages.push(page(spec, p.id, p.title, html, p.chapter));
    });
    // Table of contents: chapters in book order, each with its pages.
    const chapters = [...new Set(own.map((p) => p.chapter))];
    const contents = chapters
      .map((c) => `<h2>${c}</h2>\n<ul>${own.filter((p) => p.chapter === c).map((p) => `<li>${link(spec, p.id, p.title)}</li>`).join("")}</ul>`)
      .join("\n");
    out.pages.push(page(spec, contentsId, contentsTitle, `<p>Les pages du <em>${spec.french}</em> dans l'ordre du livre.</p>\n${contents}`, "Sommaire"));
  }

  // Last guard: no purchase watermark may reach the site.
  for (const p of out.pages) if (PERSONAL_DATA.test(p.doc.system.description.value)) throw new Error(`personal data found in book page "${p.doc.name}"`);
  for (const d of out.descriptions) if (PERSONAL_DATA.test(d.html)) throw new Error(`personal data found in the description of "${d.name}"`);
  return out;
}

function page(spec: BookSpec, id: string, title: string, html: string, chapter: string): ExtraSource {
  return {
    collection: "rules",
    pack: spec.pack,
    folder: "",
    doc: extraDoc(id, title, html, spec.publication),
    adapter: simpleAdapter(shortChapter(chapter) || spec.french, { chapter: [chapter] }),
    french: { name: title, description: html, provenance: BBE },
    idSuffix: spec.idSuffix,
  };
}
