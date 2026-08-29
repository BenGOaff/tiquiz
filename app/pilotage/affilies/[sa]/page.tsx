// app/pilotage/affilies/[sa]/page.tsx
//
// LA FICHE D'UN AFFILIÉ : qui il a amené, et ce qu'ils ont acheté.

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CARTE } from "@/components/pilotage/carte";
import { lireFicheAffiliee } from "@/lib/pilotage/affilies";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fiche affilié" };

function euros(cents: number, devise = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: devise }).format(cents / 100);
}

function quand(iso: string | null | undefined): string {
  const t = Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return "date inconnue";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "2-digit" })
    .format(new Date(t));
}

const ETAT: Record<string, { mot: string; ton: string }> = {
  versee: { mot: "versée", ton: "text-muted-foreground" },
  "a-verser": { mot: "à verser", ton: "font-medium" },
  "sous-garantie": { mot: "sous garantie", ton: "text-muted-foreground" },
  annulee: { mot: "annulée", ton: "text-muted-foreground line-through" },
};

export default async function FicheAffiliePage({
  params,
}: {
  params: Promise<{ sa: string }>;
}) {
  const { sa } = await params;
  const { fiche, raison } = await lireFicheAffiliee(sa);

  if (!fiche) {
    if (raison === "introuvable") notFound();
    return (
      <div className="space-y-4">
        <Retour />
        <section className={`${CARTE} p-6`}>
          <p className="text-sm font-medium">La fiche n&apos;est pas lisible pour le moment</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {raison === "not_configured"
              ? "PARTNER_SHARED_SECRET n'est pas posée sur ce serveur."
              : raison === "pas-deploye"
                ? "La mise à jour de l'espace affilié n'est pas encore en ligne."
                : "L'espace affilié n'a pas répondu. Réessaie dans un instant."}
          </p>
        </section>
      </div>
    );
  }

  const a = fiche.affilie;
  const total = fiche.filleuls.reduce((s, f) => s + f.gagneCents, 0);

  return (
    <div className="space-y-5">
      <Retour />

      <div>
        <h1 className="text-2xl font-semibold">{a.display_name ?? a.email}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{a.email}</p>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {a.ref ? (
            <code className="rounded bg-card px-2 py-1">?ref={a.ref}</code>
          ) : (
            <span className="font-medium text-amber-700 dark:text-amber-300">
              aucun code public
            </span>
          )}
          <span className="text-muted-foreground">inscrit le {quand(a.created_at)}</span>
          {a.alias.length > 0 && (
            <span className="text-muted-foreground" title={a.alias.join("\n")}>
              {a.alias.length} ancien identifiant{a.alias.length > 1 ? "s" : ""} Systeme.io
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Chiffre titre="Filleuls" valeur={String(fiche.filleuls.length)} />
        <Chiffre titre="Ont acheté" valeur={String(fiche.acheteurs)} />
        <Chiffre titre="Lui a rapporté" valeur={euros(total)} />
      </div>

      {fiche.filleuls.length === 0 ? (
        // LE VIDE PARLE : sans un mot, il se lit "c'est cassé".
        <section className={`${CARTE} p-6`}>
          <p className="text-sm font-medium">Il n&apos;a encore amené personne.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {a.ref
              ? "Ses clics n'ont pas encore donné d'inscription."
              : "Et sans code public, aucun de ses liens ne peut le désigner : c'est peut-être la cause."}
          </p>
        </section>
      ) : (
        <section className={`${CARTE} divide-y`}>
          {fiche.filleuls.map((f) => (
            <div key={f.email} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <Link
                  href={`/pilotage/clients/${encodeURIComponent(f.email)}`}
                  className="min-w-0 truncate text-sm font-medium hover:underline"
                >
                  {f.email}
                </Link>
                <span className="shrink-0 text-sm tabular-nums">
                  {f.gagneCents > 0 ? euros(f.gagneCents) : ""}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                arrivé le {quand(f.arriveLe)}
                {f.achats.length === 0 && " · rien acheté pour l'instant"}
              </p>
              {f.achats.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {f.achats.map((achat, i) => (
                    <li
                      key={`${achat.le}-${i}`}
                      className={`text-xs ${ETAT[achat.etat]?.ton ?? ""}`}
                    >
                      {achat.produit ?? "produit inconnu"} · {quand(achat.le)} ·{" "}
                      {euros(achat.commissionCents, achat.devise)} ·{" "}
                      {ETAT[achat.etat]?.mot ?? achat.etat}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Retour() {
  // LA FLÈCHE REMONTE LA HIÉRARCHIE, jamais l'historique.
  return (
    <Link
      href="/pilotage/affilies"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Affiliés
    </Link>
  );
}

function Chiffre({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <div className={`${CARTE} p-4`}>
      <p className="text-xs text-muted-foreground">{titre}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{valeur}</p>
    </div>
  );
}
