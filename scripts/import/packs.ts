/** Reading Foundry packs from the cloned system repository. */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { FoundryDoc } from "./adapter-base.ts";
import { IGNORED_FOLDERS } from "./config.ts";

/** Reads a pack folder (Remaster content only) with the first sub-folder of each document. */
export function readPack(dir: string): { doc: FoundryDoc; folder: string }[] {
  const out: { doc: FoundryDoc; folder: string }[] = [];
  if (!existsSync(dir)) return out;
  const walk = (d: string, folder: string) => {
    for (const name of readdirSync(d)) {
      const full = path.join(d, name);
      if (statSync(full).isDirectory()) {
        if (!IGNORED_FOLDERS.includes(name)) walk(full, folder || name);
      } else if (name.endsWith(".json") && !name.startsWith("_")) {
        const doc = JSON.parse(readFileSync(full, "utf8")) as FoundryDoc;
        if ((doc.system?.publication ?? doc.system?.details?.publication)?.remaster === true) out.push({ doc, folder });
      }
    }
  };
  walk(dir, "");
  return out;
}

/** Foundry pack folder → compendium name (used in @UUID links). */
export function packNames(systemFile: string): Map<string, string> {
  const system = JSON.parse(readFileSync(systemFile, "utf8")) as { packs: { name: string; path: string }[] };
  return new Map(system.packs.map((p) => [path.basename(p.path), p.name]));
}
