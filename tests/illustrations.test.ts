/**
 * Illustrations are looked up by file name (src/assets/illustrations/<collection>/<id>.webp):
 * a typo in a name would silently leave a page without its picture.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Entry } from "../src/lib/types.ts";

const DIR = "src/assets/illustrations";
const ids = (collection: string) =>
  (JSON.parse(readFileSync(`src/data/${collection}.json`, "utf8")) as Entry[]).map((e) => e.id).sort();
const files = (collection: string) =>
  readdirSync(`${DIR}/${collection}`)
    .map((f) => f.replace(/\.webp$/, ""))
    .sort();

describe("illustrations", () => {
  for (const collection of ["classes", "ancestries"]) {
    it(`${collection}: every file matches an entry, and every entry has one`, () => {
      expect(files(collection)).toEqual(ids(collection));
    });
  }

  it("home page illustration exists", () => {
    expect(readdirSync(DIR)).toContain("home.webp");
  });
});
