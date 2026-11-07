/** Step 4 of the import: glossary, machine translation of missing texts, exclusion of what stays untranslated. */
import type { Draft } from "./adapters.ts";
import type { Dictionary, TraitKeys } from "./foundry-lang.ts";
import type { ImportReport } from "./output.ts";
import { siteTranslation, text } from "./provenance.ts";
import { STATISTICS } from "./terms.ts";
import type { Translator } from "./translator.ts";

/** Known French terms (entry names, traits, statistics) given to the model. */
export function buildGlossary(translator: Translator, drafts: Draft[], traitKeys: TraitKeys, englishDict: Dictionary, frenchDict: Dictionary) {
  for (const d of drafts) {
    const name = d.fields.get("name")!;
    if (name.french) translator.addGlossaryTerm(name.english, name.french.value);
  }
  for (const key of traitKeys.labels.values()) {
    const english = englishDict.get(key);
    const french = frenchDict.get(key);
    if (english && french) translator.addGlossaryTerm(english, french);
  }
  for (const [english, french] of Object.entries(STATISTICS)) translator.addGlossaryTerm(english[0].toUpperCase() + english.slice(1), french);
}

export async function translateDrafts(translator: Translator, drafts: Draft[]) {
  await Promise.all(
    drafts.map(async (d) => {
      const missing: Record<string, string> = {};
      for (const [key, field] of d.fields) if (!field.french && field.english) missing[key] = field.english;
      if (Object.keys(missing).length === 0) return;
      const pub = d.doc.system.publication ?? d.doc.system.details?.publication;
      const context = `Context: ${d.subtitle.toLowerCase()} "${d.doc.name}" (${pub?.title ?? ""}). Fields named item:<id>:name and item:<id>:desc are the names and descriptions of abilities and attacks of the same entry.`;
      const result = await translator.translateEntry(d.collection, d.doc._id, missing, context);
      if (!result) return;
      for (const [key, value] of Object.entries(result.fields)) d.fields.get(key)!.french = text(value, siteTranslation(result.status));
    }),
  );

  // Debug only: keep untranslated entries with their English text to check layouts.
  if (process.env.PF2_DEBUG_KEEP_ENGLISH === "1") {
    for (const d of drafts) for (const f of d.fields.values()) f.french ??= text(f.english, { source: "site", sourceLanguage: "en", status: "unreviewed", method: "ai" });
  }
}

/** Anything still untranslated is excluded: no English on the site. */
export function keepTranslated(drafts: Draft[], report: ImportReport): Draft[] {
  return drafts.filter((d) => {
    const missing = [...d.fields].filter(([, f]) => f.english && !f.french).map(([key]) => key);
    if (missing.length) report.excluded.push(`${d.collection}: ${d.doc.name} (missing: ${missing.join(", ")})`);
    for (const key of missing) report.untranslatedChars += d.fields.get(key)!.english.length;
    return missing.length === 0;
  });
}
