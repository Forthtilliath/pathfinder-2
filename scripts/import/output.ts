/**
 * Last step of the import: data files, import metadata and the report.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CollectionName, Entry, ImportMeta, SourceId } from "../../src/lib/types.ts";
import { OUTPUT_DIR, REPORT_FILE, TRANSLATIONS_DIR } from "./config.ts";
import type { LocalRepo } from "./git.ts";
import type { Translator } from "./translator.ts";

export interface ImportReport {
  excluded: string[];
  outdated: string[];
  warnings: Map<string, number>;
  untranslatedChars: number;
}

export function writeData(entries: Map<CollectionName, Entry[]>, foundry: LocalRepo, translationRepo: LocalRepo, translator: Translator): ImportMeta {
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const bySource: Record<SourceId, number> = { "pathfinder-fr": 0, bbe: 0, site: 0, "foundry-pf2e": 0, aon: 0 };
  const counts: ImportMeta["counts"] = {};
  for (const [name, list] of entries) {
    list.sort((a, z) => a.name.value.localeCompare(z.name.value, "fr"));
    for (const e of list) if (e.description.value) bySource[e.description.provenance.source]++;
    writeFileSync(path.join(OUTPUT_DIR, `${name}.json`), JSON.stringify(list) + "\n");
    counts[name] = list.length;
    console.log(`   ${name}: ${list.length}`);
  }

  const meta: ImportMeta = {
    date: new Date().toISOString(),
    sources: [
      {
        id: "foundry-pf2e",
        name: "Système Pathfinder 2e pour Foundry VTT",
        url: "https://github.com/foundryvtt/pf2e",
        license: "Apache 2.0 (code), ORC et OGL (contenu Paizo)",
        version: foundry.ref,
        commit: foundry.commit,
      },
      {
        id: "aon",
        name: "Archives of Nethys (règles, plans, familles de créatures, groupes d'armes, compétences)",
        url: "https://2e.aonprd.com/",
        license: "ORC",
        version: "index de recherche",
        commit: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
      },
      {
        id: "pathfinder-fr",
        name: "Traduction de la communauté Pathfinder-fr",
        url: "https://gitlab.com/pathfinder-fr/foundryvtt-pathfinder2-fr",
        license: "Apache 2.0",
        version: translationRepo.ref,
        commit: translationRepo.commit,
      },
    ],
    counts,
    bySource,
    translationModel: translator.calls > 0 || existsSync(path.join(TRANSLATIONS_DIR, "spells.json")) ? translator.model : undefined,
  };
  writeFileSync(path.join(OUTPUT_DIR, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  return meta;
}

export function writeReport(meta: ImportMeta, translator: Translator, report: ImportReport) {
  const lines = [
    `# Import report, ${meta.date.slice(0, 10)}`,
    "",
    "## Content",
    ...Object.entries(meta.counts).map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## Description sources",
    ...Object.entries(meta.bySource).map(([k, v]) => `- ${k}: ${v}`),
    "",
    `Translation model calls: ${translator.calls} (${translator.model}, tokens: ${translator.usage.input.toLocaleString("en-US")} in, ${translator.usage.output.toLocaleString("en-US")} out)`,
    `English text still awaiting translation: ${report.untranslatedChars.toLocaleString("en-US")} characters`,
    "",
    `## Excluded for lack of translation (${report.excluded.length})`,
    ...report.excluded.map((l) => `- ${l}`),
    "",
    `## Translations to review: original changed since (${report.outdated.length})`,
    ...report.outdated.map((l) => `- ${l}`),
    "",
    `## Translation failures (${translator.failures.length})`,
    ...translator.failures.map((l) => `- ${l}`),
    "",
    "## Warnings",
    ...[...report.warnings].sort((a, b) => b[1] - a[1]).map(([m, n]) => `- ${m} (×${n})`),
    "",
  ];
  writeFileSync(REPORT_FILE, lines.join("\n"));
}
