// Table of contents: always open in the side column (wide screens), collapsed above the content otherwise.
// Closed in the HTML, so narrow screens never see it open then close (no layout shift above the content).
const details = document.querySelector<HTMLDetailsElement>(".toc details");
const wide = window.matchMedia("(min-width: 60rem)");

if (details) {
  const sync = () => {
    details.open = wide.matches;
  };
  sync();
  wide.addEventListener("change", sync);
  // In the side column the title is not a toggle: the list stays visible.
  details.querySelector("summary")?.addEventListener("click", (e) => {
    if (wide.matches) e.preventDefault();
  });
}
