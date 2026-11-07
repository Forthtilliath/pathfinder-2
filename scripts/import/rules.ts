/**
 * Deterministic translations of short recurring values (ranges, durations,
 * casting times…). They avoid calling the model for "30 feet" and keep
 * a consistent French wording.
 */
import type { ActionCost } from "../../src/lib/types.ts";

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const frenchNumber = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

/** 5 feet = 1.5 m (French edition convention). */
export const feetToMeters = (feet: number) => `${frenchNumber(feet * 0.3)} m`;
export const milesToKm = (miles: number) => `${frenchNumber(miles * 1.5)} km`;

const TIME_UNITS: Record<string, [string, string]> = {
  round: ["round", "rounds"],
  minute: ["minute", "minutes"],
  hour: ["heure", "heures"],
  day: ["jour", "jours"],
  week: ["semaine", "semaines"],
  month: ["mois", "mois"],
  year: ["an", "ans"],
};

function simpleDuration(value: string): string | null {
  const m = /^(\d+)\s+(round|minute|hour|day|week|month|year)s?$/i.exec(value.trim());
  if (!m) return null;
  const n = Number(m[1]);
  const [singular, plural] = TIME_UNITS[m[2].toLowerCase()];
  return `${n} ${n > 1 ? plural : singular}`;
}

export function translateRange(value: string): string | null {
  const v = value.trim().toLowerCase();
  const fixed: Record<string, string> = {
    touch: "contact",
    planetary: "planétaire",
    unlimited: "illimitée",
    varies: "variable",
    interplanar: "interplanaire",
  };
  if (fixed[v]) return fixed[v];
  let m = /^(\d+)\s*(?:feet|foot|ft\.?)$/.exec(v);
  if (m) return feetToMeters(Number(m[1]));
  m = /^(\d+)\s*miles?$/.exec(v);
  if (m) return milesToKm(Number(m[1]));
  return null;
}

export function translateDuration(value: string, sustained: boolean): string | null {
  const v = value.trim().toLowerCase();
  if (!v) return sustained ? "maintenu" : null;
  const fixed: Record<string, string> = {
    unlimited: "illimitée",
    varies: "variable",
    "until the end of your next turn": "jusqu'à la fin de votre prochain tour",
    "until the start of your next turn": "jusqu'au début de votre prochain tour",
    "until the end of your turn": "jusqu'à la fin de votre tour",
    "until the end of the target's next turn": "jusqu'à la fin du prochain tour de la cible",
    "until your next daily preparations": "jusqu'à vos prochains préparatifs quotidiens",
  };
  const base = fixed[v] ?? simpleDuration(v);
  if (base === null) return null;
  if (!sustained) return base;
  return /^\d/.test(base) ? `maintenu jusqu'à ${base}` : `maintenu (${base})`;
}

/** Casting time: either an action cost or a duration in words. */
export function translateCastingTime(value: string): { actions?: ActionCost; text?: string } | null {
  const v = value.trim().toLowerCase();
  if (["1", "2", "3"].includes(v)) return { actions: v as ActionCost };
  const ranges: Record<string, ActionCost> = {
    "1 to 3": "1-3",
    "1 - 3": "1-3",
    "1 or 2": "1-2",
    "1 to 2": "1-2",
    "2 or 3": "2-3",
    "2 to 3": "2-3",
    reaction: "reaction",
    free: "free",
  };
  if (ranges[v]) return { actions: ranges[v] };
  const duration = simpleDuration(v);
  return duration ? { text: duration } : null;
}

export function translateTargets(value: string): string | null {
  const v = value.trim().toLowerCase();
  const fixed: Record<string, string> = {
    "1 creature": "1 créature",
    "1 willing creature": "1 créature consentante",
    "1 object": "1 objet",
    "1 creature or object": "1 créature ou objet",
    "1 living creature": "1 créature vivante",
    "1 undead creature": "1 créature morte-vivante",
    "1 enemy": "1 ennemi",
    "1 ally": "1 allié",
    you: "vous",
    "you and allies in the area": "vous et vos alliés dans la zone",
  };
  if (fixed[v]) return fixed[v];
  const m = /^(\d+|up to \d+) (willing )?creatures$/.exec(v);
  if (m) return `${m[1].replace("up to", "jusqu'à")} créatures${m[2] ? " consentantes" : ""}`;
  return null;
}

const AREA_TYPES: Record<string, string> = {
  burst: "explosion",
  emanation: "émanation",
  cone: "cône",
  line: "ligne",
  square: "carré",
  cube: "cube",
  cylinder: "cylindre",
  wall: "mur",
};

export function translateArea(type: string, distance: number | string): string | null {
  const name = AREA_TYPES[type];
  if (!name) return null;
  const n = Number(distance);
  return Number.isFinite(n) && n > 0 ? `${name} de ${feetToMeters(n)}` : name;
}

const PERIODS: Record<string, string> = {
  round: "par round",
  turn: "par tour",
  day: "par jour",
  PT1M: "par minute",
  PT10M: "par 10 minutes",
  PT1H: "par heure",
  PT24H: "par 24 heures",
  P1W: "par semaine",
  P1M: "par mois",
  P1Y: "par an",
};

export function translateFrequency(max: number, per: string): string | null {
  const period = PERIODS[per];
  if (!period) return null;
  const times = max === 1 ? "une fois" : max === 2 ? "deux fois" : `${max} fois`;
  return `${times} ${period}`;
}
