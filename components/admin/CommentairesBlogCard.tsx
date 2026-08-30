"use client";

// components/admin/CommentairesBlogCard.tsx
//
// LA FILE DE MODÉRATION DES COMMENTAIRES DU BLOG.
//
// -- POURQUOI CET ÉCRAN EXISTE ----------------------------------------
//
// Un commentaire arrive en `en_attente` et n'apparaît nulle part tant
// qu'il n'a pas été vu : c'est la seule posture tenable, ce qui se
// publie sur le domaine de Béné engage sa réputation et son
// référencement. Mais une file qu'on ne montre pas est une file que
// personne ne relève : les commentaires attendraient dans Supabase,
// c'est à dire nulle part pour elle, et la fonctionnalité entière serait
// morte à la première semaine.
//
// C'est la leçon de `webhook_logs` (7 août) : une donnée qu'on n'affiche
// pas ne sert à personne.
//
// -- CE QUI ATTEND LE PLUS LONGTEMPS PASSE DEVANT ---------------------
//
// Le tri vient du serveur (`cree_le` croissant). Trier du plus récent
// enterrerait justement ceux qu'on a déjà fait attendre : c'est la même
// règle que la file du support.

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, MessageCircle, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Ligne {
  id: string;
  slug: string;
  auteur: string;
  message: string;
  cree_le: string;
}

function quand(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function CommentairesBlogCard() {
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const r = await fetch("/api/admin/blog-commentaires", { cache: "no-store" });
      const j = (await r.json()) as { ok?: boolean; commentaires?: Ligne[]; reason?: string };
      if (!j.ok) {
        // Un refus n'est pas une panne : on dit lequel, sinon on
        // cherche un bug dans le code (regle du 19 aout).
        setErreur(
          j.reason === "forbidden"
            ? "Ton compte n'est pas reconnu comme administrateur."
            : "La file n'a pas pu etre lue.",
        );
        setLignes([]);
        return;
      }
      setLignes(j.commentaires ?? []);
    } catch {
      setErreur("La file n'a pas pu etre lue (reseau).");
      setLignes([]);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function moderer(id: string, statut: "publie" | "refuse") {
    setEnCours(id);
    try {
      const r = await fetch("/api/admin/blog-commentaires", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, statut }),
      });
      const j = (await r.json()) as { ok?: boolean; delaiMinutes?: number };
      if (!j.ok) {
        toast.error("Le changement n'a pas ete enregistre.");
        return;
      }
      setLignes((l) => (l ?? []).filter((x) => x.id !== id));
      toast.success(
        statut === "publie"
          ? // LE DELAI EST DIT. La page d'article est prerendue et
            // revalidee toutes les dix minutes : sans cette phrase, Bene
            // publie, recharge l'article, ne voit rien, et conclut que le
            // bouton ne marche pas (scenario Jocelyne du 1er aout).
            "Publie. Il apparait sur l'article dans les 10 minutes."
          : "Refuse. Il n'apparaitra nulle part.",
      );
    } finally {
      setEnCours(null);
    }
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <MessageCircle className="h-4 w-4" />
            Commentaires du blog
            {lignes && lignes.length > 0 ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                {lignes.length} en attente
              </span>
            ) : null}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => void charger()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {erreur ? <p className="mt-3 text-sm text-destructive">{erreur}</p> : null}

        {lignes === null ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Lecture de la file...
          </p>
        ) : lignes.length === 0 && !erreur ? (
          // LE VIDE PARLE. Un ecran vide sans un mot se lit "c'est
          // casse" ou "je n'ai rien a faire ici", et les deux coutent
          // du temps (lecon du tableau de liens, 24 aout).
          <p className="mt-4 text-sm text-muted-foreground">
            Rien a relire. Les nouveaux commentaires arrivent ici avant d&apos;etre publies : tant
            qu&apos;ils y sont, personne ne les voit sur le blog.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {lignes.map((c) => (
              <li key={c.id} className="rounded-lg border p-3">
                <p className="text-sm">
                  <span className="font-semibold">{c.auteur}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    | {quand(c.cree_le)} | <code className="text-xs">{c.slug}</code>
                  </span>
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{c.message}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    disabled={enCours === c.id}
                    onClick={() => void moderer(c.id, "publie")}
                  >
                    <Check className="mr-1 h-4 w-4" /> Publier
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={enCours === c.id}
                    onClick={() => void moderer(c.id, "refuse")}
                  >
                    <X className="mr-1 h-4 w-4" /> Refuser
                  </Button>
                  <a
                    href={`/blog/${c.slug}#commentaires`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-center text-xs text-muted-foreground underline"
                  >
                    Voir l&apos;article
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
