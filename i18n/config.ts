// i18n/config.ts
// Shared locale constants — safe to import in both server AND client components.

export const SUPPORTED_LOCALES = ["en", "fr", "es", "it", "ar", "pt", "pt-BR"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "en";
export const RTL_LOCALES: SupportedLocale[] = ["ar"];

// Étiquettes lisibles par locale (langue native). Partagées entre le
// LanguageSwitcher (langue de l'interface) et le sélecteur de langue du
// quiz dans l'éditeur (langue du joueur public).
export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  it: "Italiano",
  ar: "العربية",
  pt: "Português (Portugal)",
  "pt-BR": "Português (Brasil)",
};
