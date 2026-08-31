// app/pilotage/affilies/[sa]/page.tsx
//
// LA FICHE D'UN AFFILIÉ : TOUT, ET À UN SEUL ENDROIT.
//
// Béné, 31 août 2026 : "je clique sur l'affilié, je vois combien de
// comptes gratuits il a fait créer, combien il a de clients payants,
// quel est son palier de commission et / ou sa réduction sur l'outil,
// les factures passées, en cours et à venir, son mode de paiement...
// je veux TOUT parce que je ne peux le voir qu'ici et j'ai besoin de
// tout ça."
//
// Le registre vit chez Tipote et nulle part ailleurs : un chiffre
// absent de cette page est un chiffre qu'elle ne peut obtenir qu'en
// ouvrant la base.
//
// -- CE QUI N'EST PAS ICI, ET C'EST VOULU ------------------------------
//
// L'IBAN. On affiche le MASQUE (`FR14••••2606`) et rien d'autre : un
// écran se photographie, se partage, se laisse ouvert (règle du
// 25 août). Elle a besoin de RECONNAÎTRE le compte, pas de le relire.
//
// -- LES SECTIONS TOLÈRENT L'ABSENCE -----------------------------------
//
// Le pilotage et le registre sont deux serveurs déployés séparément.
// Entre les deux déploiements, la fiche répond sans les nouveaux
// champs : chaque section se tait au lieu de faire planter la page.

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
  // GRATUITS = ceux qui n'ont JAMAIS acheté. PAYANTS = ceux qui
  // comptent pour le palier (annulations exclues). Les deux ne sont pas
  // complémentaires : un remboursé n'est ni l'un ni l'autre, et c'est
  // voulu, il ne doit pas gonfler le palier.
  const gratuits = fiche.filleuls.length - fiche.acheteurs;
  const payants = fiche.payants ?? fiche.acheteurs;
  const rembourses = fiche.acheteurs - payants;
  const r = fiche.recompense;
  const v = fiche.versement;
  const argent = fiche.argent;
  const factures = fiche.factures ?? [];

  return (
    <div className="space-y-5">
      <Retour />

      <div>
        <h1 className="text-2xl font-semibold">{a.display_name ?? a.email}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{a.email}</p>
        {/* LE STATUT SE VOIT TOUT DE SUITE. `banned` = rien n'est dû,
            `paused` = ce qui est gagné reste payé (règle du 26 août) :
            les confondre prendrait l'argent de quelqu'un qui n'a rien
            fait. */}
        {a.status && a.status !== "active" && (
          <p className="mt-2 text-sm font-medium">
            {a.status === "banned"
              ? "Exclu du programme. Rien ne lui est dû, et il ne gagne plus rien."
              : a.status === "paused"
                ? "En pause. Il ne gagne plus rien, mais ce qu'il a déjà gagné lui est dû."
                : `Statut : ${a.status}`}
          </p>
        )}
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Chiffre titre="Filleuls" valeur={String(fiche.filleuls.length)} />
        <Chiffre titre="Comptes gratuits" valeur={String(gratuits)} />
        <Chiffre titre="Clients payants" valeur={String(payants)} />
        <Chiffre titre="Lui a rapporté" valeur={euros(total)} />
      </div>

      {/* ── SA RÉCOMPENSE ── */}
      {r && (
        <section className={`${CARTE} p-4`}>
          <p className="text-xs text-muted-foreground">Sa récompense</p>
          {r.choix === "commissions" ? (
            <p className="mt-1 text-sm">
              <span className="text-xl font-semibold tabular-nums">{r.tauxPct} %</span>{" "}
              de commission
              {r.tauxNegocie && " (accord négocié, il passe devant le barème)"}
            </p>
          ) : (
            <p className="mt-1 text-sm">
              <span className="text-xl font-semibold tabular-nums">{r.remisePct} %</span>{" "}
              de remise sur son abonnement, au lieu des commissions
            </p>
          )}
          {/* LES DEUX NE SE CUMULENT PAS : le dire évite de chercher
              l'autre chiffre. */}
          <p className="mt-1 text-xs text-muted-foreground">
            {r.choix === "commissions"
              ? "Il a choisi les commissions. Les deux ne se cumulent pas."
              : "Il a choisi la remise. Il ne touche donc pas de commission."}
          </p>
          {/* LA RÈGLE EST ÉCRITE À L'ÉCRAN, sinon on relit le compteur
              du haut et on croit que les 3 comptes gratuits comptent.
              Béné, 31 août : "client payant = augmente le %, client
              gratuit = aucun impact". */}
          <p className="mt-1 text-xs text-muted-foreground">
            Seuls ses clients PAYANTS font monter le palier ({payants} aujourd&apos;hui).
            {rembourses > 0 &&
              ` ${rembourses} remboursé${rembourses > 1 ? "s" : ""} ne compte${rembourses > 1 ? "nt" : ""} plus.`}
          </p>
          {r.prochaineMarcheManque !== null && r.prochaineMarcheValeur !== null && (
            <p className="mt-2 text-sm">
              Encore {r.prochaineMarcheManque} client
              {r.prochaineMarcheManque > 1 ? "s" : ""} payant
              {r.prochaineMarcheManque > 1 ? "s" : ""} et il passe à {r.prochaineMarcheValeur} %.
            </p>
          )}
        </section>
      )}

      {/* ── L'ARGENT, EN POCHES QUI NE SE RECOUVRENT PAS ── */}
      {argent && (
        <section className={`${CARTE} p-4`}>
          <p className="text-xs text-muted-foreground">Ce qu&apos;on lui doit</p>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <Poche titre="Part au prochain lot" valeur={euros(argent.aVerserCents)} fort />
            <Poche titre="Sous garantie (J+30)" valeur={euros(argent.sousGarantieCents)} />
            <Poche titre="Déjà versé" valeur={euros(argent.verseCents)} />
            {/* L'ANNULÉ S'AFFICHE, il ne se soustrait pas en silence.
                Rien quand il est nul : un zéro permanent ferait croire
                à un problème là où il n'y en a aucun. */}
            {argent.annuleCents > 0 && (
              <Poche titre="Annulé (remboursé, impayé)" valeur={euros(argent.annuleCents)} />
            )}
          </div>
          {argent.autresDevises > 0 && (
            <p className="mt-3 text-sm">
              {argent.autresDevises} commission{argent.autresDevises > 1 ? "s" : ""} dans une autre
              devise. Elles sont écartées des lots : le fichier SEPA est en euros, et convertir à un
              taux inventé donnerait un virement faux qui a l&apos;air juste.
            </p>
          )}
        </section>
      )}

      {/* ── COMMENT ON LE PAIE ── */}
      {v && (
        <section className={`${CARTE} p-4`}>
          <p className="text-xs text-muted-foreground">Comment on le paie</p>
          <p className="mt-1 text-sm">
            {v.methode === "paypal"
              ? `PayPal · ${v.paypalEmail ?? "adresse manquante"}`
              : v.methode === "virement"
                ? `Virement · ${v.ibanMasque ?? "IBAN manquant"}${v.titulaire ? ` · ${v.titulaire}` : ""}`
                : "Il n'a pas encore choisi comment être payé."}
          </p>
          {/* DEVINÉ N'EST PAS CHOISI : sur une ligne historique, on le
              dit au lieu de laisser croire qu'il a tranché. */}
          {v.methode && !v.explicite && (
            <p className="mt-1 text-xs text-muted-foreground">
              Déduit d&apos;une saisie ancienne, il ne l&apos;a pas choisi lui même.
            </p>
          )}
          {v.manques.length > 0 && (
            <p className="mt-2 text-sm">
              Il manque : {v.manques.map((m) => MANQUE[m] ?? m).join(", ")}. Tant que ce n&apos;est
              pas rempli, il est écarté du lot, et son argent reste acquis pour le lot suivant.
            </p>
          )}
        </section>
      )}

      {/* ── SES FACTURES ── */}
      {factures.length > 0 && (
        <section className={`${CARTE} divide-y`}>
          <p className="px-4 py-3 text-xs text-muted-foreground">
            Ses autofactures ({factures.length}). On les écrit à sa place, il n&apos;a rien à nous
            envoyer.
          </p>
          {factures.map((f) => (
            <div key={f.numero} className="flex flex-wrap items-baseline justify-between gap-x-4 px-4 py-2 text-sm">
              <span className="font-medium">
                {f.genre === "avoir" ? "Avoir " : ""}
                {f.numero}
              </span>
              <span className="text-xs text-muted-foreground">
                {f.periode} · émise le {quand(f.emiseLe)} · {f.versee ? "versée" : "en attente de virement"}
              </span>
              <span className="tabular-nums">{euros(f.ttcCents, f.currency)}</span>
            </div>
          ))}
        </section>
      )}

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

/** Le nom lisible de ce qui manque pour être payé. */
const MANQUE: Record<string, string> = {
  methode: "le mode de paiement",
  paypal: "son adresse PayPal",
  iban: "son IBAN",
  mandat: "l'acceptation du mandat d'autofacturation",
  "profil-fiscal": "son profil fiscal (statut, adresse, SIREN)",
};

function Poche({ titre, valeur, fort }: { titre: string; valeur: string; fort?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{titre}</p>
      <p className={`tabular-nums ${fort ? "text-base font-semibold" : ""}`}>{valeur}</p>
    </div>
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
