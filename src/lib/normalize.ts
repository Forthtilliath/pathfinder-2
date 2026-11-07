/** Lowercase without accents, for accent-insensitive matching (server and client). */
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** URL fragment from a French title: "Dons de niveau 1" → "dons-de-niveau-1". */
export const slugify = (s: string) =>
  normalize(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
