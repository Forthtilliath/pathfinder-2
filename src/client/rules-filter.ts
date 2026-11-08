// Rules index: narrows the table of contents to the pages (or whole chapters) whose title matches,
// hides what is left empty, side column included, and keeps the query in the URL (?q=).
import { normalize } from "../lib/normalize";

const input = document.querySelector<HTMLInputElement>("[data-rules-filter]");
const count = document.querySelector<HTMLElement>("[data-rules-count]");
const empty = document.querySelector<HTMLElement>("[data-rules-empty]");
const books = [...document.querySelectorAll<HTMLElement>("[data-rules-book]")];
const chapters = [...document.querySelectorAll<HTMLElement>("[data-rules-chapter]")];
const tocItems = new Map([...document.querySelectorAll<HTMLAnchorElement>('.toc a[href^="#"]')].map((a) => [a.hash.slice(1), a.closest("li")!]));
const total = document.querySelectorAll("[data-rules-chapter] li").length;

const words = (q: string) => normalize(q).split(/\s+/).filter(Boolean);
const matches = (text: string, w: string[]) => w.every((word) => text.includes(word));
const pages = (n: number) => `${n} ${n > 1 ? "pages" : "page"}`;

function apply(query: string) {
  const w = words(query);
  let shown = 0;
  for (const chapter of chapters) {
    const whole = w.length === 0 || matches(chapter.dataset.search ?? "", w);
    let visible = 0;
    for (const li of chapter.querySelectorAll<HTMLElement>("li")) {
      const on = whole || matches(li.dataset.search ?? "", w);
      li.hidden = !on;
      if (on) visible++;
    }
    shown += visible;
    chapter.hidden = !whole && visible === 0;
    const toc = tocItems.get(chapter.querySelector("h3")?.id ?? "");
    if (toc) toc.hidden = chapter.hidden;
  }
  for (const book of books) {
    book.hidden = [...book.querySelectorAll<HTMLElement>("[data-rules-chapter]")].every((c) => c.hidden);
    const toc = tocItems.get(book.querySelector("h2")?.id ?? "");
    if (toc) toc.hidden = book.hidden;
  }
  if (count) count.textContent = w.length ? `${pages(shown)} sur ${total}` : pages(total);
  if (empty) empty.hidden = books.some((b) => !b.hidden);
}

if (input) {
  input.value = new URLSearchParams(window.location.search).get("q") ?? "";
  apply(input.value);
  input.addEventListener("input", () => {
    apply(input.value);
    const params = new URLSearchParams(input.value ? { q: input.value } : {});
    history.replaceState(null, "", input.value ? `?${params}` : window.location.pathname);
  });
}
