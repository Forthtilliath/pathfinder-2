/**
 * The two Remaster core books read from their Black Book Éditions PDFs
 * (French translation © Paizo, ORC license). The PDFs are not versioned:
 * they stay in .cache/pdf/, and without them the import goes on without these pages.
 *
 * Every section of the bookmarks becomes a rules page, except:
 * - "skip": catalogues already on the site as entries (feats, spells, items,
 *   conditions, classes, backgrounds) and the book's own furniture;
 * - "describe": the text replaces the description of an existing entry
 *   (ancestries: the whole presentation instead of a single paragraph);
 * - "until": the page stops at a heading (or at the first stat block) when
 *   what follows is already on the site as entries.
 */
import type { CollectionName } from "../../../src/lib/types.ts";

export type Until = RegExp | "stat";

export type SectionRule =
  | { title: RegExp; action: "skip" }
  | { title: RegExp; action: "page"; until?: Until }
  | { title: RegExp; action: "describe"; collection: CollectionName; until?: Until };

/**
 * A map or a diagram: its labels are text in the PDF, not content. Without a
 * font, the whole PDF page is dropped; otherwise only the labels set in that
 * font (and one of those sizes).
 */
export interface Figure {
  page: number;
  font?: RegExp;
  sizes?: number[];
}

export interface BookSpec {
  /** PDF file name, in .cache/pdf/. */
  file: string;
  /** Publication title, as in Foundry and translations/books.json. */
  publication: string;
  /** French title (translations/books.json). */
  french: string;
  /** Link pack of its pages, and the suffix of an id already taken by another page. */
  pack: string;
  idSuffix: string;
  /** PDF page = printed page + offset (cover and inlay). */
  pageOffset: number;
  rules: SectionRule[];
  figures: Figure[];
}

const skip = (title: RegExp): SectionRule => ({ title, action: "skip" });
const until = (title: RegExp, end: Until): SectionRule => ({ title, action: "page", until: end });
const describe = (title: RegExp, collection: CollectionName, end: Until): SectionRule => ({ title, action: "describe", collection, until: end });

export const BOOKS: BookSpec[] = [
  {
    file: "pathfinder-2e-livre-des-joueurs.pdf",
    publication: "Pathfinder Player Core",
    french: "Livre des joueurs",
    pack: "bbe-livre-des-joueurs",
    idSuffix: "livre-des-joueurs",
    pageOffset: 2,
    rules: [
      describe(/^(Elfe|Gnome|Gobelin|Halfelin|Humain|Léchi|Nain|Orc)$/, "ancestries", /^Héritages\b/i),
      describe(/^(Changelin|Néphilim)$/, "heritages", /^Dons\b/i),
      skip(/^(Barde|Druide|Guerrier|Magicien|Prêtre|Rôdeur|Roublard|Sorcier)$/),
      until(/^(Historiques|Archétypes|Rituels|Sorts focalisés)$/, "stat"),
      skip(/^(Tables des dons|Dons|Chapitre 5 : Dons|Listes de sorts|Sorts|Annexe des États|Intensités d’états|Glossaire et index|Livre des Joueurs)$/),
    ],
    // Map of the Inner Sea region (printed page 30).
    figures: [{ page: 32 }],
  },
  {
    file: "pathfinder-2e-remaster-livre-du-mj.pdf",
    publication: "Pathfinder GM Core",
    french: "Livre du MJ",
    pack: "bbe-livre-du-mj",
    idSuffix: "livre-du-mj",
    pageOffset: 2,
    rules: [
      until(/^(Dangers|Alchimie|Magie momentanée|Attributs de pouvoir|Artefacts|Armes et armures)$/, "stat"),
      skip(/^(Glossaire et index|Livre du MJ|Chapitre 5 :)$/),
    ],
    figures: [
      // Map of the Inner Sea region, map of Golarion's continents, diagram of the planes.
      { page: 144 },
      { page: 146, font: /^Taroca$/, sizes: [14] },
      { page: 176, font: /^GoodOT-Bold$/, sizes: [10, 11] },
    ],
  },
];

export const ruleFor = (spec: BookSpec, title: string): SectionRule =>
  spec.rules.find((r) => r.title.test(title)) ?? { title: /.*/, action: "page" };
