// "Copier le lien" button on entry pages (see [id].astro).
// Loaded as an external script so the CSP can stay `script-src 'self'`
// without inline script allowances.
const button = document.querySelector<HTMLButtonElement>(".copy-link");
button?.addEventListener("click", async () => {
  const label = button.textContent;
  try {
    await navigator.clipboard.writeText(window.location.href);
    button.textContent = "Lien copié !";
    button.classList.add("copied");
    setTimeout(() => {
      button.textContent = label;
      button.classList.remove("copied");
    }, 2000);
  } catch {
    // Clipboard API unavailable (non-secure context): fallback without prompt loss.
    window.prompt("Copiez le lien :", window.location.href);
  }
});
