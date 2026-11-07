/**
 * One adapter per Foundry pack. Types and helpers live in adapter-base.ts,
 * re-exported here for the other import modules.
 */
import type { CollectionName } from "../../src/lib/types.ts";
import type { Adapter } from "./adapter-base.ts";
import { familyAbilities, universalAbilities } from "./adapters-abilities.ts";
import { actions, conditions, deities, equipment } from "./adapters-misc.ts";
import { ancestries, backgrounds, classes, classFeatures, feats, heritages, spells } from "./adapters-options.ts";
import { creatures, familiarAbilities, hazards, vehicles } from "./adapters-stat.ts";

export * from "./adapter-base.ts";

export interface PackSpec {
  collection: CollectionName;
  /** Folder under packs/pf2e. */
  folder: string;
  adapter: Adapter;
  /** Foundry document types to keep (default: all). */
  types?: string[];
}

export const PACKS: PackSpec[] = [
  { collection: "spells", folder: "spells", adapter: spells },
  { collection: "feats", folder: "feats", adapter: feats },
  { collection: "classFeatures", folder: "class-features", adapter: classFeatures, types: ["feat"] },
  { collection: "classes", folder: "classes", adapter: classes },
  { collection: "ancestries", folder: "ancestries", adapter: ancestries },
  { collection: "heritages", folder: "heritages", adapter: heritages },
  { collection: "backgrounds", folder: "backgrounds", adapter: backgrounds },
  { collection: "equipment", folder: "equipment", adapter: equipment },
  { collection: "deities", folder: "deities", adapter: deities },
  { collection: "actions", folder: "actions", adapter: actions },
  { collection: "conditions", folder: "conditions", adapter: conditions },
  { collection: "familiarAbilities", folder: "familiar-abilities", adapter: familiarAbilities },
  { collection: "hazards", folder: "hazards", adapter: hazards },
  { collection: "vehicles", folder: "vehicles", adapter: vehicles },
  { collection: "creatures", folder: "pathfinder-monster-core", adapter: creatures, types: ["npc"] },
  { collection: "creatures", folder: "pathfinder-monster-core-2", adapter: creatures, types: ["npc"] },
  { collection: "creatures", folder: "pathfinder-npc-core", adapter: creatures, types: ["npc"] },
  { collection: "monsterAbilities", folder: "bestiary-ability-glossary-srd", adapter: universalAbilities },
  { collection: "monsterAbilities", folder: "bestiary-family-ability-glossary", adapter: familyAbilities },
];
