/**
 * Role of a line from its typography. Both Black Book Éditions books share
 * the Paizo layout: Taroca for section titles, Sabon for the body text,
 * GoodOT for sidebars, tables and stat blocks, Times bold italic for the
 * fiction that opens the chapters.
 */
import type { Line, Run } from "./lines.ts";

export type Role =
  | "title" // section title (the page name: dropped)
  | "h2"
  | "h3"
  | "h4"
  | "caption" // "TABLE 2–3 : …"
  | "traits" // trait tags of a stat block
  | "serif" // body text
  | "sans" // sidebars, tables, stat blocks
  | "fiction"
  | "drop"; // map labels, decorations

export const isBold = (r: Run) => /Bold|Black|Heavy/.test(r.f);
export const isItalic = (r: Run) => /Italic|Oblique/.test(r.f);
export const isBullet = (r: Run) => /Wingdings/.test(r.f);
export const isIcon = (r: Run) => /PF2Icons/.test(r.f);

export function roleOf(line: Line): Role {
  const { font, size } = line;
  if (size < 6) return "drop";
  if (/Taroca/.test(font)) return size >= 17 ? "title" : size >= 14.5 ? "h2" : "drop";
  if (/Times/.test(font) && /Italic/.test(font) && size >= 10.5) return "fiction";
  if (/Times/.test(font)) return size <= 9.5 ? "serif" : "drop";
  if (/Sabon/.test(font)) return size <= 9.5 ? "serif" : "drop";
  if (/CondBold/.test(font)) {
    if (size >= 9.8) return /^TABLE\b/i.test(line.runs.map((r) => r.t).join("").trim()) ? "caption" : "h4";
    if (size < 7.6) return "traits";
    return "sans";
  }
  if (/GoodOT-Bold/.test(font)) {
    if (size >= 12.5) return "h3";
    if (size >= 9.5) return "h4";
    const text = line.runs.map((r) => r.t).join("");
    if (size >= 8.7 && !/\p{Ll}/u.test(text)) return "h4";
    return "sans";
  }
  if (/GoodOT|Wingdings|PF2Icons/.test(font)) return size <= 9.5 ? "sans" : "drop";
  return "drop";
}

/** Stat block types printed at the right of a stat block name ("DON 4", "SORT 1"…). */
export const STAT_TYPE = /^(DON|SORT|TOUR DE MAGIE|FOCALISÉ|RITUEL|ACTION|OBJET|CONSOMMABLE|ARME|ARMURE|BOUCLIER|DANGER|CRÉATURE|PNJ|HISTORIQUE|ARCHÉTYPE|RELIQUE|ARTEFACT|VÉHICULE|DIVINITÉ|DOMAINE|PLAN)\b.*\d*$/i;
