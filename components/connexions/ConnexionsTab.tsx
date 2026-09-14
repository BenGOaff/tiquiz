"use client";

// components/connexions/ConnexionsTab.tsx
//
// L'ONGLET CONNEXIONS : où partent les leads (Béné, 14 septembre 2026,
// en montrant l'écran Intégrations de Quizify).
//
// Une carte par outil, du catalogue `lib/integrations/fournisseurs.ts`.
// Un clic sur une carte ouvre SON panneau sous la grille : Systeme.io
// garde son gestionnaire de clés tel quel (il n'a pas bougé d'une
// ligne, la pause en plus), GoHighLevel a le sien. Les outils "bientôt"
// ont une carte grisée qui le DIT : une carte absente ferait croire que
// l'outil n'est pas prévu.
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
import SioApiKeysManager from "@/components/sio/SioApiKeysManager";
import GoHighLevelManager from "@/components/connexions/GoHighLevelManager";
import { FOURNISSEURS, type Fournisseur } from "@/lib/integrations/fournisseurs";
import { hrefPourLangue } from "@/lib/site/nav";
import { HOTE_VENTE } from "@/lib/publicHost";

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

export default function ConnexionsTab() {
  const t = useTranslations("connexions");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [ouvert, setOuvert] = useState<Fournisseur | null>(null);
  const [connexions, setConnexions] = useState<ConnexionPublique[]>([]);
  const [cles, setCles] = useState<CleSio[]>([]);
  const [oauthGhl, setOauthGhl] = useState(false);
  const [version, setVersion] = useState(0);

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
  // (`?ghl=ok|refuse|...`). On le dit UNE fois, et on ouvre le panneau
  // GoHighLevel pour que la connexion fraîche soit sous les yeux.
  useEffect(() => {
    const ghl = searchParams.get("ghl");
    if (!ghl) return;
    const n = Number(searchParams.get("n") ?? "1") || 1;
    const cles = ["ok", "refuse", "etat", "erreur", "deja", "aucun_sous_compte", "non_configure"] as const;
    const cle = (cles as readonly string[]).includes(ghl) ? ghl : "erreur";
    if (cle === "ok") toast.success(t(`ghl.retour.${cle}`, { n }));
    else toast.error(t(`ghl.retour.${cle}`, { n }));
    setOuvert("gohighlevel");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          const estOuvert = ouvert === f.id;
          return (
            <div
              key={f.id}
              className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${
                estOuvert ? "border-primary ring-1 ring-primary/40" : ""
              } ${f.disponible ? "" : "opacity-70"}`}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="h-10 w-10 rounded-full inline-flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: f.couleur }}
                >
                  {f.initiales}
                </span>
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
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="rounded-full"
                  variant={c.n > 0 ? "outline" : "default"}
                  disabled={!f.disponible}
                  onClick={() => setOuvert(estOuvert ? null : f.id)}
                >
                  {c.n > 0 ? t("boutonGerer") : t("boutonConnecter")}
                </Button>
                {f.aide && (
                  <a
                    href={guide(f.aide)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    {t("guide")} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {ouvert === "systemeio" && <SioApiKeysManager />}
      {ouvert === "gohighlevel" && (
        <GoHighLevelManager oauthDisponible={oauthGhl} onChange={() => setVersion((v) => v + 1)} />
      )}
    </div>
  );
}
