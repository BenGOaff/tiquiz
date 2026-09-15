"use client";

// components/connexions/ConnexionsTab.tsx
//
// L'ONGLET CONNEXIONS : où partent les leads (Béné, 14 septembre 2026,
// en montrant l'écran Intégrations de Quizify ; puis le 15 : "un clic
// sur la carte du haut ouvre une popup qui permet de tout gérer. C'est
// PAS ergonomique de devoir scroller").
//
// Une carte par outil, du catalogue `lib/integrations/fournisseurs.ts`,
// et LA CARTE EST LE GESTE :
//   - GoHighLevel sans connexion, OAuth configuré : la carte est un LIEN
//     vers le départ OAuth. Un clic, et on est chez eux ;
//   - sinon : la carte ouvre une FENÊTRE (Dialog) qui contient tout ce
//     qu'on peut faire sur cet outil. Rien ne s'affiche sous la grille,
//     rien à faire défiler.
// Le libellé de la carte dit ce qui va se passer : "Connecter" quand
// rien n'est connecté, "Gérer" dès qu'une connexion existe. Un "Connecter"
// sous une connexion active se lit comme "ça n'a pas marché".
//
// Les outils "bientôt" ont une carte grisée qui le DIT : une carte
// absente ferait croire que l'outil n'est pas prévu.
//
// AUCUNE IMAGE EXTERNE : la pastille porte les initiales de l'outil sur
// sa couleur. Un logo tiers chargé depuis leur CDN casserait le jour où
// ils le déplacent, et un logo recopié dans `public/` est une marque
// qu'on republie sans leur accord.

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SioApiKeysManager from "@/components/sio/SioApiKeysManager";
import GoHighLevelManager from "@/components/connexions/GoHighLevelManager";
import { FOURNISSEURS, type Fournisseur, type FicheFournisseur } from "@/lib/integrations/fournisseurs";
import { hrefPourLangue } from "@/lib/site/nav";
import { HOTE_VENTE } from "@/lib/publicHost";

/** Le depart OAuth GoHighLevel : le meme chemin que dans GoHighLevelManager. */
const LIEN_OAUTH_GHL = "/api/connexions/crm-oauth/oauth";

interface ConnexionPublique {
  id: string;
  fournisseur: Fournisseur;
  actif: boolean;
  etat: "ok" | "deconnecte";
}

interface CleSio {
  id: string;
  actif?: boolean;
  validation_status: string | null;
}

function Pastille({ f, taille = "h-10 w-10 text-sm" }: { f: FicheFournisseur; taille?: string }) {
  return (
    <span
      aria-hidden
      className={`rounded-full inline-flex items-center justify-center text-white font-bold shrink-0 ${taille}`}
      style={{ backgroundColor: f.couleur }}
    >
      {f.initiales}
    </span>
  );
}

export default function ConnexionsTab() {
  const t = useTranslations("connexions");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [ouvert, setOuvert] = useState<Fournisseur | null>(null);
  const [connexions, setConnexions] = useState<ConnexionPublique[]>([]);
  const [cles, setCles] = useState<CleSio[]>([]);
  const [oauthGhl, setOauthGhl] = useState(false);
  const [version, setVersion] = useState(0);
  // Une installation lancee chez GoHighLevel attend UN clic ici avant
  // d'ecrire quoi que ce soit (`lib/integrations/retourOauth.ts`).
  const [aConfirmer, setAConfirmer] = useState(false);
  const [relie, setRelie] = useState(false);

  useEffect(() => {
    let vivant = true;
    Promise.all([
      fetch("/api/connexions").then((r) => r.json()).catch(() => null),
      fetch("/api/sio-api-keys").then((r) => r.json()).catch(() => null),
    ]).then(([cx, sio]) => {
      if (!vivant) return;
      if (cx?.ok) {
        setConnexions(cx.connexions ?? []);
        setOauthGhl(cx.oauth?.gohighlevel === true);
      }
      if (sio?.ok) setCles(sio.keys ?? []);
    });
    return () => {
      vivant = false;
    };
  }, [version]);

  // LE RETOUR DU BOUTON OAUTH atterrit ici avec un mot dans l'adresse
  // (`?ghl=ok|refuse|...`). On le dit UNE fois, et on ouvre la fenetre
  // GoHighLevel pour que la connexion fraîche soit sous les yeux.
  useEffect(() => {
    const ghl = searchParams.get("ghl");
    if (!ghl) return;
    setOuvert("gohighlevel");
    if (ghl === "confirmer") {
      setAConfirmer(true);
      return;
    }
    const n = Number(searchParams.get("n") ?? "1") || 1;
    toastRetourGhl(ghl, n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const MOTS_RETOUR = ["ok", "refuse", "etat", "erreur", "deja", "aucun_sous_compte", "non_configure", "expire"] as const;
  function toastRetourGhl(mot: string, n: number) {
    const cle = (MOTS_RETOUR as readonly string[]).includes(mot) ? mot : "erreur";
    if (cle === "ok") toast.success(t(`ghl.retour.${cle}`, { n }));
    else toast.error(t(`ghl.retour.${cle}`, { n }));
  }

  // LE CLIC "RELIER" : le code attend dans un cookie, l'echange ne se
  // fait que sur ce POST venu de notre page (jamais sur le GET du retour).
  async function relier() {
    setRelie(true);
    try {
      const r = await fetch("/api/connexions/crm-oauth/callback", { method: "POST" });
      const j = (await r.json().catch(() => null)) as { mot?: string; n?: number } | null;
      toastRetourGhl(j?.mot ?? "erreur", Number(j?.n ?? 1) || 1);
      setVersion((v) => v + 1);
    } catch {
      toastRetourGhl("erreur", 1);
    } finally {
      setRelie(false);
      setAConfirmer(false);
    }
  }

  const compte = useMemo(() => {
    const parOutil: Record<string, { n: number; pause: number; deconnecte: number }> = {};
    for (const f of FOURNISSEURS) parOutil[f.id] = { n: 0, pause: 0, deconnecte: 0 };
    for (const c of connexions) {
      const o = parOutil[c.fournisseur];
      if (!o) continue;
      o.n++;
      if (!c.actif) o.pause++;
      if (c.etat === "deconnecte") o.deconnecte++;
    }
    for (const k of cles) {
      const o = parOutil.systemeio;
      o.n++;
      if (k.actif === false) o.pause++;
      if (k.validation_status === "deconnecte") o.deconnecte++;
    }
    return parOutil;
  }, [connexions, cles]);

  const guide = (chemin: string) => `${HOTE_VENTE}${hrefPourLangue(chemin, locale === "en" ? "en" : "fr")}`;
  const fOuvert = ouvert ? FOURNISSEURS.find((f) => f.id === ouvert) ?? null : null;

  const CARTE =
    "w-full h-full text-left rounded-xl border bg-card p-4 flex flex-col gap-3 transition-colors " +
    "hover:border-primary/60 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 " +
    "disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-card";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        <p className="text-xs text-muted-foreground inline-flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {t("alerteNote")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FOURNISSEURS.map((f) => {
          const c = compte[f.id];
          // Un clic = la connexion, tant que rien n'est connecte. Une
          // confirmation en attente passe par la fenetre : c'est la que
          // vit le bouton "Relier".
          const directOauth = f.id === "gohighlevel" && oauthGhl && c.n === 0 && !aConfirmer;
          const contenu = (
            <>
              <div className="flex items-center gap-3">
                <Pastille f={f} />
                <div className="min-w-0">
                  <div className="font-semibold">{f.nom}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-1.5 items-center">
                    {!f.disponible ? (
                      <span>{t("bientot")}</span>
                    ) : c.n === 0 ? (
                      <span>{t("nonConnecte")}</span>
                    ) : (
                      <>
                        <span className="text-emerald-600 dark:text-emerald-400">{t("connecteN", { n: c.n })}</span>
                        {c.pause > 0 && <Badge variant="secondary" className="text-[10px]">{t("pauseBadge")}</Badge>}
                        {c.deconnecte > 0 && <Badge variant="destructive" className="text-[10px]">{t("deconnecteBadge")}</Badge>}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground flex-1">{t(`desc.${f.id}`)}</p>
              {f.disponible && (
                <span
                  className={`self-start rounded-full px-3 py-1 text-xs font-medium ${
                    c.n > 0 ? "border bg-background" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {c.n > 0 ? t("boutonGerer") : t("boutonConnecter")}
                </span>
              )}
            </>
          );
          return (
            <div key={f.id} className="flex flex-col gap-1.5">
              {directOauth ? (
                <a href={LIEN_OAUTH_GHL} className={CARTE}>
                  {contenu}
                </a>
              ) : (
                <button type="button" disabled={!f.disponible} onClick={() => setOuvert(f.id)} className={CARTE}>
                  {contenu}
                </button>
              )}
              {f.aide && (
                <a
                  href={guide(f.aide)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start px-1 text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                >
                  {t("guide")} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={fOuvert !== null} onOpenChange={(o) => { if (!o) setOuvert(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {fOuvert && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pastille f={fOuvert} taille="h-7 w-7 text-[11px]" />
                  {fOuvert.nom}
                </DialogTitle>
                <DialogDescription>{fOuvert.id === "gohighlevel" ? t("ghl.desc") : t(`desc.${fOuvert.id}`)}</DialogDescription>
              </DialogHeader>

              {fOuvert.id === "gohighlevel" && aConfirmer && (
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-3" role="status">
                  <p className="text-sm">{t("ghl.confirmer.texte")}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="rounded-full" disabled={relie} onClick={relier}>
                      {t("ghl.confirmer.bouton")}
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full" disabled={relie} onClick={() => setAConfirmer(false)}>
                      {t("ghl.confirmer.annuler")}
                    </Button>
                  </div>
                </div>
              )}

              {fOuvert.id === "systemeio" && <SioApiKeysManager sansCadre />}
              {fOuvert.id === "gohighlevel" && (
                <GoHighLevelManager oauthDisponible={oauthGhl} onChange={() => setVersion((v) => v + 1)} />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
