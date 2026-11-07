/**
 * Links between entries, computed once every entry has its French id:
 * heritages of an ancestry, feats of a class, members of a creature family…
 * Also builds the skill pages, which have no Foundry document.
 */
import type { CollectionName, Entry, Text } from "../../src/lib/types.ts";
import type { Draft } from "./adapters.ts";
import { classProgression } from "./class-progression.ts";
import { slugify } from "./rules.ts";
import { ATTRIBUTES, SKILL_ATTRIBUTES, STATISTICS } from "./terms.ts";

const RULE_TEXT = (value: string): Text => ({ value, provenance: { source: "site", sourceLanguage: "en", status: "current", method: "rule" } });

export function relationHelpers(kept: Draft[], entryByDraft: Map<Draft, Entry>) {
  const byCollection = (c: CollectionName) => kept.filter((d) => d.collection === c);
  const ids = (list: Draft[]) => list.sort((a, z) => (a.level ?? 0) - (z.level ?? 0) || a.name!.localeCompare(z.name!, "fr")).map((d) => d.id!);
  const relate = (d: Draft, title: string, collection: CollectionName, list: Draft[]) => {
    if (list.length) entryByDraft.get(d)!.related.push({ title, collection, ids: ids(list) });
  };
  return { byCollection, ids, relate };
}

export function relateEntries(kept: Draft[], entryByDraft: Map<Draft, Entry>): void {
  const { byCollection, relate } = relationHelpers(kept, entryByDraft);

  // Ancestries: heritages and ancestry feats.
  for (const a of byCollection("ancestries")) {
    const slug = a.doc.system.slug ?? slugify(a.doc.name);
    const heritages = byCollection("heritages").filter((h) => h.doc.system.ancestry?.slug === slug);
    for (const h of heritages) entryByDraft.get(h)!.filters.ancestry = [a.name!];
    relate(a, "Héritages", "heritages", heritages);
    relate(a, "Dons d'ascendance", "feats", byCollection("feats").filter((f) => f.doc.system.category === "ancestry" && (f.doc.system.traits?.value ?? []).includes(slug)));
  }
  for (const h of byCollection("heritages")) if (!h.doc.system.ancestry) entryByDraft.get(h)!.filters.ancestry = ["Polyvalent"];

  // Classes: progression table (class features by level) and class feats.
  for (const c of byCollection("classes")) {
    const slug = c.doc.system.slug ?? slugify(c.doc.name);
    entryByDraft.get(c)!.progression = classProgression(c, byCollection("classFeatures"));
    relate(c, "Dons de classe", "feats", byCollection("feats").filter((f) => f.doc.system.category === "class" && (f.doc.system.traits?.value ?? []).includes(slug)));
  }

  // Archetypes: the dedication feat and the feats that require it.
  for (const a of byCollection("archetypes")) {
    const dedication = `${a.doc.name} Dedication`.toLowerCase();
    relate(
      a,
      "Dons de l'archétype",
      "feats",
      byCollection("feats").filter(
        (f) => f.doc.name.toLowerCase() === dedication || (f.doc.system.prerequisites?.value ?? []).some((p: { value: string }) => p.value.toLowerCase().includes(dedication)),
      ),
    );
  }

  // Domains: deities granting the domain.
  for (const dom of byCollection("domains")) {
    const slug = slugify(dom.doc.name.replace(/\s*Domain$/i, ""));
    relate(dom, "Divinités", "deities", byCollection("deities").filter((g) => (g.doc.system.domains?.primary ?? []).includes(slug)));
    relate(dom, "Divinités (domaine alternatif)", "deities", byCollection("deities").filter((g) => (g.doc.system.domains?.alternate ?? []).includes(slug)));
  }

  // Creature families: members, by English name (Archives of Nethys list).
  const creaturesByName = new Map(byCollection("creatures").map((c) => [c.doc.name.toLowerCase(), c]));
  for (const f of byCollection("creatureFamilies")) {
    const members = ((f.doc.system.members ?? []) as string[]).map((n) => creaturesByName.get(n.toLowerCase())).filter((c): c is Draft => Boolean(c));
    relate(f, "Membres", "creatures", members);
  }

  // Weapon and armor groups: the items of the group.
  for (const g of byCollection("groups")) {
    const { kind, slug } = g.doc.system.group as { kind: string; slug: string };
    relate(g, kind === "weapon" ? "Armes du groupe" : "Armures du groupe", "equipment", byCollection("equipment").filter((e) => e.doc.type === kind && e.doc.system.group === slug));
  }
}

/** Skill pages, built by the site from the action and feat data. */
export function buildSkills(kept: Draft[], entryByDraft: Map<Draft, Entry>, skillIds: Map<string, string>, descriptions: Map<string, Text>): Entry[] {
  const { byCollection, ids } = relationHelpers(kept, entryByDraft);
  return Object.entries(SKILL_ATTRIBUTES).map(([slug, attribute]) => {
    const englishName = slug[0].toUpperCase() + slug.slice(1);
    const mentions = new RegExp(`@Check\\[(?:type:)?${slug}\\b|\\b${englishName}\\b`, "i");
    const actions = byCollection("actions").filter((a) => a.folder === "skill" && mentions.test(a.doc.system.description?.value ?? ""));
    const skillFeats = byCollection("feats").filter(
      (f) => f.doc.system.category === "skill" && (f.doc.system.prerequisites?.value ?? []).some((p: { value: string }) => new RegExp(`\\b${englishName}\\b`, "i").test(p.value)),
    );
    return {
      id: skillIds.get(slug)!,
      collection: "skills",
      name: RULE_TEXT(STATISTICS[slug]),
      description: descriptions.get(slug) ?? RULE_TEXT(""),
      subtitle: "Compétence",
      traits: [],
      rarity: "common",
      facts: [{ label: "Caractéristique", value: RULE_TEXT(ATTRIBUTES[attribute]) }],
      filters: { attribute: [ATTRIBUTES[attribute]] },
      related: [
        { title: "Actions", collection: "actions" as CollectionName, ids: ids(actions) },
        { title: "Dons de compétence", collection: "feats" as CollectionName, ids: ids(skillFeats) },
      ].filter((r) => r.ids.length),
    } satisfies Entry;
  });
}
