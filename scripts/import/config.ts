import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const CACHE_DIR = path.join(ROOT, ".cache/sources");
export const OUTPUT_DIR = path.join(ROOT, "src/data");
export const TRANSLATIONS_DIR = path.join(ROOT, "translations");
export const REPORT_FILE = path.join(ROOT, "import-report.md");

export interface SourceRepo {
  name: string;
  url: string;
  /** Branch or tag. Can be overridden with an environment variable. */
  ref: string;
  /** Paths to check out (sparse checkout, non-cone mode). */
  paths: string[];
}

export const REPOS = {
  foundry: {
    name: "foundry-pf2e",
    url: process.env.PF2_FOUNDRY_URL ?? "https://github.com/foundryvtt/pf2e.git",
    ref: process.env.PF2_FOUNDRY_REF ?? "v14-dev",
    paths: [
      "/packs/pf2e/spells/",
      "/packs/pf2e/actions/",
      "/packs/pf2e/conditions/",
      "/packs/pf2e/feats/",
      "/packs/pf2e/class-features/",
      "/packs/pf2e/classes/",
      "/packs/pf2e/ancestries/",
      "/packs/pf2e/heritages/",
      "/packs/pf2e/backgrounds/",
      "/packs/pf2e/equipment/",
      "/packs/pf2e/deities/",
      "/packs/pf2e/familiar-abilities/",
      "/packs/pf2e/hazards/",
      "/packs/pf2e/vehicles/",
      "/packs/pf2e/pathfinder-monster-core/",
      "/packs/pf2e/pathfinder-monster-core-2/",
      "/packs/pf2e/pathfinder-npc-core/",
      "/packs/pf2e/journals/",
      "/packs/pf2e/bestiary-ability-glossary-srd/",
      "/packs/pf2e/bestiary-family-ability-glossary/",
      "/static/lang/",
      "/src/scripts/config/traits.ts",
      "/system.pf2e.json",
    ],
  },
  translation: {
    name: "pathfinder-fr",
    url: process.env.PF2_FR_URL ?? "https://gitlab.com/pathfinder-fr/foundryvtt-pathfinder2-fr.git",
    ref: process.env.PF2_FR_REF ?? "master",
    // Every translated pack: folder names changed over time.
    paths: ["/data/"],

  },
  language: {
    name: "pathfinder-fr-lang",
    url: process.env.PF2_FR_LANG_URL ?? "https://gitlab.com/pathfinder-fr/foundryvtt-pathfinder2e-lang-fr.git",
    ref: process.env.PF2_FR_LANG_REF ?? "master",
    paths: ["*.json"],
  },
} satisfies Record<string, SourceRepo>;

/** Foundry pack folders skipped (adventure or campaign content). */
export const IGNORED_FOLDERS = ["campaign", "aftermath"];

export const TRANSLATION_MODEL = process.env.PF2_MODEL ?? "claude-sonnet-5-5";
export const TRANSLATION_CONCURRENCY = Number(process.env.PF2_CONCURRENCY ?? 4);
/** Reasoning effort of the translation model: "low" is enough for glossary-guided translation. */
export const TRANSLATION_EFFORT = (process.env.PF2_EFFORT ?? "low") as "low" | "medium" | "high" | "xhigh" | "max";

/** Archives of Nethys search index, used for the rules chapters (English, ORC). */
export const AON_ENDPOINT = process.env.PF2_AON_URL ?? "https://elasticsearch.aonprd.com/aon/_search";
export const IMPORT_RULES = process.env.PF2_RULES !== "0";
