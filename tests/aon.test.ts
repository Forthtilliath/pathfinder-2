import { describe, expect, it } from "vitest";
import { aonToHtml } from "../scripts/import/aon.ts";

describe("aonToHtml", () => {
  it("drops the page title and the source line, keeps link labels", () => {
    const html = aonToHtml(
      '<title level="1" right="Skill ">[Athletics](/Skills.aspx?ID=36)</title>\n\n**Source** [Player Core](/Sources.aspx?ID=216) pg. 234\n\nYou can [Climb](/Actions.aspx?ID=33) &amp; swim.',
    );
    expect(html).toBe("<p>You can Climb & swim.</p>");
  });

  it("maps title levels to headings and lists to ul", () => {
    const html = aonToHtml('<title level="2">Members</title>\n\n- one\n- two\n\n<title level="3">Note</title> Text');
    expect(html).toContain("<h2>Members</h2>");
    expect(html).toContain("<ul><li>one</li><li>two</li></ul>");
    expect(html).toContain("<h3>Note</h3>");
  });

  it("removes a leading rule left by the removed header", () => {
    expect(aonToHtml("**Source** GM Core pg. 1\n\n---\n\nBody")).toBe("<p>Body</p>");
  });
});
