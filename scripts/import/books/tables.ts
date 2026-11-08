/**
 * Table lines → HTML table. Columns come from the body rows with the most
 * cells; every cell goes to the column it overlaps most. Header rows (bold)
 * printed on several lines are merged, and so are wrapped cells.
 */
import type { Line, Run } from "./lines.ts";
import { isBold } from "./roles.ts";

export interface TableCell {
  x0: number;
  x1: number;
  runs: Run[];
}

const visible = (runs: Run[]) => runs.filter((r) => r.t.trim());
const cellsOf = (line: Line): TableCell[] =>
  line.cells
    .map((runs) => visible(runs))
    .filter((runs) => runs.length)
    .map((runs) => ({ x0: runs[0].x, x1: Math.max(...runs.map((r) => r.x + r.w)), runs }));
const isHeader = (line: Line) => visible(line.runs).every(isBold);

/** Adds a line's runs to a cell, a space apart from what the cell holds already. */
function addTo(cell: Run[], runs: Run[]) {
  if (!runs.length) return;
  if (cell.length) cell.push({ ...runs[0], t: " ", w: 0 });
  cell.push(...runs.map((r, i) => (i === 0 && cell.length ? { ...r, x: -Infinity } : r)));
}

function columnsOf(rows: TableCell[][]): { x0: number; x1: number }[] {
  const width = Math.max(...rows.map((r) => r.length));
  const reference = rows.filter((r) => r.length === width);
  return Array.from({ length: width }, (_, i) => ({
    x0: Math.min(...reference.map((r) => r[i].x0)),
    x1: Math.max(...reference.map((r) => r[i].x1)),
  }));
}

function columnOf(cell: TableCell, columns: { x0: number; x1: number }[]): number {
  let best = 0;
  let score = -Infinity;
  columns.forEach((c, i) => {
    const overlap = Math.min(c.x1, cell.x1) - Math.max(c.x0, cell.x0);
    const distance = Math.abs((c.x0 + c.x1) / 2 - (cell.x0 + cell.x1) / 2);
    const s = overlap > 0 ? overlap : -distance;
    if (s > score) {
      score = s;
      best = i;
    }
  });
  return best;
}

export interface TableModel {
  header: Run[][][];
  body: Run[][][];
}

/** Rows of cells (each cell: runs of its lines). */
export function tableModel(lines: Line[]): TableModel {
  const bodyCells = lines.filter((l) => !isHeader(l)).map(cellsOf);
  const columns = columnsOf(bodyCells.length ? bodyCells : lines.map(cellsOf));
  const header: Run[][][] = [];
  const body: Run[][][] = [];
  let headerRow: Run[][] | null = null;
  for (const line of lines) {
    const target = isHeader(line) && body.length === 0 ? "header" : "body";
    const row: Run[][] = columns.map(() => []);
    const cells = cellsOf(line);
    let first = Infinity;
    for (const cell of cells) {
      const c = columnOf(cell, columns);
      first = Math.min(first, c);
      row[c].push(...cell.runs);
    }
    if (target === "header") {
      // Every header line goes into one header row.
      if (!headerRow) {
        headerRow = row;
        header.push(headerRow);
      } else row.forEach((runs, i) => addTo(headerRow![i], runs));
      continue;
    }
    // A line that does not start in the first column continues the previous row (wrapped cell).
    const prev = body[body.length - 1];
    if (prev && first > 0) row.forEach((runs, i) => addTo(prev[i], runs));
    else body.push(row);
  }
  return { header, body };
}
