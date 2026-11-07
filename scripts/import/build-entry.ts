/** Step 7 of the import: a translated draft becomes a site entry (facts, filters, traits, book). */
import type { Entry, Fact, Rarity, Text } from "../../src/lib/types.ts";
import type { Draft, FactContext, FactSpec } from "./adapters.ts";
import { familyOf } from "./adapters-abilities.ts";
import { RARITY_LABELS, RULE, siteTranslation, text } from "./provenance.ts";
import { RARITY_TRAITS } from "./terms.ts";
import type { TraitPages } from "./trait-pages.ts";

export interface EntryContext {
  facts: FactContext;
  traits: TraitPages;
  /** Replaces ⟪key⟫ label tokens; null when a label is missing. */
  resolveTokens(value: string): { value: string; ai: boolean } | null;
  /** Final HTML: Foundry syntax rendered, then sanitized. */
  toHtml(value: string): string;
  bookName(title: string): Text | undefined;
}

const enrichText = (ctx: EntryContext, t: Text): Text => ({ ...t, value: ctx.toHtml(t.value) });

export const publicationTitle = (d: Draft): string =>
  (d.doc.system.publication ?? d.doc.system.details?.publication)?.title ?? "";

export function buildEntry(d: Draft, ctx: EntryContext): Entry {
  const s = d.doc.system;
  const ctxForDraft: FactContext = { ...ctx.facts, field: (key) => d.fields.get(key)?.french?.value ?? null };
  const build = (specs: FactSpec[]): Fact[] => {
    const out: Fact[] = [];
    for (const spec of specs) {
      const label = ctx.resolveTokens(spec.label)?.value ?? spec.label;
      const f = spec.field ? d.fields.get(spec.field)?.french : undefined;
      if (f) {
        out.push({ label, value: enrichText(ctx, f) });
        continue;
      }
      if (!spec.value) continue;
      const resolved = ctx.resolveTokens(spec.value);
      if (resolved)
        out.push({
          label,
          value: text(ctx.toHtml(resolved.value), resolved.ai ? siteTranslation("unreviewed") : RULE),
        });
    }
    return out;
  };
  const facts = build(d.facts(ctxForDraft));
  const sections = d.sections ? build(d.sections(ctxForDraft)) : [];
  const filters: Record<string, string[]> = {};
  for (const [key, values] of Object.entries(d.filters)) {
    filters[key] = values.map((v) => ctx.resolveTokens(v)?.value).filter((v): v is string => Boolean(v));
  }
  const traitSlugs: string[] = (s.traits?.value ?? []).filter((t: string) => !RARITY_TRAITS.has(t));
  const rarity = (
    ["common", "uncommon", "rare", "unique"].includes(s.traits?.rarity) ? s.traits.rarity : "common"
  ) as Rarity;
  filters.rarity = [RARITY_LABELS[rarity]];
  if (d.collection === "feats") filters.trait = traitSlugs.map(ctx.traits.name).filter(Boolean) as string[];
  if (d.collection === "spells")
    filters.tradition = (d.extraTraits ?? []).map(ctx.traits.name).filter(Boolean) as string[];
  const family = d.collection === "monsterAbilities" ? familyOf(d.name!) : null;
  if (family) filters.family = [family];
  const book = ctx.bookName(publicationTitle(d));
  // Book facet; some sources set their own (rules: "Écran du MJ").
  if (book && !filters.book) filters.book = [book.value];
  const roleplay = d.fields.get("roleplay")?.french;

  return {
    id: d.id!,
    collection: d.collection,
    foundryId: d.doc._id,
    name: d.fields.get("name")!.french!,
    description: enrichText(ctx, d.fields.get("description")!.french ?? text("", RULE)),
    subtitle: d.subtitle,
    level: d.level,
    actionCost: d.actionCost,
    traits: [...new Set(traitSlugs.map((t) => ctx.traits.idBySlug.get(t)).filter(Boolean) as string[])],
    rarity,
    book: book
      ? { name: book, license: (s.publication ?? s.details?.publication)?.license === "OGL" ? "OGL" : "ORC" }
      : undefined,
    facts,
    sections: sections.length ? sections : undefined,
    chapters: roleplay ? [enrichText(ctx, roleplay)] : undefined,
    filters,
    related: [],
  };
}
