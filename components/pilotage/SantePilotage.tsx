"use client";

// components/pilotage/SantePilotage.tsx
//
// QU'EST-CE QUI CASSE, OU QU'IL FAUT SURVEILLER (Béné, 29 août 2026).
//
// -- AUCUN VERDICT ICI -------------------------------------------------
//
// La gravité, ce qui demande une action et les mots de chaque appel
// viennent de `lib/pilotage/sante.ts` et `lib/admin/webhookRows.ts`,
// testés. Cet écran affiche.
//
// -- ET IL DIT CE QU'IL N'A PAS PU VÉRIFIER ---------------------------
//
// Un contrôle qui n'a pas tourné n'est pas un contrôle qui passe. Les
// trois pannes les plus chères de ces dépôts étaient silencieuses : un
// écran vert est exactement ce qu'on aurait vu pendant les quinze jours
// de statistiques perdues.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldAlert } from "lucide-react";

import { CARTE } from "@/components/pilotage/carte";
import {
  LIBELLE_VERDICT,
  readCallVerdict,
  type TonVerdict,
} from "@/lib/admin/webhookRows";
import {
  etatSante,
  verdictAppels,
  type Gravite,
  type LigneAppel,
  type ResultatSonde,
} from "@/lib/pilotage/sante";

interface Liaison {
  nom: string;
  ok: boolean;
  raison: string | null;
}

interface Sante {
  ok?: boolean;
  sondes?: ResultatSonde[] | null;
  liaisons?: Liaison[];
  supabase?: {
    refUrl: string | null;
    refCle: string | null;
    cleLisible: string;
    coherentes: boolean | null;
  };
  reason?: string;
}

const TONS: Record<TonVerdict, string> = {
  ok: "text-emerald-700 dark:text-emerald-400",
  info: "text-muted-foreground",
  alerte: "text-destructive",
};

const ALLURE: Record<Gravite, { titre: string; classe: string }> = {
  ok: {
    titre: "Rien à signaler.",
    classe: "border-emerald-500/40 bg-emerald-500/5",
  },
  surveiller: {
    titre: "À surveiller.",
    classe: "border-amber-400/50 bg-amber-500/5",
  },
  casse: {
    titre: "Quelque chose est cassé.",
    classe: "border-destructive/50 bg-destructive/5",
  },
};

function quand(iso: string): string {
  const t = Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(t));
}

export function SantePilotage() {
  const [sante, setSante] = useState<Sante | null>(null);
  const [appels, setAppels] = useState<(LigneAppel & { id: string; email: string | null })[] | null>(
    null,
  );
  const [chargement, setChargement] = useState(true);
  // L'horloge est lue APRÈS le montage : sinon l'hydratation casse.
  const [maintenant, setMaintenant] = useState<Date | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    // Les deux appels sont INDÉPENDANTS : l'un qui tombe ne doit pas
    // priver de l'autre. Un écran de santé qui ne s'affiche plus quand
    // quelque chose ne va pas serait une plaisanterie.
    const [s, a] = await Promise.all([
      fetch("/api/admin/pilotage/sante", { cache: "no-store" })
        .then((r) => r.json() as Promise<Sante>)
        .catch(() => ({ ok: false, reason: "unreachable" }) as Sante),
      fetch("/api/admin/webhook-logs?limit=200", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => (j?.ok ? (j.rows as (LigneAppel & { id: string; email: string | null })[]) : null))
        .catch(() => null),
    ]);
    setSante(s);
    setAppels(a);
    setChargement(false);
    setMaintenant(new Date());
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const appelsVerdict = useMemo(
    () => (appels && maintenant ? verdictAppels(appels, maintenant) : null),
    [appels, maintenant],
  );

  const etat = useMemo(
    () =>
      etatSante({
        appels: appelsVerdict,
        sondes: sante?.ok ? (sante.sondes ?? null) : null,
        clesCoherentes: sante?.ok ? (sante.supabase?.coherentes ?? null) : null,
        liaisons: sante?.ok ? (sante.liaisons ?? []) : [],
      }),
    [appelsVerdict, sante],
  );

  // Ce qui demande une action, en premier. Le reste est du contexte.
  const aRegarder = useMemo(
    () =>
      (appels ?? [])
        .filter((r) => {
          const v = readCallVerdict(r);
          return v === "sans-acces" || v === "panne" || v === "palier-a-confirmer";
        })
        .slice(0, 12),
    [appels],
  );

  if (chargement && !sante) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allure = ALLURE[etat.gravite];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Santé des app</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ce qui casse ici ne fait pas de bruit : un chiffre devient faux, ou une donnée
            n&apos;arrive plus. Cette page va le chercher.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void charger()}
          disabled={chargement}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent disabled:opacity-60"
        >
          {chargement ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refaire les contrôles
        </button>
      </div>

      {/* LE VERDICT, ET CE QU'IL Y A À FAIRE. */}
      <section className={`rounded-xl border p-4 ${allure.classe}`}>
        <p className="flex items-center gap-2 text-sm font-medium">
          {etat.gravite === "ok" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : etat.gravite === "casse" ? (
            <ShieldAlert className="h-4 w-4 text-destructive" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          )}
          {allure.titre}
        </p>
        {etat.points.length > 0 && (
          <ul className="mt-2 space-y-1.5 text-sm">
            {etat.points.map((p) => (
              <li key={p} className="flex gap-2">
                <span aria-hidden>-</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
        {etat.gravite === "ok" && (
          <p className="mt-1 text-sm text-muted-foreground">
            Les appels reçus, les liaisons entre app et les tables dont cette console dépend ont
            tous répondu.
          </p>
        )}
      </section>

      {/* LES FONDATIONS : une table absente se corrige avec un fichier. */}
      {sante?.ok && sante.sondes && (
        <section className={`${CARTE} p-4`}>
          <h2 className="text-sm font-medium">Ce dont cette console a besoin</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Une migration en retard ne fait pas d&apos;erreur : elle vide une section, et un
            écran vide se lit &quot;tout va bien&quot;. Le contrôle complet reste{" "}
            <code className="rounded bg-muted px-1">npm run check:migrations-pending</code>.
          </p>
          <ul className="mt-3 divide-y">
            {sante.sondes.map((s) => (
              <li
                key={`${s.base}-${s.table}-${s.colonne ?? ""}`}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-2 text-sm"
              >
                <span className="font-medium">
                  {s.colonne ? `${s.table}.${s.colonne}` : s.table}
                </span>
                <span className="text-xs text-muted-foreground">
                  {s.base === "tiquiz" ? "Supabase Tiquiz" : "Supabase Tipote"}
                </span>
                <span
                  className={`ml-auto text-xs ${
                    s.etat === "ok"
                      ? TONS.ok
                      : s.etat === "absente"
                        ? TONS.alerte
                        : TONS.info
                  }`}
                >
                  {s.etat === "ok" ? "présente" : s.etat === "absente" ? "ABSENTE" : "pas pu lire"}
                </span>
                {s.etat !== "ok" && (
                  <p className="w-full text-xs text-muted-foreground">
                    {s.sansElle}
                    {s.etat === "absente" && (
                      <>
                        {" "}
                        À appliquer : <code className="rounded bg-muted px-1">{s.migration}</code>
                      </>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* LES LIAISONS : un silence rend des chiffres incomplets. */}
      {sante?.ok && sante.liaisons && (
        <section className={`${CARTE} p-4`}>
          <h2 className="text-sm font-medium">Les autres app répondent-elles ?</h2>
          <ul className="mt-2 divide-y">
            {sante.liaisons.map((l) => (
              <li key={l.nom} className="flex flex-wrap items-baseline gap-2 py-2 text-sm">
                <span>{l.nom}</span>
                <span className={`ml-auto text-xs ${l.ok ? TONS.ok : TONS.alerte}`}>
                  {l.ok ? "répond" : "ne répond pas"}
                </span>
                {!l.ok && l.raison && (
                  <span className="w-full text-xs text-muted-foreground">{l.raison}</span>
                )}
              </li>
            ))}
          </ul>
          {/* L'IDENTIFIANT DE PROJET N'EST PAS UN SECRET : il est dans
              l'URL publique, et c'est lui qui rend le diagnostic
              évident. Aucune clé n'est jamais affichée. */}
          {sante.supabase && (
            <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
              Base Supabase de cette app : {sante.supabase.refUrl ?? "inconnue"}
              {sante.supabase.refCle
                ? ` · la clé de service parle de ${sante.supabase.refCle}`
                : ` · la clé de service ne dit pas de quel projet elle parle (${sante.supabase.cleLisible})`}
            </p>
          )}
        </section>
      )}

      {/* LES APPELS REÇUS : de l'argent qui arrive sans ouvrir d'accès. */}
      <section className={`${CARTE} p-4`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">Les paiements et les appels reçus</h2>
          <Link href="/admin" className="text-xs text-primary underline-offset-2 hover:underline">
            Le détail dans Tiquiz
          </Link>
        </div>

        {appels === null ? (
          <p className="mt-2 text-sm text-destructive">
            Les appels reçus n&apos;ont pas pu être lus. On ne sait donc pas si un paiement
            s&apos;est perdu, et ce n&apos;est pas la même chose qu&apos;une absence de
            problème.
          </p>
        ) : aRegarder.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Sur les {appelsVerdict?.lues ?? 0} derniers appels, aucun n&apos;attend une action.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              Sur les {appelsVerdict?.lues ?? 0} derniers appels reçus.
            </p>
            <ul className="mt-2 divide-y">
              {aRegarder.map((r) => {
                const v = readCallVerdict(r);
                const l = LIBELLE_VERDICT[v];
                return (
                  <li key={r.id} className="py-2 text-sm">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium">{r.email ?? "adresse inconnue"}</span>
                      <span className="text-xs text-muted-foreground">{r.eventType}</span>
                      <span className={`ml-auto text-xs ${TONS[l.ton]}`}>{l.mot}</span>
                      <span className="text-xs text-muted-foreground">
                        {quand(r.receivedAt)}
                      </span>
                    </div>
                    {l.aide && <p className="mt-0.5 text-xs text-muted-foreground">{l.aide}</p>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
