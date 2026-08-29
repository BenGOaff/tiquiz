"use client";

// components/pilotage/SelecteurPeriode.tsx
//
// CHOISIR SA PÉRIODE, PARTOUT (Béné, 29 août 2026).
//
// "Sur Systeme.io je peux choisir la période dont je veux l'aperçu dès
// l'accueil. Fais vraiment un truc intelligent qui me permet de bien
// voir ce que je veux quand je veux, partout."
//
// -- IL VIT DANS L'URL, ET C'EST LE POINT ------------------------------
//
// Une vue se garde en favori, survit à un rafraîchissement, et se
// partage telle quelle. Un état interne se perd au premier F5, et on
// finit par ne plus s'en servir. C'est aussi ce qui permet au sélecteur
// d'être le MÊME sur toutes les sections sans qu'aucune ne le
// réimplémente.
//
// -- ET IL DIT QUAND IL NE PEUT PAS TENIR SA PROMESSE ------------------
//
// Le journal des encaissements a été posé le 7 août 2026. "12 derniers
// mois" ne peut donc pas rendre 12 mois. Un total tronqué qui ne le dit
// pas fait prendre des décisions sur un chiffre faux : c'est la règle du
// 8 juin, on n'affiche pas un total dont le dénominateur ment.

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarRange, Check } from "lucide-react";

import {
  CHOIX_PERIODE,
  lirePeriode,
  normaliserJour,
  type PeriodeId,
} from "@/lib/pilotage/periode";
import { sectionActive } from "@/lib/pilotage/sections";

export function SelecteurPeriode() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [ouvert, setOuvert] = useState(false);

  // L'heure est figée au rendu : recalculer à chaque frappe ferait
  // bouger les bornes sous les doigts.
  const active = useMemo(
    () => lirePeriode(params ?? new URLSearchParams(), new Date()),
    [params],
  );

  const [debut, setDebut] = useState(active.debut ?? "");
  const [fin, setFin] = useState(active.fin ?? "");

  // IL NE S'AFFICHE PAS LÀ OÙ IL NE FERAIT RIEN.
  //
  // Un annuaire de clients, une file de support, l'état des clés : rien
  // de tout ça ne se filtre par mois. Y laisser le sélecteur en ferait
  // un bouton qui ne fait rien, et on le reclique. La décision vit dans
  // `lib/pilotage/sections.ts`, avec le reste du plan : recopier ici la
  // liste des écrans concernés garantirait qu'elle finisse par ne plus
  // correspondre.
  const affiche = sectionActive(pathname ?? "/pilotage").periode;

  if (!affiche) return null;

  function aller(query: string) {
    router.push(query ? `${pathname}?${query}` : pathname);
    setOuvert(false);
  }

  function choisir(id: PeriodeId) {
    aller(`periode=${id}`);
  }

  function surMesure() {
    const d = normaliserJour(debut);
    const f = normaliserJour(fin);
    // AUCUNE BORNE LISIBLE = on ne fait rien, plutôt que d'envoyer sur
    // une vue vide dont elle ne comprendrait pas la cause.
    if (!d && !f) return;
    aller([d && `debut=${d}`, f && `fin=${f}`].filter(Boolean).join("&"));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent"
      >
        <CalendarRange className="h-4 w-4 text-muted-foreground" />
        {active.libelle}
      </button>

      {ouvert && (
        <>
          {/* Cliquer à côté ferme. Sans ça, le panneau reste ouvert et
              masque l'écran qu'on venait consulter. */}
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setOuvert(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border bg-card p-2 shadow-lg">
            <ul className="space-y-0.5">
              {CHOIX_PERIODE.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => choisir(c.id)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    {c.libelle}
                    {active.id === c.id && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-2 border-t pt-2">
              <p className="px-3 pb-1 text-xs text-muted-foreground">Dates précises</p>
              <div className="flex items-center gap-2 px-3">
                <input
                  type="date"
                  value={debut}
                  onChange={(e) => setDebut(e.target.value)}
                  aria-label="Début"
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
                <input
                  type="date"
                  value={fin}
                  onChange={(e) => setFin(e.target.value)}
                  aria-label="Fin"
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={surMesure}
                className="mt-2 w-full rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
              >
                Appliquer
              </button>
              {/* Les deux bornes sont INCLUSES, et on le dit : "du 1er au
                  31" doit contenir le 31, et personne ne devrait avoir à
                  le deviner. */}
              <p className="px-3 pt-2 text-xs text-muted-foreground">
                Les deux dates sont comprises.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
