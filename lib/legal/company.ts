// Company facts shared across every legal page, so a change (address, SIRET…)
// is made once. Keep these in plain text — they go through the translator
// as-is in all locales except when grammatically awkward.

export const COMPANY = {
  name: "ETHILIFE",
  form: "SAS",
  capital: "500 €",
  rcs: "Montpellier 909 349 045",
  vat: "FR38909349045",
  address: "377 Tertre Avenue Grassion Cibrand, 34130 Mauguio, France",
  product: "Tiquiz",
  productMark: "Tiquiz®",
  // Adresse de contact des documents légaux. Elle portait `@tiquiz.com`,
  // un domaine qui n'appartient pas à l'éditrice (constaté le 26 août
  // 2026) : les CGV, les CGU et la politique de confidentialité
  // donnaient donc une adresse que personne ne relève. C'est celle qui
  // est déjà utilisée partout ailleurs dans le code.
  email: "hello@tipote.com",
  director: "Bénédicte Lagardette",
  // ISO 8601 date that feeds every "Last updated" line.
  lastUpdated: "2026-04-22",
} as const;
