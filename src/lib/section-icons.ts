/**
 * Icon of each list page, from game-icons.net (CC BY 3.0).
 * Value: "<author>/<icon>" in the game-icons/icons repository.
 * `npm run icons` rebuilds public/icons/sections.svg from this map.
 */
export const SECTION_ICONS: Record<string, string> = {
  ascendances: "delapouite/elf-ear",
  heritages: "delapouite/family-tree",
  historiques: "delapouite/backpack",
  classes: "lorc/crossed-swords",
  aptitudes: "lorc/rune-sword",
  archetypes: "lorc/duality-mask",
  compagnons: "lorc/wolf-head",
  "pouvoirs-de-familier": "lorc/owl",
  dons: "delapouite/stars-stack",
  "dons-ancestraux": "kier-heyl/dwarf-helmet",
  "dons-de-classe": "lorc/broadsword",
  "dons-generaux": "lorc/laurel-crown",
  "dons-de-competence": "lorc/quill-ink",
  "dons-d-archetype": "lorc/tribal-mask",
  sorts: "delapouite/spell-book",
  divinites: "lorc/holy-symbol",
  domaines: "lorc/spiked-halo",
  equipement: "skoll/open-treasure-chest",
  groupes: "lorc/sword-array",
  regles: "delapouite/rule-book",
  actions: "lorc/run",
  etats: "delapouite/knocked-out-stars",
  competences: "delapouite/skills",
  traits: "delapouite/price-tag",
  creatures: "lorc/dragon-head",
  "familles-de-creatures": "lorc/monster-grasp",
  "capacites-de-monstres": "lorc/claw-slashes",
  dangers: "lorc/wolf-trap",
  vehicules: "delapouite/old-wagon",
  plans: "lorc/magic-portal",
};

export const ICON_SPRITE = "/icons/sections.svg";

/** Authors whose icons are used, for the credits page. */
export const ICON_AUTHORS = [...new Set(Object.values(SECTION_ICONS).map((v) => v.split("/")[0]))]
  .sort()
  .map((slug) => slug.replace(/(^|-)(\w)/g, (_, sep: string, c: string) => (sep ? " " : "") + c.toUpperCase()));
