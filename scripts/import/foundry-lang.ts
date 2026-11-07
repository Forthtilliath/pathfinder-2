/**
 * Reads Foundry language files (key → label). These are data sources:
 * the English files come with the Foundry system, the French ones with
 * the pathfinder-fr language module. The site itself has no i18n.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export type Dictionary = Map<string, string>;

function flatten(value: unknown, prefix: string, target: Dictionary): void {
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof child === "string") target.set(fullKey, child);
      else flatten(child, fullKey, target);
    }
  }
}

function listJsonFiles(dir: string, filter: (name: string) => boolean): string[] {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      if (name.startsWith(".")) continue;
      const full = path.join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".json") && filter(name)) files.push(full);
    }
  };
  walk(dir);
  return files.sort();
}

/** Merges every matching language file of a folder. */
export function loadDictionary(dir: string, filter: (name: string) => boolean): Dictionary {
  const dictionary: Dictionary = new Map();
  for (const file of listJsonFiles(dir, filter)) {
    try {
      flatten(JSON.parse(readFileSync(file, "utf8")), "", dictionary);
    } catch {
      console.warn(`  skipped unreadable language file: ${file}`);
    }
  }
  return dictionary;
}

export interface TraitKeys {
  /** English slug → label key */
  labels: Map<string, string>;
  /** English slug → description key */
  descriptions: Map<string, string>;
}

/** Parses src/scripts/config/traits.ts of the Foundry system. */
export function loadTraitKeys(traitsFile: string): TraitKeys {
  const source = readFileSync(traitsFile, "utf8");
  const labels = new Map<string, string>();
  const descriptions = new Map<string, string>();
  const pattern = /^\s*"?([a-z0-9-]+)"?:\s*"(PF2E\.[A-Za-z0-9.]+)"/gm;
  for (const [, slug, key] of source.matchAll(pattern)) {
    if (key.includes("Description")) {
      if (!descriptions.has(slug)) descriptions.set(slug, key);
    } else if (!labels.has(slug)) {
      labels.set(slug, key);
    }
  }
  return { labels, descriptions };
}
