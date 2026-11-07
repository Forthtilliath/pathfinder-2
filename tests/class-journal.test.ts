import { describe, expect, it } from "vitest";
import { firstChapter } from "../scripts/import/class-journal.ts";

describe("firstChapter", () => {
  it("takes the first h1 section, headings one level down", () => {
    const html = '<p>Intro</p><h1 class="title">Jouer</h1><h2>Combat</h2><p>A</p><h1>Maîtrises</h1><p>B</p>';
    expect(firstChapter(html, "h1")).toBe('<h2 class="title">Jouer</h2><h3>Combat</h3><p>A</p>');
  });

  it("starts at the first h2 when the page has no chapter title", () => {
    expect(firstChapter("<p>Intro</p><h2>Combat</h2><p>A</p><h1>Maîtrises</h1>", "h2")).toBe("<h2>Jeu de rôle</h2>\n<h3>Combat</h3><p>A</p>");
  });

  it("returns null without the heading", () => {
    expect(firstChapter("<p>Rien</p>", "h1")).toBeNull();
  });
});
