/**
 * Action cost glyphs inside imported texts. Foundry and pathfinder-fr write
 * them as <span class="action-glyph">2</span> or <span class="pf2-icon">R</span>,
 * drawn by a custom font the site does not have: a bare "R" or "1" is cryptic.
 *
 * Each glyph becomes a marker span carrying its cost in its class, with plain
 * symbols as text (kept by plainText, e.g. in link previews). The sanitizer
 * does not allow SVG: the site turns the markers into its own glyphs when it
 * loads the data (renderActionGlyphs in src/lib/action-glyph.ts).
 */
import { ACTION_LABELS } from "../../src/lib/action-glyph.ts";
import type { ActionCost } from "../../src/lib/types.ts";

/** Font codes (letters of the Pathfinder font, digits of Foundry's) → cost. */
const CODES: Record<string, ActionCost> = {
  "1": "1",
  a: "1",
  "2": "2",
  d: "2",
  "3": "3",
  t: "3",
  r: "reaction",
  f: "free",
  "0": "free",
  "1-3": "1-3",
};

const SYMBOLS: Record<ActionCost, string> = {
  "1": "◆",
  "2": "◆◆",
  "3": "◆◆◆",
  "1-2": "◆ ou ◆◆",
  "1-3": "◆ à ◆◆◆",
  "2-3": "◆◆ ou ◆◆◆",
  reaction: "⟲",
  free: "◇",
};

/** Any span whose class list holds action-glyph or pf2-icon, quotes and other attributes included. */
const SOURCE_GLYPH = /<span\b[^>]*?\bclass=(["'])(?:(?!\1)[^>])*?\b(?:action-glyph|pf2-icon)\b(?:(?!\1)[^>])*\1[^>]*>([^<]*)<\/span>/g;

const costOf = (code: string): ActionCost | undefined => CODES[code.toLowerCase().replace(/\s+/g, "").replace(/[–—]/g, "-")];

/** Font glyphs → marker spans. Unknown codes are left untouched. */
export function markActionGlyphs(html: string): string {
  return html.replace(SOURCE_GLYPH, (match, _quote: string, code: string) => {
    const cost = costOf(code);
    if (!cost) return match;
    const label = ACTION_LABELS[cost];
    return `<span class="cost-glyph-text cost-${cost}" title="${label}" aria-label="${label}">${SYMBOLS[cost]}</span>`;
  });
}
