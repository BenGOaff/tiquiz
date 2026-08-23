"use client";

// components/admin/ClientFiche.tsx
//
// TOUT CE QU'ON SAIT D'UNE PERSONNE, ET TOUT CE QU'ON PEUT LUI FAIRE.
//
// Béné, 22 août : "Retrouver toutes ses infos, pouvoir mettre à jour ses
// infos, le rembourser, savoir d'où il vient, ce qu'il a comme accès, ce
// qu'il a payé etc ?"
//
// -- AUCUN CALCUL ICI --------------------------------------------------
//
// L'état, le rattachement des ventes et la provenance viennent du
// serveur, qui les calcule avec les MÊMES fonctions que la liste. Une
// fiche qui recalcule finirait par afficher "Abonné" là où le tableau
// dit "Part bientôt", et on sait où ça mène : c'est le défaut qui est
// sorti sept fois dans ce dépôt.
//
// -- CE QUI EST MODIFIABLE, ET PAR QUEL CHEMIN -------------------------
//
// Le nom passe par `/api/admin/clients/<email>`. Le palier, le lien de
// connexion et la suppression passent par `/api/admin/users`, qui les
// fait déjà. Deux chemins pour la même action finissent toujours par
// diverger.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarX,
  CreditCard,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SupportCard from "@/components/admin/SupportCard";
import { Input } from "@/components/ui/input";
import { isAtelierSale } from "@/lib/admin/atelier";
import { readClientKind, type ClientKind, type Person } from "@/lib/admin/people";
import type { Provenance } from "@/lib/admin/provenance";
import { NOM_PRODUIT, readSaleProduct } from "@/lib/admin/saleProduct";
import type { Sale } from "@/lib/checkout/sales";

const CLIENTS: Record<ClientKind, { label: string; classe: string }> = {
  tiquiz: { label: "Tiquiz", classe: "bg-emerald-100 text-emerald-800" },
  atelier: { label: "Atelier", classe: "bg-sky-100 text-sky-900" },
  "les-deux": { label: "Tiquiz + Atelier", classe: "bg-indigo-100 text-indigo-800" },
  aucun: { label: "Gratuit", classe: "bg-muted text-muted-foreground" },
};

const ETATS: Record<string, { label: string; classe: string }> = {
  essai: { label: "Essai", classe: "bg-muted text-muted-foreground" },
  abonne: { label: "Abonné", classe: "bg-emerald-100 text-emerald-800" },
  partant: { label: "Part bientôt", classe: "bg-amber-100 text-amber-900" },
  parti: { label: "Parti", classe: "bg-rose-100 text-rose-900" },
  avie: { label: "À vie", classe: "bg-indigo-100 text-indigo-800" },
  atelier: { label: "Atelier seul", classe: "bg-sky-100 text-sky-900" },
};

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

const RAISONS_REMBOURSEMENT: Record<string, string> = {
  forbidden: "Tu n'as pas les droits pour rembourser.",
  invalid_body: "Cette vente n'a pas de référence exploitable.",
  not_configured: "La clé de paiement n'est pas posée sur le serveur.",
  missing_permission:
    "Ta clé Stripe n'a pas le droit de rembourser. Dans Stripe, ouvre ta clé restreinte et passe Remboursements en Écriture. Rien n'a été remboursé.",
  provider_refused: "Le fournisseur a refusé le remboursement. Rien n'a été remboursé.",
  network: "La connexion au fournisseur a échoué. Rien n'a été remboursé.",
};

/** Ce que le serveur refuse, dit en une phrase exploitable. */
const RAISONS_ABONNEMENT: Record<string, string> = {
  forbidden: "Tu n'as pas les droits pour arrêter un abonnement.",
  invalid_body: "Cette adresse n'est pas exploitable.",
  already_free: "Ce compte est déjà en gratuit : il n'y a aucun abonnement à arrêter.",
  lifetime_plan: "Ce palier est à vie, il n'y a pas d'abonnement derrière.",
  not_configured: "La clé de paiement n'est pas posée sur le serveur.",
  missing_permission:
    "Ta clé Stripe n'a pas le droit d'arrêter un abonnement. Dans Stripe, ouvre ta clé restreinte et passe Abonnements en Écriture. Rien n'a été arrêté.",
  provider_refused: "Stripe a refusé l'annulation. Rien n'a été arrêté.",
  sio_unreachable: "Systeme.io n'est pas joignable. Rien n'a été arrêté, réessaie.",
  network: "La connexion a échoué. Rien n'a été arrêté.",
  unreadable:
    "Impossible de vérifier ses abonnements, donc rien n'a été touché : mieux vaut ça qu'un accès coupé pendant que le prélèvement continue.",
};

const RAISONS_PAGE: Record<string, string> = {
  forbidden: "Ton compte n'est pas reconnu comme administrateur.",
  introuvable: "Personne ne correspond à cette adresse.",
  read_failed: "Le serveur n'a pas pu lire cette fiche.",
  network: "La connexion a coupé avant la réponse.",
};

const PLANS = ["free", "monthly", "monthly_plus", "yearly", "yearly_plus", "lifetime"] as const;

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    (Number(cents) || 0) / 100,
  );
}

/** Le montant d'une vente, et ce qu'il vaut. */
function montant(v: Sale): string {
  if (v.amountSource === "payload") return euros(v.amountCents);
  if (v.amountSource === "plan") return `~ ${euros(v.amountCents)}`;
  return "montant inconnu";
}

function jour(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

/** Une vente qu'on peut vraiment rembourser d'ici. */
function estRemboursable(v: Sale): boolean {
  return !v.refundedAt && v.provider !== "systeme_io" && !isAtelierSale(v.ref);
}

/** Où va-t-on rembourser cette vente, quand ce n'est pas ici. */
function ouRembourser(v: Sale): string {
  if (v.refundedAt) return `remboursée le ${jour(v.refundedAt)}`;
  if (isAtelierSale(v.ref)) return "à rembourser depuis l'Atelier";
  if (v.provider === "systeme_io") return "à rembourser dans Systeme.io";
  return "";
}

interface Reponse {
  ok?: boolean;
  personne?: Person;
  provenance?: Provenance;
  ventesOrphelines?: Sale[];
  atelierJoignable?: boolean;
  reason?: string;
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-1.5 py-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {titre}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}

export default function ClientFiche({ email }: { email: string }) {
  const router = useRouter();
  const [data, setData] = useState<Reponse | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");

  const url = `/api/admin/clients/${encodeURIComponent(email)}`;

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as Reponse;
      setData(json);
      if (json.personne?.name) {
        const [p, ...reste] = json.personne.name.split(" ");
        setPrenom(p ?? "");
        setNom(reste.join(" "));
      }
    } catch {
      setData({ ok: false, reason: "network" });
    } finally {
      setChargement(false);
    }
  }, [url]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const p = data?.personne;

  async function enregistrerNom() {
    setEnCours("nom");
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: prenom, lastName: nom }),
      });
      const j = (await res.json()) as { ok?: boolean; reason?: string };
      if (j.ok) {
        toast.success("Nom enregistré.");
        await charger();
      } else {
        toast.error("Le nom n'a pas pu être enregistré.");
      }
    } catch {
      toast.error("La connexion a échoué. Rien n'a été enregistré.");
    } finally {
      setEnCours(null);
    }
  }

  async function changerPlan(plan: string) {
    if (!p?.userId) return;
    setEnCours("plan");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: p.userId, plan }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (j.ok) {
        toast.success(`Palier passé en ${plan}.`);
        await charger();
      } else {
        toast.error(j.error ?? "Le palier n'a pas pu être changé.");
      }
    } catch {
      toast.error("La connexion a échoué. Le palier n'a pas changé.");
    } finally {
      setEnCours(null);
    }
  }

  async function renvoyerAcces() {
    setEnCours("lien");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (j.ok) toast.success(`Lien de connexion renvoyé à ${email}.`);
      else toast.error(j.error ?? "L'email n'est pas parti.");
    } catch {
      toast.error("La connexion a échoué. L'email n'est pas parti.");
    } finally {
      setEnCours(null);
    }
  }

  async function supprimer() {
    if (!p?.userId) return;
    if (
      !window.confirm(
        `Supprimer définitivement le compte de ${email} ?\n\n` +
          `Ses quiz et ses leads partent avec. Rien ne peut être récupéré.`,
      )
    ) {
      return;
    }
    setEnCours("suppr");
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: p.userId }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (j.ok) {
        toast.success("Compte supprimé.");
        router.push("/admin");
      } else {
        toast.error(j.error ?? "Le compte n'a pas pu être supprimé.");
      }
    } catch {
      toast.error("La connexion a échoué. Le compte n'a pas été supprimé.");
    } finally {
      setEnCours(null);
    }
  }

  /**
   * ARRÊTER L'ABONNEMENT. Ce n'est PAS rembourser.
   *
   * Béné, 23 août : "il me faut un bouton pour annuler l'abo directement
   * et un différent pour rembourser (ce qui sera plus rare)."
   *
   * Le défaut est la fin de période : la personne a payé son mois, on ne
   * lui reprend pas ce qu'elle a acheté. L'immédiat existe pour les cas
   * où l'argent repart aussi.
   */
  async function annulerAbonnement(immediat: boolean) {
    const phrase = immediat
      ? `Arrêter TOUT DE SUITE l'abonnement de ${email} ?\n\nLe prélèvement s'arrête et l'accès repasse en gratuit immédiatement. À réserver aux cas où l'argent repart aussi.`
      : `Arrêter l'abonnement de ${email} ?\n\nPlus aucun prélèvement. L'accès reste ouvert jusqu'à la fin de la période déjà payée, puis repasse en gratuit tout seul.`;
    if (!window.confirm(phrase)) return;
    setEnCours("abo");
    try {
      const res = await fetch("/api/admin/clients/abonnement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, quand: immediat ? "immediat" : "fin-de-periode" }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        reason?: string;
        arretes?: Array<{ fournisseur: string; id: string }>;
        aucunAbonnement?: boolean;
        finLe?: string | null;
      };
      if (!j.ok) {
        toast.error(RAISONS_ABONNEMENT[j.reason ?? ""] ?? "L'abonnement n'a pas pu être arrêté.");
        return;
      }
      if (j.aucunAbonnement) {
        toast.success("Aucun abonnement en cours : le palier a été aligné sur gratuit.");
      } else if (immediat) {
        toast.success(`${j.arretes?.length ?? 0} abonnement(s) arrêté(s), accès fermé.`);
      } else {
        const fin = j.finLe ? new Date(j.finLe).toLocaleDateString("fr-FR") : null;
        toast.success(
          fin
            ? `Abonnement arrêté. Accès conservé jusqu'au ${fin}.`
            : "Abonnement arrêté. Accès conservé jusqu'à la fin de la période payée.",
        );
      }
      await charger();
    } catch {
      toast.error("La connexion a échoué. L'abonnement n'a pas été arrêté.");
    } finally {
      setEnCours(null);
    }
  }

  async function rembourser(v: Sale) {
    if (
      !window.confirm(
        `Rembourser ${montant(v)} à ${email} ?\n\n` +
          `L'argent repart tout de suite. Si c'est un remboursement TOTAL, son accès repasse en gratuit et elle reçoit un email.`,
      )
    ) {
      return;
    }
    setEnCours(v.ref);
    try {
      const res = await fetch("/api/admin/ventes/rembourser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: v.ref, provider: v.provider }),
      });
      const j = (await res.json()) as { ok?: boolean; reason?: string };
      if (j.ok) {
        toast.success("Remboursé.");
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

  if (chargement && !data) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="mx-auto size-6 animate-spin" />
      </div>
    );
  }

  if (!data?.ok || !p) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-primary">
          <ArrowLeft className="size-4" /> Retour à mes clients
        </Link>
        <Card className="border-rose-300 bg-rose-50">
          <CardContent className="py-4">
            <p className="text-sm font-bold text-rose-900">Cette fiche n&apos;a pas pu s&apos;ouvrir.</p>
            <p className="mt-1 text-xs text-rose-900">
              {RAISONS_PAGE[data?.reason ?? ""] ?? "Le serveur a refusé sans dire pourquoi."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chez = readClientKind(p);
  const etat = ETATS[p.status] ?? { label: p.status, classe: "bg-muted" };

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      {/* La fleche remonte a MES CLIENTS, jamais a l'historique : deux
          ecrans qui se citent l'un l'autre font une boucle dont on ne
          sort pas (drame Gwenn, 1er aout). */}
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-primary">
        <ArrowLeft className="size-4" /> Retour à mes clients
      </Link>

      {/* ── QUI C'EST ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{p.name || email}</h1>
          <p className="text-sm text-muted-foreground">{email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge className={`${CLIENTS[chez].classe} border-0`}>{CLIENTS[chez].label}</Badge>
            <Badge className={`${etat.classe} border-0`}>{etat.label}</Badge>
            <Badge className="border-0 bg-muted text-muted-foreground">{p.plan}</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void charger()} disabled={chargement}>
          {chargement ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Rafraîchir
        </Button>
      </div>

      {/* L'ATELIER MANQUE : ON LE DIT. Regle du 8 juin, on n'affiche pas
          un total dont le denominateur ment. */}
      {data.atelierJoignable === false && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-3">
            <p className="flex items-start gap-2 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              L&apos;Atelier n&apos;a pas répondu : ce qu&apos;il sait d&apos;elle et ses achats
              là bas manquent sur cette fiche.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Bloc titre="Son compte">
          <p className="text-muted-foreground">
            {p.hasTiquizAccount ? `Créé le ${jour(p.createdAt)}` : "Pas de compte Tiquiz"}
          </p>
          <p className="text-muted-foreground">
            Dernière visite : {p.lastSignIn ? jour(p.lastSignIn) : "jamais"}
          </p>
          <p className="text-muted-foreground">
            {p.quizCount} quiz · {p.leadCount} leads
          </p>
          {p.resellerName && (
            <p className="text-muted-foreground">Revendeur : {p.resellerName}</p>
          )}
          {p.selfServe && (
            <p className="inline-flex items-center gap-1 text-muted-foreground">
              <CreditCard className="size-3" /> gère sa carte elle même
            </p>
          )}
          {p.churn && (
            <p className="text-amber-700">
              {p.churn.endsAt && !p.churn.endedAt
                ? `Part, accès jusqu'au ${jour(p.churn.endsAt)}`
                : `Parti le ${jour(p.churn.endedAt)}`}
              {p.churn.feedback && (
                <span className="block">{MOTIFS[p.churn.feedback] ?? p.churn.feedback}</span>
              )}
              {p.churn.comment && (
                <span className="block italic">&laquo;&nbsp;{p.churn.comment}&nbsp;&raquo;</span>
              )}
            </p>
          )}
        </Bloc>

        {/* D'OU ELLE VIENT. Le journal ne remonte qu'au 7 aout : on le
            DIT au lieu d'afficher un tiret qui se lirait "venue de
            nulle part". */}
        <Bloc titre="D'où elle vient">
          {data.provenance?.tunnel ? (
            <>
              <p className="break-all">{data.provenance.tunnel}</p>
              <p className="text-muted-foreground">
                Première fois vue le {jour(data.provenance.quand)}
              </p>
              {data.provenance.parAffiliee && (
                <p className="font-semibold text-indigo-700">Entrée par un lien d&apos;affiliée</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              Inconnue. Le journal des appels ne remonte qu&apos;au 7 août : quelqu&apos;un entré
              avant n&apos;y laisse aucune trace.
            </p>
          )}
        </Bloc>

        <Bloc titre="L'Atelier">
          {p.atelier ? (
            <>
              <p className="capitalize">
                {p.atelier.status === "active" ? "Élève" : p.atelier.status ?? "-"}
                {p.atelier.tier ? ` · ${p.atelier.tier}` : ""}
              </p>
              <p className="text-muted-foreground">
                {p.atelier.daysDone} jour{p.atelier.daysDone > 1 ? "s" : ""} fait
                {p.atelier.daysDone > 1 ? "s" : ""}
              </p>
              {p.atelier.grantedAt && (
                <p className="text-muted-foreground">Inscrite le {jour(p.atelier.grantedAt)}</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Pas élève de l&apos;Atelier.</p>
          )}
        </Bloc>

        {/* LE MOIS OFFERT.
            Bene, 23 aout : "il faut aussi tracker les tricheurs qui
            veulent s'autoaffilier". On MONTRE, on ne reprend rien :
            reprendre un essai commence, c'est prelever quelqu'un qui ne
            s'y attend pas. Le bloc ne s'affiche que si elle en a eu un :
            "jamais eu de mois offert" est vrai de presque tout le monde,
            donc ce serait du bruit sur toutes les fiches. */}
        {p.moisOffert && (
          <Bloc titre="Mois offert">
            <p>30 jours offerts le {jour(p.moisOffert.grantedAt)}</p>
            {p.moisOffert.sa && (
              <p className="text-muted-foreground break-all">
                Lien : {p.moisOffert.sa}
              </p>
            )}
            {p.moisOffert.flag === "deja_recu" && (
              <p className="font-semibold text-rose-700">
                Elle en avait DÉJÀ eu un. Ouvert quand même : son adresse
                n&apos;était pas connue avant le paiement.
              </p>
            )}
            {p.moisOffert.flag === "meme_ip" && (
              <p className="font-semibold text-amber-700">
                Même connexion que le lien utilisé. Ça arrive pour un couple
                ou deux collègues, ça arrive aussi à qui s&apos;auto-affilie.
              </p>
            )}
          </Bloc>
        )}
      </div>

      {/* ── CE QU'ELLE A PAYÉ ── */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold">Ce qu&apos;elle a payé</p>
            <p className="text-sm text-muted-foreground">
              {p.paidCents > 0 ? `${euros(p.paidCents)} au total` : "rien pour l'instant"}
            </p>
          </div>

          {p.sales.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Aucune vente enregistrée.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Produit</th>
                    <th className="py-1 pr-3 font-medium">Montant</th>
                    <th className="py-1 pr-3 font-medium">Date</th>
                    <th className="py-1 pr-3 font-medium">Payé par</th>
                    <th className="py-1 font-medium">Remboursement</th>
                  </tr>
                </thead>
                <tbody>
                  {p.sales.map((v) => (
                    <tr key={v.ref} className="border-b last:border-0">
                      <td className="py-2 pr-3">{NOM_PRODUIT[readSaleProduct(v)]}</td>
                      <td className="py-2 pr-3 font-semibold">{montant(v)}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{jour(v.paidAt)}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {v.provider === "stripe"
                          ? "carte"
                          : v.provider === "paypal"
                            ? "PayPal"
                            : "Systeme.io"}
                      </td>
                      <td className="py-2">
                        {/* UNE VENTE SYSTEME.IO NE SE REMBOURSE PAS D'ICI :
                            l'argent est chez eux. Et une vente de l'Atelier
                            non plus : elle est sur le MEME compte Stripe,
                            donc l'appel reussirait, mais seul l'Atelier sait
                            couper l'acces et envoyer l'email de depart. */}
                        {estRemboursable(v) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => void rembourser(v)}
                            disabled={enCours === v.ref}
                          >
                            {enCours === v.ref && <Loader2 className="size-3 animate-spin" />}
                            Rembourser
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{ouRembourser(v)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(data.ventesOrphelines?.length ?? 0) > 0 && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {data.ventesOrphelines!.length} paiement à cette adresse ne se rattache à aucun
              compte. Vérifie l&apos;adresse, puis ouvre lui son accès à la main.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── CE QU'ELLE NOUS A ECRIT ──
          Bene, 22 aout : "pourquoi ne pas lier le compte client a l'aide
          au ticketing ?" Repondre a quelqu'un sans voir ses acces ni ses
          paiements, c'est repondre a l'aveugle. Le MEME composant que la
          file, filtre sur elle : deux implementations d'une file de
          tickets finiraient par se contredire. */}
      <Card>
        <CardContent className="py-4">
          <SupportCard email={email} />
        </CardContent>
      </Card>

      {/* ── AGIR ── */}
      <Card>
        <CardContent className="py-4">
          <p className="text-sm font-semibold">Agir</p>

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">
                Son nom
                <div className="mt-1 flex gap-2">
                  <Input
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Prénom"
                  />
                  <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" />
                </div>
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void enregistrerNom()}
                disabled={enCours === "nom" || !p.hasTiquizAccount}
              >
                {enCours === "nom" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Enregistrer
              </Button>
            </div>

            <div className="space-y-2">
              {p.userId ? (
                <>
                  <label className="block text-xs font-medium text-muted-foreground">
                    Son palier
                    <select
                      value={p.plan}
                      onChange={(e) => void changerPlan(e.target.value)}
                      disabled={enCours === "plan"}
                      className="mt-1 w-full rounded border bg-background px-2 py-2 text-sm"
                    >
                      {PLANS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void renvoyerAcces()}
                      disabled={enCours === "lien"}
                    >
                      {enCours === "lien" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Mail className="size-4" />
                      )}
                      Lui renvoyer ses accès
                    </Button>
                    {/* ARRÊTER L'ABONNEMENT, distinct de REMBOURSER.
                        Rembourser vit sur la ligne de la vente, parce
                        qu'on rembourse UN paiement ; annuler vit ici,
                        parce qu'on annule UN abonnement. */}
                    {p.plan !== "free" && p.plan !== "beta" && p.plan !== "lifetime" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void annulerAbonnement(false)}
                          disabled={enCours === "abo"}
                        >
                          {enCours === "abo" ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <CalendarX className="size-4" />
                          )}
                          Arrêter l&apos;abonnement
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => void annulerAbonnement(true)}
                          disabled={enCours === "abo"}
                        >
                          Arrêter tout de suite
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => void supprimer()}
                      disabled={enCours === "suppr"}
                    >
                      {enCours === "suppr" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      Supprimer le compte
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Elle n&apos;a pas de compte Tiquiz : il n&apos;y a pas de palier à changer.
                  Invite la depuis l&apos;écran Mes clients.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
