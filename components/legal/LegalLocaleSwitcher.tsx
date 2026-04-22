"use client";

// components/legal/LegalLocaleSwitcher.tsx
// Renders the 5 supported locales as plain anchor tags on legal pages so
// creators can share locale-specific links from their landing pages
// (e.g. tiquiz.com/privacy?lang=en from an English sales page).

import Link from "next/link";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  it: "Italiano",
  ar: "العربية",
};

const ORDER = ["fr", "en", "es", "it", "ar"] as const;

export default function LegalLocaleSwitcher({ current }: { current: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Language" className="flex flex-wrap gap-1">
      {ORDER.map((l) => {
        const active = l === current;
        return (
          <Link
            key={l}
            href={`${pathname}?lang=${l}`}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {LABELS[l]}
          </Link>
        );
      })}
    </nav>
  );
}
