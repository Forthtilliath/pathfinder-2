/**
 * Foundry texts contain "enrichers":
 *   @UUID[Compendium.pf2e.conditionitems.Item.Frightened]{effrayé 1}
 *   @Check[reflex|dc:20|basic]   @Damage[6d6[fire]]   @Template[burst|distance:20]
 *   [[/r 1d4 #rounds]]   [[/act seek]]{Chercher}
 *
 * This module tokenizes them and protects them during machine translation;
 * enrichers.ts renders them as French HTML.
 */

export interface Token {
  kind: "enricher" | "command";
  /** Enricher name (UUID, Check…) or command name (r, act…). */
  name: string;
  params: string;
  label?: string;
  /** Original source, label included. */
  raw: string;
}

export type Segment = string | Token;

function readLabel(text: string, i: number): { label?: string; end: number } {
  if (text[i] !== "{") return { end: i };
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    if (text[j] === "{") depth++;
    else if (text[j] === "}" && --depth === 0) return { label: text.slice(i + 1, j), end: j + 1 };
  }
  return { end: i };
}

/** Splits a text into plain strings and tokens. */
export function tokenize(text: string): Segment[] {
  const segments: Segment[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) segments.push(buffer);
    buffer = "";
  };
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    const enricher = /^@([A-Za-z]+)\[/.exec(rest);
    if (enricher) {
      let depth = 0;
      let close = -1;
      for (let j = i + enricher[0].length - 1; j < text.length; j++) {
        if (text[j] === "[") depth++;
        else if (text[j] === "]" && --depth === 0) {
          close = j;
          break;
        }
      }
      if (close > 0) {
        const { label, end } = readLabel(text, close + 1);
        flush();
        segments.push({
          kind: "enricher",
          name: enricher[1],
          params: text.slice(i + enricher[0].length, close),
          label,
          raw: text.slice(i, end),
        });
        i = end;
        continue;
      }
    }
    if (rest.startsWith("[[/")) {
      let depth = 0;
      let close = -1;
      for (let j = i + 2; j < text.length; j++) {
        if (text[j] === "[") depth++;
        else if (text[j] === "]") {
          if (depth > 0) depth--;
          else if (text[j + 1] === "]") {
            close = j;
            break;
          }
        }
      }
      if (close > 0) {
        const inner = text.slice(i + 3, close);
        const space = inner.search(/\s/);
        const { label, end } = readLabel(text, close + 2);
        flush();
        segments.push({
          kind: "command",
          name: space < 0 ? inner : inner.slice(0, space),
          params: space < 0 ? "" : inner.slice(space + 1).trim(),
          label,
          raw: text.slice(i, end),
        });
        i = end;
        continue;
      }
    }
    buffer += text[i];
    i++;
  }
  flush();
  return segments;
}

/** Default label of an unlabeled link: the target's name. */
export function uuidTargetName(params: string): string {
  const parts = params.split(".");
  const name = parts.length >= 5 && parts[0] === "Compendium" ? parts.slice(4).join(".") : parts.at(-1)!;
  return name.replace(/^(Spell |Feat |Equipment |)Effect: /, "");
}

export interface UuidTarget {
  pack: string;
  key: string;
}

export function parseUuid(token: Token): UuidTarget | null {
  const p = token.params.split(".");
  if (token.name === "UUID" && p[0] === "Compendium" && p.length >= 5) return { pack: p[2], key: p.slice(4).join(".") };
  if (token.name === "Compendium" && p.length >= 3) return { pack: p[1], key: p.slice(2).join(".") };
  return null;
}

/* ------------------------------------------------------------------ */
/* Protection during machine translation                              */
/* ------------------------------------------------------------------ */

const LINK_ENRICHERS = new Set(["UUID", "Compendium"]);

/**
 * Replaces tokens with <ref id="n">…</ref> tags the model must keep.
 * Tag contents (labels) get translated.
 */
export function protect(text: string): { text: string; tokens: Token[] } {
  const tokens: Token[] = [];
  const output = tokenize(text)
    .map((s) => {
      if (typeof s === "string") return s;
      const n = tokens.push(s) - 1;
      const inner = s.label ?? (s.kind === "enricher" && LINK_ENRICHERS.has(s.name) ? uuidTargetName(s.params) : undefined);
      return inner === undefined ? `<ref id="${n}"/>` : `<ref id="${n}">${inner}</ref>`;
    })
    .join("");
  return { text: output, tokens };
}

/** Reverse of protect: puts the original tokens back with translated labels. */
export function restore(text: string, tokens: Token[]): string {
  const seen = new Set<number>();
  const output = text
    .replace(/<ref id="(\d+)"\s*\/>/g, (_, n) => {
      const t = tokens[Number(n)];
      if (!t) throw new Error(`Unknown tag <ref id="${n}"/>.`);
      seen.add(Number(n));
      return t.raw;
    })
    .replace(/<ref id="(\d+)">([\s\S]*?)<\/ref>/g, (_, n, label) => {
      const t = tokens[Number(n)];
      if (!t) throw new Error(`Unknown tag <ref id="${n}">.`);
      seen.add(Number(n));
      const withoutLabel = t.label === undefined ? t.raw : t.raw.slice(0, t.raw.length - t.label.length - 2);
      return `${withoutLabel}{${label}}`;
    });
  if (seen.size !== tokens.length) throw new Error(`Incomplete translation: ${tokens.length - seen.size} reference(s) lost.`);
  return output;
}
