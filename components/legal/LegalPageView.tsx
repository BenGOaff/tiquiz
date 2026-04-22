import Link from "next/link";
import type { LegalPage } from "@/lib/legal/types";

// Server component that renders a LegalPage dataset.
// Keeps the markup minimal and screen-reader-friendly; relies on Tailwind
// typography utilities so the page inherits the site's look & feel.

export default function LegalPageView({
  page,
  locale,
}: {
  page: LegalPage;
  locale: string;
}) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <main dir={dir} className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-16 space-y-8">
        <header className="space-y-2 border-b pb-6">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-block"
          >
            ← Tiquiz
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{page.title}</h1>
          <p className="text-sm text-muted-foreground">{page.lastUpdated}</p>
        </header>
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
    </main>
  );
}
