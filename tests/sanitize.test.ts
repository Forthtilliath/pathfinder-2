import { describe, expect, it } from "vitest";
import { sanitize } from "../scripts/import/sanitize.ts";

describe("sanitize", () => {
  it("keeps the markup produced by the import", () => {
    const html =
      '<p><strong>Succès</strong> <a href="/sorts/boule-de-feu" class="ref" data-preview="/apercus/sorts/boule-de-feu">boule de feu</a> <span class="roll">DD 20</span> <span class="cost-glyph-text" title="Deux actions" aria-label="Deux actions">◆◆</span></p><table><tr><th colspan="2">A</th></tr></table>';
    expect(sanitize(html)).toBe(html);
  });

  it("removes scripts, event handlers and dangerous links", () => {
    const dirty =
      '<p onclick="steal()">Texte<script>steal()</script><img src=x onerror="steal()"><a href="javascript:steal()">lien</a><iframe src="https://evil.example"></iframe><style>body{}</style></p>';
    const clean = sanitize(dirty);
    expect(clean).not.toMatch(/script|onclick|onerror|javascript:|iframe|style|<img/i);
    expect(clean).toContain("Texte");
    expect(clean).toContain("lien");
  });

  it("drops unknown tags but keeps their text", () => {
    expect(sanitize("<p><thsr>texte</thsr></p>")).toBe("<p>texte</p>");
  });
});
