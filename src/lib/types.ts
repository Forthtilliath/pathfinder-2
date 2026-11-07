/**
 * Types shared by the import script and the site.
 * Every piece of text carries its provenance.
 */

export type SourceId = "pathfinder-fr" | "bbe" | "site" | "foundry-pf2e" | "aon";

export type TranslationStatus =
  | "current" // translation matches the original
  | "outdated" // the original changed after the translation
  | "unreviewed" // site translation not yet checked by a human
  | "reviewed"; // site translation checked by a human

export type TranslationMethod = "human" | "ai" | "rule";

export interface Provenance {
  source: SourceId;
  sourceLanguage: "en" | "fr";
  status: TranslationStatus;
  method: TranslationMethod;
}

export interface Text {
  value: string;
  provenance: Provenance;
}

export type Rarity = "common" | "uncommon" | "rare" | "unique";

export type CollectionName =
  | "spells"
  | "feats"
  | "classes"
  | "classFeatures"
  | "ancestries"
  | "heritages"
  | "backgrounds"
  | "equipment"
  | "deities"
  | "skills"
  | "actions"
  | "conditions"
  | "traits"
  | "archetypes"
  | "domains"
  | "creatures"
  | "hazards"
  | "vehicles"
  | "familiarAbilities"
  | "companions"
  | "monsterAbilities"
  | "creatureFamilies"
  | "planes"
  | "groups"
  | "rules";

export type ActionCost = "1" | "2" | "3" | "1-3" | "1-2" | "2-3" | "reaction" | "free";

export interface Book {
  name: Text;
  license: "ORC" | "OGL";
}

/** A displayed property: French label (site wording) and its value (HTML). */
export interface Fact {
  label: string;
  value: Text;
}

/** A group of entries related to this one (heritages of an ancestry, feats of a class…). */
export interface Related {
  title: string;
  collection: CollectionName;
  ids: string[];
}

export interface Entry {
  /** French slug, unique within the collection. */
  id: string;
  collection: CollectionName;
  /** Absent for entries built by the site (skills). */
  foundryId?: string;
  name: Text;
  /** Enriched HTML with internal links resolved. May be empty. */
  description: Text;
  /** French subtitle, e.g. "Don 4", "Sort 3", "Arme 1". */
  subtitle: string;
  level?: number;
  actionCost?: ActionCost;
  /** Trait ids (French slugs). */
  traits: string[];
  rarity: Rarity;
  book?: Book;
  facts: Fact[];
  /** Stat block sections (creature abilities, spells…), shown before the description. */
  sections?: Fact[];
  /** Extra chapters shown after the description (HTML with its own heading), e.g. roleplaying a class. */
  chapters?: Text[];
  /** Facet values used by list filters, in French. */
  filters: Record<string, string[]>;
  related: Related[];
  /** Class progression table: what the class grants at each level. */
  progression?: ProgressionLevel[];
}

export interface ProgressionLevel {
  level: number;
  /** French label; href of its page or list when there is one; preview path for entries. */
  items: { label: string; href?: string; preview?: string }[];
}

/** Compact row used by list pages (loaded as JSON). */
export interface ListRow {
  id: string;
  name: string;
  subtitle: string;
  cost?: ActionCost;
  rarity: Rarity;
  filters: Record<string, string[]>;
  /** Normalized text for quick filtering (name + traits). */
  search: string;
}

/** Display-only part of a row: the first rows of a long list, before the full list is loaded. */
export type ListItem = Pick<ListRow, "id" | "name" | "subtitle" | "cost" | "rarity">;

/** Lightweight summary used by link previews. */
export interface Preview {
  name: string;
  subtitle: string;
  excerpt: string;
}

export interface SourceMeta {
  id: SourceId;
  name: string;
  url: string;
  license: string;
  version: string;
  commit: string;
}

export interface ImportMeta {
  date: string;
  sources: SourceMeta[];
  counts: Partial<Record<CollectionName, number>>;
  bySource: Record<SourceId, number>;
  translationModel?: string;
}
