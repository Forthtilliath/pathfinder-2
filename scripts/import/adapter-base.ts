/**
 * Types and helpers shared by the pack adapters: a Foundry document becomes a
 * Draft (translatable fields, French subtitle, list filters, and a fact builder
 * run once every entry has its id, so facts can link to other entries).
 */
import type { ActionCost, CollectionName, Provenance } from "../../src/lib/types.ts";
import type { FrenchTranslation } from "./pathfinder-fr.ts";
import { RULE } from "./provenance.ts";
import { translateFrequency } from "./rules.ts";

export { RULE };

export interface FoundryDoc {
  _id: string;
  name: string;
  type: string;
  system: Record<string, any>;
}

export interface Field {
  english: string;
  french?: { value: string; provenance: Provenance };
}

/** A fact as produced by an adapter, before link and label resolution. */
export interface FactSpec {
  label: string;
  /** French HTML; may contain ⟪label tokens⟫. */
  value?: string;
  /** Or: the translated field holding the value. */
  field?: string;
}

export interface FactContext {
  /** Link to an entry by Foundry pack and id or English name. */
  link(pack: string, key: string): string | null;
  /** Link from a Foundry UUID ("Compendium.pf2e.spells-srd.Item.Fireball"). */
  linkUuid(uuid: string): string | null;
  /** Link to a trait from its English slug. */
  trait(slug: string): string | null;
  /** Link to a skill page from its English slug. */
  skill(slug: string): string | null;
  /** Link to a weapon from its base item slug. */
  weapon(slug: string): string | null;
  /** French name of a trait (plain text). */
  traitName(slug: string): string | null;
  /** French value of a translated field of the current draft. */
  field(key: string): string | null;
}

export interface Draft {
  collection: CollectionName;
  pack: string;
  doc: FoundryDoc;
  folder: string;
  translation?: FrenchTranslation;
  fields: Map<string, Field>;
  subtitle: string;
  level?: number;
  actionCost?: ActionCost;
  filters: Record<string, string[]>;
  facts: (ctx: FactContext) => FactSpec[];
  /** Stat block sections (abilities, spells), label + value. */
  sections?: (ctx: FactContext) => FactSpec[];
  /** English description when it is not system.description. */
  description?: string;
  /** Extra trait slugs to create pages for (spell traditions). */
  extraTraits?: string[];
  name?: string;
  id?: string;
}

export interface Labels {
  /** French label of a Foundry language key, or a token resolved later. */
  key(key: string, english?: string): string;
}

export const pascal = (slug: string) =>
  slug
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");


/** "alchimiste" → "d'alchimiste", "barde" → "de barde". */
export const elide = (word: string) => (/^[aeiouyàâéèêîôh]/i.test(word) ? `d'${word}` : `de ${word}`);

export const list = (items: (string | null)[]) => items.filter(Boolean).join(", ");

/** Field from the pathfinder-fr Data section, if any. */
function frField(t: FrenchTranslation | undefined, ...keys: string[]) {
  for (const k of keys) {
    const v = t?.fields.get(k);
    if (v) return v;
  }
  return undefined;
}

export interface AdapterInput {
  doc: FoundryDoc;
  folder: string;
  translation?: FrenchTranslation;
  frProvenance: Provenance | null;
  labels: Labels;
  /** pathfinder-fr translation of an embedded item, by id: in the entry's own file first, then in the whole index. */
  lookup(id: string): { translation: { englishName: string; name: string; description: string }; provenance: Provenance } | null;
}

export type Adapter = (input: AdapterInput) => Omit<Draft, "doc" | "folder" | "translation" | "pack" | "collection">;


/** Adds a translatable field, using the French data or a rule when available. */
export function addField(
  fields: Map<string, Field>,
  key: string,
  english: string | undefined,
  input: AdapterInput,
  frKeys: string[],
  ruleResult: string | null = null,
) {
  if (!english) return;
  const fr = frField(input.translation, ...frKeys);
  fields.set(key, {
    english,
    french: fr && input.frProvenance ? { value: fr, provenance: input.frProvenance } : ruleResult ? { value: ruleResult, provenance: RULE } : undefined,
  });
}

export function frequencyFact(s: Record<string, any>): FactSpec | null {
  if (!s.frequency?.per) return null;
  const value = translateFrequency(s.frequency.max ?? 1, s.frequency.per);
  return value ? { label: "Fréquence", value } : null;
}

export function actionCostOf(s: Record<string, any>): ActionCost | undefined {
  const type = s.actionType?.value;
  const n = s.actions?.value;
  if (type === "action" && [1, 2, 3].includes(n)) return String(n) as ActionCost;
  if (type === "reaction") return "reaction";
  if (type === "free") return "free";
  return undefined;
}
