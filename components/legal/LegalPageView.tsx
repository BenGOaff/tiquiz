import Link from "next/link";
import type { LegalPage } from "@/lib/legal/types";
import { LEGAL_SLUGS } from "@/lib/legal/types";
import LegalLocaleSwitcher from "@/components/legal/LegalLocaleSwitcher";

// Server component that renders a LegalPage dataset.
// Includes a language switcher + sub-nav between legal pages so creators
// can share locale-specific links from landing pages (?lang=en, ?lang=es…).

const NAV_LABELS: Record<string, Record<(typeof LEGAL_SLUGS)[number], string>> = {
  fr: { privacy: "Confidentialité", legal: "Mentions légales", terms: "CGV", "terms-of-use": "CGU", cookies: "Cookies", affiliate: "Affiliation" },
  en: { privacy: "Privacy", legal: "Legal notice", terms: "Terms of Sale", "terms-of-use": "Terms of Use", cookies: "Cookies", affiliate: "Affiliate terms" },
  es: { privacy: "Privacidad", legal: "Aviso legal", terms: "Condiciones de venta", "terms-of-use": "Condiciones de uso", cookies: "Cookies", affiliate: "Afiliación" },
  it: { privacy: "Privacy", legal: "Note legali", terms: "Condizioni di vendita", "terms-of-use": "Condizioni d'uso", cookies: "Cookie", affiliate: "Affiliazione" },
  ar: { privacy: "الخصوصية", legal: "إشعار قانوني", terms: "شروط البيع", "terms-of-use": "شروط الاستخدام", cookies: "ملفات تعريف الارتباط", affiliate: "برنامج الشركاء" },
};

export default function LegalPageView({
  page,
  locale,
  activeSlug,
}: {
  page: LegalPage;
  locale: string;
  activeSlug: (typeof LEGAL_SLUGS)[number];
}) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const nav = NAV_LABELS[locale] ?? NAV_LABELS.en;
  return (
    <main dir={dir} className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 sm:py-14 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight hover:opacity-80 transition-opacity"
          >
            Tiquiz<span className="align-top text-[10px] ml-0.5">™</span>
          </Link>
          <LegalLocaleSwitcher current={locale} />
        </header>
        <nav aria-label="Legal pages" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {LEGAL_SLUGS.map((slug) => {
            const active = slug === activeSlug;
            return (
              <Link
                key={slug}
                href={`/${slug}?lang=${locale}`}
                className={`transition-colors ${
                  active
                    ? "text-foreground font-semibold underline underline-offset-4"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {nav[slug]}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-8 pt-2">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{page.title}</h1>
            <p className="text-sm text-muted-foreground italic">{page.lastUpdated}</p>
          </div>
          {page.intro && (
            <p className="text-base leading-relaxed text-muted-foreground">{page.intro}</p>
          )}
          <div className="space-y-10">
            {page.sections.map((section, i) => (
              <section key={i} className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-semibold">{section.h}</h2>
                {section.body.map((block, j) =>
                  Array.isArray(block) ? (
                    <ul key={j} className="list-disc pl-6 space-y-1.5 text-base leading-relaxed">
                      {block.map((item, k) => (
                        <li key={k}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={j} className="text-base leading-relaxed whitespace-pre-line">
                      {block}
                    </p>
                  ),
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
