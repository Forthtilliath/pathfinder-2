// Table of contents: always open in the side column (wide screens), collapsed above the content otherwise,
// and the section being read is highlighted (aria-current).
const nav = document.querySelector<HTMLElement>(".toc");
const details = nav?.querySelector("details");
const wide = window.matchMedia("(min-width: 60rem)");

if (nav && details) {
  // Closed in the HTML, so narrow screens never see it open then close (no layout shift above the content).
  const sync = () => {
    details.open = wide.matches;
  };
  sync();
  wide.addEventListener("change", sync);
  // In the side column the title is not a toggle: the list stays visible.
  details.querySelector("summary")?.addEventListener("click", (e) => {
    if (wide.matches) e.preventDefault();
  });

  const links = [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  const targets = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))));
  let active: HTMLAnchorElement | null = null;

  /** Keeps the active link visible when the table of contents scrolls on its own (long lists). */
  function reveal(link: HTMLAnchorElement) {
    if (!wide.matches || nav!.scrollHeight <= nav!.clientHeight) return;
    const top = link.offsetTop;
    const bottom = top + link.offsetHeight;
    if (top < nav!.scrollTop) nav!.scrollTop = top - 16;
    else if (bottom > nav!.scrollTop + nav!.clientHeight) nav!.scrollTop = bottom - nav!.clientHeight + 16;
  }

  // A section is being read once its heading passes the reading line: the top third of the screen,
  // and never above the point where anchors land (below the sticky header).
  const READING_LINE = 0.3;
  const anchorLine = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) + 24;
  const line = () => Math.max(window.innerHeight * READING_LINE, anchorLine);

  function update() {
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    let index = -1;
    if (atBottom) index = targets.length - 1;
    // A hidden target (rules index narrowed by a search) has no box: it is never the section being read.
    else targets.forEach((t, i) => t && t.getClientRects().length && t.getBoundingClientRect().top <= line() && (index = i));
    const link = links[index] ?? null;
    if (link === active) return;
    active?.removeAttribute("aria-current");
    link?.setAttribute("aria-current", "true");
    active = link;
    if (link) reveal(link);
  }

  // Fires whenever a heading crosses the reading line, or the bottom of the footer comes fully into view (end of
  // the page, where the last short sections never reach the line): no scroll listener.
  // A percentage margin follows the window size (resizes, mobile toolbar).
  const observer = new IntersectionObserver(update, { rootMargin: `-${READING_LINE * 100}% 0px 0px 0px`, threshold: [0, 1] });
  // A related list is a tall <section>: its heading is what crosses the line.
  for (const t of targets) if (t) observer.observe(t.matches("h2, h3") ? t : (t.querySelector("h2") ?? t));
  // Its last block only: the whole footer can be taller than the observed area on short windows.
  const footer = document.querySelector(".footer-legal");
  if (footer) observer.observe(footer);
  // Jumps (anchor links, Home/End) can carry a heading past the line without crossing the observed area:
  // checked once the scroll has ended.
  window.addEventListener("scrollend", update, { passive: true });
}
