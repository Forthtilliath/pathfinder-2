import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import globals from "globals";

// Délibérément léger : le code est petit et propre, on ne veut pas de pluie
// de corrections de style (Prettier s'occupe du format).
export default [
  { ignores: ["dist/**", "node_modules/**", "playwright-report/**", "translations/**", ".astro/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  // Le pipeline d'import manipule des données externes non typées
  // (JSON Foundry VTT, HTML GitLab) : `any` y est assumé.
  {
    files: ["scripts/import/**/*.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
];
