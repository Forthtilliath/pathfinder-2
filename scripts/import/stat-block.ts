/**
 * Stat block helpers shared by the creature, hazard and vehicle adapters:
 * embedded items (strikes, abilities, spells), immunities, weaknesses and resistances.
 */
import { actionCostOf, pascal, type AdapterInput, type FactContext, type FactSpec, type Field } from "./adapter-base.ts";
import { DAMAGE_TYPES } from "./terms.ts";

export interface Item {
  _id: string;
  name: string;
  type: string;
  system: Record<string, any>;
  _stats?: { compendiumSource?: string | null };
  flags?: { core?: { sourceId?: string } };
}

/** Id of the compendium entry an embedded item was copied from (e.g. the ability glossary). */
const sourceIdOf = (item: Item) =>
  /\.Item\.([A-Za-z0-9]{16})$/.exec(item._stats?.compendiumSource ?? item.flags?.core?.sourceId ?? "")?.[1];

/** Translation of an embedded item, or of its compendium source when it kept the same English name. */
function itemTranslation(input: AdapterInput, item: Item) {
  const own = input.lookup(item._id);
  if (own) return own;
  const source = sourceIdOf(item);
  const fromSource = source ? input.lookup(source) : null;
  return fromSource?.translation.englishName === item.name ? fromSource : null;
}

export const SIGN = (n: number) => (n >= 0 ? `+${n}` : `–${Math.abs(n)}`);
const GLYPH: Record<string, string> = { "1": "◆", "2": "◆◆", "3": "◆◆◆", reaction: "⟲", free: "◇" };

export const ATTRIBUTE_SHORT: Record<string, string> = { str: "For", dex: "Dex", con: "Con", int: "Int", wis: "Sag", cha: "Cha" };

const IWR: Record<string, string> = {
  "critical-hits": "coups critiques",
  precision: "précision",
  "object-immunities": "immunités des objets",
  "death-effects": "effets de mort",
  disease: "maladie",
  poison: "poison",
  paralyzed: "paralysé",
  sleep: "sommeil",
  unconscious: "inconscient",
  "fear-effects": "effets de terreur",
  emotion: "émotion",
  mental: "mental",
  visual: "visuel",
  auditory: "auditif",
  controlled: "contrôlé",
  physical: "physiques",
  bleed: "saignement",
  fire: "feu",
  cold: "froid",
  electricity: "électricité",
  acid: "acide",
  sonic: "son",
  force: "force",
  vitality: "vitalité",
  void: "vide",
  spirit: "esprit",
  holy: "sacré",
  unholy: "impie",
  slashing: "tranchant",
  piercing: "perforant",
  bludgeoning: "contondant",
  "area-damage": "dégâts de zone",
  "splash-damage": "dégâts d'éclaboussure",
  "persistent-damage": "dégâts persistants",
  magic: "magie",
  "cold-iron": "fer froid",
  silver: "argent",
  adamantine: "adamantium",
  doomed: "condamné",
  drained: "drainé",
  fatigued: "fatigué",
  "off-guard": "pris au dépourvu",
  grabbed: "agrippé",
  restrained: "entravé",
  "polymorph": "métamorphose",
  "olfactory": "olfactif",
  "spellshape": "façonnage de sort",
};

export const SPEEDS: Record<string, string> = { fly: "vol", swim: "nage", climb: "escalade", burrow: "creusement", travel: "voyage" };
export const ACUITY: Record<string, string> = { imprecise: "imprécis", vague: "vague", precise: "précis" };
const CASTING: Record<string, string> = { prepared: "préparés", spontaneous: "spontanés", innate: "innés", focus: "focalisés", ritual: "rituels" };

/** Creature-type traits used as a list filter. */
export const CREATURE_TYPES = new Set([
  "aberration", "animal", "astral", "beast", "celestial", "construct", "dragon", "dream", "elemental", "ethereal", "fey",
  "fiend", "fungus", "giant", "humanoid", "monitor", "ooze", "plant", "spirit", "time", "undead", "shadow",
]);

function iwrLabel(input: AdapterInput, type: string): string {
  return IWR[type] ?? DAMAGE_TYPES[type]?.replace(/^d['e] ?/, "") ?? input.labels.key(`PF2E.Trait${pascal(type)}`, type);
}

export function iwrList(input: AdapterInput, list: any[] | undefined, withValue: boolean): string | null {
  if (!list?.length) return null;
  return list
    .map((x) => {
      const exceptions = x.exceptions?.length ? ` (sauf ${x.exceptions.map((e: any) => iwrLabel(input, typeof e === "string" ? e : e.label ?? e)).join(", ")})` : "";
      return `${iwrLabel(input, x.type)}${withValue && x.value ? ` ${x.value}` : ""}${exceptions}`;
    })
    .join(", ");
}

/** Embedded items: name and description fields, from pathfinder-fr when available. */
export function itemFields(input: AdapterInput, fields: Map<string, Field>, items: Item[], withDescription: (i: Item) => boolean) {
  for (const item of items) {
    const fr = itemTranslation(input, item);
    fields.set(`item:${item._id}:name`, {
      english: item.name,
      french: fr?.translation.name ? { value: fr.translation.name, provenance: fr.provenance } : undefined,
    });
    const desc = item.system.description?.value ?? "";
    if (withDescription(item) && desc) {
      fields.set(`item:${item._id}:desc`, {
        english: desc,
        french: fr?.translation.description ? { value: fr.translation.description, provenance: fr.provenance } : undefined,
      });
    }
  }
}

export function strikeLine(item: Item, ctx: FactContext): FactSpec | null {
  const name = ctx.field(`item:${item._id}:name`);
  if (!name) return null;
  const traits: string[] = item.system.traits?.value ?? [];
  const ranged = Boolean(item.system.range?.increment || item.system.range?.max) || traits.some((t) => t.startsWith("range"));
  const traitNames = traits.map((t) => ctx.traitName(t)).filter(Boolean);
  const damage = Object.values(item.system.damageRolls ?? {})
    .map((d: any) => {
      const type = DAMAGE_TYPES[d.damageType] ?? "";
      const persistent = d.category === "persistent" ? " persistants" : "";
      return `${d.damage} ${type}${persistent}`.trim();
    })
    .join(" plus ");
  return {
    label: ranged ? "À distance" : "Corps à corps",
    value: `◆ ${name} ${SIGN(item.system.bonus?.value ?? 0)}${traitNames.length ? ` (${traitNames.join(", ")})` : ""}${damage ? `, <strong>Dégâts</strong> ${damage}` : ""}`,
  };
}

export function abilitySections(items: Item[], ctx: FactContext): FactSpec[] {
  return items
    .filter((i) => i.type === "action")
    .map((i) => {
      const name = ctx.field(`item:${i._id}:name`);
      if (!name) return null;
      const cost = actionCostOf(i.system);
      // Abilities without text (standard abilities like Reactive Strike) show their name only.
      return { label: `${name}${cost ? ` ${GLYPH[cost]}` : ""}`, field: `item:${i._id}:desc`, value: " " } as FactSpec;
    })
    .filter(Boolean) as FactSpec[];
}

export function spellSections(items: Item[], ctx: FactContext): FactSpec[] {
  const out: FactSpec[] = [];
  for (const entry of items.filter((i) => i.type === "spellcastingEntry")) {
    const tradition = ctx.traitName(entry.system.tradition?.value ?? "") ?? "";
    const kind = CASTING[entry.system.prepared?.value] ?? "";
    const dc = entry.system.spelldc?.dc;
    const attack = entry.system.spelldc?.value;
    const spells = items.filter((i) => i.type === "spell" && i.system.location?.value === entry._id);
    const byRank = new Map<string, string[]>();
    for (const sp of spells) {
      const cantrip = (sp.system.traits?.value ?? []).includes("cantrip");
      const rank = cantrip ? "Tours de magie" : `Rang ${sp.system.level?.value ?? 1}`;
      const link = ctx.link("spells-srd", sp.name);
      if (link) byRank.set(rank, [...(byRank.get(rank) ?? []), link]);
    }
    if (!byRank.size) continue;
    const ranks = [...byRank].sort(([a], [b]) => (a.startsWith("Tours") ? 1 : b.startsWith("Tours") ? -1 : b.localeCompare(a, "fr", { numeric: true })));
    out.push({
      label: `Sorts ${kind} ${tradition.toLowerCase()}`.replace(/\s+/g, " ").trim(),
      value: [`${dc ? `DD ${dc}` : ""}${attack ? `, attaque ${SIGN(attack)}` : ""}`, ...ranks.map(([r, l]) => `<strong>${r}</strong> ${l.join(", ")}`)]
        .filter(Boolean)
        .join(" ; "),
    });
  }
  return out;
}
