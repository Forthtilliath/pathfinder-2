/**
 * Build-time access to the imported data. Files are read from disk (not
 * bundled), so thousands of entries do not end up inside the build output.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { COLLECTION_BY_NAME, COLLECTION_BY_PATH, COLLECTIONS, entryPath, VIEWS } from "./collections";
import { normalize } from "./normalize";
import type { CollectionName, Entry, ImportMeta, ListItem, ListRow, Preview, Provenance, Text } from "./types";

const DATA_DIR = path.join(process.cwd(), "src/data");
const cache = new Map<CollectionName, Entry[]>();

export function entries(collection: CollectionName): Entry[] {
  let list = cache.get(collection);
  if (!list) {
    const file = path.join(DATA_DIR, `${collection}.json`);
    list = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Entry[]) : [];
    cache.set(collection, list);
  }
  return list;
}

const countCache = new Map<string, number>();

/** Number of entries on a list page (collection or view), by URL path. */
export function pageCount(pagePath: string): number {
  let n = countCache.get(pagePath);
  if (n === undefined) {
    const collection = COLLECTION_BY_PATH[pagePath];
    const view = VIEWS.find((v) => v.path === pagePath);
    n = collection ? entries(collection.name).length : view ? entries(view.base).filter((e) => e.filters[view.filter.key]?.includes(view.filter.value)).length : 0;
    countCache.set(pagePath, n);
  }
  return n;
}

export const meta = JSON.parse(readFileSync(path.join(DATA_DIR, "meta.json"), "utf8")) as ImportMeta;

let byKey: Map<string, Entry> | null = null;
export function findEntry(collection: CollectionName, id: string): Entry | undefined {
  byKey ??= new Map(COLLECTIONS.flatMap((c) => entries(c.name).map((e) => [`${c.name}/${e.id}`, e] as const)));
  return byKey.get(`${collection}/${id}`);
}

export const entryUrl = (e: { collection: CollectionName; id: string }) => `/${entryPath(e.collection, e.id)}/`;
export { entryPath };

export function traitName(id: string): string {
  return findEntry("traits", id)?.name.value ?? id;
}

export function listRow(e: Entry): ListRow {
  return {
    id: e.id,
    name: e.name.value,
    subtitle: e.subtitle,
    cost: e.actionCost,
    rarity: e.rarity,
    filters: e.filters,
    search: normalize([e.name.value, ...e.traits.map(traitName)].join(" ")),
  };
}

/** Display fields only (no undefined key, so nothing extra gets serialized). */
export const listItem = ({ id, name, subtitle, cost, rarity }: ListRow): ListItem => (cost ? { id, name, subtitle, cost, rarity } : { id, name, subtitle, rarity });

const rowCache = new Map<CollectionName, ListRow[]>();

/** List rows of a collection, optionally narrowed to one facet value (views). Computed once per collection. */
export function listRows(collection: CollectionName, filter?: { key: string; value: string }): ListRow[] {
  let rows = rowCache.get(collection);
  if (!rows) {
    rows = entries(collection).map(listRow);
    rowCache.set(collection, rows);
  }
  return filter ? rows.filter((r) => r.filters[filter.key]?.includes(filter.value)) : rows;
}

/** Plain text without tags, for excerpts. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function preview(e: Entry): Preview {
  const plain = plainText(e.description.value) || e.facts.map((f) => `${f.label} : ${plainText(f.value.value)}`).join(" · ");
  return { name: e.name.value, subtitle: e.subtitle, excerpt: plain.length > 320 ? `${plain.slice(0, 320).replace(/\s\S*$/, "")}…` : plain };
}

export const collectionTitle = (c: CollectionName) => COLLECTION_BY_NAME[c].title;

/* ------------------------------------------------------------------ */
/* Provenance                                                          */
/* ------------------------------------------------------------------ */

const SOURCE_LABELS: Record<Provenance["source"], string> = {
  "pathfinder-fr": "traduction de la communauté Pathfinder-fr",
  bbe: "traduction officielle de Black Book Éditions",
  site: "traduction du site",
  "foundry-pf2e": "système Pathfinder 2e de Foundry VTT",
  aon: "Archives of Nethys",
};

export function describeProvenance(p: Provenance): string {
  const parts = [SOURCE_LABELS[p.source]];
  if (p.source === "site") parts.push(p.method === "ai" ? "automatique" : p.method === "rule" ? "par règle de conversion" : "manuelle");
  parts.push(p.sourceLanguage === "en" ? "depuis l'anglais" : "texte original français");
  if (p.status === "unreviewed") parts.push("non relue");
  if (p.status === "outdated") parts.push("la version anglaise a changé depuis");
  return parts.join(", ");
}

const provenanceKey = (p: Provenance) => `${p.source}|${p.sourceLanguage}|${p.status}|${p.method}`;

/** Groups the texts of an entry by identical provenance. */
export function groupByProvenance(fields: [string, Text | undefined][]): { labels: string[]; provenance: Provenance }[] {
  const groups = new Map<string, { labels: string[]; provenance: Provenance }>();
  for (const [label, t] of fields) {
    if (!t || !t.value) continue;
    const key = provenanceKey(t.provenance);
    const group = groups.get(key) ?? { labels: [], provenance: t.provenance };
    group.labels.push(label);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function entryTexts(e: Entry): [string, Text][] {
  return [
    ["nom", e.name],
    ["description", e.description],
    ...(e.chapters ?? []).map((t) => ["jeu de rôle", t] as [string, Text]),
    ...[...e.facts, ...(e.sections ?? [])].map((f) => [f.label.toLowerCase(), f.value] as [string, Text]),
  ];
}

export const hasUnreviewedTranslation = (texts: Text[]) =>
  texts.some((t) => t.provenance.source === "site" && t.provenance.method === "ai" && t.provenance.status === "unreviewed");
