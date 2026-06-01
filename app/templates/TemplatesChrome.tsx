// app/templates/TemplatesChrome.tsx
//
// En-tête / pied minimal pour les pages publiques /templates. Léger,
// branding Tiquiz, sans la sidebar dashboard (ces pages servent aussi
// les visiteurs non connectés / le SEO).

import Link from "next/link";
import type { ReactNode } from "react";

export function TemplatesChrome({
  isLoggedIn,
  children,
}: {
  isLoggedIn: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1100px] mx-auto w-full px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-display font-bold text-lg">
            Tiquiz
          </Link>
          <Link
            href={isLoggedIn ? "/dashboard" : "/signup"}
            className="rounded-full bg-primary text-primary-foreground text-sm font-medium px-4 py-1.5 hover:opacity-90 transition"
          >
            {isLoggedIn ? "Mon tableau de bord" : "Créer mon compte gratuit"}
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full">{children}</main>

      <footer className="border-t border-border/40 mt-12">
        <div className="max-w-[1100px] mx-auto w-full px-4 sm:px-6 py-8 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-3">
          <span>Tiquiz — le quiz lead-magnet le plus simple à créer.</span>
          <Link href="/templates" className="hover:text-foreground">
            Tous les modèles
          </Link>
        </div>
      </footer>
    </div>
  );
}
