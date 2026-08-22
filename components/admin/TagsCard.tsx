"use client";

// components/admin/TagsCard.tsx
//
// CE QUE SYSTEME.IO DIT, ET CE QU'ON A VRAIMENT OUVERT.
//
// Béné, 22 août : "oui pourquoi pas un contrôle des tags".
//
// Ivan portait `tiquiz-mensuel` chez Systeme.io et `free` chez nous
// pendant une journée entière, et on l'a appris par lui. Cet écran pose
// la question tout seul.
//
// Il ne se lance PAS au chargement : lire tous ses contacts prend
// plusieurs secondes et n'a d'intérêt qu'au moment où elle se pose la
// question. Un écran d'admin qui met dix secondes à s'ouvrir est un
// écran qu'on n'ouvre plus.

import { useCallback, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AuditTags, EcartTrouve } from "@/lib/sio/contacts";

interface Reponse extends Partial<AuditTags> {
  ok?: boolean;
  reason?: string;
  status?: number;
  detail?: string | null;
  contactsLus?: number;
  tronque?: boolean;
}

/**
 * Chaque écart, dit en clair ET avec ce qu'il faut faire.
 *
 * Le premier est le seul urgent : quelqu'un a payé et n'a pas ses accès.
 */
const ECARTS: Record<EcartTrouve["ecart"], { titre: string; quoiFaire: string; grave: boolean }> = {
  "acces-manquant": {
    titre: "A payé, n'a pas ses accès",
    quoiFaire:
      "Systeme.io la marque payante, son compte Tiquiz est en gratuit. Ouvre lui son palier depuis la liste des clients.",
    grave: true,
  },
  "palier-different": {
    titre: "Pas au même palier des deux côtés",
    quoiFaire: "Vérifie lequel est le bon, et aligne l'autre.",
    grave: true,
  },
  "tag-manquant": {
    titre: "Payante chez nous, pas étiquetée chez Systeme.io",
    quoiFaire:
      "Elle sort de tes automatisations et de tes séquences d'emails. Ajoute lui le tag dans Systeme.io.",
    grave: false,
  },
};

const RAISONS: Record<string, string> = {
  forbidden: "Ton compte n'est pas reconnu comme administrateur.",
  no_key:
    "Aucune clé Systeme.io n'est connectée sur ton compte. Va dans Paramètres, onglet Systeme.io.",
  key_refused:
    "Systeme.io a refusé ta clé pour lire les contacts. Vérifie ses droits dans ton compte Systeme.io.",
  api_failed: "Systeme.io n'a pas répondu correctement. Réessaie dans un moment.",
  read_failed: "La liste de tes comptes Tiquiz n'a pas pu être lue.",
};

export default function TagsCard() {
  const [data, setData] = useState<Reponse | null>(null);
  const [chargement, setChargement] = useState(false);

  const lancer = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch("/api/admin/sio-tags", { cache: "no-store" });
      setData((await res.json()) as Reponse);
    } catch {
      setData({ ok: false, reason: "api_failed" });
    } finally {
      setChargement(false);
    }
  }, []);

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tags className="size-4 shrink-0 text-primary" />
          <h2 className="flex-1 text-sm font-semibold">Contrôle des tags Systeme.io</h2>
          <Button variant="outline" size="sm" onClick={() => void lancer()} disabled={chargement}>
            {chargement && <Loader2 className="size-4 animate-spin" />}
            {data ? "Relancer" : "Lancer le contrôle"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Compare ce que Systeme.io dit de chaque personne à ce qu&apos;on lui a vraiment ouvert.
          Utilise ta clé Systeme.io, celle de tes Paramètres. Le contrôle lit tous tes contacts,
          compte quelques secondes.
        </p>

        {data && !data.ok && (
          <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
            <p className="font-bold">Le contrôle n&apos;a pas pu se faire.</p>
            <p className="mt-1">
              {RAISONS[data.reason ?? ""] ?? "Le serveur a refusé sans dire pourquoi."}
            </p>
            {data.detail && <p className="mt-1 opacity-70">{data.detail}</p>}
          </div>
        )}

        {data?.ok && (
          <>
            {/* CE QUE L'AUDIT A VRAIMENT PU LIRE.
                Zero ecart sur zero contact lisible se lirait "tout va
                bien" : c'est le pire ecran possible. */}
            <p className="text-xs text-muted-foreground">
              {data.compares ?? 0} personne{(data.compares ?? 0) > 1 ? "s" : ""} comparée
              {(data.compares ?? 0) > 1 ? "s" : ""} sur {data.contactsLus ?? 0} contacts lus.
              {(data.absentsDeSio ?? 0) > 0 &&
                ` ${data.absentsDeSio} compte${(data.absentsDeSio ?? 0) > 1 ? "s" : ""} Tiquiz introuvable${(data.absentsDeSio ?? 0) > 1 ? "s" : ""} chez Systeme.io.`}
            </p>

            {(data.illisibles ?? 0) > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <p>
                  {data.illisibles} contact{(data.illisibles ?? 0) > 1 ? "s" : ""} reçu
                  {(data.illisibles ?? 0) > 1 ? "s" : ""} dont je n&apos;ai pas su lire les tags.
                  Le résultat ci dessous est donc incomplet : envoie moi cette phrase, je corrige
                  la lecture.
                </p>
              </div>
            )}

            {data.tronque && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                Ta liste de contacts dépasse ce que le contrôle lit d&apos;un coup. Les plus
                anciens n&apos;ont pas été vérifiés.
              </div>
            )}

            {(data.ecarts?.length ?? 0) === 0 ? (
              <p className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="size-4" /> Aucun écart. Tout le monde a ce qu&apos;il a
                payé.
              </p>
            ) : (
              <ul className="space-y-2">
                {(data.ecarts ?? []).map((e) => {
                  const info = ECARTS[e.ecart];
                  return (
                    <li
                      key={`${e.email}-${e.ecart}`}
                      className={`rounded-md border p-3 text-xs ${info.grave ? "border-rose-300 bg-rose-50" : ""}`}
                    >
                      <p className="flex items-center gap-1.5 font-bold">
                        {info.grave && <AlertTriangle className="size-3.5 shrink-0" />}
                        {e.email}
                      </p>
                      <p className="mt-0.5 font-semibold">{info.titre}</p>
                      <p className="mt-0.5 text-muted-foreground">
                        Chez Systeme.io : {e.tags.length ? e.tags.join(", ") : "aucun tag Tiquiz"}
                        {" · "}
                        Chez nous : {e.planChezNous || "gratuit"}
                      </p>
                      <p className="mt-1">{info.quoiFaire}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
