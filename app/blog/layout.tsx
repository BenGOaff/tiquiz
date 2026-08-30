// app/blog/layout.tsx
//
// LE BLOG A SON PROPRE CADRE.
//
// Il est servi sur `tiquiz.fr`, le domaine de vente, à des gens qui
// n'ont pas de compte et qui découvrent Tiquiz par une recherche. Il ne
// porte donc ni la navigation de l'app, ni rien qui suppose une
// session : un menu "Mes quiz" sur un article lu par un inconnu est une
// porte fermée au visage.
//
// Ce qu'il porte, c'est le chemin du retour : le nom du produit en haut,
// un lien vers la page de vente en haut et en bas.

import Link from "next/link";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/blog" className="text-lg font-bold tracking-tight">
            Tiquiz<span className="font-normal text-muted-foreground"> / blog</span>
          </Link>
          <a
            href="https://tiquiz.fr/"
            className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Découvrir Tiquiz
          </a>
        </div>
      </header>

      {children}

      <footer className="mt-16 border-t">
        <div className="mx-auto max-w-3xl px-6 py-10 text-sm text-muted-foreground">
          <p>
            Tiquiz, l&apos;outil de quiz connecté à Systeme.io. Des leads qualifiés, taggés
            automatiquement par profil.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            <a href="https://tiquiz.fr/" className="underline underline-offset-4 hover:text-foreground">
              La page de Tiquiz
            </a>
            <Link href="/blog" className="underline underline-offset-4 hover:text-foreground">
              Tous les articles
            </Link>
            {/* Un lien légal ne fait JAMAIS quitter la page (règle du
                24 août) : le visiteur est au milieu d'un article. */}
            <a
              href="/legal"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Mentions légales
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
