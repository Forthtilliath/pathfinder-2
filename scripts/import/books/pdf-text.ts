/**
 * Text fragments of a book PDF (pdf.js), page by page, with their font and
 * position, plus the bookmarks. Purchase watermarks (buyer's name, e-mail and
 * order number printed in tiny type at the foot of the pages) are dropped here,
 * before anything else sees the text: they must never reach the site.
 * The result is cached in .cache/books/ (the PDF is parsed once).
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CACHE_DIR } from "../config.ts";
import type { Figure } from "./config.ts";

export interface Fragment {
  /** Text. */
  t: string;
  x: number;
  y: number;
  /** Width. */
  w: number;
  /** Font size. */
  s: number;
  /** Font name, without the subset prefix ("GoodOT-Bold"). */
  f: string;
}

export interface Bookmark {
  title: string;
  /** PDF page (1-based). */
  page: number;
  depth: number;
}

export interface BookText {
  pages: Fragment[][];
  bookmarks: Bookmark[];
  /** Fragments dropped as purchase watermarks. */
  watermarks: number;
}

/** E-mail addresses and BBE order numbers ("202410/3535351/4100401"). */
export const PERSONAL_DATA = /[\w.+-]+@[\w-]+\.[a-z]{2,}|\b\d{6}\/\d{6,8}\/\d{6,8}\b/i;

/** The watermark line: tiny Helvetica at the very bottom of the page, or anything carrying personal data. */
export const isWatermark = (f: Fragment) => (f.s < 4 && f.y < 15) || PERSONAL_DATA.test(f.t);

/** The text of a book without the labels of its maps and diagrams. */
export function withoutFigures(text: BookText, figures: Figure[]): BookText {
  const isLabel = (n: number, f: Fragment) =>
    figures.some((fig) => fig.page === n && (!fig.font || (fig.font.test(f.f) && (!fig.sizes || fig.sizes.includes(f.s)))));
  return { ...text, pages: text.pages.map((page, i) => page.filter((f) => !isLabel(i + 1, f))) };
}

const BOOKS_CACHE =path.join(path.dirname(CACHE_DIR), "books");
const round = (n: number) => Math.round(n * 10) / 10;

async function parse(file: string): Promise<BookText> {
  // Loaded lazily: only an import with the PDFs present needs pdf.js.
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({
    data: new Uint8Array(readFileSync(file)),
    disableFontFace: true,
    isEvalSupported: false,
    verbosity: 0,
  }).promise;
  const pages: Fragment[][] = [];
  let watermarks = 0;
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    // Real font names are known once the page operators are loaded.
    await page.getOperatorList();
    const content = await page.getTextContent();
    const out: Fragment[] = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue;
      let font = item.fontName;
      try {
        font = (page.commonObjs.get(item.fontName) as { name?: string } | undefined)?.name ?? font;
      } catch {
        // Font not resolved: keep pdf.js's internal name.
      }
      const fragment: Fragment = {
        t: item.str,
        x: round(item.transform[4]),
        y: round(item.transform[5]),
        w: round(item.width),
        s: round(Math.hypot(item.transform[0], item.transform[1])),
        f: font.replace(/^[A-Z]{6}\+/, ""),
      };
      if (isWatermark(fragment)) watermarks++;
      else out.push(fragment);
    }
    pages.push(out);
    page.cleanup();
  }

  const bookmarks: Bookmark[] = [];
  const walk = async (items: Awaited<ReturnType<typeof doc.getOutline>>, depth: number) => {
    for (const item of items ?? []) {
      const dest = typeof item.dest === "string" ? await doc.getDestination(item.dest) : item.dest;
      if (dest) bookmarks.push({ title: item.title.replace(/\s+/g, " ").trim(), page: (await doc.getPageIndex(dest[0])) + 1, depth });
      await walk(item.items, depth + 1);
    }
  };
  await walk(await doc.getOutline(), 0);
  await doc.destroy();
  return { pages, bookmarks, watermarks };
}

/** Reads a book PDF, from the cache when the PDF did not change. */
export async function readBookText(file: string): Promise<BookText> {
  const stat = statSync(file);
  const key = `${path.basename(file, ".pdf")}-${stat.size}-${Math.round(stat.mtimeMs)}`;
  const cacheFile = path.join(BOOKS_CACHE, `${path.basename(file, ".pdf")}.json`);
  if (existsSync(cacheFile)) {
    const cached = JSON.parse(readFileSync(cacheFile, "utf8")) as BookText & { key: string };
    if (cached.key === key) return cached;
  }
  const text = await parse(file);
  mkdirSync(BOOKS_CACHE, { recursive: true });
  writeFileSync(cacheFile, JSON.stringify({ key, ...text }));
  return text;
}
