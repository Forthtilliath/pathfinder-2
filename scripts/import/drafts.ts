/**
 * Step 3 of the import: every Remaster document (Foundry packs, journals,
 * companions, Archives of Nethys) becomes a Draft with its translatable fields.
 */
import path from "node:path";
import type { CollectionName } from "../../src/lib/types.ts";
import { PACKS, type Draft, type FoundryDoc, type Labels } from "./adapters.ts";
import { readAon } from "./aon.ts";
import { attachClassJournals } from "./class-journal.ts";
import { IMPORT_RULES } from "./config.ts";
import { readCompanions, readJournals } from "./extra-sources.ts";
import type { Dictionary } from "./foundry-lang.ts";
import type { ImportReport } from "./output.ts";
import { readPack } from "./packs.ts";
import { translationProvenance, type indexTranslations } from "./pathfinder-fr.ts";
import { FR_LANGUAGE_FILE, RULE, text } from "./provenance.ts";

export interface DraftSources {
  foundryDir: string;
  translationDir: string;
  translations: ReturnType<typeof indexTranslations>;
  /** Pack folder → compendium name. */
  packs: Map<string, string>;
  labels: Labels;
  englishDict: Dictionary;
  frenchDict: Dictionary;
  offline: boolean;
  report: ImportReport;
  warn: (message: string) => void;
}

export async function readDrafts(src: DraftSources): Promise<{ drafts: Draft[]; linkKeys: Map<Draft, string[]> }> {
  const { translations, frenchDict, englishDict } = src;
  const drafts: Draft[] = [];
  const linkKeys = new Map<Draft, string[]>();
  const lookup = (id: string) => {
    const translation = translations.get(id);
    const provenance = translation ? translationProvenance(translation) : null;
    return translation && provenance ? { translation, provenance } : null;
  };
  const addDraft = (collection: CollectionName, pack: string, doc: FoundryDoc, folder: string, adapter: (typeof PACKS)[number]["adapter"]) => {
    const translation = translations.get(doc._id);
    const frProvenance = translation ? translationProvenance(translation) : null;
    const lookupItem = (id: string) => {
      const own = translation?.items.get(id);
      return own?.name && frProvenance ? { translation: own, provenance: frProvenance } : lookup(id);
    };
    const base = adapter({ doc, folder, translation, frProvenance, labels: src.labels, lookup: lookupItem });
    const draft: Draft = { ...base, collection, pack, doc, folder, translation };
    draft.fields.set("name", { english: doc.name, french: frProvenance && translation?.name ? text(translation.name, frProvenance) : undefined });
    draft.fields.set("description", {
      english: base.description ?? doc.system.description?.value ?? "",
      french: frProvenance && translation?.description ? text(translation.description, frProvenance) : undefined,
    });
    if (frProvenance?.status === "outdated") src.report.outdated.push(`${collection}: ${translation!.name} (${doc.name})`);
    drafts.push(draft);
    return draft;
  };
  const counts = new Map<string, number>();
  for (const spec of PACKS) {
    const pack = src.packs.get(spec.folder) ?? spec.folder;
    for (const { doc, folder } of readPack(path.join(src.foundryDir, "packs/pf2e", spec.folder))) {
      if (spec.types && !spec.types.includes(doc.type)) continue;
      addDraft(spec.collection, pack, doc, folder, spec.adapter);
      counts.set(spec.collection, (counts.get(spec.collection) ?? 0) + 1);
    }
  }
  attachClassJournals(drafts, src.foundryDir, translations, translationProvenance);
  const extras = [...readJournals(src.foundryDir), ...readCompanions(src.translationDir), ...(IMPORT_RULES ? await readAon(src.offline, src.warn) : [])];
  for (const x of extras) {
    const draft = addDraft(x.collection, x.pack, x.doc, x.folder, x.adapter);
    if (x.linkKeys) linkKeys.set(draft, x.linkKeys);
    const name = draft.fields.get("name")!;
    const frenchName = x.nameKey ? frenchDict.get(x.nameKey) : undefined;
    if (!name.french && frenchName) name.french = text(frenchName, FR_LANGUAGE_FILE);
    if (x.transform) {
      for (const field of draft.fields.values()) {
        field.english = x.transform(field.english);
        if (field.french) field.french = { ...field.french, value: x.transform(field.french.value) };
      }
    }
    counts.set(x.collection, (counts.get(x.collection) ?? 0) + 1);
  }
  for (const [c, n] of counts) console.log(`   ${c}: ${n}`);

  // @Localize[key]: rendered from the French dictionary. A text made only of
  // such references needs no translation; a key missing in French is replaced
  // by its English text so that it gets translated with the rest.
  const LOCALIZE = /@Localize\[([^\]]+)\]/g;
  for (const d of drafts) {
    for (const field of d.fields.values()) {
      if (field.french || !field.english.includes("@Localize[")) continue;
      field.english = field.english.replace(LOCALIZE, (all, key: string) => (frenchDict.has(key) ? all : (englishDict.get(key) ?? all)));
      const rest = field.english.replace(LOCALIZE, "").replace(/<[^>]*>/g, "").trim();
      if (!rest) field.french = text(field.english, RULE);
    }
  }
  return { drafts, linkKeys };
}
