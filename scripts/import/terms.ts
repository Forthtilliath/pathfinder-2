/**
 * Core French terms used when the language files have no translation.
 * Provenance: site (rule).
 */
export const STATISTICS: Record<string, string> = {
  fortitude: "Vigueur",
  reflex: "Réflexes",
  will: "Volonté",
  perception: "Perception",
  acrobatics: "Acrobaties",
  arcana: "Arcanes",
  athletics: "Athlétisme",
  crafting: "Artisanat",
  deception: "Duperie",
  diplomacy: "Diplomatie",
  intimidation: "Intimidation",
  medicine: "Médecine",
  nature: "Nature",
  occultism: "Occultisme",
  performance: "Représentation",
  religion: "Religion",
  society: "Société",
  stealth: "Discrétion",
  survival: "Survie",
  thievery: "Vol",
  ac: "CA",
};

/** Damage type as it follows "dégâts" ("6d6 dégâts de feu"). */
export const DAMAGE_TYPES: Record<string, string> = {
  bludgeoning: "contondants",
  piercing: "perforants",
  slashing: "tranchants",
  acid: "d'acide",
  cold: "de froid",
  electricity: "d'électricité",
  fire: "de feu",
  sonic: "de son",
  force: "de force",
  mental: "mentaux",
  poison: "de poison",
  bleed: "de saignement",
  vitality: "de vitalité",
  void: "de vide",
  spirit: "spirituels",
  untyped: "",
};

export const ACTION_CATEGORIES = new Set(["interaction", "offensive", "defensive", "familiar"]);

/** Rarity traits: never shown as traits, they feed the rarity field. */
export const RARITY_TRAITS = new Set(["common", "uncommon", "rare", "unique"]);

export const ATTRIBUTES: Record<string, string> = {
  str: "Force",
  dex: "Dextérité",
  con: "Constitution",
  int: "Intelligence",
  wis: "Sagesse",
  cha: "Charisme",
};

export const RANKS = ["inexpérimenté", "qualifié", "expert", "maître", "légendaire"];

export const SIZES: Record<string, string> = {
  tiny: "Très petite",
  sm: "Petite",
  med: "Moyenne",
  lg: "Grande",
  huge: "Très grande",
  grg: "Gigantesque",
};

export const VISIONS: Record<string, string> = {
  "low-light-vision": "vision nocturne",
  darkvision: "vision dans le noir",
  "greater-darkvision": "vision dans le noir supérieure",
};

export const FEAT_CATEGORIES: Record<string, string> = {
  ancestry: "Ascendance",
  class: "Classe",
  general: "Général",
  skill: "Compétence",
  bonus: "Bonus",
  classfeature: "Aptitude de classe",
};

export const EQUIPMENT_TYPES: Record<string, string> = {
  weapon: "Arme",
  armor: "Armure",
  shield: "Bouclier",
  consumable: "Consommable",
  equipment: "Équipement",
  ammo: "Munition",
  treasure: "Trésor",
  backpack: "Contenant",
  kit: "Kit",
};

export const WEAPON_CATEGORIES: Record<string, string> = {
  simple: "simple",
  martial: "de guerre",
  advanced: "évoluée",
  unarmed: "à mains nues",
};

export const ARMOR_CATEGORIES: Record<string, string> = {
  unarmored: "sans armure",
  light: "légère",
  medium: "intermédiaire",
  heavy: "lourde",
  "light-barding": "barde légère",
  "heavy-barding": "barde lourde",
};

export const DAMAGE_LETTERS: Record<string, string> = { bludgeoning: "C", piercing: "P", slashing: "T" };

export const USAGES: Record<string, string> = {
  "held-in-one-hand": "tenu à une main",
  "held-in-two-hands": "tenu à deux mains",
  "held-in-one-plus-hands": "tenu à une main ou plus",
  worn: "porté",
  "worn-under-armor": "porté sous l'armure",
  wornarmor: "porté (armure)",
  wornshield: "porté (bouclier)",
  affixed: "fixé",
  "affixed-to-armor": "fixé à une armure",
  "affixed-to-weapon": "fixé à une arme",
  "affixed-to-a-shield": "fixé à un bouclier",
  "etched-onto-armor": "gravé sur une armure",
  "etched-onto-a-weapon": "gravé sur une arme",
  "applied-to-a-weapon": "appliqué sur une arme",
  carried: "transporté",
  bonded: "lié",
  tattooed: "tatoué",
};

export const ACTION_FOLDERS: Record<string, string> = {
  basic: "De base",
  skill: "Compétence",
  exploration: "Exploration",
  downtime: "Intermède",
  ancestry: "Ascendance",
  heritage: "Héritage",
  background: "Historique",
  class: "Classe",
  archetype: "Archétype",
  equipment: "Équipement",
  familiar: "Familier",
  spells: "Sort",
  subsystems: "Sous-système",
  vehicles: "Véhicule",
  stamina: "Endurance",
  mythic: "Mythique",
  "impossible-spells": "Sort impossible",
};

export const SKILL_ATTRIBUTES: Record<string, string> = {
  acrobatics: "dex",
  arcana: "int",
  athletics: "str",
  crafting: "int",
  deception: "cha",
  diplomacy: "cha",
  intimidation: "cha",
  medicine: "wis",
  nature: "wis",
  occultism: "int",
  performance: "cha",
  religion: "wis",
  society: "int",
  stealth: "dex",
  survival: "wis",
  thievery: "dex",
};

export const DIVINE_FONTS: Record<string, string> = { heal: "soin", harm: "mise à mal" };
export const DEITY_CATEGORIES: Record<string, string> = { deity: "Divinité", pantheon: "Panthéon", philosophy: "Philosophie", "covenant": "Alliance" };

const COINS: [string, string][] = [["pp", "pp"], ["gp", "po"], ["sp", "pa"], ["cp", "pc"]];
export function formatPrice(value: Record<string, number> | undefined): string | null {
  if (!value) return null;
  const parts = COINS.filter(([k]) => value[k]).map(([k, fr]) => `${value[k]} ${fr}`);
  return parts.length ? parts.join(" ") : null;
}

export function formatBulk(bulk: number | undefined): string | null {
  if (bulk === undefined || bulk === null) return null;
  if (bulk === 0) return "—";
  if (bulk < 1) return "L";
  return String(bulk);
}
