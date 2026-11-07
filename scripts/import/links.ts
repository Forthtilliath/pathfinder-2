/** Step 6 of the import: French ids, link index and the context used by fact builders to link entries. */
import { entryPath } from "../../src/lib/collections.ts";
import type { CollectionName } from "../../src/lib/types.ts";
import type { Draft, FactContext } from "./adapters.ts";
import type { ResolvedTarget } from "./enrichers.ts";
import { slugify } from "./rules.ts";
import { SKILL_ATTRIBUTES, STATISTICS } from "./terms.ts";
import type { TraitPages } from "./trait-pages.ts";

/** Gives each draft its French name and a slug id, unique within its collection. Sorts `kept` by Foundry id first, for stable ids. */
export function assignIds(kept: Draft[]) {
  const takenIds = new Map<CollectionName, Set<string>>();
  for (const d of kept.sort((a, z) => a.doc._id.localeCompare(z.doc._id))) {
    const taken = takenIds.get(d.collection) ?? new Set<string>();
    takenIds.set(d.collection, taken);
    d.name = d.fields.get("name")!.french!.value;
    let id = slugify(d.name) || d.doc._id.toLowerCase();
    if (taken.has(id)) id = `${id}-${d.doc._id.slice(0, 4).toLowerCase()}`;
    taken.add(id);
    d.id = id;
  }
}

export interface LinkIndex {
  /** "pack:Foundry id" and "pack:English name" → target. */
  index: Map<string, ResolvedTarget>;
  actionsBySlug: Map<string, ResolvedTarget>;
  weaponsBySlug: Map<string, ResolvedTarget>;
}

export function buildLinkIndex(kept: Draft[], linkKeys: Map<Draft, string[]>): LinkIndex {
  const index = new Map<string, ResolvedTarget>();
  const actionsBySlug = new Map<string, ResolvedTarget>();
  const weaponsBySlug = new Map<string, ResolvedTarget>();
  for (const d of kept) {
    const target: ResolvedTarget = { collection: d.collection, id: d.id!, name: d.name! };
    index.set(`${d.pack}:${d.doc._id}`, target);
    index.set(`${d.pack}:${d.doc.name}`, target);
    for (const k of linkKeys.get(d) ?? []) index.set(`${d.pack}:${k}`, target);
    const slug = d.doc.system.slug ?? slugify(d.doc.name);
    if (d.collection === "actions") actionsBySlug.set(slug, target);
    if (d.collection === "equipment" && d.doc.type === "weapon") weaponsBySlug.set(d.doc.system.baseItem ?? slug, target);
  }
  return { index, actionsBySlug, weaponsBySlug };
}

const anchor = (t: ResolvedTarget | null | undefined) => {
  if (!t) return null;
  const p = entryPath(t.collection, t.id);
  return `<a href="/${p}/" data-preview="${p}">${t.name}</a>`;
};

/** Skill English slug → French page id. */
export const skillIds = new Map(Object.keys(SKILL_ATTRIBUTES).map((slug) => [slug, slugify(STATISTICS[slug])]));

/** Fact context shared by every draft (`field` is set per draft). */
export function factContext({ index, weaponsBySlug }: LinkIndex, traits: TraitPages): FactContext {
  return {
    link: (pack, key) => anchor(index.get(`${pack}:${key}`)),
    linkUuid: (uuid) => {
      const p = uuid.split(".");
      return p[0] === "Compendium" && p.length >= 5 ? anchor(index.get(`${p[2]}:${p.slice(4).join(".")}`)) : null;
    },
    trait: (slug) => {
      const id = traits.idBySlug.get(slug);
      const t = id ? traits.entries.get(id) : undefined;
      return t ? anchor({ collection: "traits", id: t.id, name: t.name.value }) : null;
    },
    skill: (slug) => (skillIds.has(slug) ? anchor({ collection: "skills", id: skillIds.get(slug)!, name: STATISTICS[slug] }) : null),
    weapon: (slug) => anchor(weaponsBySlug.get(slug)),
    traitName: (slug) => traits.name(slug) ?? null,
    field: () => null,
  };
}
