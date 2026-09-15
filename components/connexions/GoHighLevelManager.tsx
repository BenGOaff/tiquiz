"use client";

// components/connexions/GoHighLevelManager.tsx
//
// LES CONNEXIONS GOHIGHLEVEL D'UN COMPTE, dans la fenêtre qu'ouvre la
// carte de l'onglet Connexions (Béné, 15 septembre 2026 : "un clic sur
// la carte du haut ouvre une popup qui permet de tout gérer", et "tu
// supprimes aussi le jeton privé : on fait connexion native c'est tout").
//
// Une ligne par sous-compte : la pause, le test, le défaut, le nom, la
// suppression. UN SEUL chemin pour en ajouter un, le départ OAuth, le
// même que celui de la carte : deux départs écrits séparément finiraient
// par diverger. Plus aucun jeton collé à la main : deux façons de se
// connecter, c'est deux écrans à expliquer, et le jeton était celle
// qu'elle ne veut plus montrer. Les routes qui l'acceptaient existent
// encore côté serveur ; l'écran, lui, ne le propose plus.
//
// Ce composant ne DÉCIDE rien : il affiche ce que `/api/connexions`
// rend, et il envoie ce que la personne fait. Les raisons de refus sont
// des CLÉS que l'écran traduit (l'interface existe en sept langues).

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Plus, RefreshCw, ShieldAlert, ShieldCheck, Star, StarOff, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface Connexion {
  id: string;
  fournisseur: string;
  nom: string;
  actif: boolean;
  est_defaut: boolean;
  etat: "ok" | "deconnecte";
  derniere_erreur: string | null;
}

const RAISONS = ["JETON_REFUSE", "SOUS_COMPTE_INCONNU", "OUTIL_INDISPONIBLE", "NOM_PRIS", "REFUSE", "COMPANY_ID_REQUIS"] as const;

export default function GoHighLevelManager({
  oauthDisponible,
  onChange,
}: {
  oauthDisponible: boolean;
  onChange?: () => void;
}) {
  const t = useTranslations("connexions.ghl");
  const [liste, setListe] = useState<Connexion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [editionNom, setEditionNom] = useState("");
  const [testEnCours, setTestEnCours] = useState<string | null>(null);

  const raison = useCallback(
    (code: unknown) => {
      const c = String(code ?? "");
      return (RAISONS as readonly string[]).includes(c) ? t(`erreurs.${c}`) : t("erreurs.generic");
    },
    [t],
  );

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/connexions");
      const data = await res.json();
      if (data.ok) setListe((data.connexions as Connexion[]).filter((c) => c.fournisseur === "gohighlevel"));
    } catch {
      toast.error(t("erreurs.generic"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void charger();
  }, [charger]);

  function fini() {
    void charger();
    onChange?.();
  }

  async function patch(id: string, corps: Record<string, unknown>, message: string) {
    try {
      const res = await fetch(`/api/connexions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(raison(data.error));
        return false;
      }
      toast.success(message);
      fini();
      return true;
    } catch {
      toast.error(t("erreurs.generic"));
      return false;
    }
  }

  async function supprimer(c: Connexion) {
    if (!confirm(t("confirmSuppr", { nom: c.nom }))) return;
    try {
      const res = await fetch(`/api/connexions/${c.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast.success(t("toastSuppr"));
      fini();
    } catch {
      toast.error(t("erreurs.generic"));
    }
  }

  async function tester(id: string) {
    setTestEnCours(id);
    try {
      const res = await fetch(`/api/connexions/${id}/tester`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      if (data.etat === "ok" && !data.raison) toast.success(t("toastTestOk"));
      else if (data.raison === "JETON_REFUSE") toast.error(t("toastTestKo"));
      else if (data.raison === "OUTIL_INDISPONIBLE") toast.error(t("toastTestIndispo"));
      else toast.error(t("erreurs.REFUSE"));
      fini();
    } catch {
      toast.error(t("erreurs.generic"));
    } finally {
      setTestEnCours(null);
    }
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("chargement")}
        </div>
      ) : liste.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded-lg">{t("vide")}</div>
      ) : (
        <ul className="space-y-2">
          {liste.map((c) => (
            <li key={c.id} className="border rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  {c.etat === "ok" ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {editionId === c.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editionNom}
                        onChange={(e) => setEditionNom(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && (await patch(c.id, { nom: editionNom }, t("toastMaj")))) setEditionId(null);
                          if (e.key === "Escape") setEditionId(null);
                        }}
                        autoFocus
                        className="h-8"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={async () => {
                          if (await patch(c.id, { nom: editionNom }, t("toastMaj"))) setEditionId(null);
                        }}
                      >
                        <Check className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditionId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{c.nom}</span>
                      {c.est_defaut && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Star className="h-3 w-3 mr-0.5" />
                          {t("defaut")}
                        </Badge>
                      )}
                    </div>
                  )}
                  {c.etat === "deconnecte" && (
                    <p className="text-xs text-destructive mt-1">
                      {t("etatDeconnecte")}
                      {c.derniere_erreur ? ` : ${c.derniere_erreur}` : ""}
                    </p>
                  )}
                </div>
                {editionId !== c.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <label className="inline-flex items-center gap-1.5 mr-1 text-[11px] text-muted-foreground cursor-pointer">
                      <Switch
                        checked={c.actif}
                        onCheckedChange={(v) => patch(c.id, { actif: v }, t("toastMaj"))}
                        aria-label={c.actif ? t("syncActive") : t("syncPause")}
                      />
                      <span className="hidden sm:inline">{c.actif ? t("syncActive") : t("syncPause")}</span>
                    </label>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title={t("tester")} onClick={() => tester(c.id)} disabled={testEnCours === c.id}>
                      <RefreshCw className={`h-4 w-4 ${testEnCours === c.id ? "animate-spin" : ""}`} />
                    </Button>
                    {!c.est_defaut && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" title={t("definirDefaut")} onClick={() => patch(c.id, { estDefaut: true }, t("toastMaj"))}>
                        <StarOff className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title={t("renommer")}
                      onClick={() => {
                        setEditionId(c.id);
                        setEditionNom(c.nom);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title={t("supprimer")} onClick={() => supprimer(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {oauthDisponible ? (
        // Le SEUL chemin pour ajouter un sous-compte : le meme depart OAuth
        // que la carte. Un bouton discret, jamais un "Connecter" plein sur
        // un ecran ou l'on est deja connecte.
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <a href="/api/connexions/crm-oauth/oauth">
            <Plus className="h-4 w-4 mr-1.5" />
            {t("ajouterSousCompte")}
          </a>
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">{t("oauthAbsent")}</p>
      )}
    </div>
  );
}
