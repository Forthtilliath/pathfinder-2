/** Adapters of equipment, deities, actions and conditions. */
import { actionCostOf, frequencyFact, list, pascal, type Adapter, type FactSpec } from "./adapter-base.ts";
import { feetToMeters } from "./rules.ts";
import { ACTION_FOLDERS, ARMOR_CATEGORIES, ATTRIBUTES, DAMAGE_LETTERS, DEITY_CATEGORIES, DIVINE_FONTS, EQUIPMENT_TYPES, formatBulk, formatPrice, USAGES, WEAPON_CATEGORIES } from "./terms.ts";

export const equipment: Adapter = (input) => {
  const s = input.doc.system;
  const type = EQUIPMENT_TYPES[input.doc.type] ?? "Équipement";
  const level = s.level?.value ?? 0;
  const groupKey = input.doc.type === "weapon" ? `PF2E.WeaponGroup${pascal(s.group ?? "")}` : input.doc.type === "armor" ? `PF2E.ArmorGroup${pascal(s.group ?? "")}` : null;
  const group = s.group && groupKey ? input.labels.key(groupKey, s.group) : null;
  return {
    fields: new Map(),
    subtitle: `${type} ${level}`,
    level,
    filters: { type: [type], level: [String(level)], group: group ? [group] : [] },
    facts: (ctx) => {
      const facts: (FactSpec | null)[] = [
        formatPrice(s.price?.value) ? { label: "Prix", value: formatPrice(s.price.value)! } : null,
        formatBulk(s.bulk?.value) ? { label: "Encombrement", value: formatBulk(s.bulk.value)! } : null,
        s.usage?.value && USAGES[s.usage.value] ? { label: "Utilisation", value: USAGES[s.usage.value] } : null,
      ];
      if (input.doc.type === "weapon") {
        const d = s.damage;
        facts.push(
          d?.dice ? { label: "Dégâts", value: `${d.dice}${d.die} ${DAMAGE_LETTERS[d.damageType] ?? ""}`.trim() } : null,
          s.category ? { label: "Catégorie", value: WEAPON_CATEGORIES[s.category] ?? s.category } : null,
          group ? { label: "Groupe", value: ctx.link("aon-groups", `weapon:${s.group}`) ?? group } : null,
          s.range ? { label: "Facteur de portée", value: feetToMeters(s.range) } : null,
          s.reload?.value ? { label: "Rechargement", value: String(s.reload.value) } : null,
        );
      }
      if (input.doc.type === "armor") {
        facts.push(
          s.category ? { label: "Catégorie", value: ARMOR_CATEGORIES[s.category] ?? s.category } : null,
          { label: "Bonus à la CA", value: `+${s.acBonus ?? 0}` },
          s.dexCap !== undefined && s.dexCap !== null ? { label: "Dex max", value: `+${s.dexCap}` } : null,
          s.checkPenalty ? { label: "Malus aux tests", value: String(s.checkPenalty) } : null,
          s.speedPenalty ? { label: "Malus de vitesse", value: feetToMeters(Math.abs(s.speedPenalty)).replace(/^/, "–") } : null,
          s.strength ? { label: "Force", value: `+${s.strength}` } : null,
          group ? { label: "Groupe", value: ctx.link("aon-groups", `armor:${s.group}`) ?? group } : null,
        );
      }
      if (input.doc.type === "shield") {
        facts.push(
          { label: "Bonus à la CA", value: `+${s.acBonus ?? 2}` },
          s.hardness ? { label: "Solidité", value: String(s.hardness) } : null,
          s.hp?.max ? { label: "Points de vie", value: `${s.hp.max} (seuil de rupture ${s.hp.brokenThreshold ?? Math.floor(s.hp.max / 2)})` } : null,
        );
      }
      return facts.filter(Boolean) as FactSpec[];
    },
  };
};

export const deities: Adapter = (input) => {
  const s = input.doc.system;
  const category = DEITY_CATEGORIES[s.category] ?? "Divinité";
  const fonts = (s.font ?? []).map((f: string) => DIVINE_FONTS[f]).filter(Boolean);
  const domains = (s.domains?.primary ?? []).map((d: string) => input.labels.key(`PF2E.Item.Deity.Domain.${pascal(d)}.Label`, d));
  const alternate = (s.domains?.alternate ?? []).map((d: string) => input.labels.key(`PF2E.Item.Deity.Domain.${pascal(d)}.Label`, d));
  const sanct = s.sanctification?.what?.length
    ? `${s.sanctification.modal === "must" ? "doit être" : "peut être"} ${s.sanctification.what.map((w: string) => (w === "holy" ? "sacré" : "impie")).join(" ou ")}`
    : null;
  return {
    fields: new Map(),
    subtitle: category,
    filters: { category: [category], font: fonts },
    facts: (ctx) =>
      [
        s.attribute?.length ? { label: "Caractéristiques divines", value: s.attribute.map((a: string) => ATTRIBUTES[a]).join(" ou ") } : null,
        fonts.length ? { label: "Source divine", value: fonts.join(" ou ") } : null,
        sanct ? { label: "Sanctification", value: sanct } : null,
        s.skill?.length ? { label: "Compétence divine", value: list(s.skill.map((k: string) => ctx.skill(k))) } : null,
        s.weapons?.length ? { label: "Arme de prédilection", value: list(s.weapons.map((w: string) => ctx.weapon(w))) } : null,
        domains.length ? { label: "Domaines", value: domains.join(", ") } : null,
        alternate.length ? { label: "Domaines alternatifs", value: alternate.join(", ") } : null,
        Object.keys(s.spells ?? {}).length
          ? {
              label: "Sorts de prêtre",
              value: Object.entries(s.spells)
                .map(([r, uuid]) => {
                  const l = ctx.linkUuid(uuid as string);
                  return l ? `${r} : ${l}` : null;
                })
                .filter(Boolean)
                .join(" ; "),
            }
          : null,
      ].filter((f: any) => f && (f.value || f.field)) as FactSpec[],
  };
};

export const actions: Adapter = (input) => {
  const s = input.doc.system;
  const type = s.actionType?.value ?? "passive";
  const typeLabel = { action: "Action", reaction: "Réaction", free: "Action gratuite" }[type as string] ?? "Activité";
  const category = ACTION_FOLDERS[input.folder] ?? "Autre";
  return {
    fields: new Map(),
    subtitle: typeLabel,
    actionCost: actionCostOf(s),
    filters: { category: [category], type: [typeLabel] },
    facts: () => [frequencyFact(s)].filter(Boolean) as FactSpec[],
  };
};

export const conditions: Adapter = (input) => ({
  fields: new Map(),
  subtitle: input.doc.system.value?.isValued ? "État à valeur" : "État",
  filters: {},
  facts: () => [],
});
