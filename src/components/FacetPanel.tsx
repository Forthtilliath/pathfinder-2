export interface FacetOptions {
  key: string;
  label: string;
  options: string[];
}

export type Selection = Record<string, string[]>;

export const activeCount = (selection: Selection) => Object.values(selection).reduce((n, v) => n + v.length, 0);

/** Toggles one facet value; drops the facet once it has no value left. */
export function toggleValue(selection: Selection, key: string, value: string): Selection {
  const values = selection[key] ?? [];
  const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
  const copy = { ...selection, [key]: next };
  if (!next.length) delete copy[key];
  return copy;
}

/** Side panel of facet buttons of the filterable list. */
export default function FacetPanel({
  facets,
  selection,
  open,
  onChange,
}: {
  facets: FacetOptions[];
  selection: Selection;
  open: boolean;
  onChange: (update: (current: Selection) => Selection) => void;
}) {
  return (
    <aside class="facets" data-open={open}>
      {facets.map((f) => (
        <fieldset key={f.key}>
          <legend>{f.label}</legend>
          <div class="facet-options">
            {f.options.map((o) => (
              <button type="button" key={o} aria-pressed={selection[f.key]?.includes(o) ?? false} onClick={() => onChange((s) => toggleValue(s, f.key, o))}>
                {o}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      {activeCount(selection) > 0 && (
        <button type="button" class="clear-filters" onClick={() => onChange(() => ({}))}>
          Effacer les filtres
        </button>
      )}
    </aside>
  );
}
