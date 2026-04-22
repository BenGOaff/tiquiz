// Shape of a legal page — locale-agnostic.
// Sections render as markdown-ish: heading (h2) + one or more body blocks.
// A body block can be a paragraph string or a bullet list (string[]).

export type LegalBody = string | string[];

export type LegalSection = {
  /** H2 heading, rendered as-is. */
  h: string;
  /** One or more paragraphs / lists. */
  body: LegalBody[];
};

export type LegalPage = {
  /** Visible page title (H1). */
  title: string;
  /** Human-readable "last updated on …" suffix (pre-localised). */
  lastUpdated: string;
  /** Optional preamble before the first section. */
  intro?: string;
  sections: LegalSection[];
};

export type LegalSlug =
  | "privacy"
  | "legal"
  | "terms"
  | "terms-of-use"
  | "cookies"
  | "affiliate";

export const LEGAL_SLUGS: LegalSlug[] = [
  "privacy",
  "legal",
  "terms",
  "terms-of-use",
  "cookies",
  "affiliate",
];
