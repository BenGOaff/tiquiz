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
  // Consumer-facing email. Using @tiquiz.com for the US launch; the creator
  // can still reply from hello@tipote.com internally.
  email: "hello@tiquiz.com",
  director: "Bénédicte Lagardette",
  // ISO 8601 date that feeds every "Last updated" line.
  lastUpdated: "2026-04-22",
} as const;
