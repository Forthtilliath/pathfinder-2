/** Trait pages: one per French trait label, listing everything that carries the trait. */
import type { CollectionName, Entry, Text } from "../../src/lib/types.ts";
import type { Draft } from "./adapters.ts";
import type { TraitKeys } from "./foundry-lang.ts";
import type { ImportReport } from "./output.ts";
import { FR_LANGUAGE_FILE, text } from "./provenance.ts";
import { slugify } from "./rules.ts";

export interface TraitPages {
  /** Foundry trait slug → French trait id. */
  idBySlug: Map<string, string>;
  /** French trait id → entry. */
  entries: Map<string, Entry>;
  /** French name of a trait from its Foundry slug. */
  name(slug: string): string | undefined;
}

/** Two Foundry traits with the same French label become one page. */
export function buildTraitPages(slugs: Set<string>, traitKeys: TraitKeys, label: (key: string | undefined) => Text | null, report: ImportReport): TraitPages {
  const idBySlug = new Map<string, string>();
  const entries = new Map<string, Entry>();
  for (const slug of [...slugs].sort()) {
    const name = label(traitKeys.labels.get(slug));
    if (!name) {
      report.excluded.push(`traits: ${slug} (label without translation)`);
      continue;
    }
    const id = slugify(name.value);
    idBySlug.set(slug, id);
    const description = label(traitKeys.descriptions.get(slug));
    const existing = entries.get(id);
    if (existing) {
      if (description && !existing.description.value.includes(description.value)) {
        existing.description.value = [existing.description.value, description.value].filter(Boolean).join("\n<hr />\n");
      }
      continue;
    }
    entries.set(id, {
      id,
      collection: "traits",
      name,
      description: description ?? text("", FR_LANGUAGE_FILE),
      subtitle: "Trait",
      traits: [],
      rarity: "common",
      facts: [],
      filters: {},
      related: [],
    });
  }
  return {
    idBySlug,
    entries,
    name: (slug) => {
      const id = idBySlug.get(slug);
      return id ? entries.get(id)?.name.value : undefined;
    },
  };
}

/** Fills the related lists of each trait page: everything carrying the trait (or the tradition, for spells). One pass over the entries. */
export function relateTraits(traits: TraitPages, kept: Draft[], entryByDraft: Map<Draft, Entry>) {
  const groups = new Map<string, Map<CollectionName, string[]>>();
  for (const d of kept) {
    const entry = entryByDraft.get(d)!;
    const ids = new Set(entry.traits);
    for (const slug of d.extraTraits ?? []) {
      const id = traits.idBySlug.get(slug);
      if (id) ids.add(id);
    }
    for (const id of ids) {
      let byCollection = groups.get(id);
      if (!byCollection) groups.set(id, (byCollection = new Map()));
      const list = byCollection.get(d.collection);
      if (list) list.push(entry.id);
      else byCollection.set(d.collection, [entry.id]);
    }
  }
  for (const t of traits.entries.values()) {
    t.related = [...(groups.get(t.id) ?? [])].map(([collection, list]) => ({ title: "", collection, ids: list.sort() }));
  }
}
