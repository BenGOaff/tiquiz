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

import { useState } from "react";

const PHRASES: Record<string, string> = {
  email_manquant: "Il manque ton adresse email.",
  email_invalide: "Cette adresse ne ressemble pas à une adresse email. Vérifie la frappe ?",
  consentement_manquant: "Coche la case pour que je puisse t'envoyer la newsletter.",
  trop_de_demandes: "Trop de tentatives depuis cette connexion. Réessaie dans une heure.",
  indisponible:
    "Je n'ai pas réussi à t'inscrire, et ce n'est pas de ta faute. Réessaie dans un moment, ou écris à hello@tiquiz.fr.",
};

const PHRASE_PAR_DEFAUT = PHRASES.indisponible;

export default function FormulaireNewsletter() {
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
      setErreur(PHRASES[String(data.raison)] ?? PHRASE_PAR_DEFAUT);
    } catch {
      // La panne réseau est le SEUL cas où on ne sait rien. On le dit
      // comme tel plutôt que d'accuser l'adresse de la personne.
      setEtat("repos");
      setErreur("La connexion a coupé. Réessaie ?");
    }
  }

  if (etat === "ok") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-[var(--tq-bord)] bg-white p-7"
      >
        <p className="text-lg font-bold">C&apos;est fait, tu es inscrit.</p>
        <p className="tq-doux mt-2 leading-relaxed">
          Tu recevras le prochain email avec les autres. Si tu ne trouves rien d&apos;ici quelques
          jours, regarde dans tes indésirables et fais-moi sortir de là (ça aide tout le monde).
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={envoyer} className="rounded-2xl border border-[var(--tq-bord)] bg-white p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">Ton prénom</span>
          <input
            name="prenom"
            type="text"
            autoComplete="given-name"
            placeholder="Gwenn"
            className="mt-1.5 w-full rounded-lg border border-[var(--tq-bord)] px-3.5 py-2.5 outline-none focus:border-[var(--tq-bleu)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Ton email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="gwenn@exemple.fr"
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
          J&apos;accepte de recevoir les emails de Béné. Je peux me désinscrire en un clic, en bas
          de chaque email.{" "}
          {/* Un lien légal ne fait JAMAIS quitter la page (règle du 24
              août) : la personne est au milieu d'un formulaire, et
              revenir lui ferait tout resaisir. */}
          <a
            href="/politique-de-confidentialite"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Politique de confidentialité
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
        {etat === "envoi" ? "Une seconde..." : "Je m'inscris"}
      </button>
    </form>
  );
}
