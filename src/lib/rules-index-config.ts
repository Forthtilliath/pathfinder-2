/**
 * Editorial choices of the rules index (/regles/): book order, the GM screen
 * groups, and the site catalogues each chapter leads to.
 */

/** Books in reading order; any other book follows alphabetically. */
export const RULES_BOOK_ORDER = ["Livre des joueurs", "Livre du MJ", "Écran du MJ"];

/** Chapter labels fixed for display (the book bookmark lacks the number). */
export const CHAPTER_RENAMES: Record<string, Record<string, string>> = {
  "Livre du MJ": { Trésors: "Chapitre 5 : Trésors" },
};

/**
 * Chapters whose pages are all entries of the site (no rules page):
 * shown in their place so the book reads whole, with their catalogue links.
 */
export const CATALOGUE_CHAPTERS: Record<string, string[]> = {
  "Livre des joueurs": ["Chapitre 5 : Dons"],
};

/** Site catalogues of a chapter, by book then short chapter title (list page paths). */
export const CHAPTER_CATALOGUES: Record<string, Record<string, string[]>> = {
  "Livre des joueurs": {
    "Ascendances & Historiques": ["ascendances", "heritages", "historiques"],
    Classes: ["classes", "archetypes", "compagnons"],
    Compétences: ["competences", "dons-de-competence"],
    Dons: ["dons", "dons-ancestraux", "dons-de-classe", "dons-generaux"],
    Équipement: ["equipement", "groupes"],
    Sorts: ["sorts"],
    "Jouer une partie": ["actions", "etats", "traits"],
  },
  "Livre du MJ": {
    "Création de parties": ["dangers"],
    "L’âge des prédictions perdues": ["divinites", "plans"],
    "Sous-systèmes": ["vehicules"],
    Trésors: ["equipement"],
  },
};

/**
 * The GM screen pages, grouped as on the screen itself (its "Écran du MJ" page),
 * the last group split in two. A page missing here goes to "Autres".
 */
export const SCREEN_GROUPS: { title: string; ids: string[] }[] = [
  {
    title: "Règles du jeu",
    ids: [
      "actions-basiques",
      "actions-de-competence",
      "activites-d-exploration",
      "attitudes",
      "bonus-et-penalites",
      "chuter",
      "contre",
      "detecter-et-discretion-avec-d-autres-sens",
      "detection-des-creatures",
      "encombrement-et-surcharge",
      "etats",
      "lumiere",
      "mort-mourant-et-inconscient",
      "points-d-heroisme",
      "sens",
      "soigner-les-blessures",
      "taille-et-allonge",
      "terrain-et-abri",
      "trait-convocation",
      "traits",
      "vitesse-de-voyage",
    ],
  },
  {
    title: "Mener la partie",
    ids: [
      "ajustements-de-monstre",
      "ajustements-des-dd",
      "budget-de-rencontre",
      "combats-speciaux",
      "cout-de-la-vie",
      "dd-de-competence-specifiques",
      "dd-par-niveau",
      "degats-environnementaux",
      "effets-de-la-meteo",
      "evenements-d-intermede",
      "identification-de-creature",
      "recompenses-en-px",
      "repos",
      "structures-et-dd-pour-ouvrir-de-force",
      "taches-pour-gagner-de-l-argent",
      "tresor",
    ],
  },
  {
    title: "Sous-systèmes",
    ids: ["commandement", "duels", "hexploration", "infiltration", "influence", "points-de-victoire", "poursuites", "recherche", "reputation"],
  },
  {
    title: "Variantes de règles",
    ids: [
      "archetype-gratuit",
      "endurance",
      "maitrise-sans-niveau",
      "parangon-ancestral",
      "personnages-de-niveau-0",
      "personnages-mythiques",
      "primes-d-attributs-graduels",
      "progression-automatique-des-bonus",
    ],
  },
];

/** Pages that only list other pages: linked from the book header, not listed. */
export const SCREEN_INDEX_PAGES = ["ecran-du-mj", "ecran-du-joueur"];
