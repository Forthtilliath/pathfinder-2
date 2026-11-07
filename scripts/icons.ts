/**
 * Builds public/icons/sections.svg, a sprite of the game-icons.net icons listed in src/lib/section-icons.ts.
 * Each icon is checked before being kept: only <path> elements with plain path data are accepted,
 * so nothing but shapes can reach the published sprite.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { SECTION_ICONS } from "../src/lib/section-icons.ts";

const BASE = "https://raw.githubusercontent.com/game-icons/icons/master";
const BACKGROUND = "M0 0h512v512H0z";
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\-\s]+$/;
const OUT = new URL("../public/icons/sections.svg", import.meta.url);

async function iconPaths(name: string): Promise<string[]> {
  const res = await fetch(`${BASE}/${name}.svg`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const svg = await res.text();
  const tags = svg.match(/<[a-zA-Z][^>]*>/g) ?? [];
  const unexpected = tags.filter((t) => !/^<(svg|path)\b/.test(t));
  if (unexpected.length > 0) throw new Error(`${name}: unexpected elements ${unexpected.join(" ")}`);
  const paths = [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map((m) => m[1]).filter((d) => d !== BACKGROUND);
  if (paths.length === 0) throw new Error(`${name}: no path`);
  for (const d of paths) if (!PATH_DATA.test(d) || d.length > 20000) throw new Error(`${name}: invalid path data`);
  return paths;
}

const symbols: string[] = [];
for (const [id, name] of Object.entries(SECTION_ICONS)) {
  if (!/^[a-z-]+$/.test(id)) throw new Error(`invalid id ${id}`);
  const paths = await iconPaths(name);
  symbols.push(`<symbol id="${id}" viewBox="0 0 512 512">${paths.map((d) => `<path d="${d}"/>`).join("")}</symbol>`);
  console.log(`ok ${id} ← ${name}`);
}

await mkdir(new URL(".", OUT), { recursive: true });
await writeFile(
  OUT,
  `<svg xmlns="http://www.w3.org/2000/svg"><!-- Icons by game-icons.net contributors, CC BY 3.0 --><defs>${symbols.join("")}</defs></svg>\n`,
);
console.log(`${symbols.length} icons → public/icons/sections.svg`);
