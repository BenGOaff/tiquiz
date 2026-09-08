"use client";

// components/site/FormulaireNewsletter.tsx
//
// LE FORMULAIRE DE LA NEWSLETTER.
//
// Le seul composant client du site public, et il l'est pour une bonne
// raison : il doit dire à la personne ce qui s'est passé. Un formulaire
// qui poste et recharge la page laisse un doute, et un `ok: false` muet
// envoie réessayer dix fois (règle du 3 août).
//
// LE SERVEUR REND UNE RAISON, L'ÉCRAN REND LA PHRASE. C'est la règle de
// la suppression d'un quiz et de l'import PDF, appliquée ici.
//
// -- IL NE PORTE PLUS UNE SEULE PHRASE (8 septembre 2026) --------------
//
// Béné : "oui traduis la newsletter." Ses cinq raisons d'échec et ses
// six libellés vivaient EN DUR ici, donc un lecteur anglophone lisait
// un formulaire français au milieu d'une page anglaise. C'est le
// reproche du client anglophone du 7 septembre, transposé.
//
// Ils vivent maintenant dans `lib/site/newsletter.ts`, avec le reste de
// la page : deux endroits qui portent le texte d'un même écran
// finissent toujours par ne plus dire la même chose.
//
// La LANGUE est une prop, jamais devinée : ce composant est monté par
// une page qui, elle, connaît déjà la langue de son adresse. La deviner
// ici (un cookie, `navigator.language`) donnerait un formulaire anglais
// sous un titre français, et l'inverse.
//
// L'ADRESSE DE CONTACT VIENT DU SERVEUR, ELLE N'EST PAS ÉCRITE ICI.
// Le 31 août, cette phrase portait `hello@tiquiz.fr` en dur. J'ai cru à
// une adresse inventée et je l'ai remplacée : **c'était MA correction
// qui était fausse.** La leçon n'est pas "il fallait la laisser en
// dur" : c'est qu'une adresse écrite à la main dans un message d'erreur
// est invérifiable, dans les deux sens. Elle vient de
// `adresseExpediteur()`, la MÊME source que l'expéditeur des emails.

import { useState } from "react";

import type { LanguePublique } from "@/lib/site/langues";
import { contenuNewsletter, phraseEchecNewsletter } from "@/lib/site/newsletter";

export default function FormulaireNewsletter({
  contact,
  langue,
  lienConfidentialite,
}: {
  contact: string;
  langue: LanguePublique;
  /** L'adresse de la politique, résolue par la page (jamais préfixée ici). */
  lienConfidentialite: string;
}) {
  const t = contenuNewsletter(langue).formulaire;
  const [etat, setEtat] = useState<"repos" | "envoi" | "ok">("repos");
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (etat === "envoi") return;
    const form = new FormData(e.currentTarget);
    setEtat("envoi");
    setErreur(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          prenom: String(form.get("prenom") ?? ""),
          consentement: form.get("consentement") === "on",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; raison?: string };
      if (data.ok) {
        setEtat("ok");
        return;
      }
      setEtat("repos");
      setErreur(phraseEchecNewsletter(t, data.raison, contact));
    } catch {
      // La panne réseau est le SEUL cas où on ne sait rien. On le dit
      // comme tel plutôt que d'accuser l'adresse de la personne.
      setEtat("repos");
      setErreur(t.reseau);
    }
  }

  if (etat === "ok") {
    return (
      <div role="status" className="rounded-2xl border border-[var(--tq-bord)] bg-white p-7">
        <p className="text-lg font-bold">{t.succesTitre}</p>
        <p className="tq-doux mt-2 leading-relaxed">{t.succesCorps}</p>
      </div>
    );
  }

  return (
    <form onSubmit={envoyer} className="rounded-2xl border border-[var(--tq-bord)] bg-white p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">{t.labelPrenom}</span>
          <input
            name="prenom"
            type="text"
            autoComplete="given-name"
            placeholder={t.placeholderPrenom}
            className="mt-1.5 w-full rounded-lg border border-[var(--tq-bord)] px-3.5 py-2.5 outline-none focus:border-[var(--tq-bleu)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">{t.labelEmail}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t.placeholderEmail}
            className="mt-1.5 w-full rounded-lg border border-[var(--tq-bord)] px-3.5 py-2.5 outline-none focus:border-[var(--tq-bleu)]"
          />
        </label>
      </div>

      <label className="mt-5 flex items-start gap-3">
        <input
          name="consentement"
          type="checkbox"
          required
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--tq-bleu)]"
        />
        <span className="tq-doux text-sm leading-relaxed">
          {t.consentementAvant}
          {/* Un lien légal ne fait JAMAIS quitter la page (règle du 24
              août) : la personne est au milieu d'un formulaire, et
              revenir lui ferait tout resaisir. */}
          <a
            href={lienConfidentialite}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {t.lienConfidentialite}
          </a>
          .
        </span>
      </label>

      {erreur ? (
        <p role="alert" className="mt-4 rounded-lg bg-[#fdeceb] px-4 py-3 text-sm text-[#8c1d18]">
          {erreur}
        </p>
      ) : null}

      <button type="submit" disabled={etat === "envoi"} className="tq-bouton mt-5 w-full sm:w-auto">
        {etat === "envoi" ? t.boutonEnvoi : t.bouton}
      </button>
    </form>
  );
}
