import { useState } from "preact/hooks";

export interface FacetOptions {
  key: string;
  label: string;
  options: string[];
  /** Long facets show only their first options (and the selected ones) until expanded. */
  collapseAfter?: number;
}

/** Options shown: all once expanded, otherwise the first ones plus any selected value. */
export function visibleOptions(f: FacetOptions, selected: string[], expanded: boolean): string[] {
  if (expanded || !f.collapseAfter) return f.options;
  return f.options.filter((o, i) => i < f.collapseAfter! || selected.includes(o));
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

function FacetGroup({
  facet: f,
  selected,
  onChange,
}: {
  facet: FacetOptions;
  selected: string[];
  onChange: (update: (current: Selection) => Selection) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = visibleOptions(f, selected, expanded);
  const hidden = f.options.length - shown.length;
  return (
    <fieldset>
      <legend>{f.label}</legend>
      <div class="facet-options">
        {shown.map((o) => (
          <button
            type="button"
            key={o}
            aria-pressed={selected.includes(o)}
            onClick={() => onChange((s) => toggleValue(s, f.key, o))}
          >
            {o}
          </button>
        ))}
      </div>
      {f.collapseAfter && (hidden > 0 || expanded) && (
        <button type="button" class="facet-more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Afficher moins" : `${hidden} autre${hidden > 1 ? "s" : ""}`}
        </button>
      )}
    </fieldset>
  );
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
        <FacetGroup key={f.key} facet={f} selected={selection[f.key] ?? []} onChange={onChange} />
      ))}
      {activeCount(selection) > 0 && (
        <button type="button" class="clear-filters" onClick={() => onChange(() => ({}))}>
          Effacer les filtres
        </button>
      )}
    </aside>
  );
}
