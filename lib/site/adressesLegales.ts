// lib/site/adressesLegales.ts
//
// LES ADRESSES FRANÇAISES DES DOCUMENTS LÉGAUX.
//
// -- POURQUOI CE FICHIER EST SEUL, SANS LE MOINDRE IMPORT --------------
//
// Il est lu par `next.config.ts`, qui construit les redirections. Or
// Next compile sa configuration HORS du projet TypeScript : l'alias
// `@/` n'y est pas résolu. La table vivait au départ dans
// `lib/site/nav.ts`, qui importe `@/lib/affiliateUrls`, et le BUILD a
// échoué avec `Cannot find module './lib/affiliateUrls'` alors que
// `tsc` et les 1748 tests étaient au vert.
//
// C'est exactement le piège de `pdf-parse` du 7 août : le vert local ne
// prouve rien, seul un vrai `next build` le dit. **Ne jamais ajouter
// d'import ici.**
//
// Clé = l'adresse que Béné communique, valeur = la page qui porte
// vraiment le document. Les documents existent déjà en 5 langues à des
// adresses anglaises : on ne les DÉPLACE pas (elles sont posées dans
// l'app, dans des emails et dans des quiz publiés), on ajoute des
// adresses françaises qui redirigent.

export const ADRESSES_LEGALES_FR: Readonly<Record<string, string>> = {
  "/cgv": "/terms",
  "/cgu": "/terms-of-use",
  "/mentions-legales": "/legal",
  "/politique-de-confidentialite": "/privacy",
  "/politique-de-cookies": "/cookies",
  "/conditions-generales-affiliation": "/affiliate",
} as const;
