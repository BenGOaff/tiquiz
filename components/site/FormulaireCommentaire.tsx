"use client";

// components/site/FormulaireCommentaire.tsx
//
// LE FORMULAIRE DE COMMENTAIRE.
//
// -- IL DIT TOUJOURS CE QUI S'EST PASSÉ -------------------------------
//
// Quatre issues, quatre phrases, et aucune ne peut être silencieuse :
//
//   - PUBLIÉ -> "il est en ligne", et on invite à recharger. C'est le
//     cas normal depuis le 31 août : l'auto-modération publie tout de
//     suite ce qui n'a aucun signal douteux ;
//   - RETENU -> "il attend d'être relu". Sans cette phrase la lectrice
//     recharge, ne voit rien, et conclut que ça n'a pas marché (le
//     scénario exact de Jocelyne, 1er août) ;
//   - refusé -> la raison, traduite ici. Le serveur renvoie une RAISON,
//     jamais une phrase (règle du 3 août) ;
//   - panne réseau -> on le dit aussi, au lieu d'un `catch {}` muet.
//
// **LE STATUT VIENT DU SERVEUR, il ne se devine pas ici.** Deux
// endroits qui décideraient chacun de leur côté finiraient par se
// contredire, et ici la contradiction se lit "mon commentaire a
// disparu".
//
// -- LE CHAMP PIÈGE ---------------------------------------------------
//
// `siteWeb` est invisible et hors du flux de tabulation. Un robot le
// remplit, une personne ne le voit jamais. C'est le seul anti-spam qui
// ne demande rien au visiteur : un captcha fait fuir une lectrice sur
// cinq et envoie ses données à un tiers.

import { useState } from "react";

import { MESSAGE_MAX, NOM_MAX, PHRASE_REFUS, type RaisonRefus } from "@/lib/blog/commentaires";

const AUTRES_RAISONS: Record<string, string> = {
  "trop-rapide": "Tu viens d'en envoyer plusieurs. Laisse passer un moment.",
  "corps-illisible": "Le message n'est pas arrivé entier. Réessaie.",
  table_absente:
    "Les commentaires ne sont pas encore activés sur le serveur. Rien n'est perdu de ton côté : réessaie plus tard.",
  ecriture: "Ton commentaire n'a pas pu être enregistré. Réessaie dans un instant.",
  reseau: "La connexion n'a pas abouti. Ton message n'est pas parti.",
};

export default function FormulaireCommentaire({ slug }: { slug: string }) {
  const [etat, setEtat] = useState<"prêt" | "envoi" | "envoyé">("prêt");
  const [statut, setStatut] = useState<"publie" | "en_attente">("en_attente");
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setEtat("envoi");
    setErreur(null);
    try {
      const r = await fetch("/api/blog/commentaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          auteur: data.get("auteur"),
          email: data.get("email"),
          message: data.get("message"),
          siteWeb: data.get("siteWeb"),
        }),
      });
      const json = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        raison?: string;
        statut?: string;
      };
      if (json.ok) {
        setStatut(json.statut === "publie" ? "publie" : "en_attente");
        setEtat("envoyé");
        form.reset();
        return;
      }
      setEtat("prêt");
      const cle = String(json.raison ?? "");
      setErreur(
        PHRASE_REFUS[cle as RaisonRefus] ?? AUTRES_RAISONS[cle] ?? AUTRES_RAISONS.ecriture,
      );
    } catch {
      setEtat("prêt");
      setErreur(AUTRES_RAISONS.reseau);
    }
  }

  if (etat === "envoyé") {
    return (
      <p className="mt-10 rounded-2xl border border-[var(--tq-bord)] bg-white p-5 leading-relaxed">
        {statut === "publie" ? (
          <>
            <strong>C&apos;est en ligne.</strong> Recharge la page pour le voir avec les autres.
            Merci d&apos;avoir pris le temps.
          </>
        ) : (
          <>
            <strong>C&apos;est envoyé.</strong> Ton commentaire attend d&apos;être relu avant
            d&apos;apparaître : c&apos;est ce qui garde cette page lisible. Tu ne le verras donc
            pas tout de suite.
          </>
        )}
      </p>
    );
  }

  return (
    <form onSubmit={envoyer} className="mt-10 max-w-[38rem]">
      <p className="tq-etiquette">Laisser un commentaire</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[0.9rem] font-medium">Ton prénom</span>
          <input
            name="auteur"
            required
            maxLength={NOM_MAX}
            autoComplete="given-name"
            className="tq-champ mt-1.5"
          />
        </label>
        <label className="block">
          <span className="text-[0.9rem] font-medium">
            Ton email <span className="tq-doux font-normal">(jamais publié)</span>
          </span>
          <input name="email" type="email" autoComplete="email" className="tq-champ mt-1.5" />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-[0.9rem] font-medium">Ton message</span>
        <textarea name="message" required rows={5} maxLength={MESSAGE_MAX} className="tq-champ mt-1.5" />
      </label>

      {/* Le piège. `aria-hidden` et `tabIndex={-1}` : ni lu, ni
          atteignable au clavier. Il n'est PAS `display:none` : certains
          robots ignorent les champs cachés en CSS, et celui là doit être
          rempli pour servir. */}
      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Ne remplis pas ce champ
          <input name="siteWeb" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {erreur ? (
        <p className="mt-4 rounded-xl bg-[#fdecec] px-4 py-3 text-[0.92rem] text-[#8b1a1a]">
          {erreur}
        </p>
      ) : null}

      <p className="tq-doux mt-4 text-[0.82rem] leading-relaxed">
        Ton email sert uniquement à te répondre. Il n&apos;apparaît nulle part et ne part dans
        aucune liste de diffusion.
      </p>

      <button
        type="submit"
        disabled={etat === "envoi"}
        className="tq-bouton tq-bouton-plein mt-4 disabled:opacity-60"
      >
        {etat === "envoi" ? "Envoi..." : "Envoyer"}
      </button>
    </form>
  );
}
