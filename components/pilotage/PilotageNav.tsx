"use client";

// components/pilotage/PilotageNav.tsx
//
// LE MENU DU CENTRE DE PILOTAGE.
//
// Une entrée par section, et les entrées PAS ENCORE CONSTRUITES le
// disent au lieu de mener à une page vide. Béné doit pouvoir faire
// confiance à ce menu : un lien qui ne fait rien est pire qu'un lien
// absent, parce qu'elle le reclique.
//
// Les sections viennent de `lib/pilotage/sections.ts`, jamais recopiées
// ici. Deux listes finissent toujours par diverger.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Gauge,
  Handshake,
  Store,
  LifeBuoy,
  Menu,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { SECTIONS, cheminSection, sectionActive, type SectionId } from "@/lib/pilotage/sections";

// L'icône est résolue ICI, par une CLÉ. Une page serveur ne peut pas
// passer une référence de composant à un composant client : ça ne pète
// qu'au rendu, sans message utile (drame du 1er août sur FolderCard).
const ICONES: Record<SectionId, React.ComponentType<{ className?: string }>> = {
  accueil: Gauge,
  clients: Users,
  ventes: Receipt,
  affilies: Handshake,
  revendeurs: Store,
  business: BarChart3,
  support: LifeBuoy,
  sante: ShieldCheck,
  parametres: Settings,
};

export function PilotageNav({ email }: { email: string }) {
  const pathname = usePathname();
  const active = sectionActive(pathname ?? "/pilotage");
  const [ouvert, setOuvert] = useState(false);

  const liens = (
    <nav className="space-y-0.5">
      {SECTIONS.map((s) => {
        const Icone = ICONES[s.id];
        const estActive = s.id === active.id;
        return (
          <Link
            key={s.id}
            href={cheminSection(s)}
            onClick={() => setOuvert(false)}
            aria-current={estActive ? "page" : undefined}
            className={[
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              estActive
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            ].join(" ")}
          >
            <Icone className="h-4 w-4 shrink-0" />
            <span className="truncate">{s.nom}</span>
            {/* Une section pas encore construite le DIT. Elle mène quand
                même à sa page, qui donne l'écran qui fait le travail
                aujourd'hui. */}
            {s.etat === "a-venir" && (
              <span className="ml-auto shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                à venir
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile : une barre, et le menu se déplie. Une sidebar fixe sur
          un téléphone mange la moitié de l'écran. */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-3 lg:hidden">
        <span className="text-sm font-semibold">Pilotage</span>
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          className="rounded-lg border p-2"
          aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={ouvert}
        >
          {ouvert ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>
      {ouvert && (
        <div className="border-b bg-card p-3 lg:hidden">{liens}</div>
      )}

      <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-card lg:block">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold">Pilotage</p>
            <p className="text-xs text-muted-foreground">Toutes les app</p>
          </div>
          <div className="mt-4 flex-1">{liens}</div>
          {/* QUI est connecté. Cet écran ouvre des accès et rembourse :
              savoir sous quel compte on agit n'est pas décoratif. */}
          <p className="truncate px-3 pt-4 text-xs text-muted-foreground" title={email}>
            {email}
          </p>
        </div>
      </aside>
    </>
  );
}
