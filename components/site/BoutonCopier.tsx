"use client";

// components/site/BoutonCopier.tsx
//
// LE SEUL MORCEAU DE PARTAGE QUI A BESOIN DU NAVIGATEUR.
//
// Les six liens de réseaux sont des `<a href>` calculés au build. Copier
// une adresse, non : ça demande le presse-papiers. Ce bouton est donc le
// seul composant client de la page d'article, et il pèse ce qu'il pèse.
//
// -- UN ÉCHEC DOIT SE VOIR --------------------------------------------
//
// Le premier partage du viewer avalait TOUT échec dans un `catch {}`
// silencieux : sur un navigateur sans presse-papiers, le visiteur
// cliquait et il ne se passait rien (drame du 1er août). On ne refait
// pas ça : quand `navigator.clipboard` manque ou refuse, on retombe sur
// une sélection de texte, et si même ça échoue le bouton le DIT.

import { useState } from "react";

type Etat = "prêt" | "copié" | "raté";

export default function BoutonCopier({ url }: { url: string }) {
  const [etat, setEtat] = useState<Etat>("prêt");

  async function copier() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setEtat("copié");
      } else {
        // Repli historique : il marche encore là où l'API moderne est
        // refusée (page non sécurisée, navigateur verrouillé).
        const champ = document.createElement("textarea");
        champ.value = url;
        champ.setAttribute("readonly", "");
        champ.style.position = "fixed";
        champ.style.opacity = "0";
        document.body.appendChild(champ);
        champ.select();
        const ok = document.execCommand("copy");
        champ.remove();
        setEtat(ok ? "copié" : "raté");
      }
    } catch {
      setEtat("raté");
    }
    window.setTimeout(() => setEtat("prêt"), 2500);
  }

  return (
    <button
      type="button"
      onClick={copier}
      aria-live="polite"
      className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--tq-bord)] bg-white px-4 text-[0.85rem] font-medium text-[var(--tq-encre-douce)] transition hover:border-[var(--tq-encre)] hover:text-[var(--tq-encre)]"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
      </svg>
      {etat === "copié" ? "Lien copié" : etat === "raté" ? "Copie refusée" : "Copier le lien"}
    </button>
  );
}
