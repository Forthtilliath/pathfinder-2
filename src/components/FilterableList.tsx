import { useEffect, useMemo, useState } from "preact/hooks";
import { normalize } from "../lib/normalize";
import type { ListItem, ListRow } from "../lib/types";
import ActionGlyph from "./ActionGlyph.tsx";
import FacetPanel, { activeCount, type FacetOptions, type Selection } from "./FacetPanel.tsx";

export type { FacetOptions };

const STEP = 200;

function readUrl(facets: FacetOptions[]): { query: string; selection: Selection } {
  const params = new URLSearchParams(window.location.search);
  const selection: Selection = {};
  for (const f of facets) {
    const values = params.getAll(f.key);
    if (values.length) selection[f.key] = values;
  }
  return { query: params.get("q") ?? "", selection };
}

function writeUrl(query: string, selection: Selection) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  for (const [key, values] of Object.entries(selection)) for (const v of values) params.append(key, v);
  const search = params.toString();
  history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
}

/**
 * Filterable list. The server renders the first rows; the full list is
 * fetched as JSON on load, so large collections stay light in HTML.
 */
export default function FilterableList({
  allRows,
  initialItems,
  total,
  dataUrl,
  basePath,
  facets,
  noun,
}: {
  /** Every row, for short lists (nothing to fetch). */
  allRows?: ListRow[];
  /** First rows of a long list, shown until the full list arrives. */
  initialItems: ListItem[];
  total: number;
  dataUrl: string;
  basePath: string;
  facets: FacetOptions[];
  noun: string;
}) {
  const [rows, setRows] = useState<ListRow[] | null>(allRows ?? null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection>({});
  // False until the state is read from the URL, so the first render does not wipe the URL.
  const [ready, setReady] = useState(false);
  const [facetsOpen, setFacetsOpen] = useState(false);
  const [limit, setLimit] = useState(STEP);

  useEffect(() => {
    const state = readUrl(facets);
    setQuery(state.query);
    setSelection(state.selection);
    setReady(true);
    if (!rows) {
      fetch(dataUrl)
        .then((r) => (r.ok ? (r.json() as Promise<ListRow[]>) : Promise.reject(new Error(r.statusText))))
        .then(setRows)
        .catch(() => setFailed(true));
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeUrl(query, selection);
    setLimit(STEP);
  }, [ready, query, selection]);

  const results: ListItem[] = useMemo(() => {
    if (!rows) return initialItems;
    const words = normalize(query).split(/\s+/).filter(Boolean);
    const active = Object.entries(selection).filter(([, values]) => values.length);
    if (!words.length && !active.length) return rows;
    return rows.filter(
      (row) =>
        words.every((w) => row.search.includes(w)) && active.every(([key, values]) => values.some((v) => row.filters[key]?.includes(v))),
    );
  }, [rows, query, selection]);

  const count = activeCount(selection);
  const visibleFacets = facets.filter((f) => f.options.length > 1);

  return (
    <div class="list">
      <div class="list-tools">
        <label class="filter-field">
          <span class="visually-hidden">Filtrer par nom</span>
          <input
            type="search"
            value={query}
            onInput={(e) => setQuery(e.currentTarget.value)}
            placeholder={`Filtrer les ${noun}…`}
            autocomplete="off"
          />
        </label>
        {visibleFacets.length > 0 && (
          <button type="button" class="filters-toggle" aria-expanded={facetsOpen} onClick={() => setFacetsOpen((o) => !o)}>
            Filtres{count ? ` (${count})` : ""}
          </button>
        )}
      </div>

      <div class={visibleFacets.length ? "list-body" : "list-body no-facets"}>
        {visibleFacets.length > 0 && <FacetPanel facets={visibleFacets} selection={selection} open={facetsOpen} onChange={setSelection} />}
        <div class="results">
          <p class="result-count" aria-live="polite">
            {rows
              ? `${results.length} ${results.length > 1 ? "résultats" : "résultat"}`
              : failed
                ? `${initialItems.length} premiers sur ${total} : la liste complète n'a pas pu être chargée.`
                : `${total} au total, chargement…`}
          </p>
          {results.length === 0 ? (
            <p class="empty-state">Aucun résultat. Retirez un filtre ou raccourcissez la recherche.</p>
          ) : (
            <ul>
              {results.slice(0, limit).map((row) => (
                <li key={row.id}>
                  <a href={`/${basePath}/${row.id}/`} data-preview={`${basePath}/${row.id}`}>
                    <span class="entry-name" data-rarity={row.rarity}>
                      {row.name}
                    </span>
                    {row.cost && <ActionGlyph cost={row.cost} />}
                  </a>
                  <span class="subtitle">{row.subtitle}</span>
                </li>
              ))}
            </ul>
          )}
          {results.length > limit && (
            <button type="button" class="load-more" onClick={() => setLimit((l) => l + STEP)}>
              Afficher {Math.min(STEP, results.length - limit)} de plus ({results.length - limit} restants)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
