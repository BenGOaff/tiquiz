"use client";

// components/connexions/GoHighLevelManager.tsx
//
// LES CONNEXIONS GOHIGHLEVEL D'UN COMPTE : le bouton "Connecter avec
// GoHighLevel" (OAuth, quand le serveur porte l'app déclarée chez eux),
// le jeton privé collé à la main (un sous-compte, ou une agence entière
// qui en importe plusieurs), et pour chaque connexion : la pause, le
// test, le défaut, un nouveau jeton, la suppression.
//
// Ce composant ne DÉCIDE rien : il affiche ce que `/api/connexions`
// rend, et il envoie ce que la personne fait. Les raisons de refus sont
// des CLÉS que l'écran traduit (l'interface existe en sept langues).

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Check,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Connexion {
  id: string;
  fournisseur: string;
  nom: string;
  last4: string | null;
  mode: "jeton" | "oauth";
  locationId: string | null;
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
  const [ajout, setAjout] = useState(false);
  const [mode, setMode] = useState<"sous-compte" | "agence">("sous-compte");
  const [nom, setNom] = useState("");
  const [token, setToken] = useState("");
  const [locationId, setLocationId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [editionNom, setEditionNom] = useState("");
  const [jetonPourId, setJetonPourId] = useState<string | null>(null);
  const [nouveauJeton, setNouveauJeton] = useState("");
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

  async function creer() {
    setEnvoi(true);
    try {
      const corps =
        mode === "agence"
          ? { fournisseur: "gohighlevel", mode: "agence", token: token.trim(), companyId: companyId.trim() }
          : { fournisseur: "gohighlevel", nom: nom.trim(), token: token.trim(), locationId: locationId.trim() };
      const res = await fetch("/api/connexions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(raison(data.error));
        return;
      }
      if (mode === "agence") {
        const creees: string[] = data.creees ?? [];
        const refusees: Array<{ nom: string; raison: string }> = data.refusees ?? [];
        if (creees.length > 0) toast.success(t("toastImport", { n: creees.length }));
        if (refusees.length > 0) toast.error(t("toastRefuses", { liste: refusees.map((r) => `${r.nom} (${raison(r.raison)})`).join(", ") }));
      } else {
        toast.success(t("toastCree"));
      }
      setAjout(false);
      setNom("");
      setToken("");
      setLocationId("");
      setCompanyId("");
      fini();
    } catch {
      toast.error(t("erreurs.generic"));
    } finally {
      setEnvoi(false);
    }
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

  const formulaireValide =
    token.trim().length > 0 && (mode === "agence" ? companyId.trim().length > 0 : nom.trim().length > 0 && locationId.trim().length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          {t("titre")}
        </CardTitle>
        <CardDescription>{t("desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
              <li key={c.id} className="border rounded-lg p-3 space-y-2">
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
                        <Badge variant="outline" className="text-[10px]">{c.mode === "oauth" ? t("modeOauth") : t("modeJeton")}</Badge>
                        {c.last4 && <span className="text-xs text-muted-foreground font-mono">••••{c.last4}</span>}
                        {c.locationId && <span className="text-xs text-muted-foreground font-mono truncate">{c.locationId}</span>}
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
                      <Button size="icon" variant="ghost" className="h-8 w-8" title={t("nouveauJeton")} onClick={() => setJetonPourId(jetonPourId === c.id ? null : c.id)}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title={t("supprimer")} onClick={() => supprimer(c)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                {jetonPourId === c.id && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="password"
                      value={nouveauJeton}
                      onChange={(e) => setNouveauJeton(e.target.value)}
                      placeholder="pit-…"
                      className="h-8 font-mono"
                    />
                    <Button
                      size="sm"
                      className="rounded-full"
                      disabled={!nouveauJeton.trim()}
                      onClick={async () => {
                        if (await patch(c.id, { token: nouveauJeton.trim() }, t("toastMaj"))) {
                          setJetonPourId(null);
                          setNouveauJeton("");
                        }
                      }}
                    >
                      {t("nouveauJeton")}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {oauthDisponible ? (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Button asChild className="rounded-full">
              <a href="/api/connexions/gohighlevel/oauth">{t("oauthBouton")}</a>
            </Button>
            <p className="text-xs text-muted-foreground">{t("oauthAide")}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("oauthAbsent")}</p>
        )}

        {ajout ? (
          <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
            <div className="flex flex-wrap gap-2">
              {(["sous-compte", "agence"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${mode === m ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
                >
                  {m === "agence" ? t("modeAgence") : t("modeSousCompte")}
                </button>
              ))}
            </div>
            {mode === "sous-compte" && (
              <div>
                <Label>{t("nomLabel")}</Label>
                <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={t("nomPh")} className="mt-1.5" maxLength={80} />
              </div>
            )}
            <div>
              <Label>{t("jetonLabel")}</Label>
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="pit-…" type="password" className="mt-1.5 font-mono" />
              <p className="text-xs text-muted-foreground mt-1">{t("jetonAide")}</p>
            </div>
            {mode === "sous-compte" ? (
              <div>
                <Label>{t("locationLabel")}</Label>
                <Input value={locationId} onChange={(e) => setLocationId(e.target.value)} className="mt-1.5 font-mono" />
                <p className="text-xs text-muted-foreground mt-1">{t("locationAide")}</p>
              </div>
            ) : (
              <div>
                <Label>{t("companyLabel")}</Label>
                <Input value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="mt-1.5 font-mono" />
                <p className="text-xs text-muted-foreground mt-1">{t("companyAide")}</p>
              </div>
            )}
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setAjout(false)} disabled={envoi}>
                {t("annuler")}
              </Button>
              <Button size="sm" onClick={creer} disabled={envoi || !formulaireValide} className="rounded-full">
                {envoi ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
                {mode === "agence" ? t("importer") : t("ajouter")}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAjout(true)} className="rounded-full">
            <Plus className="h-4 w-4 mr-1.5" />
            {t("ouJeton")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
