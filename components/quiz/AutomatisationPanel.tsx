"use client";

// components/quiz/AutomatisationPanel.tsx
//
// L'ONGLET AUTOMATISATION (Béné, 1er septembre 2026).
//
// "Un onglet Automatisation qui explique le workflow et les tags précis à
// créer dans Systeme.io. Pas un truc générique, un truc réel. Ça doit
// être bien présenté, facile à lire, comprendre et mettre en oeuvre."
//
// Cet écran N'AFFICHE RIEN QU'IL AURAIT DEVINÉ : tout vient de
// `construirePlanAutomatisation`, qui ne rend que les tags que ce quiz
// pose vraiment. Le composant écrit les phrases (7 langues), le module
// pur décide de leur contenu.
//
// LE POINT QUI JUSTIFIE TOUT L'ÉCRAN : poser un tag ne déclenche RIEN
// chez Systeme.io tant qu'aucune règle ne l'écoute. Mesuré le 31 août.
// C'est pour ça que la marche à suivre est donnée clic par clic, avec le
// nom du tag copiable : c'est le seul endroit où une faute de frappe
// casse tout en silence.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, ExternalLink, Info, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  EtapeAutomatisation,
  ManqueAutomatisation,
  PlanAutomatisation,
} from "@/lib/automatisation/planSysteme";

const URL_REGLES = "https://systeme.io/dashboard/automation-rules";

function Tag({ valeur }: { valeur: string }) {
  const t = useTranslations("automatisation");
  const [copie, setCopie] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(valeur);
          setCopie(true);
          window.setTimeout(() => setCopie(false), 1500);
        } catch {
          // Copie refusée (navigateur strict) : on le DIT, sinon le clic
          // n'a aucun effet visible et on croit le bouton cassé.
          toast.error(t("copyError", { tag: valeur }));
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-md border bg-muted/60 px-2 py-0.5 font-mono text-[13px] hover:bg-muted transition-colors align-middle"
      title={t("copyTag")}
    >
      {valeur}
      {copie ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 opacity-50" />}
    </button>
  );
}

function Etape({ etape, numero }: { etape: EtapeAutomatisation; numero: number }) {
  const t = useTranslations("automatisation");

  // Une formation ou une communauté est ouverte PAR TIQUIZ. Une règle de
  // plus l'ouvrirait deux fois, et ça ne se voit qu'en recevant deux
  // emails : cette carte dit donc de NE RIEN FAIRE.
  if (etape.action === "rien") {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-5 space-y-2">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium text-sm">{t("accesTitre", { profil: etape.contexte ?? "" })}</p>
              <p className="text-sm text-muted-foreground">{t("accesTexte")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const titre =
    etape.type === "profil"
      ? t("profilTitre", { profil: etape.contexte ?? "" })
      : etape.type === "partage"
        ? t("partageTitre")
        : etape.type === "capture-sondage"
          ? t("captureTitre")
          : etape.type === "reponse-sondage"
            ? t("reponseTitre", { reponse: etape.contexte ?? "" })
            : etape.contexte
              ? t("scoreTitre", { axe: etape.contexte })
              : t("scoreTitreGlobal");

  const action = etape.action === "email" ? t("actionEmail") : t("actionCampagne");
  const quoiEnvoyer =
    etape.type === "partage"
      ? t("envoiPartage")
      : etape.type === "profil"
        ? t("envoiProfil", { profil: etape.contexte ?? "" })
        : t("envoiGenerique");

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-baseline gap-2.5">
          <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold inline-flex items-center justify-center">
            {numero}
          </span>
          <p className="font-medium">{titre}</p>
        </div>

        {/* Le MOTIF : les tags de score sont calculés au moment de la
            réponse. On ne promet donc pas un nom unique, on donne la
            liste réelle des valeurs possibles. */}
        {etape.motif && etape.valeurs ? (
          <p className="text-sm text-muted-foreground">
            {t("scoreMotif")}{" "}
            {etape.valeurs.map((v) => (
              <span key={v} className="mr-1.5 inline-block">
                <Tag valeur={v} />
              </span>
            ))}
          </p>
        ) : null}

        <ol className="space-y-2 text-sm">
          <li className="flex gap-2">
            <span className="text-muted-foreground shrink-0">1.</span>
            <span>
              {t("pas1")} <Tag valeur={etape.nomWorkflow} />
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-muted-foreground shrink-0">2.</span>
            <span>
              {t("pas2")} {etape.motif ? t("pas2Motif") : <Tag valeur={etape.tag} />}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-muted-foreground shrink-0">3.</span>
            <span>
              {t("pas3", { action })} {quoiEnvoyer}
            </span>
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}

function Manque({ manque }: { manque: ManqueAutomatisation }) {
  const t = useTranslations("automatisation");
  const texte =
    manque.type === "cle-api"
      ? t("manqueCle")
      : manque.type === "tag-profil"
        ? t("manqueTagProfil", { profil: manque.contexte ?? "" })
        : manque.type === "tag-capture"
          ? t("manqueTagCapture")
          : t("manqueTagPartage");
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        manque.bloquant ? "border-destructive/40 bg-destructive/5" : "border-amber-500/40 bg-amber-500/5"
      }`}
    >
      <div className="flex items-start gap-2">
        <TriangleAlert
          className={`w-4 h-4 mt-0.5 shrink-0 ${manque.bloquant ? "text-destructive" : "text-amber-600"}`}
        />
        <span>{texte}</span>
      </div>
    </div>
  );
}

export function AutomatisationPanel({ plan }: { plan: PlanAutomatisation }) {
  const t = useTranslations("automatisation");
  const bloquant = plan.manques.some((m) => m.bloquant);

  // Les cartes "ne rien faire" ne sont pas des étapes : elles ne portent
  // pas de numéro, sinon la créatrice compte 6 choses à faire quand il y
  // en a 4.
  let numero = 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">{t("titre")}</h2>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        {/* LA PHRASE QUI MANQUAIT PARTOUT : un tag posé ne déclenche rien
            tant qu'aucune règle ne l'écoute. */}
        <p className="text-sm">{t("pourquoi")}</p>
      </div>

      {plan.manques.length > 0 && (
        <div className="space-y-2">
          {plan.manques.map((m, i) => (
            <Manque key={`${m.type}-${i}`} manque={m} />
          ))}
        </div>
      )}

      {!bloquant && plan.etapes.length === 0 && (
        // LE VIDE PARLE : un écran vide se lit "c'est cassé" ou "je n'ai
        // rien à faire ici", et les deux coûtent une créatrice.
        <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
          <p className="font-medium">{t("videTitre")}</p>
          <p className="text-sm text-muted-foreground">{t("videTexte")}</p>
        </div>
      )}

      {plan.etapes.length > 0 && (
        <>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <a href={URL_REGLES} target="_blank" rel="noopener noreferrer">
              {t("ouvrirSysteme")} <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </a>
          </Button>

          <div className="space-y-3">
            {plan.etapes.map((e) => {
              if (e.action !== "rien") numero += 1;
              return <Etape key={e.cle} etape={e} numero={numero} />;
            })}
          </div>

          <p className="text-xs text-muted-foreground">{t("noteFin")}</p>
        </>
      )}
    </div>
  );
}
