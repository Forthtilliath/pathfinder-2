/**
 * Lines of a section → blocks (headings, paragraphs, list items, tables,
 * stat block headers). A paragraph goes on across columns, pages and the
 * sidebars inserted in its column: in the books a new paragraph is indented,
 * a continued one is not.
 */
import { runsText, type Line, type Run } from "./lines.ts";
import { isBold, isBullet, isIcon, isItalic, roleOf, STAT_TYPE } from "./roles.ts";

export interface Segment {
  t: string;
  b?: boolean;
  i?: boolean;
  /** Action icon character (PF2 icon font). */
  icon?: boolean;
}

export type Style = "serif" | "sans" | "fiction";
export type Para = {
  kind: "p" | "li";
  style: Style;
  segs: Segment[];
  last: Line;
  textX: number;
  lines: number;
  /** Starts with a bold run (a label). */
  boldStart: boolean;
  /** Set with a hanging indent: the label at the margin, its next lines set in. */
  hanging: boolean;
};
export type Table = { kind: "table"; caption?: string; rows: Line[] };

export type Block =
  | { kind: "heading"; level: 2 | 3 | 4; text: string; last: Line }
  | Para
  | Table
  | { kind: "stat"; name: string; type: string }
  | { kind: "traits"; items: string[] };

/** Hyphenated words written on one line somewhere in the book: a line-end hyphen inside one of them is kept. */
export function compoundWords(lines: Line[]): Set<string> {
  const out = new Set<string>();
  for (const line of lines) for (const m of runsText(line.runs).matchAll(/(\p{L}+)[‑-](\p{L}+)/gu)) out.add(`${m[1]}-${m[2]}`.toLowerCase());
  return out;
}

export function segmentsOf(runs: Run[], plain = false): Segment[] {
  const segs: Segment[] = [];
  let end = -Infinity;
  for (const r of runs) {
    if (isBullet(r)) continue;
    const gap = segs.length && !/^\s/.test(r.t) && r.x - end > r.s * 0.2 ? " " : "";
    if (isIcon(r)) segs.push({ t: gap + r.t, icon: true });
    else segs.push({ t: gap + r.t, b: !plain && isBold(r), i: !plain && isItalic(r) });
    if (r.t.trim()) end = r.x + r.w;
  }
  return segs;
}

export const plainOf = (segs: Segment[]) => segs.map((s) => s.t).join("");

/** Appends a line to a paragraph: line-end hyphens are joined back. */
function append(block: { segs: Segment[] }, next: Segment[], compounds: Set<string>) {
  const last = block.segs[block.segs.length - 1];
  const before = plainOf(block.segs).trimEnd();
  const after = plainOf(next).trimStart();
  const hyphen = /(\p{L}+)\s?[‑-]$/u.exec(before);
  if (last && hyphen && /^\p{L}/u.test(after)) {
    const word = `${hyphen[1]}-${/^\p{L}+/u.exec(after)![0]}`.toLowerCase();
    last.t = last.t.trimEnd().replace(/\s?[‑-]$/, compounds.has(word) ? "-" : "");
    if (block.segs.length > 1 && /^\s*-$/.test(last.t)) last.t = "-";
    // The hyphen may be a run of its own: drop the empty run.
    if (!last.t) block.segs.pop();
    next[0] = { ...next[0], t: next[0].t.trimStart() };
  } else if (last) {
    last.t = last.t.trimEnd();
    next[0] = { ...next[0], t: ` ${next[0].t.trimStart()}` };
  }
  block.segs.push(...next);
}

const TERMINAL = /[.!?:;»…)]\s*$/;
/** A bullet typed as text at the start of a line. */
const TEXT_BULLET = /^\s*[•▪●]\s*/;
const visibleRuns = (l: Line) => l.runs.filter((r) => r.t.trim());
/** A short bold line of the sans-serif font: maybe a table header printed above the columns. */
const maybeHeader = (l: Line) => l.cells.length === 1 && visibleRuns(l).every(isBold) && runsText(l.runs).length <= 40 && !/[.:]$/.test(runsText(l.runs));

export function buildBlocks(lines: Line[], compounds: Set<string>): Block[] {
  const blocks: Block[] = [];
  const open = new Map<Style, Para>();
  let table: Table | null = null;
  let caption: string | undefined;
  let pending: Line[] = [];

  // Left edge of each text style per page and column (the most frequent one): an indent marks a new paragraph.
  const edges = new Map<string, Map<number, number>>();
  const leftKey = (l: Line, style: string) => `${l.page}|${l.col}|${style}`;
  for (const l of lines) {
    const role = roleOf(l);
    if ((role === "serif" || role === "sans" || role === "fiction") && !l.runs.some(isBullet)) {
      const k = leftKey(l, role);
      const counts = edges.get(k) ?? new Map<number, number>();
      counts.set(Math.round(l.x0), (counts.get(Math.round(l.x0)) ?? 0) + 1);
      edges.set(k, counts);
    }
  }
  const left = new Map([...edges].map(([k, counts]) => [k, [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]]));
  // Right edge (justified lines reach it): a line that stops well before it ends a paragraph.
  const rights = new Map<string, number[]>();
  for (const l of lines) {
    const role = roleOf(l);
    if (role === "serif" || role === "sans" || role === "fiction") rights.set(leftKey(l, role), [...(rights.get(leftKey(l, role)) ?? []), l.x1]);
  }
  const right = new Map([...rights].map(([k, xs]) => [k, xs.sort((a, b) => a - b)[Math.floor(xs.length * 0.8)]]));

  const paragraphLine = (line: Line, style: Style) => {
    const segs = segmentsOf(line.runs, style === "fiction");
    if (!segs.length) return;
    // Bullets: a dingbat of their own, or a "•" typed at the start of the line (sidebars).
    const textBullet = TEXT_BULLET.test(segs[0].t);
    if (textBullet) segs[0] = { ...segs[0], t: segs[0].t.replace(TEXT_BULLET, "") };
    const bullet = textBullet || isBullet(line.runs.find((r) => r.t.trim())!);
    const para = open.get(style);
    const colLeft = left.get(leftKey(line, style)) ?? line.x0;
    let continues = false;
    let hanging = false;
    if (para && !bullet) {
      const prev = para.last;
      const sameColumn = prev.page === line.page && prev.col === line.col;
      if (para.kind === "li") {
        // An item goes on under its text (or flush, for a typed bullet), until a short line ends a sentence.
        const short = sameColumn && prev.x1 < (right.get(leftKey(prev, style)) ?? Infinity) - 25;
        const gapOk = !sameColumn || (prev.y > line.y && prev.y - line.y < line.size * 2);
        const finished = TERMINAL.test(plainOf(para.segs));
        continues = gapOk && (sameColumn ? line.x0 >= para.textX - 2 && !(short && finished) : !finished);
      } else {
        // A first-line indent (about one em) after a finished sentence; text flowing around a picture is not one.
        const offset = line.x0 - colLeft;
        const indented = offset >= 5 && offset <= 11 && TERMINAL.test(plainOf(para.segs));
        const gapOk = !sameColumn || (prev.y > line.y && prev.y - line.y < line.size * 2);
        // A short line (not justified to the right edge) followed by a capital or a bold label: a new paragraph,
        // as each property of a stat block ("Succès critique.", "Discrétion.").
        const first = line.runs.find((r) => r.t.trim());
        const short = sameColumn && prev.x1 < (right.get(leftKey(prev, style)) ?? Infinity) - 25 && !/[‑-]$/.test(plainOf(para.segs).trimEnd());
        const startsAnew = /^[\p{Lu}\d«]/u.test(first?.t.trim() ?? "") || (first ? isBold(first) : false);
        // A bold label at the start of a line ("Échec.", "Déclencheur.") always starts a property.
        const label = first && isBold(first) && /^\p{Lu}[^.]{0,30}\.$/u.test(first.t.trim());
        // Hanging indent (a bold label at the margin, the rest set in): a line back at the margin starts a new
        // property when it begins in bold ("Habitants natifs", "Kyra (Jessica) :"), else the text that follows.
        // In another column or page, only a bold start tells a new property.
        const atMargin = sameColumn ? Math.abs(line.x0 - para.textX) <= 2 : !!first && isBold(first);
        if (para.hanging && atMargin) {
          hanging = first ? isBold(first) : false;
          continues = false;
        } else continues = !indented && gapOk && !(short && startsAnew) && !label;
        if (continues && para.lines === 1 && para.boldStart && sameColumn && line.x0 > para.textX + 4 && line.x0 < para.textX + 80) para.hanging = true;
      }
    }
    if (continues && para) {
      append(para, segs, compounds);
      para.last = line;
      para.lines++;
      return;
    }
    const textX = bullet && !textBullet ? (line.runs.find((r) => r.t.trim() && !isBullet(r))?.x ?? line.x0) : line.x0;
    const firstRun = line.runs.find((r) => r.t.trim() && !isBullet(r));
    const block: Para = {
      kind: bullet ? "li" : "p",
      style,
      segs: [{ ...segs[0], t: segs[0].t.trimStart() }, ...segs.slice(1)],
      last: line,
      textX,
      lines: 1,
      boldStart: firstRun ? isBold(firstRun) : false,
      hanging,
    };
    blocks.push(block);
    open.set(style, block);
  };

  const flushPending = () => {
    const lines = pending;
    pending = [];
    for (const l of lines) paragraphLine(l, "sans");
  };

  const textLine = (line: Line, style: Style) => {
    if (style === "sans" && line.cells.length >= 2) {
      // Tables: several cells on a line of the sans-serif font.
      const last = table?.rows[table.rows.length - 1];
      if (table && last && last.page === line.page && last.y > line.y && last.y - line.y < line.size * 3.5) table.rows.push(...pending, line);
      else {
        const header = pending.filter((p) => p.page === line.page && p.y - line.y < line.size * 3.5);
        flushPendingExcept(header);
        table = { kind: "table", caption, rows: [...header, line] };
        caption = undefined;
        blocks.push(table);
      }
      pending = [];
      open.delete("sans");
      return;
    }
    if (style === "sans" && table) {
      // A wrapped cell: under the table, inside it, not at its left edge.
      const last = table.rows[table.rows.length - 1];
      const tableLeft = Math.min(...table.rows.map((r) => r.x0));
      if (last.page === line.page && last.y > line.y && last.y - line.y < line.size * 2 && line.x0 > tableLeft + 5) {
        table.rows.push(line);
        return;
      }
      table = null;
    }
    if (style === "sans" && maybeHeader(line)) {
      pending.push(line);
      return;
    }
    flushPending();
    paragraphLine(line, style);
  };
  const flushPendingExcept = (keep: Line[]) => {
    const rest = pending.filter((p) => !keep.includes(p));
    pending = [];
    for (const l of rest) paragraphLine(l, "sans");
  };

  for (const line of lines) {
    const role = roleOf(line);
    if (role === "drop") continue;
    if (role === "serif" || role === "sans" || role === "fiction") {
      textLine(line, role);
      continue;
    }
    flushPending();
    if (role === "title") {
      open.clear();
      table = null;
      continue;
    }
    const text = runsText(line.runs);
    if (role === "caption") {
      caption = text;
      open.delete("sans");
      table = null;
      continue;
    }
    if (role === "traits") {
      // Each trait is a box of its own: runs a little apart.
      const items: Run[][] = [];
      let end = -Infinity;
      for (const r of line.runs.filter((x) => x.t.trim())) {
        if (!items.length || r.x - end > 1.5) items.push([r]);
        else items[items.length - 1].push(r);
        end = r.x + r.w;
      }
      blocks.push({ kind: "traits", items: items.map((c) => runsText(c)).filter(Boolean) });
      open.delete("sans");
      continue;
    }
    const level = role === "h2" ? 2 : role === "h3" ? 3 : 4;
    // A stat block name with its type at the right ("Elfe ancien … DON 1").
    if (line.cells.length >= 2 && STAT_TYPE.test(runsText(line.cells[line.cells.length - 1]))) {
      blocks.push({ kind: "stat", name: runsText(line.cells.slice(0, -1).flat()), type: runsText(line.cells[line.cells.length - 1]) });
      open.delete("sans");
      table = null;
      continue;
    }
    // A heading printed on two lines.
    const prev = blocks[blocks.length - 1];
    if (prev?.kind === "heading" && prev.level === level && prev.last.page === line.page && prev.last.col === line.col && prev.last.y - line.y < line.size * 1.8) {
      prev.text = `${prev.text} ${text}`;
      prev.last = line;
      continue;
    }
    blocks.push({ kind: "heading", level, text, last: line });
    open.delete("sans");
    table = null;
    if (level < 4) open.clear();
  }
  flushPending();
  return blocks;
}
