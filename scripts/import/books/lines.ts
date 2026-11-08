/**
 * Fragments of a page → lines in reading order. The page furniture (running
 * heads, page numbers, the chapter tabs on the outer edge) is dropped, and the
 * two columns are read one after the other: pdf.js returns them in drawing
 * order, which is not always the reading order.
 */
import type { Fragment } from "./pdf-text.ts";

export interface Run {
  t: string;
  f: string;
  s: number;
  x: number;
  y: number;
  w: number;
}

export interface Line {
  page: number;
  x0: number;
  x1: number;
  y: number;
  /** Size and font of most of the text. */
  size: number;
  font: string;
  /** 0: left column (or full width), 1: right column. */
  col: 0 | 1;
  runs: Run[];
  /** Runs grouped by wide horizontal gaps: table cells, or a stat block name and its type. */
  cells: Run[][];
}

/** Page size of both books (points). */
export const PAGE_WIDTH = 601;
const TOP_FURNITURE = 736;
const BOTTOM_FURNITURE = 28;

const isBlank = (r: { t: string }) => !r.t.trim();

/** A word set letter-spaced to fill a justified line ("a c c e s s i b l e s"): its letters joined again. */
export const unspaced = (t: string) => (/^\s*(?:\p{L} ){2,}\p{L}\s*$/u.test(t) ? t.replace(/(?<=\p{L}) (?=\p{L})/gu, "") : t);

/** Running heads and page numbers (top and bottom margins), chapter tabs (outer edge, condensed bold). */
export function isFurniture(f: Fragment): boolean {
  if (f.y > TOP_FURNITURE || f.y < BOTTOM_FURNITURE) return true;
  return /CondBold/.test(f.f) && f.s >= 7.5 && f.s <= 9.5 && (f.x > 515 || f.x < 80);
}

function dominant(runs: Run[]): { size: number; font: string } {
  const weight = new Map<string, number>();
  for (const r of runs) if (!isBlank(r)) weight.set(`${r.s}|${r.f}`, (weight.get(`${r.s}|${r.f}`) ?? 0) + r.t.trim().length);
  const [key] = [...weight].sort((a, b) => b[1] - a[1])[0] ?? ["0|"];
  const [size, font] = key.split("|");
  return { size: Number(size), font };
}

/** Runs separated by a gap wider than a word space: cells. */
export function splitCells(runs: Run[], size: number): Run[][] {
  const cells: Run[][] = [];
  let current: Run[] = [];
  let end = -Infinity;
  for (const r of runs) {
    if (isBlank(r)) {
      if (current.length) current.push(r);
      continue;
    }
    if (current.length && r.x - end > Math.max(10, size * 1.2)) {
      cells.push(current);
      current = [];
    }
    current.push(r);
    end = r.x + r.w;
  }
  if (current.length) cells.push(current);
  return cells.map((c) => {
    while (c.length && isBlank(c[c.length - 1])) c.pop();
    return c;
  });
}

function makeLine(page: number, runs: Run[]): Line | null {
  const visible = runs.filter((r) => !isBlank(r));
  if (!visible.length) return null;
  const { size, font } = dominant(visible);
  const x0 = visible[0].x;
  const x1 = Math.max(...visible.map((r) => r.x + r.w));
  return { page, x0, x1, y: visible[0].y, size, font, col: x0 < PAGE_WIDTH / 2 - 25 ? 0 : 1, runs, cells: splitCells(runs, size) };
}

/** Lines of one page, furniture removed, left column then right column, top to bottom. */
export function pageLines(page: number, fragments: Fragment[]): Line[] {
  const lines: Line[] = [];
  let runs: Run[] = [];
  let y = NaN;
  let end = -Infinity;
  const flush = () => {
    const line = makeLine(page, runs);
    if (line) lines.push(line);
    runs = [];
  };
  // Text drawn twice at the same place (outlined labels, shadowed sidebars): read once.
  const drawn = new Set<string>();
  for (const f of fragments) {
    if (isFurniture(f)) continue;
    const key = `${f.t}|${f.x}|${f.y}|${f.s}|${f.f}`;
    if (drawn.has(key)) continue;
    drawn.add(key);
    const run: Run = { t: unspaced(f.t), f: f.f, s: f.s, x: f.x, y: f.y, w: f.w };
    const sameLine = runs.length > 0 && Math.abs(f.y - y) < 1.5 && f.x >= end - 3;
    // A jump over the gutter between two text columns starts a new line, not a new cell.
    const crossesGutter = sameLine && end < PAGE_WIDTH / 2 - 5 && f.x > PAGE_WIDTH / 2 + 5 && /Sabon/.test(f.f) && f.x - end > 20;
    if (!sameLine || crossesGutter) {
      if (isBlank(run) && !runs.length) continue;
      flush();
      y = f.y;
    }
    if (isBlank(run) && !runs.length) continue;
    runs.push(run);
    if (!isBlank(run)) end = f.x + f.w;
  }
  flush();
  // Frames: lines that follow each other in the PDF, each just below the previous one.
  // Inside a frame the drawing order is the reading order; frames are then read
  // column by column, top to bottom.
  const frames: Line[][] = [];
  for (const line of lines) {
    const frame = frames[frames.length - 1];
    const prev = frame?.[frame.length - 1];
    const below = prev && prev.y > line.y && prev.y - line.y < Math.max(prev.size, line.size) * 2.6;
    const overlaps = prev && line.x0 < prev.x1 && line.x1 > prev.x0;
    if (frame && below && overlaps) frame.push(line);
    else frames.push([line]);
  }
  const sorted = frames
    .map((frame, i) => ({ frame, i, top: Math.max(...frame.map((l) => l.y)), col: frame[0].col, x0: Math.min(...frame.map((l) => l.x0)) }))
    .sort((a, b) => a.col - b.col || b.top - a.top || a.x0 - b.x0 || a.i - b.i)
    .flatMap(({ frame }) => frame);
  // Pieces of one printed line drawn separately (table cells of a header): one line.
  const merged: Line[] = [];
  for (const line of sorted) {
    const prev = merged[merged.length - 1];
    if (prev && prev.col === line.col && Math.abs(prev.y - line.y) < 1.5 && line.x0 > prev.x1) {
      merged[merged.length - 1] = makeLine(page, [...prev.runs, ...line.runs])!;
    } else merged.push(line);
  }
  return merged;
}

/** Line text: runs joined, with a space where two runs are visibly apart. */
export function runsText(runs: Run[]): string {
  let out = "";
  let end = -Infinity;
  for (const r of runs) {
    if (out && !/\s$/.test(out) && !/^\s/.test(r.t) && r.x - end > r.s * 0.2) out += " ";
    out += r.t;
    if (!isBlank(r)) end = r.x + r.w;
  }
  return out.replace(/\s+/g, " ").trim();
}
