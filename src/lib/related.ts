import { collectionTitle, findEntry } from "./data";
import { slugify } from "./normalize";
import type { Entry, Related } from "./types";

/** Lists longer than this, whose entries all have a level, are shown by level. */
const BY_LEVEL_MIN = 8;

export interface RelatedGroup {
  title: string;
  /** Anchor of the section, also listed in the table of contents. */
  id: string;
  items: Entry[];
  levels: [number, Entry[]][] | null;
}

/** Related lists of an entry, as rendered on its page (empty lists dropped). */
export function relatedGroups(related: Related[]): RelatedGroup[] {
  return related
    .map((r) => {
      const title = r.title || collectionTitle(r.collection);
      const items = r.ids.map((id) => findEntry(r.collection, id)).filter((e): e is Entry => e !== undefined);
      const byLevel = items.length >= BY_LEVEL_MIN && items.every((e) => e.level !== undefined);
      const levels = new Map<number, Entry[]>();
      if (byLevel)
        for (const e of items) {
          const list = levels.get(e.level!);
          if (list) list.push(e);
          else levels.set(e.level!, [e]);
        }
      return { title, id: slugify(title), items, levels: byLevel ? [...levels].sort(([a], [b]) => a - b) : null };
    })
    .filter((g) => g.items.length);
}
