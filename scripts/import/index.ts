/**
 * Import orchestration: sources → drafts → translation → labels and traits →
 * ids and links → entries → relations → data files. Each step lives in its own module.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CollectionName, Entry, Text } from "../../src/lib/types.ts";
import type { Draft } from "./adapters.ts";
import { readAonSkills } from "./aon.ts";
import { buildEntry } from "./build-entry.ts";
import { IMPORT_RULES, REPORT_FILE, REPOS, TRANSLATIONS_DIR } from "./config.ts";
import { readDrafts } from "./drafts.ts";
import { enrich, type RenderContext } from "./enrichers.ts";
import { loadDictionary, loadTraitKeys } from "./foundry-lang.ts";
import { fetchRepo } from "./git.ts";
import { assignIds, buildLinkIndex, factContext, skillIds } from "./links.ts";
import { writeData, writeReport, type ImportReport } from "./output.ts";
import { packNames } from "./packs.ts";
import { indexTranslations } from "./pathfinder-fr.ts";
import { FR_LANGUAGE_FILE, siteTranslation, text, UNTRANSLATED } from "./provenance.ts";
import { buildSkills, relateEntries } from "./relations.ts";
import { sanitize } from "./sanitize.ts";
import { DAMAGE_TYPES, RARITY_TRAITS, SKILL_ATTRIBUTES, STATISTICS } from "./terms.ts";
import { buildTraitPages, relateTraits } from "./trait-pages.ts";
import { buildGlossary, keepTranslated, translateDrafts } from "./translation-steps.ts";
import { Translator } from "./translator.ts";

const args = new Set(process.argv.slice(2));
const offline = args.has("--offline");
const noTranslate = args.has("--no-translate");

const report: ImportReport = { excluded: [], outdated: [], warnings: new Map(), untranslatedChars: 0 };
const warn = (message: string) => report.warnings.set(message, (report.warnings.get(message) ?? 0) + 1);

/** Labels missing from the French language files become ⟪key⟫ tokens, resolved after translation. */
const TOKEN = /⟪([^⟫]+)⟫/g;
/** A paragraph made only of a link to content that is not imported (e.g. the class journal page) would be a lone word. */
const LONE_LINK = /<p>\s*@UUID\[Compendium\.pf2e\.([^.\]]+)\.[^.\]]+\.([^\]]+)\](?:\{[^}]*\})?\s*<\/p>/g;

async function main() {
  console.log("1. Fetching sources");
  const foundry = fetchRepo(REPOS.foundry, offline);
  const translationRepo = fetchRepo(REPOS.translation, offline);
  const languageRepo = fetchRepo(REPOS.language, offline);

  console.log("2. Reading language files");
  const englishDict = loadDictionary(
    path.join(foundry.dir, "static/lang"),
    (n) => n.endsWith("en.json") && !n.startsWith("sf2e"),
  );
  const frenchDict = loadDictionary(languageRepo.dir, (n) => n.endsWith("fr.json"));
  const traitKeys = loadTraitKeys(path.join(foundry.dir, "src/scripts/config/traits.ts"));
  const translations = indexTranslations(translationRepo.dir, ["data"]);
  const packs = packNames(path.join(foundry.dir, "system.pf2e.json"));
  console.log(
    `   ${englishDict.size} English keys, ${frenchDict.size} French keys, ${translations.size} pathfinder-fr files`,
  );

  const neededKeys = new Map<string, string>();
  const labels = {
    key(key: string, english?: string): string {
      const fr = frenchDict.get(key);
      if (fr) return fr;
      neededKeys.set(key, englishDict.get(key) ?? english ?? key);
      return `⟪${key}⟫`;
    },
  };

  console.log("3. Reading Remaster data");
  const { drafts, linkKeys } = await readDrafts({
    foundryDir: foundry.dir,
    translationDir: translationRepo.dir,
    translations,
    packs,
    labels,
    englishDict,
    frenchDict,
    offline,
    report,
    warn,
  });

  const translator = new Translator(!noTranslate, new Map());
  buildGlossary(translator, drafts, traitKeys, englishDict, frenchDict);
  console.log(
    translator.enabled
      ? `4. Translating missing texts (${translator.model})`
      : "4. Machine translation disabled: only cached translations are used",
  );
  await translateDrafts(translator, drafts);
  const kept = keepTranslated(drafts, report);

  console.log("5. Traits, books and labels");
  const usedTraits = new Set<string>();
  for (const d of kept) {
    for (const t of d.doc.system.traits?.value ?? []) if (!RARITY_TRAITS.has(t)) usedTraits.add(t);
    for (const t of d.extraTraits ?? []) usedTraits.add(t);
  }
  // Every known trait gets a page, used or not.
  for (const t of traitKeys.labels.keys()) usedTraits.add(t);
  for (const t of usedTraits) {
    for (const key of [traitKeys.labels.get(t), traitKeys.descriptions.get(t)]) {
      if (key && !frenchDict.get(key) && englishDict.get(key)) neededKeys.set(key, englishDict.get(key)!);
    }
  }
  const booksFile = path.join(TRANSLATIONS_DIR, "books.json");
  const bookTitles: Record<string, string> = existsSync(booksFile) ? JSON.parse(readFileSync(booksFile, "utf8")) : {};
  const siteDict = await translator.translateKeys(
    neededKeys,
    "Context: labels of a rules system (traits, languages, weapon groups, divine domains…) and book titles of the Pathfinder 2 line. For a book title, give the usual French title if one exists, otherwise a natural translation.",
  );

  const label = (key: string | undefined): Text | null => {
    if (!key) return null;
    const fr = frenchDict.get(key);
    if (fr) return text(fr, FR_LANGUAGE_FILE);
    const site = siteDict.get(key);
    return site ? text(site.french, siteTranslation(site.status)) : null;
  };
  const traits = buildTraitPages(usedTraits, traitKeys, label, report);

  // Book titles: the official French title when there is one (translations/books.json), otherwise the
  // English title as published, never a made-up translation: readers must be able to find the book.
  const bookName = (title: string): Text | undefined => {
    const clean = title.replace(/\s+/g, " ").trim();
    if (!clean) return undefined;
    if (bookTitles[clean])
      return text(bookTitles[clean], { source: "site", sourceLanguage: "en", status: "reviewed", method: "human" });
    // "Pathfinder Guns & Gears" → "Guns & Gears"; kept where it is part of the name ("Pathfinder #210", Society).
    return text(clean.replace(/^Pathfinder (?!#|Society)/, ""), UNTRANSLATED);
  };

  /** Replaces ⟪key⟫ tokens. Returns null when a label is missing. */
  const resolveTokens = (value: string): { value: string; ai: boolean } | null => {
    let ai = false;
    let missing = false;
    const out = value.replace(TOKEN, (_, key: string) => {
      if (key.startsWith("trait:")) {
        const name = traits.name(key.slice(6));
        if (!name) missing = true;
        return name ?? "";
      }
      if (key.startsWith("book:")) return bookName(key.slice(5))?.value ?? "";
      const site = siteDict.get(key);
      if (!site) {
        missing = true;
        warn(`label without translation: ${key}`);
        return "";
      }
      if (site.status === "unreviewed") ai = true;
      return site.french;
    });
    return missing ? null : { value: out, ai };
  };

  console.log("6. Ids and links");
  assignIds(kept);
  const links = buildLinkIndex(kept, linkKeys);
  const renderCtx: RenderContext = {
    resolve: (pack, key) => links.index.get(`${pack}:${key}`) ?? null,
    resolveAction: (slug) => links.actionsBySlug.get(slug) ?? null,
    statistic: (slug) => STATISTICS[slug] ?? null,
    damageType: (slug) => (slug in DAMAGE_TYPES ? DAMAGE_TYPES[slug] : null),
    localize: (key) => frenchDict.get(key) ?? siteDict.get(key)?.french ?? null,
    report: warn,
  };
  const dropDeadLinks = (value: string) =>
    value.replace(LONE_LINK, (all, pack: string, key: string) => (links.index.has(`${pack}:${key}`) ? all : ""));
  /** Final HTML of a page: Foundry syntax rendered, then filtered (rendered with set:html). */
  const toHtml = (value: string) => sanitize(enrich(dropDeadLinks(value), renderCtx));
  const enrichText = (t: Text): Text => ({ ...t, value: toHtml(t.value) });

  console.log("7. Building entries");
  const entries = new Map<CollectionName, Entry[]>();
  const push = (e: Entry) => {
    const list = entries.get(e.collection);
    if (list) list.push(e);
    else entries.set(e.collection, [e]);
  };
  const entryByDraft = new Map<Draft, Entry>();
  const entryCtx = { facts: factContext(links, traits), traits, resolveTokens, toHtml, bookName };
  for (const d of kept) {
    const entry = buildEntry(d, entryCtx);
    entryByDraft.set(d, entry);
    push(entry);
  }

  console.log("8. Relations");
  relateEntries(kept, entryByDraft);

  // Skills: descriptions from Archives of Nethys (translated like any other text).
  const aonSkills = IMPORT_RULES ? await readAonSkills(offline, warn) : new Map<string, string>();
  const skillDescriptions = new Map<string, Text>();
  await Promise.all(
    Object.keys(SKILL_ATTRIBUTES).map(async (slug) => {
      const english = aonSkills.get(slug);
      if (!english) return;
      const result = await translator.translateEntry(
        "skills",
        slug,
        { description: english },
        `Context: description of the skill "${slug}".`,
      );
      if (result)
        skillDescriptions.set(slug, enrichText(text(result.fields.description, siteTranslation(result.status))));
      else {
        report.excluded.push(`skills: ${slug} (missing: description)`);
        report.untranslatedChars += english.length;
      }
    }),
  );
  for (const skill of buildSkills(kept, entryByDraft, skillIds, skillDescriptions)) push(skill);

  relateTraits(traits, kept, entryByDraft);
  for (const t of traits.entries.values()) {
    t.description = enrichText(t.description);
    push(t);
  }

  console.log("9. Writing");
  const meta = writeData(entries, foundry, translationRepo, translator);
  translator.save();
  writeReport(meta, translator, report);
  console.log(`Done. Report: ${path.relative(process.cwd(), REPORT_FILE)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
