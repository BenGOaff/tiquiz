"use client";

// components/admin/PilotageCard.tsx
//
// L'ÉCRAN UNIQUE : UNE LIGNE PAR PERSONNE, ET LE BOUTON REMBOURSER.
//
// Béné, 21 août : "tu peux pas centraliser ? Je vois les élèves, leurs
// infos + le bouton rembourser ? Au lieu d'avoir deux écrans... pas
// ouf..." Et le cadre : "que des trucs utiles et rapides à piloter".
//
// -- CE QUI EST DEHORS, ET POURQUOI -----------------------------------
//
// Pas de graphique, pas de jauge, pas de carte de couleur. Un tableau de
// bord qu'on regarde tous les matins doit répondre en une seconde à
// "est-ce que ça monte", "qui part", "qui a payé sans avoir ses accès".
// Tout le reste est de la décoration qui repousse la réponse plus bas
// dans la page.
//
// -- AUCUN CALCUL ICI -------------------------------------------------
//
// Les états, les totaux et la comparaison de mois vivent dans
// `lib/admin/people.ts`, testés. Ce fichier affiche, il ne décide pas.
// Un écran qui recalcule ce que le serveur a déjà calculé finit toujours
// par mentir : c'est vrai six fois dans ce dépôt (les réseaux de
// partage, le score, l'alignement, la disposition des réponses...).

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Loader2,
  MessageSquareQuote,
  Minus,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isAtelierSale } from "@/lib/admin/atelier";
import { buildChurnDigest } from "@/lib/admin/churnDigest";
import type { PeopleTotals, Person, PersonStatus } from "@/lib/admin/people";
import type { Sale } from "@/lib/checkout/sales";

/**
 * Les raisons d'un refus de remboursement, traduites.
 *
 * Le serveur renvoie une RAISON, l'écran sait comment la dire. Et
 * `missing_permission` nomme la correction exacte : sans elle, on
 * chercherait un bug dans le code alors que ça se règle dans Stripe.
 */
const RAISONS_REMBOURSEMENT: Record<string, string> = {
  forbidden: "Tu n'as pas les droits pour rembourser.",
  invalid_body: "Cette vente n'a pas de référence exploitable.",
  not_configured: "La clé de paiement n'est pas posée sur le serveur.",
  missing_permission:
    "Ta clé Stripe n'a pas le droit de rembourser. Dans Stripe, ouvre ta clé restreinte et passe Remboursements en Écriture. Rien n'a été remboursé.",
  provider_refused: "Le fournisseur a refusé le remboursement. Rien n'a été remboursé.",
  network: "La connexion au fournisseur a échoué. Rien n'a été remboursé.",
};

const ETATS: Record<PersonStatus, { label: string; classe: string }> = {
  essai: { label: "Essai", classe: "bg-muted text-muted-foreground" },
  abonne: { label: "Abonné", classe: "bg-emerald-100 text-emerald-800" },
  partant: { label: "Part bientôt", classe: "bg-amber-100 text-amber-900" },
  parti: { label: "Parti", classe: "bg-rose-100 text-rose-900" },
  avie: { label: "À vie", classe: "bg-indigo-100 text-indigo-800" },
  // Elle a paye l'Atelier mais n'a pas de compte Tiquiz. Ce n'est ni un
  // essai ni un prospect : c'est exactement la liste a inviter.
  atelier: { label: "Atelier seul", classe: "bg-sky-100 text-sky-900" },
};

/**
 * Les raisons de départ que Stripe nous renvoie, en français.
 *
 * Elles arrivent en anglais et en majuscules techniques
 * (`too_expensive`). Les afficher telles quelles ferait un tableau que
 * Béné doit décoder ligne par ligne.
 */
const MOTIFS: Record<string, string> = {
  too_expensive: "trop cher",
  missing_features: "il manquait des fonctions",
  switched_service: "parti chez un concurrent",
  unused: "ne s'en servait pas",
  customer_service: "déçu du support",
  too_complex: "trop compliqué",
  low_quality: "qualité insuffisante",
  other: "autre",
};

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    (Number(cents) || 0) / 100,
  );
}

function jour(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" });
  } catch {
    return iso.slice(0, 10);
  }
}

interface Reponse {
  ok?: boolean;
  people?: Person[];
  totals?: PeopleTotals;
  ventesOrphelines?: Sale[];
  tendance?: { moisCents: number; moisPrecedentCents: number; ecartPct: number | null };
  evenementsLus?: number;
  atelier?: { reachable?: boolean; reason?: string | null };
  reason?: string;
}

/**
 * Pourquoi l'Atelier manque, en une phrase actionnable.
 *
 * Le serveur renvoie une RAISON, l'ecran sait comment la dire. Et
 * chacune nomme la correction : sans ca, "l'Atelier est absent" enverrait
 * chercher partout.
 */
const RAISONS_ATELIER: Record<string, string> = {
  not_configured:
    "PARTNER_SHARED_SECRET n'est pas posé sur le serveur Tiquiz.",
  forbidden:
    "Les deux serveurs n'ont pas le même PARTNER_SHARED_SECRET.",
  unreachable: "L'Atelier n'a pas répondu.",
  read_failed: "L'Atelier a répondu une erreur.",
};

export default function PilotageCard() {
  const [data, setData] = useState<Reponse | null>(null);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<PersonStatus | "tous">("tous");
  const [enCours, setEnCours] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch("/api/admin/pilotage");
      const j = (await res.json()) as Reponse;
      setData(j);
      // UN `ok: false` PRODUIT TOUJOURS QUELQUE CHOSE A L'ECRAN.
      if (!j.ok) toast.error("Le tableau de bord n'a pas pu être chargé.");
    } catch {
      setData({ ok: false });
      toast.error("Le tableau de bord n'a pas pu être chargé.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function rembourser(personne: Person, vente: Sale) {
    const somme = euros(vente.amountCents);
    if (
      !window.confirm(
        `Rembourser ${somme} à ${personne.email} ?\n\n` +
          `L'argent repart tout de suite. Si c'est un remboursement TOTAL, son accès repasse en gratuit et elle reçoit un email.`,
      )
    ) {
      return;
    }
    setEnCours(vente.ref);
    try {
      const res = await fetch("/api/admin/ventes/rembourser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: vente.ref, provider: vente.provider }),
      });
      const j = (await res.json()) as { ok?: boolean; reason?: string };
      if (j.ok) {
        toast.success(`${somme} remboursés à ${personne.email}.`);
        await charger();
      } else {
        toast.error(
          RAISONS_REMBOURSEMENT[j.reason ?? ""] ?? "Le remboursement n'a pas pu se faire.",
        );
      }
    } catch {
      toast.error("La connexion a échoué. Rien n'a été remboursé.");
    } finally {
      setEnCours(null);
    }
  }

  const people = data?.people ?? [];
  const totals = data?.totals ?? null;
  const orphelines = data?.ventesOrphelines ?? [];
  const tendance = data?.tendance ?? null;
  // Le tri et les comptes vivent dans lib/, testes. Ici on affiche.
  const departs = buildChurnDigest(people);

  const q = recherche.trim().toLowerCase();
  const visibles = people.filter((p) => {
    if (filtre !== "tous" && p.status !== filtre) return false;
    if (!q) return true;
    return p.email.includes(q) || (p.name ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* ── L'ARGENT, ET S'IL MONTE OU S'IL DESCEND ── */}
      {tendance && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Encaissé ce mois
                </p>
                <p className="text-2xl font-bold">{euros(tendance.moisCents)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Mois précédent
                </p>
                <p className="text-lg font-semibold text-muted-foreground">
                  {euros(tendance.moisPrecedentCents)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                {/* Pas de mois precedent = pas d'ecart. Afficher "+100%"
                    sur un premier mois serait un chiffre invente. */}
                {tendance.ecartPct === null ? (
                  <span className="text-muted-foreground">pas encore de comparaison</span>
                ) : tendance.ecartPct > 0 ? (
                  <span className="flex items-center gap-1 text-emerald-700">
                    <ArrowUpRight className="size-4" /> {tendance.ecartPct}%
                  </span>
                ) : tendance.ecartPct < 0 ? (
                  <span className="flex items-center gap-1 text-rose-700">
                    <ArrowDownRight className="size-4" /> {tendance.ecartPct}%
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Minus className="size-4" /> stable
                  </span>
                )}
              </div>
              {totals && totals.rembourseCents > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Remboursé
                  </p>
                  <p className="text-lg font-semibold">{euros(totals.rembourseCents)}</p>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void charger()}
                disabled={chargement}
                className="ml-auto"
              >
                {chargement ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Rafraîchir
              </Button>
            </div>
            {totals && totals.parProduit.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                {totals.parProduit
                  .map((p) => `${p.productId} : ${p.count} (${euros(p.totalCents)})`)
                  .join("  ·  ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── L'ATELIER MANQUE : ON LE DIT ──
          Regle du 8 juin : on n'affiche pas un total dont le
          denominateur ment. Un chiffre d'affaires ampute de moitie sans
          prevenir vaut moins que pas de chiffre, parce qu'il a l'air
          juste. */}
      {data?.ok && data.atelier && !data.atelier.reachable && (
        <Card className="border-rose-300 bg-rose-50">
          <CardContent className="py-3">
            <p className="flex items-center gap-2 text-sm font-bold text-rose-900">
              <AlertTriangle className="size-4" aria-hidden />
              Les chiffres ci dessous ne comptent PAS l&apos;Atelier
            </p>
            <p className="mt-1 text-xs text-rose-900">
              {RAISONS_ATELIER[data.atelier.reason ?? ""] ??
                "La liaison avec l'Atelier n'a pas abouti."}{" "}
              Les ventes et les élèves de l&apos;Atelier sont donc absents des totaux.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── L'ARGENT EST ENTRE, PERSONNE EN FACE ── */}
      {orphelines.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
              <AlertTriangle className="size-4" aria-hidden />
              {orphelines.length === 1
                ? "Une vente encaissée sans compte en face"
                : `${orphelines.length} ventes encaissées sans compte en face`}
            </p>
            <p className="mt-1 text-xs text-amber-900">
              Ces personnes ont payé et n&apos;apparaissent dans aucun compte. Vérifie leur
              adresse : si elle est juste, ouvre leur l&apos;accès à la main.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-amber-900">
              {orphelines.map((v) => (
                <li key={v.ref} className="flex flex-wrap items-center gap-x-3">
                  <span className="font-semibold">{v.email ?? "adresse inconnue"}</span>
                  <span>{euros(v.amountCents)}</span>
                  <span>{v.provider === "stripe" ? "par carte" : "en PayPal"}</span>
                  <span>le {jour(v.paidAt)}</span>
                  {v.refundedAt && <span className="font-semibold">(remboursée)</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── POURQUOI ELLES PARTENT ──
          "consigner ces reponses pour level up l'outil". Une reponse
          rangee dans une colonne que personne n'ouvre n'existe pas : ce
          bloc est la seule raison d'etre de l'email de depart.
          AUCUN POURCENTAGE : sur trois departs, "67% pour le prix"
          designe deux personnes et se lit comme une tendance (meme
          defaut que le funnel de Jocelyne, 4 aout). */}
      {departs.total > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="flex items-center gap-2 text-sm font-bold">
              <MessageSquareQuote className="size-4" aria-hidden />
              Pourquoi elles partent
            </p>
            {departs.parMotif.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                {departs.parMotif
                  .map((m) => `${MOTIFS[m.motif] ?? m.motif} : ${m.count}`)
                  .join("  ·  ")}
              </p>
            )}
            {departs.voix.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {departs.voix.map((v) => (
                  <li key={`${v.email}-${v.quand ?? ""}`} className="text-sm">
                    <p className="italic">&laquo;&nbsp;{v.texte}&nbsp;&raquo;</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {v.name || v.email}
                      {v.quand && ` · ${jour(v.quand)}`}
                      {v.motif && ` · ${MOTIFS[v.motif] ?? v.motif}`}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Personne n&apos;a encore écrit. L&apos;email part le lendemain de la
                résiliation.
              </p>
            )}
            {departs.sansReponse > 0 && (
              // On BORNE ce que les phrases ci dessus valent. Sans cette
              // ligne, 2 reponses sur 30 departs se lisent comme "voila
              // pourquoi les gens partent".
              <p className="mt-3 text-xs text-muted-foreground">
                {departs.sansReponse === 1
                  ? "1 personne est partie sans rien dire"
                  : `${departs.sansReponse} personnes sont parties sans rien dire`}{" "}
                sur {departs.total} {departs.total === 1 ? "départ" : "départs"}.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── LE FILTRE, ET IL DIT DEJA LES CHIFFRES ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Chercher une adresse ou un nom"
            className="pl-9"
          />
        </div>
        {totals && (
          <div className="flex flex-wrap gap-1.5">
            {([
              ["tous", `Tous ${totals.comptes}`],
              ["abonne", `Abonnés ${totals.abonnes}`],
              ["partant", `Partent ${totals.partants}`],
              ["parti", `Partis ${totals.partis}`],
              ["avie", `À vie ${totals.avie}`],
              ["essai", `Essai ${totals.essai}`],
              ["atelier", `Atelier seul ${totals.atelierSeul}`],
            ] as [PersonStatus | "tous", string][]).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFiltre(id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  filtre === id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── LE TABLEAU ── */}
      <Card>
        <CardContent className="p-0">
          {chargement && people.length === 0 ? (
            <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Chargement...
            </p>
          ) : visibles.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Personne ne correspond.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Personne</th>
                    <th className="px-4 py-2 font-semibold">État</th>
                    <th className="px-4 py-2 font-semibold">Plan</th>
                    <th className="px-4 py-2 font-semibold">Atelier</th>
                    <th className="px-4 py-2 font-semibold">Payé</th>
                    <th className="px-4 py-2 font-semibold">Dernier paiement</th>
                    <th className="px-4 py-2 font-semibold">Activité</th>
                    <th className="px-4 py-2 font-semibold">Rembourser</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((p) => (
                    <tr key={p.email} className="border-b align-top last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-medium">{p.email}</span>
                        {p.name && (
                          <span className="block text-xs text-muted-foreground">{p.name}</span>
                        )}
                        {p.resellerName && (
                          <span className="block text-xs text-muted-foreground">
                            revendeur : {p.resellerName}
                          </span>
                        )}
                        {p.selfServe && (
                          <span
                            className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"
                            title="Peut changer sa carte elle même depuis ses réglages"
                          >
                            <CreditCard className="size-3" /> gère sa carte
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${ETATS[p.status].classe} border-0`}>
                          {ETATS[p.status].label}
                        </Badge>
                        {/* Le POURQUOI du depart, quand on l'a. C'est
                            l'information qui sert a corriger l'outil. */}
                        {p.churn && (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {p.churn.endsAt && !p.churn.endedAt
                              ? `jusqu'au ${jour(p.churn.endsAt)}`
                              : `parti le ${jour(p.churn.endedAt)}`}
                            {p.churn.feedback && (
                              <span className="block">
                                {MOTIFS[p.churn.feedback] ?? p.churn.feedback}
                              </span>
                            )}
                            {p.churn.comment && (
                              <span className="block italic">
                                &laquo;&nbsp;{p.churn.comment}&nbsp;&raquo;
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize">{p.plan}</td>
                      <td className="px-4 py-3 text-xs">
                        {p.atelier ? (
                          <>
                            <span className="font-semibold capitalize">
                              {p.atelier.status === "active" ? "élève" : (p.atelier.status ?? "-")}
                            </span>
                            {p.atelier.tier && (
                              <span className="block text-muted-foreground">{p.atelier.tier}</span>
                            )}
                            <span className="block text-muted-foreground">
                              {p.atelier.daysDone} jour{p.atelier.daysDone > 1 ? "s" : ""} fait
                              {p.atelier.daysDone > 1 ? "s" : ""}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {p.paidCents > 0 ? euros(p.paidCents) : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.lastPaidAt ? (
                          <>
                            {jour(p.lastPaidAt)}
                            <span className="block text-xs">
                              {p.lastProvider === "stripe"
                                ? "carte"
                                : p.lastProvider === "paypal"
                                  ? "PayPal"
                                  : "Systeme.io"}
                            </span>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {p.quizCount} quiz · {p.leadCount} leads
                        <span className="block">vu le {jour(p.lastSignIn)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {p.sales.length === 0 ? (
                          <span className="text-xs text-muted-foreground">aucune vente</span>
                        ) : (
                          <div className="space-y-1">
                            {p.sales.map((v) =>
                              /* UNE VENTE SYSTEME.IO NE SE REMBOURSE PAS
                                 D'ICI : l'argent est chez eux. Afficher
                                 un bouton qui echouerait enverrait Bene
                                 chercher au mauvais endroit. */
                              /* UNE VENTE DE L'ATELIER NE SE REMBOURSE PAS
                                 D'ICI, ET LE PIEGE EST SUBTIL : elle est
                                 sur le MEME compte Stripe, donc l'appel
                                 REUSSIRAIT. Mais seul l'Atelier sait
                                 couper l'acces et envoyer l'email de
                                 depart : on reprendrait l'argent en
                                 laissant l'eleve dedans, sans un mot.
                                 La moitie d'une decision, et on sait ou
                                 ca mene dans ce depot. */
                              isAtelierSale(v.ref) ? (
                                <span key={v.ref} className="block text-xs text-muted-foreground">
                                  {euros(v.amountCents)} du {jour(v.paidAt)}
                                  <span className="block">
                                    {v.refundedAt
                                      ? `remboursée le ${jour(v.refundedAt)}`
                                      : "à rembourser depuis l'Atelier"}
                                  </span>
                                </span>
                              ) : v.provider === "systeme_io" ? (
                                <span key={v.ref} className="block text-xs text-muted-foreground">
                                  {euros(v.amountCents)} du {jour(v.paidAt)}
                                  <span className="block">à rembourser dans Systeme.io</span>
                                </span>
                              ) : v.refundedAt ? (
                                <span
                                  key={v.ref}
                                  className="block text-xs text-muted-foreground"
                                >
                                  {euros(v.amountCents)} remboursés le {jour(v.refundedAt)}
                                </span>
                              ) : (
                                <Button
                                  key={v.ref}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void rembourser(p, v)}
                                  disabled={enCours === v.ref}
                                  className="h-7 text-xs"
                                >
                                  {enCours === v.ref && (
                                    <Loader2 className="size-3 animate-spin" />
                                  )}
                                  {euros(v.amountCents)} du {jour(v.paidAt)}
                                </Button>
                              ),
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ON DIT CE QU'ON LIT, ET SUR QUOI.
          Un tableau de bord qui laisse croire qu'il couvre tout alors
          qu'il lit les 3000 derniers evenements ferait tirer de fausses
          conclusions sur un mois ancien. */}
      <p className="text-xs text-muted-foreground">
        Tiquiz (notre bon de commande, carte et PayPal, ET Systeme.io) sur les{" "}
        {data?.evenementsLus ?? 0} derniers évènements reçus, PLUS l&apos;Atelier lu en direct.
        Les ventes Systeme.io se remboursent chez eux, celles de l&apos;Atelier depuis son
        écran Élèves : lui seul sait couper l&apos;accès et envoyer l&apos;email de départ.
      </p>
    </div>
  );
}
