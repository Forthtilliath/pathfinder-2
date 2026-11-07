/** Adapters of the character options: spells, feats, classes, ancestries, heritages and backgrounds. */
import { actionCostOf, addField, elide, frequencyFact, list, type Adapter, type FactSpec, type Field } from "./adapter-base.ts";
import { feetToMeters, translateArea, translateCastingTime, translateDuration, translateRange, translateTargets } from "./rules.ts";
import { ARMOR_CATEGORIES, ATTRIBUTES, FEAT_CATEGORIES, RANKS, SIZES, STATISTICS, VISIONS } from "./terms.ts";

const rank = (n: number) => RANKS[n] ?? String(n);

/** Class-specific attack proficiencies (system.attacks.other.name). */
const OTHER_ATTACKS: Record<string, string> = {
  "Alchemical Bombs": "bombes alchimiques",
  "Deity's favored weapon": "arme de prédilection de votre divinité",
  "Simple Firearms, Martial Firearms": "armes à feu simples et de guerre",
};

export const spells: Adapter = (input) => {
  const s = input.doc.system;
  const traits: string[] = s.traits?.value ?? [];
  const type = s.ritual || traits.includes("ritual") ? "Rituel" : traits.includes("cantrip") ? "Tour de magie" : traits.includes("focus") ? "Focalisé" : "Sort";
  const rankValue = s.level?.value ?? 0;
  const fields = new Map<string, Field>();
  addField(fields, "range", s.range?.value, input, ["range"], s.range?.value ? translateRange(s.range.value) : null);
  addField(fields, "targets", s.target?.value, input, ["target"], s.target?.value ? translateTargets(s.target.value) : null);
  addField(fields, "cost", s.cost?.value, input, ["cost"]);
  const duration = s.duration?.value ?? "";
  if (duration || s.duration?.sustained) {
    addField(fields, "duration", duration || "sustained", input, ["duration"], translateDuration(duration, Boolean(s.duration?.sustained)));
  }
  if (s.area?.type) {
    const english = `${s.area.value}-foot ${s.area.type}${s.area.details ? ` (${s.area.details})` : ""}`;
    addField(fields, "area", english, input, ["areasize"], s.area.details ? null : translateArea(s.area.type, s.area.value));
  }
  const casting = translateCastingTime(String(s.time?.value ?? ""));
  if (!casting?.actions) addField(fields, "castingTime", String(s.time?.value ?? ""), input, ["time"], casting?.text ?? null);

  const save = s.defense?.save;
  const passive = s.defense?.passive;
  const defense = save?.statistic
    ? `${STATISTICS[save.statistic] ?? save.statistic}${save.basic ? " basique" : ""}`
    : passive?.statistic
      ? STATISTICS[passive.statistic] ?? null
      : null;
  const traditions: string[] = s.traits?.traditions ?? [];

  return {
    fields,
    subtitle: `${type} ${rankValue}`,
    level: rankValue,
    actionCost: casting?.actions,
    filters: { type: [type], rank: [String(rankValue)], tradition: [] },
    extraTraits: traditions,
    facts: (ctx) => {
      const tradLinks = traditions.map((t) => ctx.trait(t)).filter(Boolean) as string[];
      return [
        tradLinks.length ? { label: "Traditions", value: tradLinks.join(", ") } : null,
        fields.has("castingTime") ? { label: "Incantation", field: "castingTime" } : null,
        { label: "Coût", field: "cost" },
        { label: "Portée", field: "range" },
        { label: "Zone", field: "area" },
        { label: "Cibles", field: "targets" },
        defense ? { label: "Défense", value: defense } : null,
        { label: "Durée", field: "duration" },
      ].filter(Boolean) as FactSpec[];
    },
  };
};

export const feats: Adapter = (input) => {
  const s = input.doc.system;
  const traits: string[] = s.traits?.value ?? [];
  const fields = new Map<string, Field>();
  const prereq = (s.prerequisites?.value ?? []).map((p: { value: string }) => p.value).filter(Boolean).join("; ");
  addField(fields, "prerequisites", prereq, input, ["prerequisites", "prerequisite", "prereq"]);
  const category = traits.includes("archetype") ? "Archétype" : FEAT_CATEGORIES[s.category] ?? "Autre";
  const level = s.level?.value ?? 0;
  return {
    fields,
    subtitle: `Don ${level}`,
    level,
    actionCost: actionCostOf(s),
    filters: { category: [category], level: [String(level)] },
    facts: () =>
      [{ label: "Catégorie", value: category }, frequencyFact(s), prereq ? { label: "Prérequis", field: "prerequisites" } : null].filter(Boolean) as FactSpec[],
  };
};

export const classFeatures: Adapter = (input) => {
  const s = input.doc.system;
  const level = s.level?.value ?? 1;
  return {
    fields: new Map(),
    subtitle: `Aptitude de classe ${level}`,
    level,
    actionCost: actionCostOf(s),
    filters: { level: [String(level)] },
    facts: () => [frequencyFact(s)].filter(Boolean) as FactSpec[],
  };
};

export const classes: Adapter = (input) => {
  const s = input.doc.system;
  const keys: string[] = s.keyAbility?.value ?? [];
  const attrs = keys.map((k) => ATTRIBUTES[k]).filter(Boolean);
  return {
    fields: new Map(),
    subtitle: "Classe",
    filters: { attribute: attrs },
    facts: (ctx) => {
      const skills = (s.trainedSkills?.value ?? []).map((k: string) => ctx.skill(k)).filter(Boolean);
      const extra = s.trainedSkills?.additional ?? 0;
      const attacks = Object.entries(s.attacks ?? {})
        .filter(([k, v]) => k !== "other" && typeof v === "number" && v > 0)
        .map(([k, v]) => `${{ simple: "armes simples", martial: "armes de guerre", advanced: "armes évoluées", unarmed: "attaques à mains nues" }[k] ?? k} : ${rank(v as number)}`);
      const other = s.attacks?.other;
      if (other?.rank > 0 && OTHER_ATTACKS[other.name]) attacks.push(`${OTHER_ATTACKS[other.name]} : ${rank(other.rank)}`);
      const className = ctx.field("name")?.toLowerCase();
      const defenses = Object.entries(s.defenses ?? {})
        .filter(([, v]) => typeof v === "number" && (v as number) > 0)
        .map(([k, v]) => `${k === "unarmored" ? "sans armure" : `armure ${ARMOR_CATEGORIES[k] ?? k}`} : ${rank(v as number)}`);
      return [
        { label: "Caractéristique principale", value: attrs.join(" ou ") },
        { label: "Points de vie", value: `${s.hp} + modificateur de Constitution par niveau` },
        { label: "Perception", value: rank(s.perception ?? 0) },
        {
          label: "Jets de sauvegarde",
          value: `Vigueur ${rank(s.savingThrows?.fortitude ?? 0)}, Réflexes ${rank(s.savingThrows?.reflex ?? 0)}, Volonté ${rank(s.savingThrows?.will ?? 0)}`,
        },
        {
          label: "Compétences",
          value: [skills.length ? `qualifié en ${skills.join(", ")}` : "", extra ? `${extra} compétences supplémentaires + modificateur d'Intelligence` : ""]
            .filter(Boolean)
            .join(" ; "),
        },
        attacks.length ? { label: "Attaques", value: attacks.join(" ; ") } : null,
        defenses.length ? { label: "Défenses", value: defenses.join(" ; ") } : null,
        // Read from the class journal page by class-journal.ts (not in the class item).
        s.classDC > 0 && className ? { label: "DD de classe", value: `DD de classe ${elide(className)} : ${rank(s.classDC)}` } : null,
        s.spellcasting > 0 ? { label: "Sorts", value: `jets d'attaque et DD des sorts : ${rank(s.spellcasting)}` } : null,
      ].filter(Boolean) as FactSpec[];
    },
  };
};

function boostList(boosts: Record<string, { value: string[] }> | undefined): string {
  return Object.values(boosts ?? {})
    .map((b) => (b.value.length >= 6 ? "libre" : b.value.map((k) => ATTRIBUTES[k]).join(" ou ")))
    .join(", ");
}

export const ancestries: Adapter = (input) => {
  const s = input.doc.system;
  const languages = (s.languages?.value ?? []).map((l: string) => input.labels.key(`PF2E.Actor.Creature.Language.${l}`, l));
  return {
    fields: new Map(),
    subtitle: "Ascendance",
    filters: {},
    facts: () =>
      [
        { label: "Points de vie", value: String(s.hp) },
        { label: "Taille", value: SIZES[s.size] ?? s.size },
        { label: "Vitesse", value: feetToMeters(s.speed) },
        { label: "Primes de caractéristique", value: boostList(s.boosts) },
        Object.keys(s.flaws ?? {}).length ? { label: "Défaut de caractéristique", value: boostList(s.flaws) } : null,
        languages.length ? { label: "Langues", value: languages.join(", ") } : null,
        s.vision && VISIONS[s.vision] ? { label: "Sens", value: VISIONS[s.vision] } : null,
      ].filter(Boolean) as FactSpec[],
  };
};

export const heritages: Adapter = (input) => {
  const s = input.doc.system;
  return {
    fields: new Map(),
    subtitle: s.ancestry ? "Héritage" : "Héritage polyvalent",
    filters: { ancestry: [] },
    facts: (ctx) => {
      const link = s.ancestry?.uuid ? ctx.linkUuid(s.ancestry.uuid) : null;
      return [{ label: "Ascendance", value: link ?? "polyvalent (toutes ascendances)" }];
    },
  };
};

export const backgrounds: Adapter = (input) => {
  const s = input.doc.system;
  const fields = new Map<string, Field>();
  const lore: string[] = s.trainedSkills?.lore ?? [];
  addField(fields, "lore", lore.join(", "), input, ["lore"]);
  const feat = Object.values(s.items ?? {})[0] as { uuid: string } | undefined;
  return {
    fields,
    subtitle: "Historique",
    filters: { skill: (s.trainedSkills?.value ?? []).map((k: string) => STATISTICS[k]).filter(Boolean) },
    facts: (ctx) =>
      [
        { label: "Primes de caractéristique", value: boostList(s.boosts) },
        { label: "Compétences", value: list((s.trainedSkills?.value ?? []).map((k: string) => ctx.skill(k))) },
        lore.length ? { label: "Connaissance", field: "lore" } : null,
        feat ? { label: "Don", value: ctx.linkUuid(feat.uuid) ?? undefined } : null,
      ].filter((f: any) => f && (f.value || f.field)) as FactSpec[],
  };
};
