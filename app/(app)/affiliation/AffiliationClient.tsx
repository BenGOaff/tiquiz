"use client";

// app/(app)/affiliation/AffiliationClient.tsx
// Espace Affiliation en onglets (lisibilité) : Mon lien / Mes gains /
// Promouvoir / Paiement. Construit le lien affilié Systeme.io, affiche les
// VRAIS gains (commissions attribuées par les webhooks) + un simulateur, et
// un kit de promo personnalisé selon le business de l'élève.

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Share2,
  Link2,
  Copy,
  Check,
  ExternalLink,
  TrendingUp,
  Sparkles,
  Rocket,
  Lightbulb,
  Compass,
  Gift,
  Info,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Mail,
  Megaphone,
  FileText,
  Video,
  MessageSquare,
  ImageIcon,
  Download,
  Pencil,
  RotateCcw,
  Bold,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  QUIZING_COMMISSION_PCT,
  TIQUIZ_RECURRING_PCT,
  ATELIER_SALES_URL,
  SIO_AFFILIATE_DASHBOARD_URL,
  SIO_AFFILIATE_SETTINGS_URL,
  buildAffiliateLink,
  normalizeAffiliateId,
  isValidAffiliateId,
  getAffiliatePlaybook,
  AFFILIATE_ARGUMENTS,
  affiliateIntro,
} from "@/lib/affiliate";
import {
  SWIPE_EMAILS,
  SWIPE_POSTS,
  ARTICLE_ANGLES,
  VIDEO_IDEAS,
  DEFAULT_ASSETS,
  DEFAULT_POSTS,
  POSTS_TEXT_DOC,
  fillSwipe,
} from "@/lib/affiliateSwipe";
import { renderSwipeEmailHtml } from "@/lib/affiliateEmailRender";

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
    Math.max(0, Math.round(n)),
  );
const eurCents = (c: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Math.max(0, c) / 100);

// Types locaux (on n'importe pas lib/affiliateTracking qui est server-only).
type DisplayStatus = "guarantee" | "payable" | "paid" | "refunded";
type CommissionRow = {
  id: string;
  source_app: "quizing" | "tiquiz";
  product_name: string | null;
  sale_amount_cents: number;
  commission_cents: number;
  status: string;
  sale_at: string;
  refunded_at?: string | null;
  displayStatus: DisplayStatus;
};
type MonthRow = { key: string; label: string; salesCount: number; commissionCents: number };
type Gains = {
  visits: number;
  leads: number;
  salesCount: number;
  refundsCount: number;
  totalCents: number;
  guaranteeCents: number;
  payableCents: number;
  paidCents: number;
  refundedCents: number;
  quizingCents: number;
  tiquizCents: number;
  byMonth: MonthRow[];
  nextPayout: { amountCents: number; label: string } | null;
  recent: CommissionRow[];
} | null;

const STATUS_LABEL: Record<DisplayStatus, string> = {
  guarantee: "Garantie 30j",
  payable: "À verser",
  paid: "Versé",
  refunded: "Remboursé",
};
const STATUS_CLASS: Record<DisplayStatus, string> = {
  guarantee: "bg-amber-100 text-amber-800",
  payable: "bg-primary/10 text-primary",
  paid: "bg-success/15 text-success",
  refunded: "bg-muted text-muted-foreground line-through",
};

type Tab = "lien" | "gains" | "promo" | "emails" | "contenus" | "paiement";

export interface AffiliateAsset {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  url: string;
  file_type: string | null;
}

export type EmailOverride = { subject?: string | null; bodyHtml?: string | null };

export function AffiliationClient({
  firstName,
  niche,
  activityType,
  initialAffiliateId,
  gains,
  assets,
  emailOverrides,
}: {
  firstName: string | null;
  niche: string | null;
  activityType: string | null;
  initialAffiliateId: string;
  gains: Gains;
  assets: AffiliateAsset[];
  emailOverrides: Record<string, EmailOverride>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialAffiliateId ? "gains" : "lien");
  const [input, setInput] = useState(initialAffiliateId);
  const [savedId, setSavedId] = useState(initialAffiliateId);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const playbook = useMemo(() => getAffiliatePlaybook(activityType), [activityType]);
  const intro = useMemo(() => affiliateIntro({ firstName, niche }), [firstName, niche]);

  const normalized = normalizeAffiliateId(input);
  const inputValid = isValidAffiliateId(normalized);
  const inputTouchedInvalid = normalized.length > 0 && !inputValid;
  const effectiveId = inputValid ? normalized : savedId;
  const link = effectiveId ? buildAffiliateLink(effectiveId) : "";

  async function save() {
    if (inputTouchedInvalid) {
      toast.error("Cet identifiant ne ressemble pas à un ID affilié Systeme.io (sa...).");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/me/affiliate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateId: input }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error(data?.reason === "bad_format" ? "Format d'identifiant invalide." : "Échec de l'enregistrement.");
        return;
      }
      setSavedId(data.affiliateId ?? "");
      setInput(data.affiliateId ?? "");
      toast.success(data.affiliateId ? "Lien affilié enregistré !" : "Identifiant retiré.");
      router.refresh();
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Impossible de copier. Sélectionne le lien à la main.");
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
          <Share2 className="size-7 text-primary" />
          Affiliation
        </h1>
        <p className="text-sm text-muted-foreground">{intro}</p>
      </header>

      {/* Onglets */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface-soft p-1">
        <TabBtn active={tab === "lien"} onClick={() => setTab("lien")} icon={Link2}>
          Mon lien
        </TabBtn>
        <TabBtn active={tab === "gains"} onClick={() => setTab("gains")} icon={TrendingUp}>
          Mes gains
        </TabBtn>
        <TabBtn active={tab === "promo"} onClick={() => setTab("promo")} icon={Rocket}>
          Promouvoir
        </TabBtn>
        <TabBtn active={tab === "emails"} onClick={() => setTab("emails")} icon={Mail}>
          Emails
        </TabBtn>
        <TabBtn active={tab === "contenus"} onClick={() => setTab("contenus")} icon={Megaphone}>
          Contenus
        </TabBtn>
        <TabBtn active={tab === "paiement"} onClick={() => setTab("paiement")} icon={CheckCircle2}>
          Paiement
        </TabBtn>
      </div>

      {/* ───── Onglet Mon lien ───── */}
      {tab === "lien" && (
        <Card>
          <CardContent className="flex flex-col gap-4 py-5">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" />
              Ton lien affilié
            </span>

            <ol className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <li>
                1. Ouvre ton{" "}
                <a
                  href={SIO_AFFILIATE_DASHBOARD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  tableau de bord affilié Systeme.io
                  <ExternalLink className="size-3.5" />
                </a>
                .
              </li>
              <li>
                2. Repère ton <strong>identifiant affilié</strong> (il commence par{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">sa</code>).
              </li>
              <li>3. Colle-le ci-dessous : on construit ton lien automatiquement.</li>
            </ol>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="aff-id">Ton identifiant affilié Systeme.io</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="aff-id"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="sa0007878317200141bbe3de2b6644176621db2c6580"
                  className="font-mono text-xs sm:text-sm"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
                <Button onClick={save} disabled={saving} className="shrink-0">
                  {saving ? "..." : savedId ? "Mettre à jour" : "Valider"}
                </Button>
              </div>
              {inputTouchedInvalid ? (
                <p className="text-xs text-destructive">
                  Hmm, ça ne ressemble pas à un ID Systeme.io. Tu peux aussi coller le lien complet.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Astuce : tu peux coller ton ID seul OU un lien Systeme.io contenant ?sa=...
                </p>
              )}
            </div>

            {link ? (
              <div className="flex flex-col gap-2">
                <Label>Ton lien affilié prêt à partager</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                    {link}
                  </code>
                  <Button variant="outline" onClick={copyLink} className="shrink-0">
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied ? "Copié" : "Copier"}
                  </Button>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Partage toujours CE lien (avec <code>?sa=</code>). Un lien nu vers {ATELIER_SALES_URL}{" "}
                    sans ton identifiant ne te crédite aucune commission.
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ajoute ton identifiant ci-dessus pour générer ton lien.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ───── Onglet Mes gains ───── */}
      {tab === "gains" && (
        <div className="flex flex-col gap-6">
          {!savedId ? (
            <Card>
              <CardContent className="flex flex-col items-start gap-3 py-5">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="size-4 text-primary" />
                  Tes gains réels
                </span>
                <p className="text-sm text-muted-foreground">
                  Ajoute ton identifiant affilié pour activer le suivi de tes commissions.
                </p>
                <Button size="sm" onClick={() => setTab("lien")}>
                  Configurer mon lien
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Entonnoir : visites -> leads -> ventes -> remboursements */}
              <Card>
                <CardContent className="grid gap-3 py-5 sm:grid-cols-2 lg:grid-cols-4">
                  <CountStat label="Visites via ton lien" value={gains?.visits ?? 0} />
                  <CountStat label="Leads captés" value={gains?.leads ?? 0} />
                  <CountStat label="Ventes" value={gains?.salesCount ?? 0} />
                  <CountStat label="Remboursements" value={gains?.refundsCount ?? 0} muted />
                </CardContent>
              </Card>

              {/* Commissions par statut (calé sur le cycle Systeme.io) */}
              <Card>
                <CardContent className="flex flex-col gap-4 py-5">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <TrendingUp className="size-4 text-primary" />
                    Tes commissions
                  </span>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <GainStat label="Total gagné (net)" cents={gains?.totalCents ?? 0} highlight />
                    <GainStat label="Garantie 30j en cours" cents={gains?.guaranteeCents ?? 0} />
                    <GainStat label="Prêt à verser" cents={gains?.payableCents ?? 0} />
                    <GainStat label="Versé (estimé)" cents={gains?.paidCents ?? 0} />
                  </div>
                  {(gains?.refundsCount ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Remboursé : {eurCents(gains?.refundedCents ?? 0)} ({gains?.refundsCount} vente
                      {(gains?.refundsCount ?? 0) > 1 ? "s" : ""}), déjà déduit de ton total.
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border p-3 text-sm">
                      <div className="text-xs text-muted-foreground">
                        Atelier du Quiz ({QUIZING_COMMISSION_PCT}% du HT)
                      </div>
                      <div className="font-display text-xl font-bold text-primary">
                        {eurCents(gains?.quizingCents ?? 0)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-3 text-sm">
                      <div className="text-xs text-muted-foreground">
                        Tiquiz ({TIQUIZ_RECURRING_PCT}% du HT, récurrent)
                      </div>
                      <div className="font-display text-xl font-bold text-success">
                        {eurCents(gains?.tiquizCents ?? 0)}
                      </div>
                    </div>
                  </div>

                  {gains?.nextPayout && (
                    <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>
                        <strong>Prochain versement estimé : {eurCents(gains.nextPayout.amountCents)}</strong>,{" "}
                        {gains.nextPayout.label}. Ce sont tes commissions dont la garantie 30 jours est passée.
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Comment tu es payé (transparence, aligné Systeme.io) */}
              <Card>
                <CardContent className="flex flex-col gap-2 py-5">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Info className="size-4 text-primary" />
                    Comment tu es payé
                  </span>
                  <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span>
                        Tu touches <strong>{QUIZING_COMMISSION_PCT}% du montant HT</strong> de chaque
                        Atelier du Quiz vendu, et <strong>{TIQUIZ_RECURRING_PCT}% du HT</strong> chaque
                        mois sur chaque abonnement Tiquiz parrainé.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span>
                        Chaque vente est retenue <strong>30 jours</strong> : c'est la durée de la
                        garantie satisfait ou remboursé. Si l'acheteur se fait rembourser pendant ce
                        délai, la commission est annulée (c'est normal, et rare).
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span>
                        Passé ces 30 jours, la commission est acquise. Systeme.io te la verse
                        <strong> une fois par mois, autour du 10</strong>, sur le moyen de paiement de
                        tes réglages affilié.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span>
                        Les montants ici sont calculés comme ceux de Systeme.io. En cas d'écart,
                        Systeme.io reste la référence pour le paiement.
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Par mois */}
              {gains && gains.byMonth.length > 0 && (
                <Card>
                  <CardContent className="flex flex-col gap-3 py-5">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <TrendingUp className="size-4 text-primary" />
                      Par mois
                    </span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">Mois</th>
                            <th className="py-2 pr-3 font-medium">Ventes</th>
                            <th className="py-2 font-medium">Commissions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gains.byMonth.map((m) => (
                            <tr key={m.key} className="border-b last:border-0">
                              <td className="py-2 pr-3 capitalize">{m.label}</td>
                              <td className="py-2 pr-3 text-muted-foreground">{m.salesCount}</td>
                              <td className="py-2 font-medium">{eurCents(m.commissionCents)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Détail des ventes */}
              <Card>
                <CardContent className="flex flex-col gap-3 py-5">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <TrendingUp className="size-4 text-primary" />
                    Détail de tes ventes
                  </span>
                  {gains && gains.recent.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">Date</th>
                            <th className="py-2 pr-3 font-medium">Produit</th>
                            <th className="py-2 pr-3 font-medium">Vente HT</th>
                            <th className="py-2 pr-3 font-medium">Commission</th>
                            <th className="py-2 font-medium">Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gains.recent.map((r) => (
                            <tr key={r.id} className="border-b last:border-0">
                              <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                                {new Date(r.sale_at).toLocaleDateString("fr-FR")}
                              </td>
                              <td className="py-2 pr-3">
                                {r.source_app === "quizing" ? "Atelier du Quiz" : "Tiquiz"}
                                {r.product_name ? (
                                  <span className="block text-xs text-muted-foreground">{r.product_name}</span>
                                ) : null}
                              </td>
                              <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                                {eurCents(r.sale_amount_cents)}
                              </td>
                              <td className="py-2 pr-3 whitespace-nowrap font-medium">
                                {eurCents(r.commission_cents)}
                              </td>
                              <td className="py-2 whitespace-nowrap">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[r.displayStatus]}`}
                                >
                                  {STATUS_LABEL[r.displayStatus]}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Pas encore de commission. Dès qu'une vente passe par ton lien, elle apparaît ici.
                    </p>
                  )}
                  <div>
                    <Button asChild variant="outline" size="sm">
                      <a href={SIO_AFFILIATE_DASHBOARD_URL} target="_blank" rel="noopener noreferrer">
                        Voir aussi sur Systeme.io
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Estimator />
            </>
          )}
        </div>
      )}

      {/* ───── Onglet Promouvoir ───── */}
      {tab === "promo" && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-4 py-5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Gift className="size-4 text-primary" />
                Tes avantages
              </span>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-primary/10 p-4">
                  <div className="font-display text-3xl font-bold text-primary">{QUIZING_COMMISSION_PCT}%</div>
                  <p className="mt-1 text-sm">
                    de commission sur <strong>chaque vente de l’Atelier du Quiz</strong>.
                  </p>
                </div>
                <div className="rounded-xl bg-success/10 p-4">
                  <div className="font-display text-3xl font-bold text-success">{TIQUIZ_RECURRING_PCT}%</div>
                  <p className="mt-1 text-sm">
                    <strong>chaque mois</strong> sur chaque abonnement Tiquiz parrainé.
                  </p>
                </div>
              </div>
              <ul className="flex flex-col gap-2">
                {AFFILIATE_ARGUMENTS.map((a) => (
                  <li key={a.title} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    <span>
                      <strong>{a.title}.</strong> {a.body}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 py-5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Rocket className="size-4 text-primary" />
                Ton kit pour promouvoir l’Atelier du Quiz
              </span>

              <div className="rounded-xl bg-primary/5 p-4 text-sm">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Lightbulb className="size-3.5" />
                  Ton angle
                </span>
                <p className="mt-1">{playbook.angle}</p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles className="size-4 text-primary" />
                  3 idées de quiz pour vendre Quizing à ton audience
                </span>
                <ul className="flex flex-col gap-2">
                  {playbook.quizIdeas.map((idea, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{idea}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Compass className="size-4 text-primary" />
                  À qui le recommander en priorité
                </span>
                <ul className="flex flex-col gap-2">
                  {playbook.niches.map((n, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ───── Onglet Emails ───── */}
      {tab === "emails" && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-3 py-5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="size-4 text-primary" />
                Ta séquence email prête à envoyer
              </span>
              <p className="text-sm text-muted-foreground">
                6 emails à copier-coller dans ton outil d'emailing. Ton lien affilié est déjà
                inséré. Rythme conseillé : 1 email par jour sur 6 jours, ou espacé sur 10 à 12 jours.
              </p>
              <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span>
                    <code className="rounded bg-muted px-1 py-0.5">{"{first_name}"}</code> reste tel
                    quel : c'est le champ de fusion de TON outil (il met le prénom du destinataire).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span>3 objets par email : teste le A, garde B et C pour relancer les non-ouvreurs.</span>
                </li>
              </ul>
              {!effectiveId && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Ajoute d'abord ton identifiant dans l'onglet Mon lien : sans ça, tes emails
                    partent avec un lien non tracké et tu ne touches aucune commission.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {SWIPE_EMAILS.map((mail) => (
            <SwipeEmailCard
              key={mail.n}
              mail={mail}
              link={link}
              firstName={firstName}
              override={emailOverrides[String(mail.n)]}
            />
          ))}
        </div>
      )}

      {/* ───── Onglet Contenus ───── */}
      {tab === "contenus" && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-2 py-5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Megaphone className="size-4 text-primary" />
                Ta bibliothèque de contenus
              </span>
              <p className="text-sm text-muted-foreground">
                Des visuels à télécharger, des posts réseaux, des angles d'articles et des idées de
                vidéos, prêts à réutiliser. Ton lien affilié est déjà inséré dans les posts. Adapte
                le ton à ta voix.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 py-5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <ImageIcon className="size-4 text-primary" />
                Visuels à télécharger
              </span>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {DEFAULT_ASSETS.map((a) => (
                  <AssetTile
                    key={a.url}
                    url={a.url}
                    title={a.title}
                    description={a.description}
                    fileType={a.fileType}
                  />
                ))}
                {assets.map((a) => (
                  <AssetTile
                    key={a.id}
                    url={a.url}
                    title={a.title}
                    description={a.description}
                    fileType={a.file_type}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 py-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <ImageIcon className="size-4 text-primary" />
                  Posts prêts à publier
                </span>
                <Button asChild variant="outline" size="sm">
                  <a href={POSTS_TEXT_DOC.url} target="_blank" rel="noopener noreferrer" download>
                    <Download className="size-4" />
                    Textes des posts
                  </a>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Des visuels et carrousels aux couleurs de l'Atelier, à publier tels quels. Les
                légendes sont dans le document Word (bouton ci-dessus), à copier-coller et adapter.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {DEFAULT_POSTS.map((a) => (
                  <AssetTile
                    key={a.url}
                    url={a.url}
                    title={a.title}
                    description={a.description}
                    fileType={a.fileType}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 py-5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="size-4 text-primary" />
                Posts réseaux sociaux (textes)
              </span>
              {SWIPE_POSTS.map((post, i) => (
                <SwipeTextBlock
                  key={i}
                  eyebrow={post.platform}
                  title={post.hook}
                  text={fillSwipe(post.body, { link, firstName })}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 py-5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-primary" />
                Angles d'articles de blog
              </span>
              <ul className="flex flex-col gap-3">
                {ARTICLE_ANGLES.map((a, i) => (
                  <li key={i} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-semibold">{a.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{a.angle}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 py-5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Video className="size-4 text-primary" />
                Idées de vidéos promo
              </span>
              <ul className="flex flex-col gap-3">
                {VIDEO_IDEAS.map((v, i) => (
                  <li key={i} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {v.format}
                      </span>
                      <p className="text-sm font-semibold">{v.title}</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{v.outline}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ───── Onglet Paiement ───── */}
      {tab === "paiement" && (
        <Card>
          <CardContent className="flex flex-col gap-3 py-5">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="size-4 text-primary" />
              Configure ton paiement (une fois)
            </span>
            <p className="text-sm text-muted-foreground">
              Tu es payé directement par Systeme.io, en automatique,{" "}
              <strong>entre le 10 et le 13</strong> de chaque mois. Pour ça, complète tes infos de
              paiement (PayPal ou virement) dans tes réglages affilié.
            </p>
            <div>
              <Button asChild variant="outline" size="sm">
                <a href={SIO_AFFILIATE_SETTINGS_URL} target="_blank" rel="noopener noreferrer">
                  Compléter mes infos de paiement
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Sans infos de paiement renseignées, Systeme.io ne peut pas t’envoyer tes commissions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Link2;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

/** Bouton "copier" générique avec feedback visuel. */
function CopyButton({ text, label = "Copier" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      toast.success("Copié !");
      setTimeout(() => setDone(false), 1800);
    } catch {
      toast.error("Impossible de copier. Sélectionne le texte à la main.");
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      {done ? "Copié" : label}
    </Button>
  );
}

/** Texte brut (repli) depuis du HTML, pour le copier-coller sans HTML. */
function htmlToPlain(html: string): string {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Bouton copier qui préserve la mise en forme (text/html + repli text/plain). */
function CopyRichButton({ html, label = "Copier le mail" }: { html: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    const text = htmlToPlain(html);
    try {
      if (typeof window !== "undefined" && "ClipboardItem" in window && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setDone(true);
      toast.success("Copié avec la mise en forme !");
      setTimeout(() => setDone(false), 1800);
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      } catch {
        toast.error("Impossible de copier. Sélectionne le texte à la main.");
      }
    }
  }
  return (
    <Button size="sm" onClick={copy} className="shrink-0">
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      {done ? "Copié" : label}
    </Button>
  );
}

/**
 * Un email de la séquence : objets A/B/C + corps RICHE (vrai gras, tailles,
 * couleurs, interligne), éditable et enregistrable par l'affilié, copiable
 * avec la mise en forme. Aucun markdown affiché.
 */
function SwipeEmailCard({
  mail,
  link,
  firstName,
  override,
}: {
  mail: (typeof SWIPE_EMAILS)[number];
  link: string;
  firstName: string | null;
  override?: EmailOverride;
}) {
  const defaultHtml = useMemo(
    () => renderSwipeEmailHtml(fillSwipe(mail.body, { link, firstName })),
    [mail.body, link, firstName],
  );
  const [bodyHtml, setBodyHtml] = useState<string>(override?.bodyHtml || defaultHtml);
  const [customized, setCustomized] = useState<boolean>(!!override?.bodyHtml);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  async function patch(payload: { subject?: string | null; bodyHtml?: string | null }) {
    const res = await fetch("/api/me/affiliate-emails", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n: mail.n, ...payload }),
    });
    if (!res.ok) throw new Error("save failed");
  }

  async function save() {
    const html = editorRef.current?.innerHTML ?? bodyHtml;
    setSaving(true);
    try {
      await patch({ bodyHtml: html });
      setBodyHtml(html);
      setCustomized(true);
      setEditing(false);
      toast.success("Ton email est enregistré.");
    } catch {
      toast.error("Enregistrement impossible. Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setSaving(true);
    try {
      await patch({ bodyHtml: null, subject: null });
      setBodyHtml(defaultHtml);
      setCustomized(false);
      setEditing(false);
      toast.success("Email réinitialisé.");
    } catch {
      toast.error("Réinitialisation impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              Email {mail.n}
              {customized ? " · personnalisé" : ""}
            </span>
            <span className="text-sm font-semibold">{mail.role}</span>
          </div>
          {!editing && <CopyRichButton html={bodyHtml} />}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Objets à tester (A / B / C)</span>
          <ul className="flex flex-col gap-1">
            {mail.subjects.map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-sm">
                <span className="min-w-0 truncate">{s}</span>
                <CopyButton text={s} label="" />
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Corps du mail</span>
          {editing ? (
            <>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onMouseDown={(e) => {
                    // Garde la sélection dans l'éditeur.
                    e.preventDefault();
                    document.execCommand("bold");
                  }}
                >
                  <Bold className="size-4" />
                  Gras
                </Button>
                <span className="text-xs text-muted-foreground">
                  Sélectionne du texte puis clique sur Gras.
                </span>
              </div>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
                className="max-h-96 min-h-40 overflow-auto rounded-lg border border-input bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                  Annuler
                </Button>
                {customized && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={reset}
                    disabled={saving}
                    className="ml-auto text-muted-foreground"
                  >
                    <RotateCcw className="size-3.5" />
                    Revenir au modèle
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div
                className="max-h-96 overflow-auto rounded-lg border border-border bg-muted/20 p-4"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
              <div>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="size-3.5" />
                  Personnaliser cet email
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Vignette d'un visuel téléchargeable (kit officiel ou upload admin). */
function AssetTile({
  url,
  title,
  description,
  fileType,
}: {
  url: string;
  title: string;
  description?: string | null;
  fileType?: string | null;
}) {
  const isImage = (fileType ?? "").startsWith("image/");
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-2">
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md bg-muted/40">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={title} className="h-full w-full object-contain" />
        ) : (
          <ImageIcon className="size-7 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        {description && <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>}
      </div>
      <Button asChild variant="outline" size="sm">
        <a href={url} target="_blank" rel="noopener noreferrer" download>
          <Download className="size-4" />
          Télécharger
        </a>
      </Button>
    </div>
  );
}

/** Bloc de contenu copiable (post réseau) avec en-tête. */
function SwipeTextBlock({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-wide text-primary">{eyebrow}</span>
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <CopyButton text={text} label="Copier" />
      </div>
      <pre className="mt-2 whitespace-pre-wrap text-sm text-foreground">{text}</pre>
    </div>
  );
}

function CountStat({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${muted ? "bg-muted/40" : "bg-primary/5"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function GainStat({ label, cents, highlight }: { label: string; cents: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-primary/10" : "bg-muted/40"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl font-bold ${highlight ? "text-primary" : ""}`}>
        {eurCents(cents)}
      </div>
    </div>
  );
}

// Simulateur de gains. Valeurs indicatives, ajustables (Atelier du Quiz 47€,
// Tiquiz 9€/mois par défaut). On n'invente aucun chiffre officiel.
function Estimator() {
  const [quizSales, setQuizSales] = useState(5);
  const [quizPrice, setQuizPrice] = useState(47);
  const [tiquizSubs, setTiquizSubs] = useState(5);
  const [tiquizPrice, setTiquizPrice] = useState(9);

  const quizingEarn = quizSales * quizPrice * (QUIZING_COMMISSION_PCT / 100);
  const tiquizMonthly = tiquizSubs * tiquizPrice * (TIQUIZ_RECURRING_PCT / 100);
  const thisMonth = quizingEarn + tiquizMonthly;

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="size-3.5" />
        Simulateur (ajuste les valeurs)
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Ventes Quizing / mois" value={quizSales} onChange={setQuizSales} />
        <NumberField label="Prix Atelier du Quiz (€)" value={quizPrice} onChange={setQuizPrice} />
        <NumberField label="Abonnés Tiquiz actifs" value={tiquizSubs} onChange={setTiquizSubs} />
        <NumberField label="Prix abonnement Tiquiz / mois (€)" value={tiquizPrice} onChange={setTiquizPrice} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            Ventes Atelier ({QUIZING_COMMISSION_PCT}% de commission)
          </div>
          <div className="font-display text-2xl font-bold">{eur(quizingEarn)}</div>
        </div>
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            Récurrent Tiquiz ({TIQUIZ_RECURRING_PCT}%, chaque mois)
          </div>
          <div className="font-display text-2xl font-bold text-success">{eur(tiquizMonthly)}</div>
        </div>
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">Total ce mois-ci</div>
          <div className="font-display text-2xl font-bold text-primary">{eur(thisMonth)}</div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Estimation indicative. Tes commissions réelles sont dans l’onglet Mes gains.
      </p>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
    </div>
  );
}
