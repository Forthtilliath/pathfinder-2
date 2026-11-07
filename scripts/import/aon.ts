/**
 * Archives of Nethys search index (English, ORC): content that the Foundry
 * packs do not hold. Each document becomes a Foundry-like document so it
 * follows the same pipeline (translation, links, exclusion when untranslated).
 *
 * - rules chapters;
 * - planes, creature families (with their members), weapon and armor groups
 *   (critical and armor specialization effects);
 * - skill descriptions, merged into the skill pages built by the site.
 *
 * Only the Remaster core books are kept. Each category is cached in
 * .cache/sources/aon-<category>.json (PF2_AON_CACHE=1 or --offline reuses it).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { AON_ENDPOINT, CACHE_DIR } from "./config.ts";
import { pascal } from "./adapters.ts";
import { extraDoc, simpleAdapter, type ExtraSource } from "./extra-sources.ts";

/** Books whose content is kept: the Remaster core line. */
const REMASTER_BOOKS = ["Player Core", "Player Core 2", "GM Core", "Monster Core", "Monster Core 2", "NPC Core"];

interface AonDoc {
  id?: string;
  name?: string;
  markdown?: string;
  text?: string;
  url?: string;
  primary_source?: string;
  source?: string[] | string;
  remaster_id?: string;
  rarity?: string;
  plane_category?: string;
}

const PAGE_SIZE = 500;

async function fetchCategory(category: string, offline: boolean): Promise<AonDoc[]> {
  const cacheFile = path.join(CACHE_DIR, `aon-${category}.json`);
  if (offline || process.env.PF2_AON_CACHE === "1") {
    return existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : [];
  }
  const all: AonDoc[] = [];
  for (let from = 0; from < 20000; from += PAGE_SIZE) {
    const response = await fetch(AON_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "pf2-fr-import (site de règles en français)" },
      body: JSON.stringify({ query: { bool: { must: [{ term: { category } }] } }, size: PAGE_SIZE, from }),
    });
    if (!response.ok) throw new Error(`AoN (${category}): HTTP ${response.status}`);
    const body = (await response.json()) as { hits?: { hits?: { _source: AonDoc }[] } };
    const hits = body.hits?.hits ?? [];
    all.push(...hits.map((h) => h._source));
    if (hits.length < PAGE_SIZE) break;
    // One request per second at most: AoN is a community site.
    await new Promise((r) => setTimeout(r, 1000));
  }
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(all));
  return all;
}

/** Remaster core book of a document, or null (legacy or other books). */
function coreBook(d: AonDoc): string | null {
  if (d.remaster_id || !d.name) return null;
  const sources = [d.primary_source, ...(Array.isArray(d.source) ? d.source : [d.source])].filter(Boolean) as string[];
  const book = sources.find((s) => REMASTER_BOOKS.some((b) => s.startsWith(b)));
  return book ? `Pathfinder ${book.replace(/\s+pg\..*$/, "")}` : null;
}

/** Stable 16-character id, like Foundry ids (used as translation key). */
const aonId = (d: AonDoc) => String(d.id ?? d.url ?? d.name).replace(/[^A-Za-z0-9]/g, "").slice(-16).padStart(16, "0");

/** AoN markdown uses a few custom tags: map them to plain HTML. */
export function aonToHtml(markdown: string): string {
  const glyphs: Record<string, string> = { "single action": "1", "two actions": "2", "three actions": "3", reaction: "r", "free action": "f" };
  let s = markdown
    // The page title is shown by the site; the book is shown in the sources box.
    .replace(/<title[^>]*level="1"[^>]*>[\s\S]*?<\/title>/g, "")
    .replace(/^\*\*Source\*\*.*$/gm, "")
    .replace(/<title[^>]*level="(\d)"[^>]*>([\s\S]*?)<\/title>/g, (_, level, t) => `\n\n<h${level === "2" ? 2 : 3}>${t.trim()}</h${level === "2" ? 2 : 3}>\n\n`)
    .replace(/<title[^>]*>([\s\S]*?)<\/title>/g, (_, t) => `\n\n<h3>${t.trim()}</h3>\n\n`)
    .replace(/<actions string="([^"]+)"\s*\/>/g, (_, a) => `<span class="action-glyph">${glyphs[a.toLowerCase()] ?? ""}</span>`)
    .replace(/<\/?(traits|trait|aside|row|column|document|summary|additional-info|sidebar)[^>]*>/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/&amp;/g, "&");
  // Minimal markdown: bold, italics, horizontal rules, lists and paragraphs.
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>").replace(/^-{3,}$/gm, "<hr />");
  const html = s
    .split(/\n{2,}/)
    .map((block) => {
      const b = block.trim();
      if (!b) return "";
      if (/^<(h\d|hr|table|ul|ol)/.test(b)) return b;
      if (/^[-*] /m.test(b)) return `<ul>${b.split(/\n/).map((l) => `<li>${l.replace(/^[-*]\s+/, "")}</li>`).join("")}</ul>`;
      return `<p>${b.replace(/\s*\n\s*/g, " ")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
  // A leading rule (after the removed title and source) is noise.
  return html.replace(/^(<hr \/>\n?)+/, "").replace(/(\n?<hr \/>)+$/, "");
}

/** Removes the "Members" section of a creature family and returns the member names (English). */
function extractMembers(markdown: string): { markdown: string; members: string[] } {
  const m = /<title level="2">Members<\/title>([\s\S]*?)(?=\n\s*\n\s*<|$)/.exec(markdown);
  if (!m) return { markdown, members: [] };
  const members = [...m[1].matchAll(/\[([^\]]+)\]\(\/Monsters\.aspx\?ID=\d+\)/g)].map((x) => x[1]);
  return { markdown: markdown.replace(m[0], ""), members };
}

const PLANE_CATEGORIES: Record<string, string> = {
  "Inner Sphere Planes": "Sphère intérieure",
  "Outer Sphere Planes": "Sphère extérieure",
  "Transitive Planes": "Plans de transition",
  Dimensions: "Dimensions",
};

type Warn = (message: string) => void;

async function load(category: string, offline: boolean, warn: Warn): Promise<AonDoc[]> {
  try {
    return await fetchCategory(category, offline);
  } catch (error) {
    warn(`not fetched from Archives of Nethys: ${(error as Error).message}`);
    return [];
  }
}

const rarityOf = (d: AonDoc) => (["uncommon", "rare", "unique"].includes(String(d.rarity).toLowerCase()) ? String(d.rarity).toLowerCase() : "common");

export async function readAon(offline: boolean, warn: Warn): Promise<ExtraSource[]> {
  const out: ExtraSource[] = [];
  const add = (collection: ExtraSource["collection"], pack: string, d: AonDoc, book: string, html: string, adapter: ExtraSource["adapter"], extra: Partial<ExtraSource> = {}, system: Record<string, unknown> = {}) => {
    if (!html) return;
    out.push({
      collection,
      pack,
      folder: "",
      doc: extraDoc(aonId(d), d.name!, html, book, { traits: { value: [], rarity: rarityOf(d) }, ...system }),
      adapter,
      ...extra,
    });
  };

  for (const d of await load("rules", offline, warn)) {
    const book = coreBook(d);
    if (book) add("rules", "aon-rules", d, book, aonToHtml(d.markdown ?? d.text ?? ""), simpleAdapter("Règle", { book: [`⟪book:${book}⟫`] }));
  }

  for (const d of await load("plane", offline, warn)) {
    const book = coreBook(d);
    const category = PLANE_CATEGORIES[d.plane_category ?? ""];
    if (book) add("planes", "aon-planes", d, book, aonToHtml(d.markdown ?? ""), simpleAdapter("Plan", category ? { category: [category] } : {}));
  }

  for (const d of await load("creature-family", offline, warn)) {
    const book = coreBook(d);
    if (!book) continue;
    const { markdown, members } = extractMembers(d.markdown ?? "");
    add("creatureFamilies", "aon-creature-families", d, book, aonToHtml(markdown), simpleAdapter("Famille de créatures"), {}, { members });
  }

  const groups: [string, string, string, string][] = [
    ["weapon-group", "weapon", "PF2E.WeaponGroup", "Groupe d'armes"],
    ["armor-group", "armor", "PF2E.ArmorGroup", "Groupe d'armures"],
  ];
  for (const [category, kind, keyPrefix, subtitle] of groups) {
    for (const d of await load(category, offline, warn)) {
      const book = coreBook(d);
      if (!book) continue;
      const slug = d.name!.toLowerCase().replace(/[^a-z]+/g, "-");
      add("groups", "aon-groups", d, book, aonToHtml(d.markdown ?? ""), simpleAdapter(subtitle, { type: [subtitle] }), { nameKey: `${keyPrefix}${pascal(slug)}`, linkKeys: [`${kind}:${slug}`] }, { group: { kind, slug } });
    }
  }
  return out;
}

/** Skill descriptions (English HTML), by lower-case English skill name: the text before the action lists. */
export async function readAonSkills(offline: boolean, warn: Warn): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const d of await load("skill", offline, warn)) {
    if (!coreBook(d)) continue;
    const intro = (d.markdown ?? "").split(/<title level="2"/)[0];
    const html = aonToHtml(intro);
    if (html) out.set(d.name!.toLowerCase(), html);
  }
  return out;
}
