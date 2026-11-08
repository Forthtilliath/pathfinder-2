/**
 * Sources that are not Foundry item packs, turned into Foundry-like documents
 * so they follow the same pipeline:
 * - Foundry journals: archetypes, divine domains and the GM screen (rules
 *   summaries), one page each, translated by pathfinder-fr;
 * - pathfinder-fr translations of the "PF2e Animal Companions" module
 *   (the files hold both the English and the French text);
 * - Archives of Nethys: see aon.ts.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { CollectionName, Provenance } from "../../src/lib/types.ts";
import type { Adapter, FoundryDoc } from "./adapters.ts";
import { readTranslationFile } from "./pathfinder-fr.ts";

export interface ExtraSource {
  collection: CollectionName;
  pack: string;
  folder: string;
  doc: FoundryDoc;
  adapter: Adapter;
  /** Alternative keys for links (journal pages, weapon groups…). */
  linkKeys?: string[];
  /** Foundry language key holding the French name, when there is one. */
  nameKey?: string;
  /** Applied to the English and French descriptions (relative links, heading levels). */
  transform?: (html: string) => string;
  /** Text already in French (a French book): nothing to translate. */
  french?: { name: string; description: string; provenance: Provenance };
  /** Added to the id when another entry has it already (that entry keeps its address). */
  idSuffix?: string;
}

export const extraDoc = (id: string, name: string, description: string, title: string, extra: Record<string, unknown> = {}): FoundryDoc => ({
  _id: id,
  name,
  type: "page",
  system: { description: { value: description }, publication: { remaster: true, title, license: "ORC" }, traits: { value: [], rarity: "common" }, ...extra },
});

export const simpleAdapter =
  (subtitle: string, filters: Record<string, string[]> = {}): Adapter =>
  () => ({ fields: new Map(), subtitle, filters, facts: () => [] });

/* ------------------------------------------------------------------ */
/* Foundry journals                                                    */
/* ------------------------------------------------------------------ */

interface JournalSpec {
  file: string;
  collection: CollectionName;
  subtitle: string;
  filters?: Record<string, string[]>;
  /** The page's h1 is a section heading, not the page title: shift every heading down. */
  shiftHeadings?: boolean;
}

const JOURNALS: JournalSpec[] = [
  { file: "archetypes.json", collection: "archetypes", subtitle: "Archétype" },
  { file: "domains.json", collection: "domains", subtitle: "Domaine divin" },
  { file: "gm-screen.json", collection: "rules", subtitle: "Écran du MJ", filters: { book: ["Écran du MJ"] }, shiftHeadings: true },
];

/** Pages shorter than this (plain text) are only section dividers of the journal. */
const MIN_PAGE_TEXT = 120;

export const shiftHeadings = (html: string) => html.replace(/<(\/?)h([1-5])(\s[^>]*)?>/g, (_, close, level, attrs = "") => `<${close}h${Number(level) + 1}${close ? "" : attrs}>`);

export function readJournals(foundryDir: string): ExtraSource[] {
  const out: ExtraSource[] = [];
  for (const spec of JOURNALS) {
    const full = path.join(foundryDir, "packs/pf2e/journals", spec.file);
    if (!existsSync(full)) continue;
    const journal = JSON.parse(readFileSync(full, "utf8")) as { _id: string; pages: { _id: string; name: string; text?: { content?: string } }[] };
    // "@UUID[.pageId]" links point to another page of the same journal.
    const relink = (html: string) => html.replace(/@UUID\[\.([A-Za-z0-9]{16})\]/g, `@UUID[Compendium.pf2e.journals.JournalEntry.${journal._id}.JournalEntryPage.$1]`);
    for (const page of journal.pages) {
      const content = page.text?.content ?? "";
      if (content.replace(/<[^>]*>/g, "").trim().length < MIN_PAGE_TEXT) continue;
      const rarity = /<strong>Rarity<\/strong>\s*(Uncommon|Rare|Unique)/i.exec(content)?.[1]?.toLowerCase() ?? "common";
      const description = spec.shiftHeadings ? content : content.replace(/<h1>[^<]*<\/h1>/, "");
      out.push({
        collection: spec.collection,
        pack: "journals",
        folder: "",
        doc: extraDoc(page._id, page.name, description, "", { traits: { value: [], rarity } }),
        adapter: simpleAdapter(spec.subtitle, spec.filters),
        // Same key as parseUuid gives for "Compendium.pf2e.journals.JournalEntry.<journal>.JournalEntryPage.<page>".
        linkKeys: [`${journal._id}.JournalEntryPage.${page._id}`],
        transform: spec.shiftHeadings ? (html) => shiftHeadings(relink(html)) : relink,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Companions (PF2e Animal Companions module, via pathfinder-fr)        */
/* ------------------------------------------------------------------ */

const COMPANION_FOLDERS: Record<string, string> = {
  "ac-ancestries-and-class": "Compagnon animal",
  "ac-construct-companions": "Compagnon artificiel",
  "ac-eidolons": "Eidolon",
  "ac-advanced-maneuvers": "Manœuvre avancée",
  "ac-support-benefits": "Bénéfice de soutien",
  "ac-evolution-feats": "Don d'évolution",
  "ac-construct-breakthroughs": "Percée artificielle",
};

export function readCompanions(translationDir: string): ExtraSource[] {
  const out: ExtraSource[] = [];
  for (const [folder, type] of Object.entries(COMPANION_FOLDERS)) {
    const dir = path.join(translationDir, "data", folder);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".htm")) continue;
      const t = readTranslationFile(path.join(dir, name));
      if (!t || !t.englishName) continue;
      out.push({
        collection: "companions",
        pack: folder,
        folder,
        doc: extraDoc(t.foundryId, t.englishName, t.englishDescription, ""),
        adapter: simpleAdapter(type, { type: [type] }),
      });
    }
  }
  return out;
}
