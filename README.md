# PF2 en français

Les règles de Pathfinder 2 remasterisé, en français : site statique Astro alimenté par un import des données Foundry VTT et des traductions Pathfinder-fr.

## Démarrage

```bash
npm install
npm run import            # récupère les sources, traduit ce qui manque, écrit src/data/
npm run dev               # site en développement (la recherche n'y fonctionne pas)
npm run build && npm run preview   # site complet avec la recherche Pagefind
npm test
```

## Tests

| Commande | Ce qu'elle vérifie |
| --- | --- |
| `npm run check` | Types TypeScript des fichiers `.ts`, `.tsx` et `.astro` (`astro check`). |
| `npm test` | Tests unitaires Vitest (`tests/`) : import, utilitaires du site, et intégrité des données de `src/data/` (identifiants uniques, aucun HTML dangereux, aucun lien interne cassé). |
| `npm run test:e2e` | Tests Playwright (`e2e/`) sur le site construit : navigation, listes filtrables, recherche Pagefind, aperçus, affichage mobile et accessibilité (axe, thèmes clair et sombre). Lancer `npm run build` avant, et `npx playwright install chromium` la première fois. |
| `npm run verify` | Tout ce qui précède, dans l'ordre : à lancer avant de pousser. |

La CI (`.github/workflows/ci.yml`) lance `npm audit` puis ces mêmes étapes sur chaque pull request vers `main` (hors brouillons et modifications de Markdown seules).

Variantes de l'import :

- `npm run import:no-translate` : sans appel au modèle, seules les traductions déjà en cache sont utilisées.
- `npm run import:offline` : réutilise les dépôts déjà présents dans `.cache/`.

La traduction automatique demande `ANTHROPIC_API_KEY` dans l'environnement. Les traductions sont écrites dans `translations/` toutes les 20 entrées : un import interrompu peut être relancé sans repayer ce qui est déjà fait. Variables optionnelles : `PF2_MODEL`, `PF2_EFFORT` (effort de réflexion du modèle, `low` par défaut), `PF2_CONCURRENCY`, `PF2_FOUNDRY_REF` (tag du système Foundry), `PF2_FR_REF`, et les URL des dépôts (`PF2_FOUNDRY_URL`, `PF2_FR_URL`, `PF2_FR_LANG_URL`).

## Sources

| Source | Rôle |
| --- | --- |
| `foundryvtt/pf2e` (GitHub) | Données de règles : niveaux, traits, coûts, descriptions anglaises. Seul le contenu `publication.remaster === true` est importé. |
| `pathfinder-fr/foundryvtt-pathfinder2-fr` (GitLab) | Traductions fan et officielles (BBE), un fichier `.htm` par entrée. |
| `pathfinder-fr/foundryvtt-pathfinder2e-lang-fr` (GitLab) | Libellés français du système : traits, statistiques… |

## Provenance

Chaque texte importé est un objet `{ value, provenance }`, où `provenance` vaut `{ source, sourceLanguage, status, method }`. Les pages affichent ces informations dans l'encart « Sources ».

## Traductions du site

`translations/*.json` contient les traductions produites par l'import, versionnées avec le code. Pour relire une traduction, corrigez `fields` et passez `status` à `"reviewed"`. Une traduction n'est refaite que si le texte anglais change ; une version relue est alors conservée dans `previous`.

`translations/books.json` donne les titres français des livres, saisis à la main.

## Contenu

Ascendances, héritages, historiques, classes et aptitudes de classe, archétypes, dons (avec des pages dédiées par catégorie), compétences, sorts, équipement, créatures, capacités de monstres, familles de créatures, dangers, divinités, domaines, plans, groupes d'armes et d'armures, compagnons, pouvoirs de familier, véhicules, actions, états, règles et traits. Seul le contenu Remaster est importé.

Sources hors packs d'objets Foundry :
- archétypes, domaines et écran du MJ (rangés dans les règles) : journaux du système Foundry, traduits par pathfinder-fr ;
- capacités de monstres : glossaires `bestiary-ability-glossary-srd` et `bestiary-family-ability-glossary` de Foundry ;
- compagnons : fichiers `data/ac-*` de pathfinder-fr (module « PF2e Animal Companions ») ;
- Archives of Nethys (`scripts/import/aon.ts`, `PF2_AON_URL`) : chapitres de règles, plans, familles de créatures (avec leurs membres), groupes d'armes et d'armures, descriptions des compétences. Livres Remaster de base uniquement. Chaque catégorie est mise en cache dans `.cache/sources/aon-<catégorie>.json`. `PF2_RULES=0` désactive cet import, `PF2_AON_CACHE=1` réutilise le cache.

Le site pf2e.pathfinder-fr.org est construit à partir des mêmes dépôts (Foundry et pathfinder-fr) : il n'est pas lu directement. Le wiki pathfinder-fr.org n'est pas importé : son `robots.txt` interdit les robots d'IA, et sa partie Pathfinder 2 ne contient pas de règles (elle renvoie au site ci-dessus).

`PF2_DEBUG_KEEP_ENGLISH=1` garde le texte anglais des entrées non traduites : réservé au contrôle des mises en page, à ne jamais publier.

## Structure

```
scripts/import/
  index.ts          orchestration des étapes (sources → brouillons → traduction → traits → liens → entrées)
  adapters.ts       table des packs Foundry → adaptateur ; adapter-base.ts : types et utilitaires communs
  adapters-options.ts, adapters-misc.ts, adapters-stat.ts, adapters-abilities.ts   adaptateurs
                    (options de personnage, équipement/divinités/actions, blocs de statistiques, capacités)
  stat-block.ts     attaques, capacités, sorts et IFR des blocs de statistiques
  drafts.ts         lecture des documents en brouillons ; packs.ts : lecture des packs
  translation-steps.ts   glossaire, traduction des textes manquants, exclusion du non traduit
  trait-pages.ts, links.ts, build-entry.ts   pages de traits, identifiants et liens, construction des entrées
  extra-sources.ts  journaux Foundry et compagnons ; aon.ts : Archives of Nethys
  relations.ts      liens entre entrées et pages de compétences ; output.ts : écriture et rapport
  enricher-tokens.ts, enrichers.ts   enrichers Foundry : découpage et protection, puis rendu HTML français
  translator.ts     traduction automatique avec cache relisible
  provenance.ts, pathfinder-fr.ts, foundry-lang.ts, rules.ts, terms.ts, git.ts, config.ts
src/data/           données générées (un JSON par collection)
src/lib/            types, registre des collections, accès aux données
src/components/     composants Astro et îles Preact (seul JS client : la liste filtrable)
src/styles/         global.css importe un fichier par zone (tokens, base, en-tête, accueil, fiche, listes, pages) ;
                    fonts.css : polices en sous-ensembles latin uniquement
src/pages/          [section]/ et [section]/[id] servent toutes les collections ;
                    listes/ (JSON des listes) et apercus/ (infobulles)
translations/       traductions du site, relisibles
```

Ajouter une collection : un adaptateur dans `adapters.ts` et une entrée dans `src/lib/collections.ts`. Aucune page à écrire.

Le code (fichiers, fonctions, propriétés) est en anglais ; les chemins d'URL et le contenu des pages sont en français.

## Sécurité

Le HTML des pages vient de sources tierces (pathfinder-fr, Archives of Nethys, Foundry, traduction automatique) et il est rendu avec `set:html`. L'import le filtre donc par liste blanche (`scripts/import/sanitize.ts`) : aucun script, gestionnaire d'événement, style ni lien `javascript:` ne peut atteindre le site. Toute nouvelle sortie HTML doit passer par `toHtml()` dans `index.ts`. Seul l'attribut `data-preview` est conservé, et seulement au format `section/identifiant`.

Content Security Policy en deux parties :

- `security.csp` dans `astro.config.mjs` : une balise `<meta>` sur chaque page, avec les hashes des scripts et styles inline émis par Astro (pas de `'unsafe-inline'`). `'wasm-unsafe-eval'` est nécessaire à Pagefind. Les tests e2e tournent avec cette CSP : toute violation fait échouer un test.
- `vercel.json` : ce qu'une balise `<meta>` ne peut pas porter (`frame-ancestors`), plus `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` et le cache longue durée des fichiers hachés de Pagefind.

Toute ressource tierce (CDN, mesure d'audience) devra être ajoutée à ces directives.

Au niveau HTTP, `_headers` (convention Netlify, dans `public/` donc publié à la racine du site) fixe une CSP restrictive — le site est 100 % autonome, aucune ressource tierce — ainsi que `Referrer-Policy`, `X-Content-Type-Options` et `Permissions-Policy`. Les scripts clients sont des fichiers externes (`script-src 'self'`) ; seuls les scripts inline émis par Astro (runtime d'hydratation Preact) sont autorisés, par leur hash SHA-256. Le fichier est régénéré à chaque build par `scripts/csp-headers.mjs` : ne pas le modifier à la main. Sur Cloudflare Pages, recopier la CSP dans une Page Rule. Voir `CONTRIBUTING.md`.

## À noter

Le lecteur pathfinder-fr gère le format actuel des fichiers GitLab (`-- Desc (fr) --`, sections `Fields`, `Lists`, `Arrays`, `Items`) et l'ancien format des miroirs de 2022. Après un import, vérifiez `import-report.md` : il indique le volume de texte anglais encore à traduire et les jetons consommés.
