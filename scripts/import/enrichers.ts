/**
 * Renders Foundry enrichers (see enricher-tokens.ts) as French HTML: links,
 * checks, damage, templates. Also re-exports the tokenizer API.
 */
import { entryPath } from "../../src/lib/collections.ts";
import type { CollectionName } from "../../src/lib/types.ts";
import { feetToMeters, translateArea } from "./rules.ts";
import { parseUuid, tokenize, type Token } from "./enricher-tokens.ts";

export { parseUuid, protect, restore, tokenize, uuidTargetName, type Segment, type Token, type UuidTarget } from "./enricher-tokens.ts";

/* ------------------------------------------------------------------ */
/* French HTML rendering                                               */
/* ------------------------------------------------------------------ */

export interface ResolvedTarget {
  collection: CollectionName;
  id: string;
  name: string;
}

export interface RenderContext {
  resolve(pack: string, key: string): ResolvedTarget | null;
  resolveAction(englishSlug: string): ResolvedTarget | null;
  /** French label of a statistic (reflex, athletics…). */
  statistic(slug: string): string | null;
  /** French wording of a damage type (fire…). */
  damageType(slug: string): string | null;
  /** French value of a Foundry language key. */
  localize(key: string): string | null;
  report(message: string): void;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function link(target: ResolvedTarget, label: string): string {
  const path = entryPath(target.collection, target.id);
  return `<a href="/${path}/" data-preview="${path}">${label}</a>`;
}

function parseParams(params: string): { positional: string[]; named: Map<string, string> } {
  const positional: string[] = [];
  const named = new Map<string, string>();
  for (const part of params.split("|")) {
    const m = /^([a-zA-Z]+):(.*)$/.exec(part.trim());
    if (m) named.set(m[1], m[2]);
    else if (part.trim()) positional.push(part.trim());
  }
  return { positional, named };
}

function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const c of text) {
    if ("([{".includes(c)) depth++;
    if (")]}".includes(c)) depth--;
    if (c === separator && depth === 0) {
      parts.push(current);
      current = "";
    } else current += c;
  }
  parts.push(current);
  return parts;
}

function formula(f: string): string {
  let r = f
    .trim()
    .replace(/@item\.rank/g, "rang")
    .replace(/@item\.level|@actor\.level/g, "niveau")
    .replace(/@[\w.]+/g, "X")
    .replace(/\b(floor|ceil|max|min)\b/g, "");
  if (/^\(([^()]*)\)$/.test(r)) r = r.slice(1, -1);
  return r;
}

function renderDamage(params: string, ctx: RenderContext): string {
  let expression = splitTopLevel(params, "|")[0].trim();
  if (expression.startsWith("{") && expression.endsWith("}")) expression = expression.slice(1, -1);
  return splitTopLevel(expression, ",")
    .map((part) => {
      const m = /^(.*)\[([^\][]*)\]$/.exec(part.trim());
      if (!m) return formula(part);
      const types = m[2]
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (types.includes("healing")) return formula(m[1]);
      let kind = "";
      const qualifiers: string[] = [];
      for (const t of types) {
        if (t === "persistent") qualifiers.push("persistants");
        else if (t === "splash") qualifiers.push("d'éclaboussure");
        else if (t === "precision") kind ||= "de précision";
        else {
          const name = ctx.damageType(t);
          if (name === null) ctx.report(`damage type without translation: ${t}`);
          else kind = name;
        }
      }
      return [formula(m[1]), "dégâts", kind, ...qualifiers].filter(Boolean).join(" ");
    })
    .join(" + ");
}

function renderCheck(params: string, ctx: RenderContext): string {
  const { positional, named } = parseParams(params);
  const type = named.get("type") ?? positional[0] ?? "";
  const dc = named.get("dc");
  const basic = positional.includes("basic") || named.get("basic") === "true";
  if (type === "flat") return dc ? `test nu DD ${dc}` : "test nu";
  const statistic = ctx.statistic(type);
  if (!statistic) ctx.report(`statistic without translation: ${type}`);
  return [statistic ?? "test", basic ? "basique" : "", /^\d+$/.test(dc ?? "") ? `DD ${dc}` : ""].filter(Boolean).join(" ");
}

function renderToken(t: Token, ctx: RenderContext, depth: number): string {
  if (t.kind === "command") {
    if (t.name === "act") {
      const slug = t.params.split(/\s/)[0];
      const target = ctx.resolveAction(slug);
      const label = t.label ?? target?.name;
      if (!label) {
        ctx.report(`action not found: ${slug}`);
        return "";
      }
      return target ? link(target, label) : label;
    }
    if (t.label !== undefined) return `<span class="roll">${t.label}</span>`;
    const f = t.params
      .replace(/#.*$/, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/[{}]/g, "")
      .trim();
    return `<span class="roll">${escapeHtml(formula(f))}</span>`;
  }

  switch (t.name) {
    case "UUID":
    case "Compendium": {
      const target = parseUuid(t);
      const resolved = target ? ctx.resolve(target.pack, target.key) : null;
      const label = t.label ?? resolved?.name;
      if (!label) {
        if (target) ctx.report(`unlabeled link to content not imported: ${target.pack}/${target.key}`);
        return "";
      }
      return resolved ? link(resolved, label) : label;
    }
    case "Check":
      return `<span class="roll">${t.label ?? renderCheck(t.params, ctx)}</span>`;
    case "Damage":
      return `<span class="roll">${t.label ?? renderDamage(t.params, ctx)}</span>`;
    case "Template": {
      if (t.label) return t.label;
      const { positional, named } = parseParams(t.params);
      const area = translateArea(named.get("type") ?? positional[0] ?? "", named.get("distance") ?? "");
      if (area) return area;
      ctx.report(`template without translation: ${t.params}`);
      const d = Number(named.get("distance"));
      return Number.isFinite(d) ? feetToMeters(d) : "";
    }
    case "Localize": {
      const value = ctx.localize(t.params);
      if (value === null) {
        ctx.report(`language key without translation: ${t.params}`);
        return "";
      }
      return depth < 3 ? enrich(value, ctx, depth + 1) : value;
    }
    case "Embed":
      return "";
    default:
      ctx.report(`unknown enricher: @${t.name}`);
      return t.label ?? "";
  }
}

const GLYPHS: Record<string, [string, string]> = {
  "1": ["◆", "1 action"],
  a: ["◆", "1 action"],
  "2": ["◆◆", "2 actions"],
  d: ["◆◆", "2 actions"],
  "3": ["◆◆◆", "3 actions"],
  t: ["◆◆◆", "3 actions"],
  r: ["⟲", "réaction"],
  f: ["◇", "action gratuite"],
  "0": ["◇", "action gratuite"],
};

/** Foundry's <span class="action-glyph">2</span> relies on a custom font: use plain symbols. */
function replaceActionGlyphs(html: string): string {
  return html.replace(/<span class="action-glyph">([^<]*)<\/span>/g, (match, code: string) => {
    const glyph = GLYPHS[code.trim().toLowerCase()];
    return glyph ? `<span class="cost-glyph-text" title="${glyph[1]}" aria-label="${glyph[1]}">${glyph[0]}</span>` : match;
  });
}

/** Turns a Foundry text into French HTML ready to display. */
export function enrich(text: string, ctx: RenderContext, depth = 0): string {
  return (
    tokenize(replaceActionGlyphs(text))
      .map((s) => (typeof s === "string" ? s : renderToken(s, ctx, depth)))
      .join("")
      // The text around a damage roll often repeats "dégâts": dedupe.
      .replace(/(<span class="roll">[^<]*dégâts[^<]*<\/span>)\s+(?:de\s+)?dégâts\b/g, "$1")
      .replace(/\b(?:de\s+)?dégâts\s+(<span class="roll">[^<]*dégâts)/g, "$1")
      .replace(/<p>\s*<\/p>/g, "")
      .replace(/\s+class="[^"]*"/g, (m) => (/cost-glyph-text|roll/.test(m) ? m : ""))
      .trim()
  );
}
