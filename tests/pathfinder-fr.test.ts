import { describe, expect, it } from "vitest";
import { parseTranslation } from "../scripts/import/pathfinder-fr.ts";

const CURRENT = `Name: Negate Aroma
Nom: Supprimer l'arôme
NomBBE:
État: officielle

-- Desc (en) --
<p>The target loses its odor.</p>
-- Desc (fr) --
<p>La cible n'émet plus d'odeurs.</p>
<hr />
<p><strong>Intensifié (5e)</strong> La portée passe à 9 mètres.</p>
-- End desc ---

-- GM notes (en) --
<p>Secret.</p>
-- GM notes (fr) --
<p>Secret.</p>
-- End GM notes ---

----- Fields ------------------------------------------------------------------
RangeEN: touch
RangeFR: contact
TargetEN: 1 willing creature
TargetFR: 1 créature consentante
heightening.5.rangeFR: 9 mètres
-------------------------------------------------------------------------------
----- Lists -------------------------------------------------------------------
PrereqEN: tailed goblin heritage
PrereqFR: héritage gobelin à queue
-------------------------------------------------------------------------------
----- Items -------------------------------------------------------------------
ID: 0UKsJtM3fEth21iR
Name: Lifesense 240 feet
Nom: Perception de la vie 72 m
NomBBE:

ID: 0s0zoTqBFyl1ZTjC
Name: Frightful Presence
Nom: Présence terrifiante
-- Desc (en) --
<p>60 feet.</p>
-- Desc (fr) --
<p>18 mètres.</p>
-- End desc ---
-------------------------------------------------------------------------------
`;

const OLD = `Name: Fireball
Nom: Boule de feu
État: libre

------ Data ------
RangeEN: 500 feet
RangeFR: 150 mètres
------ Description (en) ------
<p>A roaring blast.</p>
------ Description (fr) ------
<p>Une explosion rugissante.</p>
`;

describe("parseTranslation", () => {
  it("reads the current GitLab format", () => {
    const t = parseTranslation(CURRENT.replace(/\n/g, "\r\n"), "abcdefghijklmnop");
    expect(t.name).toBe("Supprimer l'arôme");
    expect(t.state).toBe("officielle");
    expect(t.englishDescription).toBe("<p>The target loses its odor.</p>");
    expect(t.description).toBe(
      "<p>La cible n'émet plus d'odeurs.</p>\n<hr />\n<p><strong>Intensifié (5e)</strong> La portée passe à 9 mètres.</p>",
    );
    expect(t.fields.get("range")).toBe("contact");
    expect(t.fields.get("target")).toBe("1 créature consentante");
    expect(t.fields.get("heightening.5.range")).toBe("9 mètres");
    expect(t.fields.get("prereq")).toBe("héritage gobelin à queue");
  });

  it("keeps embedded items apart from the main description", () => {
    const t = parseTranslation(CURRENT, "abcdefghijklmnop");
    expect(t.items.get("0UKsJtM3fEth21iR")).toEqual({ englishName: "Lifesense 240 feet", name: "Perception de la vie 72 m", description: "" });
    expect(t.items.get("0s0zoTqBFyl1ZTjC")).toEqual({ englishName: "Frightful Presence", name: "Présence terrifiante", description: "<p>18 mètres.</p>" });
    expect(t.description).not.toContain("18 mètres");
  });

  it("still reads the old format", () => {
    const t = parseTranslation(OLD, "abcdefghijklmnop");
    expect(t.name).toBe("Boule de feu");
    expect(t.fields.get("range")).toBe("150 mètres");
    expect(t.englishDescription).toBe("<p>A roaring blast.</p>");
    expect(t.description).toBe("<p>Une explosion rugissante.</p>");
  });
});
