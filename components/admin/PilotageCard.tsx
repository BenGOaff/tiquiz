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
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
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
import { NOM_PRODUIT } from "@/lib/admin/saleProduct";
import { buildChurnDigest } from "@/lib/admin/churnDigest";
import { buildMoisOffertDigest } from "@/lib/admin/moisOffertDigest";
import { readClientKind, type ClientKind, type PeopleTotals, type Person, type PersonStatus } from "@/lib/admin/people";
import type { Sale } from "@/lib/checkout/sales";

/**
 * Le motif, dit en clair.
 *
 * Le serveur renvoie la RAISON, l'écran dit comment la dire : même règle
 * que la suppression d'un quiz (3 août) et que l'import PDF (7 août).
 */
const MOTIF_MOIS_OFFERT: Record<string, string> = {
  deja_recu: "en avait déjà eu un",
  meme_ip: "même connexion que le lien",
};

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

/**
 * CHEZ QUOI ELLE EST CLIENTE, EN UN COUP D'OEIL.
 *
 * Béné, 22 août : "s'il est client Tiquiz ou Atelier ou les deux". La
 * décision vit dans `readClientKind`, testée ; ici il n'y a que le mot
 * et la couleur.
 */
const CLIENTS: Record<ClientKind, { label: string; classe: string }> = {
  tiquiz: { label: "Tiquiz", classe: "bg-emerald-100 text-emerald-800" },
  atelier: { label: "Atelier", classe: "bg-sky-100 text-sky-900" },
  "les-deux": { label: "Tiquiz + Atelier", classe: "bg-indigo-100 text-indigo-800" },
  aucun: { label: "Gratuit", classe: "bg-muted text-muted-foreground" },
};

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    (Number(cents) || 0) / 100,
  );
}

/**
 * Le montant d'une vente, ET D'OÙ IL VIENT.
 *
 * Systeme.io ne nous transmet pas le prix payé là où on le lit :
 * afficher `0,00 €` sur une vente bien réelle est un mensonge, et c'est
 * pire qu'un trou parce que ça a l'air juste (règle du 8 juin).
 *
 * On affiche donc le tarif du plan quand on ne l'a que par là, avec le
 * `~` et la mention : c'est un ordre de grandeur, pas la somme encaissée
 * (il y a 54 codes de réduction actifs dans son compte).
 */
function montant(v: Sale): string {
  if (v.amountSource === "payload") return euros(v.amountCents);
  if (v.amountSource === "plan") return `~ ${euros(v.amountCents)}`;
  return "montant inconnu";
}

/**
 * LES VENTES QU'ON PEUT VRAIMENT REMBOURSER D'ICI.
 *
 * Ni Systeme.io (l'argent est chez eux), ni l'Atelier (même compte
 * Stripe, donc l'appel réussirait, mais seul l'Atelier sait couper
 * l'accès et envoyer l'email de départ), ni ce qui est déjà remboursé.
 *
 * La liste vit ici et pas dans le JSX : le bouton s'affiche à DEUX
 * endroits maintenant (la ligne fermée et le tiroir), et deux endroits
 * qui recalculent la même règle finissent toujours par diverger.
 */
function remboursables(p: Person): Sale[] {
  return p.sales.filter(
    (v) => !v.refundedAt && v.provider !== "systeme_io" && !isAtelierSale(v.ref),
  );
}

/**
 * OU SE REMBOURSE L'ARGENT DE CETTE PERSONNE.
 *
 * Bene, 22 aout : "il est ou le fucking bouton rembourser ??"
 *
 * Il n'y en avait pas, et il ne POUVAIT pas y en avoir : toutes ses
 * ventes d'aujourd'hui passent par Systeme.io, qui encaisse et qui garde
 * l'argent. Le bouton n'existe que sur nos propres encaissements, et il
 * n'y en a encore aucun.
 *
 * Mais un bouton absent sans un mot se lit comme un bug, et elle a passe
 * du temps a le chercher. La ligne dit donc OU aller, meme quand il n'y
 * a rien a cliquer ici. Regle du 3 aout : un refus n'est pas une panne,
 * mais il doit produire quelque chose a l'ecran.
 */
function ouRembourser(p: Person): string {
  if (remboursables(p).length > 0) return "remboursable ici";
  const restantes = p.sales.filter((v) => !v.refundedAt);
  if (restantes.length === 0) return "tout est rembourse";
  if (restantes.some((v) => isAtelierSale(v.ref))) return "a rembourser depuis l'Atelier";
  return "a rembourser dans Systeme.io";
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
/**
 * Pourquoi l'ecran n'a rien pu charger, en une phrase actionnable.
 *
 * Chacune nomme OU regarder. "Erreur" tout court laisse devant un mur,
 * et un ecran a zero se lit comme "tu n'as aucun client".
 */
const RAISONS_PANNE: Record<string, string> = {
  forbidden:
    "Ton compte n'est pas reconnu comme administrateur. Reconnecte toi, et si ça persiste ton adresse doit être ajoutée à la liste des admins du serveur.",
  read_failed:
    "La base de données n'a pas répondu. Le plus souvent : la clé de service du serveur n'est plus valable.",
  network: "La connexion a coupé avant la réponse. Réessaie.",
  unknown: "Le serveur a refusé sans dire pourquoi. Regarde le journal du serveur.",
};

const RAISONS_ATELIER: Record<string, string> = {
  not_configured:
    "PARTNER_SHARED_SECRET n'est pas posé sur le serveur Tiquiz.",
  forbidden:
    "Les deux serveurs n'ont pas le même PARTNER_SHARED_SECRET.",
  unreachable: "L'Atelier n'a pas répondu.",
  read_failed: "L'Atelier a répondu une erreur.",
};

/**
 * Ce que cette carte montre.
 *
 * Bene, 22 aout : "Fais moi un systeme d'onglets : clients actuels /
 * mes ventes / mes affilies." Les DEUX vues lisent la meme reponse du
 * serveur : separer les donnees en deux appels donnerait deux totaux qui
 * finiraient par se contredire.
 */
export type VuePilotage = "clients" | "ventes";

export default function PilotageCard({ vue }: { vue: VuePilotage }) {
  const [data, setData] = useState<Reponse | null>(null);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<PersonStatus | "tous">("tous");
  const [enCours, setEnCours] = useState<string | null>(null);
  /** Renseigne quand le serveur n'a pas pu repondre. Reste a l'ecran. */
  const [panne, setPanne] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch("/api/admin/pilotage");
      const j = (await res.json()) as Reponse;
      setData(j);
      // UN `ok: false` PRODUIT TOUJOURS QUELQUE CHOSE A L'ECRAN, et un
      // toast ne suffit PAS : il disparait, et il reste un ecran a zero
      // qui ressemble a "tu n'as aucun client". Bene, 22 aout : "je n'ai
      // plus AUCUNE info sur mes users". L'ecran doit rester marque.
      if (!j.ok) {
        setPanne(j.reason ?? (res.status === 403 ? "forbidden" : "unknown"));
        toast.error("Le tableau de bord n'a pas pu être chargé.");
      } else {
        setPanne(null);
      }
    } catch {
      setData({ ok: false });
      setPanne("network");
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
  const moisOfferts = buildMoisOffertDigest(people);

  const q = recherche.trim().toLowerCase();
  const visibles = people.filter((p) => {
    if (filtre !== "tous" && p.status !== filtre) return false;
    if (!q) return true;
    return p.email.includes(q) || (p.name ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* ── LE SERVEUR N'A PAS REPONDU : ON LE DIT, ET CA RESTE ──
          Un ecran a zero ressemble a "tu n'as aucun client". Bene,
          22 aout : "je n'ai plus AUCUNE info sur mes users". Un toast
          disparait ; ce bandeau reste. */}
      {panne && (
        <Card className="border-rose-300 bg-rose-50">
          <CardContent className="py-3">
            <p className="flex items-center gap-2 text-sm font-bold text-rose-900">
              <AlertTriangle className="size-4" aria-hidden />
              Rien n&apos;a pu être chargé. Les zéros ci dessous ne veulent RIEN dire.
            </p>
            <p className="mt-1 text-xs text-rose-900">
              {RAISONS_PANNE[panne] ?? `Le serveur a répondu : ${panne}.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── L'ARGENT, ET S'IL MONTE OU S'IL DESCEND ── */}
      {vue === "ventes" && tendance && (
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
            {/* TIQUIZ ET L'ATELIER, SEPARES.
                Bene, 22 aout : "je vois mal les differences entre Tiquiz
                et l'Atelier, partout". Un abonnement a 17 EUR et une
                formation a 47 EUR dans la meme ligne ne veulent rien
                dire, ni en nombre ni en total. */}
            {totals && totals.parProduitVendu.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {totals.parProduitVendu.map((p) => (
                  <div key={p.produit} className="rounded-lg border px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {NOM_PRODUIT[p.produit]}
                    </p>
                    <p className="text-lg font-bold">{euros(p.totalCents)}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.ventes} vente{p.ventes > 1 ? "s" : ""}
                      {p.estimees > 0 ? `, dont ${p.estimees} au tarif du plan` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {totals && totals.parProduit.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                {totals.parProduit
                  .map((p) =>
                    // Un montant a zero sur une vente REELLE est un
                    // mensonge : on dit qu'on ne l'a pas, on ne
                    // l'invente pas et on ne l'additionne pas.
                    p.sansMontant >= p.count
                      ? `${p.productId} : ${p.count} (montant encaissé non transmis)`
                      : `${p.productId} : ${p.count} (${euros(p.totalCents)})`,
                  )
                  .join("  ·  ")}
              </p>
            )}
            {/* LE TOTAL DIT CE QU'IL NE SAIT PAS.
                Systeme.io ne nous transmet pas le prix paye a un endroit
                qu'on sache lire : ces ventes comptent pour 0 dans
                "Encaisse ce mois". Sans cette phrase, l'ecran annonce
                zero euro sur un mois ou l'argent est bien rentre, et il
                a l'air de marcher. */}
            {/* CE QUE LE TOTAL CONTIENT, EN UNE PHRASE.
                Ces montants COMPTENT (decision Bene du 22 aout) : on dit
                juste combien viennent du tarif du plan, pour qu'un ecart
                avec sa banque ne reste pas mysterieux. */}
            {totals && totals.ventesEstimees > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Dont {totals.ventesEstimees} vente{totals.ventesEstimees > 1 ? "s" : ""} chiffrée
                {totals.ventesEstimees > 1 ? "s" : ""} au tarif du plan : Systeme.io ne nous
                transmet pas la somme exacte, une remise éventuelle n&apos;est donc pas déduite.
              </p>
            )}
            {totals && totals.ventesSansMontant > 0 && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {totals.ventesSansMontant} vente{totals.ventesSansMontant > 1 ? "s" : ""} sur un
                  produit qu&apos;on ne reconnaît pas : ni son montant ni son palier ne sont
                  connus, elle{totals.ventesSansMontant > 1 ? "s ne comptent" : " ne compte"} pas
                  dans le total.
                </span>
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
      {vue === "ventes" && orphelines.length > 0 && (
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
      {vue === "clients" && departs.total > 0 && (
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

      {/* ── LES MOIS OFFERTS ──
          Bene, 23 aout : "il faut aussi tracker les tricheurs qui veulent
          s'autoaffilier". Deux cas echappent au moteur par construction
          (adresse inconnue avant le paiement sur le formulaire carte, IP
          partagee volontairement acceptee) : ils remontent ICI, sinon la
          promesse ne tient pas. On ne reprend rien, on montre.
          La carte n'apparait qu'a partir du premier mois offert : un
          "0 mois offert" permanent serait du bruit. */}
      {vue === "clients" && moisOfferts.total > 0 && (
        <Card className={moisOfferts.aRegarder.length > 0 ? "border-amber-300 bg-amber-50" : ""}>
          <CardContent className="py-3">
            <p className="text-sm font-semibold">
              {moisOfferts.total === 1 ? "1 mois offert" : `${moisOfferts.total} mois offerts`}
              {moisOfferts.aRegarder.length > 0
                ? ` , dont ${moisOfferts.aRegarder.length} à regarder`
                : ""}
            </p>
            {moisOfferts.aRegarder.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Rien de suspect pour l&apos;instant.
              </p>
            ) : (
              <ul className="mt-2 space-y-1 text-xs">
                {moisOfferts.aRegarder.map((l) => (
                  <li key={l.email} className="flex flex-wrap items-baseline gap-x-2">
                    <a
                      href={`/admin/clients/${encodeURIComponent(l.email)}`}
                      className="font-semibold underline"
                    >
                      {l.name ?? l.email}
                    </a>
                    <span className="text-muted-foreground">
                      {MOTIF_MOIS_OFFERT[l.flag ?? ""] ?? l.flag}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── LE FILTRE ET LE TABLEAU : c'est l'onglet Clients ── */}
      {vue === "clients" && (
      <>
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
                    <th className="px-4 py-2 font-semibold">Cliente chez</th>
                    <th className="px-4 py-2 font-semibold">État</th>
                    <th className="px-4 py-2 font-semibold">Plan</th>
                    <th className="px-4 py-2 font-semibold">Payé</th>
                    <th className="px-4 py-2 font-semibold">Activité</th>
                    <th className="px-4 py-2 font-semibold">
                      <span className="sr-only">Sa fiche</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((p) => {
                    const chez = readClientKind(p);
                    return (
                        /* ── UNE LIGNE PAR PERSONNE, ET RIEN DE PLUS ──
                           Bene, 22 aout : "Tu trouves ca pratique ?
                           lisible ? facile a utiliser ? Quand j'aurai
                           200000 clients, je fais comment ?"
                           Le tiroir servait a regarder, pas a
                           travailler. Tout ce qu'on FAIT sur une
                           personne vit desormais sur sa fiche. */
                        <tr key={p.email} className="border-b align-top last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <span className="font-medium">{p.email}</span>
                            {p.name && (
                              <span className="block text-xs text-muted-foreground">{p.name}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`${CLIENTS[chez].classe} border-0`}>
                              {CLIENTS[chez].label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`${ETATS[p.status].classe} border-0`}>
                              {ETATS[p.status].label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 capitalize">{p.plan}</td>
                          <td className="px-4 py-3">
                            {/* OU EST L'ARGENT, DIT SUR LA LIGNE.
                                Bene, 22 aout : "il est ou le fucking
                                bouton rembourser ??" Il n'y en avait pas,
                                et il ne pouvait pas y en avoir : toutes
                                ses ventes passent par Systeme.io, qui
                                garde l'argent. Un bouton absent sans
                                explication se lit comme un bug. */}
                            <span className="font-semibold">
                              {p.paidCents > 0 ? euros(p.paidCents) : "-"}
                            </span>
                            {p.sales.length > 0 && (
                              <span className="block text-xs text-muted-foreground">
                                {ouRembourser(p)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {p.quizCount} quiz · {p.leadCount} leads
                            <span className="block">vu le {jour(p.lastSignIn)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {/* LE BOUTON REMBOURSER RESTE VISIBLE SANS DEPLIER.
                                Bene, 22 aout : "sauf erreur de ma part je
                                n'ai plus de bouton pour rembourser un
                                client ?" Il etait bien la, dans le tiroir,
                                et c'est exactement le probleme : une action
                                qu'on doit chercher n'existe pas. */}
                            {remboursables(p).map((v) => (
                              <Button
                                key={v.ref}
                                variant="outline"
                                size="sm"
                                onClick={() => void rembourser(p, v)}
                                disabled={enCours === v.ref}
                                className="mb-1 mr-2 h-7 text-xs"
                              >
                                {enCours === v.ref && <Loader2 className="size-3 animate-spin" />}
                                Rembourser {montant(v)}
                              </Button>
                            ))}
                            <Link
                              href={`/admin/clients/${encodeURIComponent(p.email)}`}
                              className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold hover:bg-muted"
                            >
                              Sa fiche <ChevronRight className="size-3.5" />
                            </Link>
                          </td>
                        </tr>
                    );
                  })}
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
      </>
      )}
    </div>
  );
}