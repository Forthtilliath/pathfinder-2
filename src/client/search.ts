// Full-text search (Pagefind), loaded on first open.
declare global {
  interface Window {
    PagefindUI?: new (options: Record<string, unknown>) => unknown;
  }
}

const dialog = document.querySelector<HTMLDialogElement>("dialog.search-dialog")!;
let loading: Promise<void> | null = null;

function loadPagefind(): Promise<void> {
  loading ??= new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/pagefind/pagefind-ui.css";
    document.head.append(css);
    const script = document.createElement("script");
    script.src = "/pagefind/pagefind-ui.js";
    script.onload = () => {
      new window.PagefindUI!({ element: "#search-root", showSubResults: false, showImages: false, resetStyles: false, autofocus: true });
      resolve();
    };
    script.onerror = () => reject(new Error("Pagefind unavailable"));
    document.head.append(script);
  });
  return loading;
}

async function openSearch() {
  dialog.showModal();
  try {
    await loadPagefind();
    dialog.querySelector<HTMLInputElement>("input")?.focus();
  } catch {
    dialog.querySelector<HTMLElement>(".search-unavailable")!.hidden = false;
  }
}

document.querySelectorAll("[data-open-search]").forEach((button) => button.addEventListener("click", openSearch));
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if (!dialog.open) openSearch();
  }
});
// Close when clicking the backdrop.
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close();
});

export {};
