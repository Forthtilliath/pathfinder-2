/**
 * The HTML of the pages comes from third parties (pathfinder-fr, Archives of
 * Nethys, Foundry, machine translation) and is rendered with set:html.
 * Everything is filtered here against an allowlist: no script, no event
 * handler, no style, no javascript: link can reach the site.
 */
import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "strong", "b", "em", "i", "u", "sup", "sub", "span", "div", "section", "blockquote",
    "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
    "table", "caption", "thead", "tbody", "tfoot", "tr", "th", "td", "a",
  ],
  allowedAttributes: {
    "*": ["class", "title", "aria-label"],
    a: ["href", "data-*"],
    span: ["data-*"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  // Unknown tags (typos in the sources) are dropped, their text is kept.
  disallowedTagsMode: "discard",
};

export const sanitize = (html: string): string => (html ? sanitizeHtml(html, OPTIONS) : html);
