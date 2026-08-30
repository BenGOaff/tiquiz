// app/blog/page.tsx
//
// L'INDEX DU BLOG.
//
// Le plus récent en haut : c'est ce que cherche quelqu'un qui revient,
// et c'est ce que lit un moteur pour juger si le site vit encore.

import Link from "next/link";
import type { Metadata } from "next";

import { listerArticles } from "@/lib/blog/articles";
import { ORIGINE_BLOG, jsonLdListe } from "@/lib/blog/seo";

export const dynamic = "force-static";
export const revalidate = 3600;

const TITRE = "Le blog Tiquiz : quiz, leads et Systeme.io";
const DESCRIPTION =
  "Comment un quiz capte des leads qualifiés, les tague par profil et les transforme en clients. Méthodes, cas concrets et outils, sans jargon.";

export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: `${ORIGINE_BLOG}/blog` },
  openGraph: {
    type: "website",
    title: TITRE,
    description: DESCRIPTION,
    url: `${ORIGINE_BLOG}/blog`,
    siteName: "Tiquiz",
    locale: "fr_FR",
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

function jourLisible(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

export default function BlogIndex() {
  const articles = listerArticles();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      {/* LE JSON-LD DIT À GOOGLE CE QU'EST CETTE PAGE. Sans lui, une
          liste d'articles n'est qu'une page de liens de plus. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdListe(articles)) }}
      />

      <h1 className="text-4xl font-bold tracking-tight">Le blog Tiquiz</h1>
      <p className="mt-3 text-lg text-muted-foreground">{DESCRIPTION}</p>

      {articles.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Aucun article pour le moment.</p>
      ) : (
        <div className="mt-10 space-y-2">
          {articles.map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="group flex gap-5 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/40"
            >
              {a.couverture ? (
                // Pas de `next/image` : ces visuels sont déjà
                // recompressés et servis depuis notre domaine. Une
                // couche de transformation en plus, c'est une
                // dépendance de plus qui peut casser en production sans
                // casser en local.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.couverture}
                  alt=""
                  width={160}
                  height={90}
                  loading="lazy"
                  className="hidden h-[90px] w-40 shrink-0 rounded-lg object-cover sm:block"
                />
              ) : null}
              <div className="min-w-0">
                <time dateTime={a.publieLe} className="text-xs uppercase tracking-wider text-muted-foreground">
                  {jourLisible(a.publieLe)}
                </time>
                <h2 className="mt-0.5 text-xl font-semibold leading-snug group-hover:underline">
                  {a.titre}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
