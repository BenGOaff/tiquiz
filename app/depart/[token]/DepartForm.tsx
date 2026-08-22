"use client";

// app/depart/[token]/DepartForm.tsx
//
// Le champ, le bouton, et le remerciement.
//
// UN `ok: false` PRODUIT TOUJOURS QUELQUE CHOSE À L'ÉCRAN (règle du
// 3 août). Ici ça compte double : la personne vient de quitter, elle
// prend le temps d'écrire, et un bouton sans effet serait la dernière
// chose qu'elle retiendrait de nous.

import { useState } from "react";

import { Button } from "@/components/ui/button";

const RAISONS: Record<string, string> = {
  empty: "Écris moi deux mots avant d'envoyer.",
  not_found: "Ce lien n'est plus valable. Réponds directement à l'email, ça marche aussi.",
  write_failed: "Ça n'a pas pu être enregistré. Réessaie dans un instant.",
  invalid_body: "Ça n'a pas pu être enregistré. Réessaie dans un instant.",
};

export function DepartForm({ token }: { token: string }) {
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  if (envoye) {
    return (
      <div className="mt-8 rounded-xl border bg-muted/40 p-5">
        <p className="font-semibold">C&apos;est noté, merci.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Je le lis dans la journée. Si tu veux ajouter quelque chose, réponds à
          l&apos;email.
        </p>
      </div>
    );
  }

  async function envoyer() {
    const propre = texte.trim();
    if (!propre) {
      setErreur(RAISONS.empty);
      return;
    }
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch("/api/depart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reason: propre }),
      });
      const j = (await res.json()) as { ok?: boolean; reason?: string };
      if (j.ok) setEnvoye(true);
      else setErreur(RAISONS[j.reason ?? ""] ?? "Ça n'a pas pu être enregistré.");
    } catch {
      setErreur("La connexion a échoué. Réessaie dans un instant.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={6}
        maxLength={4000}
        autoFocus
        placeholder="Par exemple : je n'ai pas réussi à connecter mes leads à Systeme.io, et j'ai laissé tomber."
        className="w-full rounded-xl border bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="flex items-center gap-3">
        <Button onClick={() => void envoyer()} disabled={envoi}>
          {envoi ? "Envoi..." : "Envoyer"}
        </Button>
        {erreur && <span className="text-sm font-semibold text-destructive">{erreur}</span>}
      </div>
    </div>
  );
}
