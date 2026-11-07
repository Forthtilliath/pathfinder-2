// Mega menu (native popover): opens right below the sticky header, whatever its height (it wraps on narrow screens).
const menu = document.getElementById("site-menu");
const header = document.querySelector<HTMLElement>(".site-header");

if (menu && header) {
  menu.addEventListener("beforetoggle", (e) => {
    if ((e as ToggleEvent).newState === "open") menu.style.setProperty("--menu-top", `${Math.round(header.getBoundingClientRect().bottom)}px`);
  });
  // The search dialog takes over: the menu does not stay open behind it.
  document.querySelectorAll("[data-open-search]").forEach((b) => b.addEventListener("click", () => menu.matches(":popover-open") && menu.hidePopover()));
}
