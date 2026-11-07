/**
 * Site menu: every list page (collection or view), sorted into themed groups.
 * Shared by the header mega menu and the home page.
 */
import { COLLECTIONS, VIEWS } from "./collections.ts";

export interface NavGroupDef {
  title: string;
  /** List page paths (collection or view), in display order. */
  paths: string[];
}

export const NAV_GROUPS: NavGroupDef[] = [
  { title: "Personnage", paths: ["ascendances", "heritages", "historiques", "classes", "aptitudes", "archetypes", "compagnons", "pouvoirs-de-familier"] },
  { title: "Dons", paths: ["dons", "dons-ancestraux", "dons-de-classe", "dons-generaux", "dons-de-competence", "dons-d-archetype"] },
  { title: "Magie et équipement", paths: ["sorts", "divinites", "domaines", "equipement", "groupes"] },
  { title: "Règles", paths: ["regles", "actions", "etats", "competences", "traits"] },
  { title: "MJ et monstres", paths: ["creatures", "familles-de-creatures", "capacites-de-monstres", "dangers", "vehicules", "plans"] },
];

export interface NavLink {
  path: string;
  href: string;
  title: string;
  intro: string;
  count: number;
}

export interface NavGroup {
  title: string;
  links: NavLink[];
}

const PAGES = new Map([...COLLECTIONS, ...VIEWS].map((p) => [p.path, p]));

/** Groups with their links resolved; empty pages (nothing translated yet) and empty groups are left out. */
export function navGroups(count: (path: string) => number): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    title: g.title,
    links: g.paths.flatMap((path) => {
      const page = PAGES.get(path);
      const n = page ? count(path) : 0;
      return page && n > 0 ? [{ path, href: `/${path}/`, title: page.title, intro: page.intro, count: n }] : [];
    }),
  })).filter((g) => g.links.length > 0);
}
