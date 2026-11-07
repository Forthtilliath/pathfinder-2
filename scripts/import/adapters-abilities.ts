/**
 * Monster ability glossaries of the Foundry system: universal abilities
 * (Monster Core, NPC Core) and creature family abilities. Both are
 * translated by pathfinder-fr.
 */
import { actionCostOf, frequencyFact, type Adapter, type FactSpec } from "./adapter-base.ts";

const ABILITY_TYPES: Record<string, string> = { action: "Action", reaction: "Réaction", free: "Action gratuite", passive: "Passive" };

const abilityAdapter =
  (kind: string): Adapter =>
  (input) => {
    const s = input.doc.system;
    const type = ABILITY_TYPES[s.actionType?.value ?? "passive"] ?? "Passive";
    return {
      fields: new Map(),
      subtitle: kind,
      actionCost: actionCostOf(s),
      // The family filter is added from the French name, "(Famille) Capacité".
      filters: { kind: [kind], type: [type] },
      facts: () => [frequencyFact(s)].filter(Boolean) as FactSpec[],
    };
  };

export const universalAbilities = abilityAdapter("Capacité universelle");
export const familyAbilities = abilityAdapter("Capacité de famille");

/** "(Dragon adamantin) Souffle" → "Dragon adamantin". */
export const familyOf = (name: string): string | null => /^\(([^)]+)\)/.exec(name)?.[1].trim() ?? null;
