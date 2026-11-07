/**
 * Checks the committed data (src/data) as the site will render it: the HTML
 * goes through set:html, so nothing dangerous may slip in, and every internal
 * link must lead to a page that exists.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COLLECTIONS, VIEWS } from "../src/lib/collections.ts";
import type { Entry } from "../src/lib/types.ts";

const load = (name: string): Entry[] => {
  const file = `src/data/${name}.json`;
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Entry[]) : [];
};

const data = COLLECTIONS.map((c) => ({ def: c, list: load(c.name) }));
const all = data.flatMap((d) => d.list);
const entryPages = new Set(data.flatMap(({ def, list }) => list.map((e) => `${def.path}/${e.id}`)));
const pages = new Set(["", "sources", ...COLLECTIONS.map((c) => c.path), ...VIEWS.map((v) => v.path), ...entryPages]);
const keys = new Set(all.map((e) => `${e.collection}/${e.id}`));

/** Every string of an entry, wherever it is nested. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) strings(v, out);
  return out;
}

const DANGEROUS =
  /<\s*(script|iframe|object|embed|style|img|svg|form|input|link|meta|base)\b|\son[a-z]+\s*=|javascript:|\sstyle\s*=|srcdoc|\sdata-(?!preview=)[a-z-]+\s*=/i;

describe("imported data", () => {
  it("is present", () => {
    expect(all.length).toBeGreaterThan(1000);
    expect(existsSync("src/data/meta.json")).toBe(true);
  });

  it("has unique, URL-safe ids in the right collection", () => {
    for (const { def, list } of data) {
      const ids = list.map((e) => e.id);
      expect(new Set(ids).size, def.name).toBe(ids.length);
      for (const e of list) {
        expect(e.collection, `${def.name}/${e.id}`).toBe(def.name);
        expect(e.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      }
    }
  });

  it("contains no dangerous HTML", () => {
    const offenders = all.filter((e) => strings(e).some((s) => DANGEROUS.test(s))).map((e) => `${e.collection}/${e.id}`);
    expect(offenders).toEqual([]);
  });

  it("only links to pages that exist", () => {
    const broken = new Set<string>();
    for (const e of all) {
      for (const s of strings(e)) {
        for (const [, href] of s.matchAll(/href="\/([^"#?]*)/g)) if (!pages.has(href.replace(/\/$/, ""))) broken.add(`${e.collection}/${e.id} → /${href}`);
        for (const [, path] of s.matchAll(/data-preview="([^"]*)"/g)) if (!entryPages.has(path)) broken.add(`${e.collection}/${e.id} → aperçu ${path}`);
      }
    }
    expect([...broken].slice(0, 20)).toEqual([]);
  });

  it("only relates to entries that exist", () => {
    const missing = all.flatMap((e) => e.related.flatMap((r) => r.ids.filter((id) => !keys.has(`${r.collection}/${id}`)).map((id) => `${e.collection}/${e.id} → ${r.collection}/${id}`)));
    expect(missing.slice(0, 20)).toEqual([]);
  });
});
