/**
 * The Pathfinder 2 Remaster core books, with their covers.
 * Covers are Paizo product covers as published on store.paizo.com, shown unmodified
 * under Paizo's Community Use Policy (https://paizo.com/licenses/communityuse).
 */
import type { ImageMetadata } from "astro";
import playerCore from "../assets/covers/player-core.jpg";
import playerCore2 from "../assets/covers/player-core-2.jpg";
import gmCore from "../assets/covers/gm-core.jpg";
import monsterCore from "../assets/covers/monster-core.jpg";
import { COLLECTIONS } from "./collections";
import { entries } from "./data";

export interface CoreBook {
  /** French title, as in the entries' `book.name`. */
  name: string;
  english: string;
  cover: ImageMetadata;
  /** Cover artist, when confirmed. */
  artist?: string;
  store: string;
}

export const CORE_BOOKS: CoreBook[] = [
  {
    name: "Livre des joueurs",
    english: "Player Core",
    cover: playerCore,
    artist: "Wayne Reynolds",
    store: "https://store.paizo.com/pathfinder-player-core/",
  },
  {
    name: "Livre du MJ",
    english: "GM Core",
    cover: gmCore,
    artist: "Wayne Reynolds",
    store: "https://store.paizo.com/pathfinder-gm-core/",
  },
  {
    name: "Livre des monstres",
    english: "Monster Core",
    cover: monsterCore,
    store: "https://store.paizo.com/pathfinder-monster-core/",
  },
  {
    name: "Livre des joueurs 2",
    english: "Player Core 2",
    cover: playerCore2,
    artist: "Wayne Reynolds",
    store: "https://store.paizo.com/pathfinder-player-core-2/",
  },
];

let counts: Map<string, number> | null = null;

/** Number of entries of the site that come from a book, by French title. */
export function bookCount(name: string): number {
  if (!counts) {
    counts = new Map();
    for (const c of COLLECTIONS)
      for (const e of entries(c.name))
        if (e.book) counts.set(e.book.name.value, (counts.get(e.book.name.value) ?? 0) + 1);
  }
  return counts.get(name) ?? 0;
}
