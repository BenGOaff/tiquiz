import { privacy } from "./privacy";
import { legal } from "./legal-notice";
import { terms } from "./terms";
import { termsOfUse } from "./terms-of-use";
import { cookies } from "./cookies";
import { affiliate } from "./affiliate";
import { DEFAULT_LOCALE } from "@/i18n/config";
import type { LegalPage, LegalSlug } from "./types";

export { LEGAL_SLUGS } from "./types";
export type { LegalPage, LegalSlug };

const bySlug: Record<LegalSlug, Record<string, LegalPage>> = {
  "privacy": privacy,
  "legal": legal,
  "terms": terms,
  "terms-of-use": termsOfUse,
  "cookies": cookies,
  "affiliate": affiliate,
};

/** Return the legal page content for the given slug and locale,
 * falling back to English then the repo default locale. */
export function getLegalPage(slug: LegalSlug, locale: string): LegalPage {
  const bag = bySlug[slug];
  return bag[locale] ?? bag.en ?? bag[DEFAULT_LOCALE] ?? bag.fr;
}
