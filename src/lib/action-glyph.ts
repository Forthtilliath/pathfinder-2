/**
 * Action cost glyphs as plain SVG markup, shared by the Astro pages and the
 * list island: building a string is much cheaper at build time than running
 * a UI framework renderer for each of the thousands of glyphs on a page.
 */
import type { ActionCost } from "./types";

export const ACTION_LABELS: Record<ActionCost, string> = {
  "1": "1 action",
  "2": "2 actions",
  "3": "3 actions",
  "1-3": "1 à 3 actions",
  "1-2": "1 ou 2 actions",
  "2-3": "2 ou 3 actions",
  reaction: "réaction",
  free: "action gratuite",
};

function diamonds(count: number, hollow = false): string {
  const width = 10 + (count - 1) * 7;
  const paint = hollow ? 'fill="none" stroke="currentColor" stroke-width="1.2"' : 'fill="currentColor"';
  let paths = "";
  for (let i = 0; i < count; i++) {
    const x = i * 7;
    paths += `<path d="M${5 + x} 1 L${9.5 + x} 6 L${5 + x} 11 L${0.5 + x} 6 Z" ${paint}/>`;
  }
  return `<svg viewBox="0 0 ${width} 12" width="${Math.round((width / 12) * 1000) / 1000}em" height="1em" aria-hidden="true" class="cost-glyph-svg">${paths}</svg>`;
}

const REACTION =
  '<svg viewBox="0 0 12 12" width="1em" height="1em" aria-hidden="true" class="cost-glyph-svg">' +
  '<path d="M2.5 8.5 A4 4 0 1 1 8 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
  '<path d="M0.6 6.4 L2.6 9.4 L5 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Inner markup of the glyph (one or two SVGs). */
export function actionGlyphSvg(cost: ActionCost): string {
  if (cost === "1" || cost === "2" || cost === "3") return diamonds(Number(cost));
  if (cost === "reaction") return REACTION;
  if (cost === "free") return diamonds(1, true);
  const [from, to] = cost.split("-").map(Number);
  return `${diamonds(from)}<span class="cost-glyph-sep">${cost === "1-3" ? "à" : "ou"}</span>${diamonds(to)}`;
}

/** Complete glyph, labelled for screen readers. Labels are constants: no escaping needed. */
export const actionGlyphHtml = (cost: ActionCost): string =>
  `<span class="cost-glyph" role="img" aria-label="${ACTION_LABELS[cost]}" title="${ACTION_LABELS[cost]}">${actionGlyphSvg(cost)}</span>`;
