/**
 * Registry of every collection: public French path, titles and list facets.
 * Shared by the import script and the site.
 */
import type { CollectionName } from "./types.ts";

export interface FacetDef {
  key: string;
  label: string;
  /** Sort values numerically instead of alphabetically. */
  numeric?: boolean;
  /** Values shown first, in this order (French values); any other value follows alphabetically. */
  order?: string[];
}

/** Facet value order: `order` first, then numeric or alphabetical. */
export function compareFacetValues(f: FacetDef): (a: string, b: string) => number {
  const rank = (v: string) => {
    const i = f.order?.indexOf(v) ?? -1;
    return i === -1 ? Infinity : i;
  };
  return (a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra === Infinity ? 1 : rb === Infinity ? -1 : ra - rb;
    return f.numeric ? Number(a) - Number(b) : a.localeCompare(b, "fr");
  };
}

export interface CollectionDef {
  name: CollectionName;
  /** French URL segment. */
  path: string;
  title: string;
  /** Plural noun used in "Filtrer les …". */
  noun: string;
  intro: string;
  facets: FacetDef[];
  /** Shortcut in the header, beside the mega menu (wide screens). */
  nav?: boolean;
}

const RARITY: FacetDef = { key: "rarity", label: "Rareté", order: ["Commun", "Peu courant", "Rare", "Unique"] };
const LEVEL: FacetDef = { key: "level", label: "Niveau", numeric: true };
/** Source book: the four Remaster core books first, then the other books (English titles) alphabetically. */
const BOOK: FacetDef = {
  key: "book",
  label: "Livre",
  order: ["Livre des joueurs", "Livre des joueurs 2", "Livre du MJ", "Livre des monstres"],
};

export const COLLECTIONS: CollectionDef[] = [
  {
    name: "ancestries",
    path: "ascendances",
    title: "Ascendances",
    noun: "ascendances",
    intro: "Les peuples jouables, leurs héritages et leurs dons.",
    facets: [RARITY, BOOK],
  },
  {
    name: "heritages",
    path: "heritages",
    title: "Héritages",
    noun: "héritages",
    intro: "Les variantes de chaque ascendance et les héritages polyvalents.",
    facets: [{ key: "ancestry", label: "Ascendance" }, RARITY, BOOK],
  },
  {
    name: "backgrounds",
    path: "historiques",
    title: "Historiques",
    noun: "historiques",
    intro: "Ce que faisait votre personnage avant l'aventure.",
    facets: [{ key: "skill", label: "Compétence" }, RARITY, BOOK],
  },
  {
    name: "classes",
    path: "classes",
    title: "Classes",
    noun: "classes",
    nav: true,
    intro: "Les classes, leurs aptitudes et leurs dons.",
    facets: [{ key: "attribute", label: "Caractéristique principale" }, RARITY, BOOK],
  },
  {
    name: "classFeatures",
    path: "aptitudes",
    title: "Aptitudes de classe",
    noun: "aptitudes",
    intro: "Les aptitudes accordées par les classes.",
    facets: [LEVEL, BOOK],
  },
  {
    name: "feats",
    path: "dons",
    title: "Dons",
    noun: "dons",
    nav: true,
    intro: "Dons d'ascendance, de classe, généraux, de compétence et d'archétype.",
    facets: [{ key: "category", label: "Catégorie" }, LEVEL, { key: "trait", label: "Traits" }, RARITY, BOOK],
  },
  {
    name: "skills",
    path: "competences",
    title: "Compétences",
    noun: "compétences",
    intro: "Chaque compétence, ses actions et ses dons.",
    facets: [{ key: "attribute", label: "Caractéristique" }],
  },
  {
    name: "spells",
    path: "sorts",
    title: "Sorts",
    noun: "sorts",
    nav: true,
    intro: "Par rang, tradition et type : tours de magie, sorts focalisés, rituels.",
    facets: [
      { key: "type", label: "Type", order: ["Sort", "Tour de magie", "Focalisé", "Rituel"] },
      { key: "rank", label: "Rang", numeric: true },
      { key: "tradition", label: "Tradition" },
      RARITY,
      BOOK,
    ],
  },
  {
    name: "equipment",
    path: "equipement",
    title: "Équipement",
    noun: "objets",
    nav: true,
    intro: "Armes, armures, boucliers, consommables et objets magiques.",
    facets: [{ key: "type", label: "Type" }, LEVEL, { key: "group", label: "Groupe" }, RARITY, BOOK],
  },
  {
    name: "deities",
    path: "divinites",
    title: "Divinités",
    noun: "divinités",
    intro: "Dieux et philosophies, leurs domaines et leurs sorts.",
    facets: [{ key: "category", label: "Catégorie" }, { key: "font", label: "Source divine" }, BOOK],
  },
  {
    name: "actions",
    path: "actions",
    title: "Actions",
    noun: "actions",
    intro: "Actions de base, de compétence, d'exploration et d'intermède.",
    facets: [
      { key: "category", label: "Catégorie" },
      { key: "type", label: "Type", order: ["Action", "Réaction", "Action gratuite", "Activité"] },
      RARITY,
      BOOK,
    ],
  },
  {
    name: "conditions",
    path: "etats",
    title: "États",
    noun: "états",
    intro: "Effrayé, agrippé, ralenti… les effets à garder sous la main en partie.",
    facets: [],
  },
  {
    name: "archetypes",
    path: "archetypes",
    title: "Archétypes",
    noun: "archétypes",
    intro: "Les archétypes et les dons qu'ils ouvrent.",
    facets: [RARITY],
  },
  {
    name: "domains",
    path: "domaines",
    title: "Domaines divins",
    noun: "domaines",
    intro: "Les domaines des divinités et leurs sorts.",
    facets: [],
  },
  {
    name: "creatures",
    path: "creatures",
    title: "Créatures",
    noun: "créatures",
    nav: true,
    intro: "Les créatures du Livre des monstres et les PNJ.",
    facets: [
      { key: "type", label: "Type" },
      LEVEL,
      {
        key: "size",
        label: "Taille",
        order: ["Très petite", "Petite", "Moyenne", "Grande", "Très grande", "Gigantesque"],
      },
      RARITY,
      BOOK,
    ],
  },
  {
    name: "creatureFamilies",
    path: "familles-de-creatures",
    title: "Familles de créatures",
    noun: "familles",
    intro: "Les familles du Livre des monstres : mœurs, variantes et membres.",
    facets: [RARITY],
  },
  {
    name: "monsterAbilities",
    path: "capacites-de-monstres",
    title: "Capacités de monstres",
    noun: "capacités",
    intro: "Les capacités universelles et les capacités de famille, pour bâtir ou modifier une créature.",
    facets: [
      { key: "kind", label: "Genre" },
      { key: "type", label: "Type", order: ["Action", "Réaction", "Action gratuite", "Passive"] },
      { key: "family", label: "Famille" },
      BOOK,
    ],
  },
  {
    name: "hazards",
    path: "dangers",
    title: "Dangers",
    noun: "dangers",
    intro: "Pièges, dangers naturels et hantises.",
    facets: [{ key: "complexity", label: "Complexité" }, LEVEL, BOOK],
  },
  {
    name: "companions",
    path: "compagnons",
    title: "Compagnons",
    noun: "compagnons",
    intro: "Compagnons animaux, eidolons et compagnons artificiels, avec leurs manœuvres.",
    facets: [{ key: "type", label: "Type" }],
  },
  {
    name: "familiarAbilities",
    path: "pouvoirs-de-familier",
    title: "Pouvoirs de familier",
    noun: "pouvoirs",
    intro: "Les pouvoirs de familier et de maître.",
    facets: [{ key: "type", label: "Type" }, BOOK],
  },
  {
    name: "vehicles",
    path: "vehicules",
    title: "Véhicules",
    noun: "véhicules",
    intro: "Chariots, navires et machines volantes.",
    facets: [LEVEL, BOOK],
  },
  {
    name: "groups",
    path: "groupes",
    title: "Groupes d'armes et d'armures",
    noun: "groupes",
    intro: "Les effets de spécialisation critique des armes et de spécialisation des armures.",
    facets: [{ key: "type", label: "Type" }],
  },
  {
    name: "planes",
    path: "plans",
    title: "Plans",
    noun: "plans",
    intro: "Les plans de la cosmologie : sphère intérieure, sphère extérieure, plans de transition et dimensions.",
    facets: [{ key: "category", label: "Catégorie" }, RARITY],
  },
  {
    name: "rules",
    path: "regles",
    title: "Règles",
    noun: "règles",
    nav: true,
    intro: "Le Livre des joueurs et le Livre du MJ chapitre par chapitre, dans l'ordre des livres, et les aide-mémoire de l'écran du MJ.",
    // No facets: the rules page is a table of contents (components/RulesIndex.astro).
    facets: [],
  },
  {
    name: "traits",
    path: "traits",
    title: "Traits",
    noun: "traits",
    intro: "Chaque trait et la liste de tout ce qui le porte.",
    facets: [],
  },
];

/** Pre-filtered views of a collection (own list page, entries stay in the base collection). */
export interface ViewDef {
  path: string;
  title: string;
  noun: string;
  intro: string;
  base: CollectionName;
  filter: { key: string; value: string };
}

export const VIEWS: ViewDef[] = [
  {
    path: "dons-ancestraux",
    title: "Dons ancestraux",
    noun: "dons ancestraux",
    intro: "Les dons propres à chaque ascendance.",
    base: "feats",
    filter: { key: "category", value: "Ascendance" },
  },
  {
    path: "dons-de-classe",
    title: "Dons de classe",
    noun: "dons de classe",
    intro: "Les dons propres à chaque classe.",
    base: "feats",
    filter: { key: "category", value: "Classe" },
  },
  {
    path: "dons-generaux",
    title: "Dons généraux",
    noun: "dons généraux",
    intro: "Les dons accessibles à tous les personnages.",
    base: "feats",
    filter: { key: "category", value: "Général" },
  },
  {
    path: "dons-de-competence",
    title: "Dons de compétence",
    noun: "dons de compétence",
    intro: "Les dons liés à une compétence.",
    base: "feats",
    filter: { key: "category", value: "Compétence" },
  },
  {
    path: "dons-d-archetype",
    title: "Dons d'archétype",
    noun: "dons d'archétype",
    intro: "Les dons ouverts par les archétypes.",
    base: "feats",
    filter: { key: "category", value: "Archétype" },
  },
];

export const COLLECTION_BY_NAME = Object.fromEntries(COLLECTIONS.map((c) => [c.name, c])) as Record<
  CollectionName,
  CollectionDef
>;
export const COLLECTION_BY_PATH = Object.fromEntries(COLLECTIONS.map((c) => [c.path, c])) as Record<
  string,
  CollectionDef
>;

export const entryPath = (collection: CollectionName, id: string) => `${COLLECTION_BY_NAME[collection].path}/${id}`;
