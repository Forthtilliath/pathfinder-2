/**
 * Class progression table, as in the rulebooks: what a class grants at each
 * level (its class features, plus feats, skill increases and attribute boosts).
 */
import { entryPath } from "../../src/lib/collections.ts";
import type { ProgressionLevel } from "../../src/lib/types.ts";
import { elide, type Draft } from "./adapters.ts";

type Item = ProgressionLevel["items"][number];

const ATTRIBUTE_BOOST_LEVELS = [1, 5, 10, 15, 20];

/** "Alchimiste" → "Don d'alchimiste", "Barde" → "Don de barde". */
export const classFeatLabel = (className: string) => `Don ${elide(className.toLowerCase())}`;

export function classProgression(c: Draft, features: Draft[]): ProgressionLevel[] {
  const s = c.doc.system;
  const levels = new Map<number, Item[]>();
  const add = (level: number, item: Item) => levels.set(level, [...(levels.get(level) ?? []), item]);
  const each = (key: string, item: Item) => {
    for (const level of (s[key]?.value ?? []) as number[]) add(level, item);
  };

  add(1, { label: "Ascendance et historique" });
  add(1, { label: "Maîtrises initiales" });
  for (const level of ATTRIBUTE_BOOST_LEVELS) add(level, { label: "Primes d'attributs" });
  each("classFeatLevels", { label: classFeatLabel(c.name!), href: "#dons-de-classe" });
  each("ancestryFeatLevels", { label: "Don ancestral", href: "/dons-ancestraux/" });
  each("skillFeatLevels", { label: "Don de compétence", href: "/dons-de-competence/" });
  each("generalFeatLevels", { label: "Don général", href: "/dons-generaux/" });
  each("skillIncreaseLevels", { label: "Amélioration de compétence" });

  // Class features: the class items point to them by id or English name.
  // A feature excluded for lack of translation is left out (no English on the site).
  for (const item of Object.values(s.items ?? {}) as { level?: number; uuid?: string }[]) {
    const key = String(item.uuid ?? "").split(".").slice(4).join(".");
    const feature = features.find((f) => f.doc._id === key || f.doc.name === key);
    if (!feature || !item.level) continue;
    const path = entryPath("classFeatures", feature.id!);
    add(item.level, { label: feature.name!, href: `/${path}/`, preview: path });
  }

  return [...levels]
    .sort(([a], [b]) => a - b)
    .map(([level, items]) => ({
      level,
      // Class features first (they have a page), then the generic steps.
      items: items.sort((a, b) => Number(Boolean(b.preview)) - Number(Boolean(a.preview)) || a.label.localeCompare(b.label, "fr")),
    }));
}
