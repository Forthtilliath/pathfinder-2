/**
 * Adapters for documents with a stat block: creatures, hazards, vehicles,
 * and familiar abilities. Embedded items (strikes, abilities, spells) are
 * translated as extra fields named "item:<id>:name" and "item:<id>:desc".
 */
import { actionCostOf, addField, frequencyFact, pascal, type Adapter, type FactSpec, type Field } from "./adapter-base.ts";
import { feetToMeters } from "./rules.ts";
import { abilitySections, ACUITY, ATTRIBUTE_SHORT, CREATURE_TYPES, itemFields, iwrList, SIGN, SPEEDS, spellSections, strikeLine, type Item } from "./stat-block.ts";
import { ATTRIBUTES, SIZES, STATISTICS, VISIONS } from "./terms.ts";

export const creatures: Adapter = (input) => {
  const doc = input.doc as typeof input.doc & { items?: Item[] };
  const s = doc.system;
  const items = doc.items ?? [];
  const level = s.details?.level?.value ?? 0;
  const traits: string[] = s.traits?.value ?? [];
  const fields = new Map<string, Field>();
  const shown = items.filter((i) => ["action", "melee", "lore"].includes(i.type));
  itemFields(input, fields, shown, (i) => i.type === "action");
  const strikeTraits = items.filter((i) => i.type === "melee").flatMap((i) => i.system.traits?.value ?? []);
  const languages = (s.details?.languages?.value ?? []).map((l: string) => input.labels.key(`PF2E.Actor.Creature.Language.${l}`, l));
  const senses = (s.perception?.senses ?? []).map((x: any) => {
    const name = VISIONS[x.type] ?? input.labels.key(`PF2E.Actor.Creature.Sense.Type.${pascal(x.type)}`, x.type).toLowerCase();
    return `${name}${x.acuity && x.acuity !== "precise" ? ` (${ACUITY[x.acuity] ?? x.acuity})` : ""}${x.range ? ` ${feetToMeters(x.range)}` : ""}`;
  });
  return {
    fields,
    description: s.details?.publicNotes ?? "",
    subtitle: `Créature ${level}`,
    level,
    filters: { level: [String(level)], type: traits.filter((t) => CREATURE_TYPES.has(t)).map((t) => `⟪trait:${t}⟫`), size: [SIZES[s.traits?.size?.value] ?? ""].filter(Boolean) },
    extraTraits: strikeTraits,
    facts: (ctx) => {
      const skills = Object.entries(s.skills ?? {})
        .filter(([k]) => STATISTICS[k])
        .map(([k, v]: [string, any]) => `${STATISTICS[k]} ${SIGN(v.base ?? v.value ?? 0)}`);
      const lores = items.filter((i) => i.type === "lore").map((i) => {
        const n = ctx.field(`item:${i._id}:name`);
        return n ? `${n} ${SIGN(i.system.mod?.value ?? 0)}` : null;
      });
      const speeds = [feetToMeters(s.attributes?.speed?.value ?? 0), ...(s.attributes?.speed?.otherSpeeds ?? []).map((o: any) => `${SPEEDS[o.type] ?? o.type} ${feetToMeters(o.value)}`)];
      const saves = s.saves ?? {};
      const strikes = items.filter((i) => i.type === "melee").map((i) => strikeLine(i, ctx));
      return [
        { label: "Taille", value: SIZES[s.traits?.size?.value] ?? "" },
        { label: "Perception", value: `${SIGN(s.perception?.mod ?? 0)}${senses.length ? ` ; ${senses.join(", ")}` : ""}` },
        languages.length ? { label: "Langues", value: languages.join(", ") } : null,
        skills.length || lores.some(Boolean) ? { label: "Compétences", value: [...skills, ...lores.filter(Boolean)].join(", ") } : null,
        { label: "Caractéristiques", value: Object.entries(ATTRIBUTE_SHORT).map(([k, short]) => `${short} ${SIGN(s.abilities?.[k]?.mod ?? 0)}`).join(", ") },
        { label: "CA", value: String(s.attributes?.ac?.value ?? "") },
        { label: "Jets de sauvegarde", value: `Vig ${SIGN(saves.fortitude?.value ?? 0)}, Réf ${SIGN(saves.reflex?.value ?? 0)}, Vol ${SIGN(saves.will?.value ?? 0)}` },
        { label: "Points de vie", value: String(s.attributes?.hp?.max ?? "") },
        iwrList(input, s.attributes?.immunities, false) ? { label: "Immunités", value: iwrList(input, s.attributes.immunities, false)! } : null,
        iwrList(input, s.attributes?.weaknesses, true) ? { label: "Faiblesses", value: iwrList(input, s.attributes.weaknesses, true)! } : null,
        iwrList(input, s.attributes?.resistances, true) ? { label: "Résistances", value: iwrList(input, s.attributes.resistances, true)! } : null,
        { label: "Vitesse", value: speeds.join(", ") },
        ...strikes,
      ].filter((f: any) => f && (f.value || f.field)) as FactSpec[];
    },
    sections: (ctx) => [...spellSections(items, ctx), ...abilitySections(items, ctx)],
  };
};

export const hazards: Adapter = (input) => {
  const doc = input.doc as typeof input.doc & { items?: Item[] };
  const s = doc.system;
  const items = doc.items ?? [];
  const level = s.details?.level?.value ?? 0;
  const complex = Boolean(s.details?.isComplex);
  const fields = new Map<string, Field>();
  addField(fields, "stealth", s.attributes?.stealth?.details, input, ["stealth"]);
  addField(fields, "disable", s.details?.disable, input, ["disable"]);
  addField(fields, "routine", s.details?.routine, input, ["routine"]);
  addField(fields, "reset", s.details?.reset, input, ["reset"]);
  itemFields(input, fields, items.filter((i) => ["action", "melee"].includes(i.type)), (i) => i.type === "action");
  return {
    fields,
    description: s.details?.description ?? "",
    subtitle: `${complex ? "Danger complexe" : "Danger"} ${level}`,
    level,
    filters: { level: [String(level)], complexity: [complex ? "Complexe" : "Simple"] },
    facts: (ctx) =>
      [
        { label: "Discrétion", value: `${SIGN(s.attributes?.stealth?.value ?? 0)}${ctx.field("stealth") ? ` ${ctx.field("stealth")!.replace(/<\/?p>/g, "")}` : ""}` },
        { label: "Désamorçage", field: "disable" },
        s.attributes?.ac?.value ? { label: "CA", value: String(s.attributes.ac.value) } : null,
        s.saves && Object.keys(s.saves).length
          ? {
              label: "Jets de sauvegarde",
              value: [["fortitude", "Vig"], ["reflex", "Réf"], ["will", "Vol"]]
                .filter(([k]) => s.saves[k]?.value)
                .map(([k, l]) => `${l} ${SIGN(s.saves[k].value)}`)
                .join(", "),
            }
          : null,
        s.attributes?.hardness ? { label: "Solidité", value: String(s.attributes.hardness) } : null,
        s.attributes?.hp?.max ? { label: "Points de vie", value: String(s.attributes.hp.max) } : null,
        iwrList(input, s.attributes?.immunities, false) ? { label: "Immunités", value: iwrList(input, s.attributes.immunities, false)! } : null,
        ...items.filter((i) => i.type === "melee").map((i) => strikeLine(i, ctx)),
      ].filter((f: any) => f && (f.value || f.field)) as FactSpec[],
    sections: (ctx) =>
      [
        ...abilitySections(items, ctx),
        ctx.field("routine") ? { label: "Routine", field: "routine" } : null,
        ctx.field("reset") ? { label: "Réinitialisation", field: "reset" } : null,
      ].filter(Boolean) as FactSpec[],
  };
};

export const vehicles: Adapter = (input) => {
  const doc = input.doc as typeof input.doc & { items?: Item[] };
  const s = doc.system;
  const d = s.details ?? {};
  const items = doc.items ?? [];
  const level = d.level?.value ?? 0;
  const fields = new Map<string, Field>();
  addField(fields, "crew", d.crew, input, ["crew"]);
  addField(fields, "passengers", d.passengers ? String(d.passengers) : "", input, ["passengers"]);
  addField(fields, "piloting", d.pilotingCheck, input, ["pilotingcheck", "piloting"]);
  addField(fields, "speed", d.speed, input, ["speed"]);
  itemFields(input, fields, items.filter((i) => i.type === "action"), () => true);
  return {
    fields,
    description: d.description ?? "",
    subtitle: `Véhicule ${level}`,
    level,
    filters: { level: [String(level)] },
    facts: () =>
      [
        d.price ? { label: "Prix", value: `${d.price} po` } : null,
        d.space ? { label: "Espace", value: `${feetToMeters(d.space.long)} de long, ${feetToMeters(d.space.wide)} de large, ${feetToMeters(d.space.high)} de haut` } : null,
        { label: "Équipage", field: "crew" },
        { label: "Passagers", field: "passengers" },
        { label: "Pilotage", field: "piloting" },
        s.attributes?.ac?.value ? { label: "CA", value: String(s.attributes.ac.value) } : null,
        s.saves?.fortitude?.value ? { label: "Vigueur", value: SIGN(s.saves.fortitude.value) } : null,
        s.attributes?.hardness ? { label: "Solidité", value: String(s.attributes.hardness) } : null,
        s.attributes?.hp?.max ? { label: "Points de vie", value: String(s.attributes.hp.max) } : null,
        iwrList(input, s.attributes?.immunities, false) ? { label: "Immunités", value: iwrList(input, s.attributes.immunities, false)! } : null,
        { label: "Vitesse", field: "speed" },
        s.attributes?.collisionDamage?.value ? { label: "Collision", value: `${s.attributes.collisionDamage.value} (DD ${s.attributes.collisionDC?.value ?? "?"})` } : null,
      ].filter(Boolean) as FactSpec[],
    sections: (ctx) => abilitySections(items, ctx),
  };
};

export const familiarAbilities: Adapter = (input) => {
  const s = input.doc.system;
  const master = /master/i.test(input.folder) || (s.traits?.value ?? []).includes("master");
  return {
    fields: new Map(),
    subtitle: master ? "Pouvoir de maître" : "Pouvoir de familier",
    actionCost: actionCostOf(s),
    filters: { type: [master ? "Pouvoir de maître" : "Pouvoir de familier"] },
    facts: () => [frequencyFact(s)].filter(Boolean) as FactSpec[],
  };
};

export { ATTRIBUTES };
