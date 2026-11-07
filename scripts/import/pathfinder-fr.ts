/**
 * Reads the translation files of the pathfinder-fr repository.
 *
 * Current format (GitLab):
 *
 *   Name: Fireball
 *   Nom: Boule de feu
 *   État: officielle
 *
 *   -- Desc (en) --
 *   <p>…</p>
 *   -- Desc (fr) --
 *   <p>…</p>
 *   -- End desc ---
 *
 *   ----- Fields -------------------------------------------------------------
 *   RangeEN: 500 feet
 *   RangeFR: 150 mètres
 *   ----- Items --------------------------------------------------------------
 *   ID: 0UKsJtM3fEth21iR
 *   Name: Lifesense 240 feet
 *   Nom: Perception de la vie 72 m
 *   -- Desc (en) -- … -- End desc ---
 *   --------------------------------------------------------------------------
 *
 * Older format (2022 mirrors): "------ Data ------" and
 * "------ Description (fr) ------" sections, without end markers.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { Provenance } from "../../src/lib/types.ts";

export interface EmbeddedTranslation {
  englishName: string;
  name: string;
  description: string;
}

export interface FrenchTranslation {
  foundryId: string;
  englishName: string;
  name: string;
  state: string;
  originalState?: string;
  /** Extra translated fields, lower-case key without suffix (e.g. "range"). */
  fields: Map<string, string>;
  description: string;
  /** English text stored next to the translation. */
  englishDescription: string;
  /** Embedded items (creature abilities, attacks…), by Foundry id. */
  items: Map<string, EmbeddedTranslation>;
  file: string;
}

type Lang = "en" | "fr";
type Container = "header" | "fields" | "items" | "ignored";

const ID_PATTERN = /(?:^|[-/\\])([A-Za-z0-9]{16})\.htm$/;
/** "-- Desc (fr) --", "-- GM notes (en) --" (current format). */
const DESC_START = /^-- (Desc|GM notes) \((en|fr)\) --$/;
const DESC_END = /^-- End (?:desc|GM notes) -+$/;
/** "------ Description (fr) ------" (old format, no end marker). */
const OLD_DESC = /^------ Description \((en|fr)\) ------$/;
const SECTION = /^-{5,6} ([A-Za-z][A-Za-z ]*?) -+$/;
const RULER = /^-{10,}$/;
const FIELD = /^([A-Za-z][A-Za-z0-9_.]*)FR:\s*(.*)$/;
const HEADER = /^([^:]+):\s*(.*)$/;

/** Sections holding KeyEN/KeyFR pairs. */
const FIELD_SECTIONS = new Set(["data", "fields", "lists", "arrays"]);

interface ItemDraft {
  id: string;
  englishName: string;
  name: string;
  fr: string[];
}

export function parseTranslation(content: string, foundryId: string, file = ""): FrenchTranslation {
  const header = new Map<string, string>();
  const fields = new Map<string, string>();
  const items = new Map<string, EmbeddedTranslation>();
  const main: Record<Lang, string[] | null> = { en: null, fr: null };

  let container: Container = "header";
  let item: ItemDraft | null = null;
  /** Lines of the description block being read, or null outside of one. */
  let desc: string[] | null = null;
  /** Old format: descriptions run until the next section. */
  let openEnded = false;

  const closeItem = () => {
    if (item) items.set(item.id, { englishName: item.englishName, name: item.name, description: item.fr.join("\n").trim() });
    item = null;
  };

  /** Where a description block goes: the entry, the current item, or nowhere (GM notes, repeated block). */
  const target = (kind: string, lang: Lang): string[] => {
    if (kind === "GM notes") return [];
    if (container === "items") return item && lang === "fr" ? item.fr : [];
    if (container === "ignored" || main[lang]) return [];
    return (main[lang] = []);
  };

  for (const line of content.replace(/\r\n/g, "\n").split("\n")) {
    if (desc && !openEnded) {
      const next = DESC_START.exec(line);
      if (DESC_END.test(line)) desc = null;
      else if (next) desc = target(next[1], next[2] as Lang);
      else desc.push(line);
      continue;
    }

    const start = DESC_START.exec(line);
    const old = OLD_DESC.exec(line);
    if (start || old) {
      openEnded = Boolean(old);
      desc = start ? target(start[1], start[2] as Lang) : target("Desc", old![1] as Lang);
      continue;
    }
    const section = SECTION.exec(line);
    if (section || RULER.test(line)) {
      desc = null;
      openEnded = false;
      closeItem();
      const name = section?.[1].trim().toLowerCase() ?? "";
      container = FIELD_SECTIONS.has(name) ? "fields" : name === "items" ? "items" : "ignored";
      continue;
    }
    if (desc) {
      desc.push(line);
      continue;
    }

    if (container === "fields") {
      const m = FIELD.exec(line);
      if (m && m[2].trim()) fields.set(m[1].toLowerCase(), m[2].trim());
      continue;
    }
    const m = HEADER.exec(line);
    if (!m) continue;
    const [key, value] = [m[1].trim(), m[2].trim()];
    if (container === "header") {
      if (!header.has(key)) header.set(key, value);
    } else if (container === "items") {
      if (key === "ID") {
        closeItem();
        item = { id: value, englishName: "", name: "", fr: [] };
      } else if (item && key === "Name") item.englishName = value;
      else if (item && key === "Nom") item.name = value;
    }
  }
  closeItem();

  return {
    foundryId,
    englishName: header.get("Name") ?? "",
    name: header.get("Nom") ?? "",
    state: (header.get("État") ?? "").toLowerCase(),
    originalState: header.get("État d'origine")?.toLowerCase(),
    fields,
    description: (main.fr ?? []).join("\n").trim(),
    englishDescription: (main.en ?? []).join("\n").trim(),
    items,
    file,
  };
}

export function readTranslationFile(file: string): FrenchTranslation | null {
  const id = ID_PATTERN.exec(file)?.[1];
  if (!id) return null;
  return parseTranslation(readFileSync(file, "utf8"), id, file);
}

/** Indexes every .htm file of the given folders by Foundry id. */
export function indexTranslations(root: string, dirs: string[]): Map<string, FrenchTranslation> {
  const index = new Map<string, FrenchTranslation>();
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = path.join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".htm")) {
        const t = readTranslationFile(full);
        if (t) index.set(t.foundryId, t);
      }
    }
  };
  for (const dir of dirs) {
    const full = path.join(root, dir);
    if (existsSync(full)) walk(full);
  }
  return index;
}

/**
 * Derives provenance from the translation state.
 * Returns null when the French text cannot be used.
 */
export function translationProvenance(t: FrenchTranslation): Provenance | null {
  if (!t.name) return null;
  const isOfficial = (state: string | undefined) => state?.startsWith("officiel") ?? false;
  switch (t.state) {
    case "libre":
      return { source: "pathfinder-fr", sourceLanguage: "en", status: "current", method: "human" };
    case "officielle":
      return { source: "bbe", sourceLanguage: "en", status: "current", method: "human" };
    case "changé":
      return {
        source: isOfficial(t.originalState) ? "bbe" : "pathfinder-fr",
        sourceLanguage: "en",
        status: "outdated",
        method: "human",
      };
    case "aucune":
    case "vide":
    case "":
      return null;
    default:
      // Unknown or automatic states: keep the text, flagged as unreviewed.
      return {
        source: "pathfinder-fr",
        sourceLanguage: "en",
        status: "unreviewed",
        method: t.state.includes("auto") ? "ai" : "human",
      };
  }
}
