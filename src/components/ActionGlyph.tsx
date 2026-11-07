import { ACTION_LABELS, actionGlyphSvg } from "../lib/action-glyph";
import type { ActionCost } from "../lib/types";

/** Island version of ActionGlyph.astro (same markup). */
export default function ActionGlyph({ cost }: { cost: ActionCost }) {
  const label = ACTION_LABELS[cost];
  return <span class="cost-glyph" role="img" aria-label={label} title={label} dangerouslySetInnerHTML={{ __html: actionGlyphSvg(cost) }} />;
}
