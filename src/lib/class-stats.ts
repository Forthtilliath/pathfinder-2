/**
 * Turns the facts of a class ("Vigueur expert, Réflexes expert…",
 * "armes simples : qualifié ; …") into a structured block: key figures
 * and proficiency lists with a rank badge on each item.
 */
import type { Fact } from "./types";

export const RANKS = ["inexpérimenté", "qualifié", "expert", "maître", "légendaire"] as const;
export type Rank = (typeof RANKS)[number];

export interface StatItem {
  /** HTML (may hold a link). */
  html: string;
  rank?: Rank;
}

export interface ClassStats {
  keyFigures: { label: string; value: string; note?: string; rank?: Rank }[];
  lists: { label: string; items: StatItem[] }[];
}

const RANK_PATTERN = RANKS.join("|");
const TRAILING_RANK = new RegExp(`^(.*?)\\s*:?\\s*(${RANK_PATTERN})$`);
const LEADING_RANK = new RegExp(`^(${RANK_PATTERN}) en (.*)$`);
const capitalize = (s: string) => (/^[a-zà-ÿ]/.test(s) ? s[0].toUpperCase() + s.slice(1) : s);

export function parseItem(raw: string): StatItem {
  const value = raw.trim();
  const trailing = TRAILING_RANK.exec(value);
  if (trailing && trailing[1]) return { html: capitalize(trailing[1]), rank: trailing[2] as Rank };
  const leading = LEADING_RANK.exec(value);
  if (leading) return { html: capitalize(leading[2]), rank: leading[1] as Rank };
  return { html: capitalize(value) };
}

/** Splits a list value on ";" (or "," when there is no ";"), outside of HTML tags. */
function splitList(value: string): string[] {
  const separator = value.includes(" ; ") ? / ; / : /, (?![^<]*>)/;
  return value.split(separator).filter((s) => s.trim());
}

const KEY_FIGURES = new Set(["Caractéristique principale", "Points de vie", "Perception"]);

export function classStats(facts: Fact[]): ClassStats {
  const stats: ClassStats = { keyFigures: [], lists: [] };
  for (const f of facts) {
    const value = f.value.value;
    if (KEY_FIGURES.has(f.label)) {
      const hp = /^(\d+) \+ (.*)$/.exec(value);
      const rank = RANKS.find((r) => r === value);
      stats.keyFigures.push(hp ? { label: f.label, value: hp[1], note: `+ ${hp[2]}` } : rank ? { label: f.label, value: capitalize(rank), rank } : { label: f.label, value });
    } else {
      stats.lists.push({ label: f.label, items: splitList(value).map(parseItem) });
    }
  }
  return stats;
}
