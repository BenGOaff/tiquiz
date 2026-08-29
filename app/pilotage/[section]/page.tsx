// app/pilotage/[section]/page.tsx
//
// LES SECTIONS PAS ENCORE CONSTRUITES.
//
// Béné : "à terme on supprime les /admin de toutes les app pour tout
// gérer sur pilotage." D'accord, et c'est la cible. Mais **on n'éteint
// rien avant d'avoir remplacé** : une section qui annonce "bientôt"
// sans dire où se fait le travail aujourd'hui laisserait sans l'outil
// ET sans son remplaçant, un jour où on en a besoin.
//
// Cette route est DYNAMIQUE, donc un dossier statique la remplacera
// section par section, sans rien retirer ici (une route statique gagne
// toujours sur une route dynamique).

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { SECTIONS } from "@/lib/pilotage/sections";

export default async function SectionAVenir({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const s = SECTIONS.find((x) => x.chemin === `/${section}`);
  // Un chemin qui n'est pas au plan n'invente pas d'écran.
  if (!s) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{s.nom}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{s.question}</p>
      </div>

      <div className="rounded-xl border bg-background p-6">
        <p className="text-sm font-medium">Cette section n&apos;est pas encore construite.</p>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Rien n&apos;a été retiré : le travail se fait toujours sur les écrans ci-dessous, et
          ils resteront en place jusqu&apos;à ce que cette section fasse tout ce qu&apos;ils
          font.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(s.remplace ?? []).map((r) => (
            <Link
              key={r.href}
              href={r.href}
              target={r.href.startsWith("http") ? "_blank" : undefined}
              rel={r.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-accent"
            >
              {r.libelle}
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
