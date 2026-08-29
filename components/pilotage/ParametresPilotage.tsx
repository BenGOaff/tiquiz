"use client";

// components/pilotage/ParametresPilotage.tsx
//
// CE QUI FAIT TOURNER LES APP ET CIRCULER L'ARGENT (Béné, 29 août 2026).
//
// -- ON DIT SI C'EST POSÉ, JAMAIS CE QUE ÇA CONTIENT -------------------
//
// Un écran se photographie, se partage, se laisse ouvert. Le serveur ne
// renvoie déjà aucune valeur secrète (`lireReglages`, et un test
// l'exige) : cet écran ne pourrait donc pas en afficher même s'il
// essayait. C'est voulu dans cet ordre.
//
// -- ET LES CONTRADICTIONS PASSENT DEVANT LA LISTE ---------------------
//
// Une variable absente se voit dans un tableau. Une combinaison qui a
// l'air complète et qui ne peut pas marcher, non : une clé Stripe
// secrète sans clé publiable ouvre le bon de commande et laisse le
// formulaire vide. Ça ne se découvre qu'à la première vente perdue.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";

import { CARTE } from "@/components/pilotage/carte";
import { comptePannes, type EtatCle, type ResultatCle } from "@/lib/pilotage/sondesCles";
import {
  NOM_GROUPE,
  type EtatReglage,
  type Groupe,
  type Mode,
  type Contradiction,
} from "@/lib/pilotage/parametres";

interface Reponse {
  ok?: boolean;
  cles?: ResultatCle[];
  reglages?: EtatReglage[];
  contradictions?: Contradiction[];
  stripe?: Mode;
  paypal?: Mode;
  supabase?: { refUrl: string | null; refCle: string | null; cleLisible: string };
  reason?: string;
}

const MOT_MODE: Record<Mode, string> = {
  reel: "en RÉEL",
  test: "en test",
  absent: "pas configuré",
  illisible: "mode illisible",
};

const ORDRE_GROUPES: Groupe[] = [
  "base",
  "paiement",
  "emails",
  "systeme-io",
  "liaisons",
  "fichiers",
];

export function ParametresPilotage() {
  const [data, setData] = useState<Reponse | null>(null);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch("/api/admin/pilotage/parametres", { cache: "no-store" });
      setData((await res.json()) as Reponse);
    } catch {
      setData({ ok: false, reason: "unreachable" });
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (chargement && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const reglages = data?.reglages ?? [];
  const soucis = data?.contradictions ?? [];
  const cles = data?.cles ?? [];
  const refusees = comptePannes(cles);
  const manquantsRequis = reglages.filter((r) => r.requis && !r.pose);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Paramètres</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ce que ce serveur a vraiment sous la main, en ce moment. On dit si une clé est
            posée, jamais ce qu&apos;elle contient.
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
          Relire
        </button>
      </div>

      {!data?.ok && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Les réglages n&apos;ont pas pu être lus.
          {data?.reason === "forbidden"
            ? " Ton compte n'est pas reconnu comme administrateur."
            : " Le serveur n'a pas répondu."}
        </p>
      )}

      {/* LES CONTRADICTIONS D'ABORD : elles coûtent des ventes. */}
      {data?.ok && (soucis.length > 0 || manquantsRequis.length > 0 || refusees > 0) && (
        <section className="rounded-xl border border-destructive/50 bg-destructive/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {soucis.length + manquantsRequis.length + refusees} chose
            {soucis.length + manquantsRequis.length + refusees > 1 ? "s" : ""} à corriger
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {manquantsRequis.map((r) => (
              <li key={r.nom} className="flex gap-2">
                <span aria-hidden>-</span>
                <span>
                  <code className="rounded bg-muted px-1">{r.nom}</code> est absente. {r.sansElle}
                </span>
              </li>
            ))}
            {soucis.map((c) => (
              <li key={c.cle} className="flex gap-2">
                <span aria-hidden>-</span>
                <span>{c.texte}</span>
              </li>
            ))}
            {cles
              .filter((c) => c.etat === "refusee")
              .map((c) => (
                <li key={c.variable} className="flex gap-2">
                  <span aria-hidden>-</span>
                  <span>{c.detail}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {data?.ok && soucis.length === 0 && manquantsRequis.length === 0 && refusees === 0 && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Rien d&apos;incohérent, et toutes les clés testées répondent.
        </p>
      )}

      {/* EST-CE QUE LES CLÉS MARCHENT. C'est la seule chose qu'un grep
          dans le .env ne dit pas, et c'est celle qui a coûté une
          journée le 22 août et un client le 7 août. */}
      {data?.ok && cles.length > 0 && (
        <section className={`${CARTE} p-4`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">Est-ce que ça répond ?</h2>
            <span className="text-xs text-muted-foreground">
              Testé à l&apos;instant, en lecture seule : rien n&apos;est créé, rien n&apos;est
              envoyé, rien n&apos;est facturé.
            </span>
          </div>
          <ul className="mt-3 divide-y">
            {cles.map((c) => (
              <li key={c.variable} className="py-2.5">
                <div className="flex flex-wrap items-baseline gap-2 text-sm">
                  <PastilleCle etat={c.etat} />
                  <span className="font-medium">{c.service}</span>
                  <code className="rounded bg-muted px-1 text-[11px] text-muted-foreground">
                    {c.variable}
                  </code>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* LES MODES : ce sont eux qui disent si on encaisse pour de vrai. */}
      {data?.ok && (
        <section className={`${CARTE} p-4`}>
          <h2 className="text-sm font-medium">Les paiements tournent en</h2>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>
              Stripe :{" "}
              <span className={data.stripe === "reel" ? "font-medium" : "text-muted-foreground"}>
                {MOT_MODE[data.stripe ?? "absent"]}
              </span>
            </span>
            <span>
              PayPal :{" "}
              <span className={data.paypal === "reel" ? "font-medium" : "text-muted-foreground"}>
                {MOT_MODE[data.paypal ?? "absent"]}
              </span>
            </span>
          </div>
          {data.supabase && (
            <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
              Base Supabase : {data.supabase.refUrl ?? "inconnue"}
              {data.supabase.refCle
                ? ` · la clé de service parle de ${data.supabase.refCle}`
                : ` · la clé de service ne dit pas de quel projet elle parle (${data.supabase.cleLisible})`}
              .{" "}
              <Link href="/pilotage/sante" className="text-primary underline-offset-2 hover:underline">
                Les contrôles complets sont dans Santé des app
              </Link>
              .
            </p>
          )}
        </section>
      )}

      {/* L'INVENTAIRE, groupe par groupe. */}
      {data?.ok &&
        ORDRE_GROUPES.map((g) => {
          const dedans = reglages.filter((r) => r.groupe === g);
          if (dedans.length === 0) return null;
          return (
            <section key={g} className={`${CARTE} p-4`}>
              <h2 className="text-sm font-medium">{NOM_GROUPE[g]}</h2>
              <ul className="mt-2 divide-y">
                {dedans.map((r) => (
                  <li key={r.nom} className="py-2">
                    <div className="flex flex-wrap items-baseline gap-2 text-sm">
                      <code className="rounded bg-muted px-1 text-xs">{r.nom}</code>
                      <span
                        className={`ml-auto text-xs ${
                          r.pose
                            ? "text-emerald-700 dark:text-emerald-400"
                            : r.requis
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }`}
                      >
                        {r.pose ? "posée" : r.requis ? "ABSENTE" : "absente"}
                      </span>
                    </div>
                    {/* La valeur n'apparaît que quand ce n'est pas un
                        secret : une adresse, un identifiant. */}
                    {r.valeur && (
                      <p className="mt-0.5 break-all text-xs text-muted-foreground">{r.valeur}</p>
                    )}
                    {!r.pose && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{r.sansElle}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

      {/* COMMENT ON POSE UNE VALEUR. Écrit UNE fois, avec les commandes
          exactes : une clé Supabase ou une clé publiable ne peut pas se
          changer depuis un écran (l'app en a besoin pour démarrer, et
          les NEXT_PUBLIC_ sont gravées au build), donc la seule chose
          utile est de ne pas la faire chercher. */}
      {data?.ok && manquantsRequis.length + soucis.length + refusees > 0 && (
        <section className={`${CARTE} p-4`}>
          <h2 className="text-sm font-medium">Poser une valeur sur le serveur</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ces clés ne peuvent pas se changer depuis un écran : l&apos;app en a besoin pour
            démarrer, et celles en <code className="rounded bg-muted px-1">NEXT_PUBLIC_</code>{" "}
            sont gravées au moment du build. Sur le serveur, dans{" "}
            <code className="rounded bg-muted px-1">~/tiquiz-app/.env</code> (et pas{" "}
            <code className="rounded bg-muted px-1">.env.local</code>, qui est une convention de
            développement).
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
            <code>{"nano ~/tiquiz-app/.env"}</code>
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            Puis, depuis <code className="rounded bg-muted px-1">~/tiquiz-app</code>, en UNE
            seule commande : sans le <code className="rounded bg-muted px-1">&amp;&amp;</code>,
            un build refusé se déploierait quand même, et c&apos;est exactement ce qui a mis
            Tipote par terre le 22 août.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
            <code>{"npm run build && pm2 restart tiquiz-prod --update-env"}</code>
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            Ne jamais faire <code className="rounded bg-muted px-1">set -a; . .env; set +a</code>{" "}
            dans le terminal pour lire une valeur : ça exporte tout le fichier dans le shell, et
            c&apos;est comme ça que les deux app ont servi la base l&apos;une de l&apos;autre
            pendant une journée. Entre parenthèses, tout meurt avec le sous-shell :{" "}
            <code className="rounded bg-muted px-1">( set -a; . .env; set +a; echo ok )</code>.
          </p>
        </section>
      )}

      {/* CE QUE CET ÉCRAN NE PEUT PAS VOIR, ET IL LE DIT. */}
      {data?.ok && (
        <section className={`${CARTE} p-4`}>
          <h2 className="text-sm font-medium">Ce que cette page ne voit pas</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>
              Les réglages des deux autres app : chaque serveur a son propre fichier, et aucun ne
              peut lire celui de l&apos;autre. Ce qui se vérifie d&apos;ici, c&apos;est que la
              liaison RÉPOND, et c&apos;est dans{" "}
              <Link
                href="/pilotage/sante"
                className="text-primary underline-offset-2 hover:underline"
              >
                Santé des app
              </Link>
              .
            </li>
            <li>
              Les valeurs elles mêmes. Pour comparer un secret entre deux serveurs :{" "}
              <code className="rounded bg-muted px-1">npm run check:prod</code>, sur la machine.
            </li>
            <li>
              Ta clé Systeme.io et tes préférences de compte vivent dans{" "}
              <Link href="/settings" className="text-primary underline-offset-2 hover:underline">
                les réglages de Tiquiz
              </Link>
              , parce qu&apos;elles t&apos;appartiennent et ne font pas tourner le serveur.
            </li>
          </ul>
        </section>
      )}
    </div>
  );
}

function PastilleCle({ etat }: { etat: EtatCle }) {
  if (etat === "ok") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" /> répond
      </span>
    );
  }
  if (etat === "refusee") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
        <XCircle className="h-3.5 w-3.5" /> refusée
      </span>
    );
  }
  if (etat === "injoignable") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5" /> pas de réponse
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">pas configurée</span>;
}
