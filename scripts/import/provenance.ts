/** Provenance values and text helpers shared by the import steps. */
import type { Provenance, Rarity, Text } from "../../src/lib/types.ts";

/** Value produced by a fixed conversion rule of the site. */
export const RULE: Provenance = { source: "site", sourceLanguage: "en", status: "current", method: "rule" };
/** Label from the pathfinder-fr language files. */
export const FR_LANGUAGE_FILE: Provenance = { source: "pathfinder-fr", sourceLanguage: "en", status: "current", method: "human" };
export const siteTranslation = (status: "unreviewed" | "reviewed"): Provenance => ({
  source: "site",
  sourceLanguage: "en",
  status,
  method: status === "reviewed" ? "human" : "ai",
});
export const text = (value: string, provenance: Provenance): Text => ({ value, provenance });
export const RARITY_LABELS: Record<Rarity, string> = { common: "Commun", uncommon: "Peu courant", rare: "Rare", unique: "Unique" };
