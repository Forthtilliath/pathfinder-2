// Preview of rule links on hover (or keyboard focus).
interface Preview {
  name: string;
  subtitle: string;
  excerpt: string;
}

const bubble = document.querySelector<HTMLElement>(".preview")!;
const cache = new Map<string, Promise<Preview | null>>();
let timer: number | undefined;
let activeLink: HTMLAnchorElement | null = null;

const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

function fetchPreview(path: string) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(`/apercus/${path}.json`)
        .then((r) => (r.ok ? (r.json() as Promise<Preview>) : null))
        .catch(() => null),
    );
  }
  return cache.get(path)!;
}

function position(link: HTMLElement) {
  const rect = link.getBoundingClientRect();
  const width = Math.min(360, window.innerWidth - 16);
  bubble.style.width = `${width}px`;
  bubble.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
  const below = rect.bottom + 8;
  bubble.style.top = `${below}px`;
  const height = bubble.offsetHeight;
  if (below + height > window.innerHeight - 8) bubble.style.top = `${Math.max(8, rect.top - height - 8)}px`;
}

/** Same check as the import sanitizer: only "section/id" paths are fetched. */
const PREVIEW_PATH = /^[a-z0-9]+(-[a-z0-9]+)*\/[a-z0-9]+(-[a-z0-9]+)*$/;

async function show(link: HTMLAnchorElement) {
  const path = link.dataset.preview;
  if (!path || !PREVIEW_PATH.test(path)) return;
  activeLink = link;
  const data = await fetchPreview(path);
  if (!data || activeLink !== link) return;
  const title = document.createElement("p");
  title.className = "preview-title";
  const name = document.createElement("strong");
  name.textContent = data.name;
  const type = document.createElement("span");
  type.textContent = data.subtitle;
  title.append(name, type);
  const excerpt = document.createElement("p");
  excerpt.textContent = data.excerpt;
  bubble.replaceChildren(title, excerpt);
  bubble.hidden = false;
  position(link);
}

function hide() {
  window.clearTimeout(timer);
  activeLink = null;
  bubble.hidden = true;
}

const linkFrom = (e: Event) => (e.target as Element | null)?.closest?.<HTMLAnchorElement>("a[data-preview]") ?? null;

document.addEventListener("mouseover", (e) => {
  if (!finePointer.matches) return;
  const link = linkFrom(e);
  if (!link || link === activeLink) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => show(link), 250);
});
document.addEventListener("mouseout", (e) => {
  const link = linkFrom(e);
  if (link && !link.contains(e.relatedTarget as Node)) hide();
});
document.addEventListener("focusin", (e) => {
  const link = linkFrom(e);
  if (link) show(link);
});
document.addEventListener("focusout", hide);
window.addEventListener("scroll", hide, { passive: true });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hide();
});

export {};
