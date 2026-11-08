/**
 * Blocks → HTML of a site page. Headings printed in capitals get back their
 * normal case: the case of each word is the one it has inside the book's
 * sentences ("GOLARION ET LA MER INTÉRIEURE" → "Golarion et la mer Intérieure").
 */
import { plainOf, segmentsOf, type Block, type Segment } from "./blocks.ts";
import type { Run } from "./lines.ts";
import { tableModel } from "./tables.ts";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Non-breaking hyphens of the French layout become plain hyphens. */
const clean = (s: string) => s.replace(/‑/g, "-").replace(/­/g, "");

/** Word → usual written form ("golarion" → "Golarion", "mj" → "MJ"), from the running text. */
export function caseDictionary(texts: string[]): Map<string, string> {
  const counts = new Map<string, Map<string, number>>();
  for (const text of texts) {
    for (const m of text.matchAll(/(^|[^\p{L}])(\p{L}+)/gu)) {
      const word = m[2];
      const before = text.slice(0, m.index + m[1].length).trimEnd();
      // A capital after a full stop says nothing about the word.
      if (!before || /[.!?:«—–]$/.test(before)) continue;
      const key = word.toLowerCase();
      const forms = counts.get(key) ?? new Map<string, number>();
      forms.set(word, (forms.get(word) ?? 0) + 1);
      counts.set(key, forms);
    }
  }
  const out = new Map<string, string>();
  for (const [key, forms] of counts) {
    const [best] = [...forms].sort((a, b) => b[1] - a[1])[0];
    if (best !== key) out.set(key, best);
  }
  return out;
}

export function normalCase(text: string, dict: Map<string, string>): string {
  if (/\p{Ll}/u.test(text)) return text;
  let first = true;
  return text.replace(/\p{L}+/gu, (word) => {
    const key = word.toLowerCase();
    const known = dict.get(key);
    let out = known ?? key;
    if (first) out = out.charAt(0).toUpperCase() + out.slice(1);
    first = false;
    return out;
  });
}

/** Action icons of the BBE icon font (1, 2, 3; 9 reaction; 0 free action) → glyph codes read by markActionGlyphs. */
const ICONS: Record<string, string> = { "1": "1", "2": "2", "3": "3", "9": "r", "0": "f" };

export function inline(segs: Segment[]): string {
  let html = "";
  let b = false;
  let i = false;
  const close = () => {
    if (i) html += "</em>";
    if (b) html += "</strong>";
    b = i = false;
  };
  for (const s of segs) {
    if (s.icon) {
      close();
      const glyph = ICONS[s.t.trim()];
      html += glyph ? `${/^\s/.test(s.t) ? " " : ""}<span class="action-glyph">${glyph}</span>` : "";
      continue;
    }
    const text = escape(clean(s.t));
    if (!text.trim()) {
      html += text;
      continue;
    }
    if (!!s.b !== b || !!s.i !== i) {
      close();
      // Spaces stay outside the tags.
      const lead = /^\s+/.exec(text)?.[0] ?? "";
      html += lead;
      if (s.b) html += "<strong>";
      if (s.i) html += "<em>";
      b = !!s.b;
      i = !!s.i;
      html += text.slice(lead.length);
      continue;
    }
    html += text;
  }
  close();
  // Line breaks become spaces; French non-breaking spaces (before « : ; ? ! ») are kept.
  return html
    .replace(/[ \t\r\n]+/g, " ")
    .replace(/ (<\/(?:strong|em)>)/g, "$1 ")
    .replace(/ {2,}/g, " ")
    .trim();
}

const cellHtml = (runs: Run[]) => inline(segmentsOf(runs, true));

function tableHtml(block: Extract<Block, { kind: "table" }>, dict: Map<string, string>): string {
  const { header, body } = tableModel(block.rows);
  const caption = block.caption ? `<caption>${escape(normalCase(clean(block.caption), dict))}</caption>` : "";
  const head = header.map((row) => `<tr>${row.map((c) => `<th scope="col">${cellHtml(c)}</th>`).join("")}</tr>`).join("");
  const rows = body.map((row) => `<tr>${row.map((c) => `<td>${cellHtml(c)}</td>`).join("")}</tr>`).join("");
  return `<table>${caption}${head ? `<thead>${head}</thead>` : ""}<tbody>${rows}</tbody></table>`;
}

export function blocksHtml(blocks: Block[], dict: Map<string, string>): string {
  const out: string[] = [];
  let list: string[] = [];
  let listStyle = "";
  let fiction: string[] = [];
  const flush = () => {
    // A list in a sidebar stays in its box.
    if (list.length) out.push(listStyle === "sans" ? `<ul class="book-aside">${list.join("")}</ul>` : `<ul>${list.join("")}</ul>`);
    if (fiction.length) out.push(`<blockquote class="book-fiction">${fiction.join("")}</blockquote>`);
    list = [];
    fiction = [];
  };
  for (const block of blocks) {
    if (block.kind === "li") {
      if (fiction.length || (list.length && listStyle !== block.style)) flush();
      listStyle = block.style;
      list.push(`<li>${inline(block.segs)}</li>`);
      continue;
    }
    if (block.kind === "p" && block.style === "fiction") {
      if (list.length) flush();
      fiction.push(`<p>${inline(block.segs)}</p>`);
      continue;
    }
    flush();
    if (block.kind === "heading") out.push(`<h${block.level}>${escape(normalCase(clean(block.text), dict))}</h${block.level}>`);
    else if (block.kind === "p") {
      if (plainOf(block.segs).trim()) out.push(block.style === "sans" ? `<p class="book-aside">${inline(block.segs)}</p>` : `<p>${inline(block.segs)}</p>`);
    } else if (block.kind === "table") out.push(tableHtml(block, dict));
    else if (block.kind === "stat") out.push(`<h4 class="book-stat-name">${escape(normalCase(clean(block.name), dict))} <span class="book-stat-type">${escape(normalCase(clean(block.type), dict))}</span></h4>`);
    else if (block.kind === "traits") out.push(`<p class="book-stat-traits">${block.items.map((t) => `<span class="book-trait">${escape(normalCase(clean(t), dict))}</span>`).join(" ")}</p>`);
  }
  flush();
  return out.join("\n");
}
