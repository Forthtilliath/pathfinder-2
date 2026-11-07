import { slugify } from "./normalize.ts";

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

const stripTags = (s: string) => s.replace(/<[^>]*>/g, "").trim();

/**
 * Injects an anchor id into every h2/h3 of a sanitized HTML block and returns
 * the list of headings as a table of contents.
 *
 * Heading ids are deduplicated: two "Dons de niveau" headings become
 * "dons-de-niveau" and "dons-de-niveau-2". Existing attributes are kept, and
 * a heading that already carries an id is left untouched. Pass the same
 * `used` map to every block of a page to keep ids unique across blocks.
 */
export function addHeadingIds(html: string, used = new Map<string, number>()): { html: string; headings: TocHeading[] } {
  if (!html) return { html, headings: [] };
  const headings: TocHeading[] = [];
  const out = html.replace(/<h(2|3)(\s[^>]*)?>([\s\S]*?)<\/h\1>/g, (match, level: string, attrs: string, inner: string) => {
    const existing = attrs?.match(/\bid=["']([^"']+)["']/);
    if (existing) return match;
    const text = stripTags(inner);
    if (!text) return match;
    const base = slugify(text) || "section";
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const id = n > 1 ? `${base}-${n}` : base;
    headings.push({ id, text, level: Number(level) as 2 | 3 });
    return `<h${level}${attrs ?? ""} id="${id}">${inner}</h${level}>`;
  });
  return { html: out, headings };
}