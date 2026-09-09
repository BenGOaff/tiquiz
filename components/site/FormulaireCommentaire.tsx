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

import { MESSAGE_MAX, NOM_MAX } from "@/lib/blog/commentaires";
import type { MotsFormulaire } from "@/lib/blog/motsDuBlog";

export default function FormulaireCommentaire({
  slug,
  mots,
}: {
  slug: string;
  /**
   * Les libelles ET les phrases de refus, dans la langue de l'article.
   *
   * Ils vivaient EN DUR dans ce fichier, en francais, refus compris :
   * un lecteur anglophone lisait "Ton prenom" et, s'il se trompait
   * d'adresse email, il decouvrait le francais au moment exact ou il a
   * besoin qu'on lui parle.
   *
   * La langue arrive en PROP et ne se devine pas : ce composant est
   * client, et la langue est celle de l'ADRESSE de l'article.
   */
  mots: MotsFormulaire;
}) {
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
        // Une raison inconnue retombe sur `ecriture` : elle
        // n'affiche JAMAIS sa cle.
        mots.refus[cle] ?? mots.refus.ecriture,
      );
    } catch {
      setEtat("prêt");
      setErreur(mots.refus.reseau);
    }
  }

  if (etat === "envoyé") {
    return (
      <p className="mt-10 rounded-2xl border border-[var(--tq-bord)] bg-white p-5 leading-relaxed">
        {statut === "publie" ? (
          <>
            <strong>{mots.publieFort}</strong> {mots.publieSuite}
          </>
        ) : (
          <>
            <strong>{mots.attenteFort}</strong> {mots.attenteSuite}
          </>
        )}
      </p>
    );
  }

  return (
    <form onSubmit={envoyer} className="mt-10 max-w-[38rem]">
      <p className="tq-etiquette">{mots.laisserUn}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[0.9rem] font-medium">{mots.prenom}</span>
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
            {mots.email}{" "}
            <span className="tq-doux font-normal">{mots.emailJamaisPublie}</span>
          </span>
          <input name="email" type="email" autoComplete="email" className="tq-champ mt-1.5" />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-[0.9rem] font-medium">{mots.message}</span>
        <textarea name="message" required rows={5} maxLength={MESSAGE_MAX} className="tq-champ mt-1.5" />
      </label>

      {/* Le piège. `aria-hidden` et `tabIndex={-1}` : ni lu, ni
          atteignable au clavier. Il n'est PAS `display:none` : certains
          robots ignorent les champs cachés en CSS, et celui là doit être
          rempli pour servir. */}
      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          {mots.piegeLibelle}
          <input name="siteWeb" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {erreur ? (
        <p className="mt-4 rounded-xl bg-[#fdecec] px-4 py-3 text-[0.92rem] text-[#8b1a1a]">
          {erreur}
        </p>
      ) : null}

      <p className="tq-doux mt-4 text-[0.82rem] leading-relaxed">
        {mots.noteEmail}
      </p>

      <button
        type="submit"
        disabled={etat === "envoi"}
        className="tq-bouton tq-bouton-plein mt-4 disabled:opacity-60"
      >
        {etat === "envoi" ? mots.envoiEnCours : mots.envoyer}
      </button>
    </form>
  );
}
