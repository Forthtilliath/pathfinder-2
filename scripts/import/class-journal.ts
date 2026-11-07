/**
 * Class journal pages of the Foundry system (packs/pf2e/journals/classes.json),
 * translated by pathfinder-fr. The class item links to its page; the page adds
 * what the item lacks:
 * - "Roleplaying the …" (combat, social, exploration, downtime, you might…),
 *   kept only when pathfinder-fr translates it, as the "roleplay" field;
 * - the class DC proficiency, stored as system.classDC for the class facts.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Provenance } from "../../src/lib/types.ts";
import type { Draft } from "./adapters.ts";
import { shiftHeadings } from "./extra-sources.ts";
import type { FrenchTranslation } from "./pathfinder-fr.ts";

const PAGE_LINK = /@UUID\[Compendium\.pf2e\.journals\.JournalEntry\.[A-Za-z0-9]{16}\.JournalEntryPage\.([A-Za-z0-9]{16})\]/;
const CLASS_DC = /<h2[^>]*>Class DC<\/h2>\s*<p>(Trained|Expert|Master|Legendary) in /i;
const RANK_VALUES: Record<string, number> = { trained: 1, expert: 2, master: 3, legendary: 4 };

/**
 * First chapter of a page, headings one level down: from the first h1 (or,
 * when the page starts without one, from the first h2) up to the next h1.
 */
export function firstChapter(html: string, from: "h1" | "h2"): string | null {
  const start = html.search(from === "h1" ? /<h1[\s>]/ : /<h2[\s>]/);
  if (start < 0) return null;
  const rest = html.slice(start + 3);
  const next = rest.search(/<h1[\s>]/);
  const chapter = html.slice(start, next < 0 ? undefined : start + 3 + next).trim();
  if (!chapter.replace(/<[^>]*>/g, "").trim()) return null;
  return from === "h1" ? shiftHeadings(chapter) : `<h2>Jeu de rôle</h2>\n${shiftHeadings(chapter)}`;
}

export function attachClassJournals(
  drafts: Draft[],
  foundryDir: string,
  translations: Map<string, FrenchTranslation>,
  provenanceOf: (t: FrenchTranslation) => Provenance | null,
): void {
  const file = path.join(foundryDir, "packs/pf2e/journals/classes.json");
  if (!existsSync(file)) return;
  const journal = JSON.parse(readFileSync(file, "utf8")) as { pages: { _id: string; text?: { content?: string } }[] };
  const pages = new Map(journal.pages.map((p) => [p._id, p.text?.content ?? ""]));

  for (const d of drafts) {
    if (d.collection !== "classes") continue;
    const pageId = PAGE_LINK.exec(d.doc.system.description?.value ?? "")?.[1];
    const english = pageId ? pages.get(pageId) : undefined;
    if (!pageId || !english) continue;

    const dc = CLASS_DC.exec(english)?.[1];
    if (dc) d.doc.system.classDC = RANK_VALUES[dc.toLowerCase()];

    // The page starts with "<h1>Roleplaying the …</h1>", or directly with its "During Combat Encounters" h2.
    const firstHeading = /<h([12])[^>]*>([^<]*)<\/h\1>/.exec(english);
    const from = firstHeading?.[1] === "1" && firstHeading[2].startsWith("Roleplaying") ? "h1" : firstHeading?.[2].startsWith("During Combat") ? "h2" : null;
    if (!from) continue;
    const translation = translations.get(pageId);
    const provenance = translation ? provenanceOf(translation) : null;
    const englishChapter = firstChapter(english, from);
    const frenchChapter = translation ? firstChapter(translation.description, from) : null;
    if (englishChapter && frenchChapter && provenance) d.fields.set("roleplay", { english: englishChapter, french: { value: frenchChapter, provenance } });
  }
}
