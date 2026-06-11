"use client";

// components/reseller/ResellerDashboard.tsx
//
// Panel revendeur (phase 1) : le revendeur gère SON portefeuille de
// clients Tiquiz comme un mini-admin, sans rien voir du reste de la
// plateforme ni du CONTENU de ses clients (RGPD : compteurs uniquement).
//
// - Stats globales : total clients, payants (= commissionnés), actifs
//   30 jours, leads capturés.
// - Bloc activation : qui utilise vraiment l'outil (a créé au moins un
//   projet, connecté 7j/30j, jamais connecté).
// - Création de compte client + renvoi de l'email d'accès.
//
// Mirror du style AdminDashboard (cards, table, badges, sonner).

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowUpDown,
  BarChart3,
  Copy,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Client = {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  plan: string;
  is_paid: boolean;
  created_at: string;
  quiz_count: number;
  survey_count: number;
  popquiz_count: number;
  lead_count: number;
  last_sign_in: string | null;
};

const CREATABLE_PLANS = ["free", "monthly", "yearly", "monthly_plus", "yearly_plus"] as const;

// Plans payants pour lesquels le revendeur configure SES bons de
// commande. Ses clients voient ces URLs dans Réglages -> Abonnement à
// la place des BDC tipote.fr : ils le payent LUI, pas Béné. Plan sans
// URL = pas de CTA affiché chez ses clients.
const CHECKOUT_PLAN_KEYS = ["monthly", "yearly", "monthly_plus", "yearly_plus"] as const;

const DAY_MS = 24 * 3600 * 1000;

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
}

export default function ResellerDashboard({ resellerName }: { resellerName: string }) {
  const t = useTranslations("reseller");

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "leads" | "projects">("date");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newPlan, setNewPlan] = useState<string>("free");
  const [creating, setCreating] = useState(false);

  const [checkoutUrls, setCheckoutUrls] = useState<Record<string, string>>({});
  const [pricingLabels, setPricingLabels] = useState<Record<string, string>>({});
  const [webhookToken, setWebhookToken] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [savingCheckout, setSavingCheckout] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reseller/clients", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setClients(json.clients ?? []);
      else toast.error(t("toasts.loadError"));
    } catch {
      toast.error(t("toasts.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetch("/api/reseller/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.ok) {
          setCheckoutUrls(json.checkout_urls ?? {});
          const labels: Record<string, string> = {};
          for (const [k, v] of Object.entries(
            (json.pricing ?? {}) as Record<string, { label?: string }>,
          )) {
            if (v?.label) labels[k] = v.label;
          }
          setPricingLabels(labels);
          setWebhookToken(json.webhook_token ?? null);
          setSlug(json.slug ?? null);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveCheckoutUrls = async () => {
    setSavingCheckout(true);
    try {
      const pricing: Record<string, { label: string }> = {};
      for (const [k, v] of Object.entries(pricingLabels)) {
        if (v.trim()) pricing[k] = { label: v.trim() };
      }
      const res = await fetch("/api/reseller/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkout_urls: checkoutUrls, pricing }),
      });
      const json = await res.json();
      if (json.ok) {
        setCheckoutUrls(json.checkout_urls ?? {});
        toast.success(t("checkout.saved"));
      } else if (json.error === "invalid_url") {
        toast.error(t("checkout.invalidUrl", { plan: json.plan ?? "" }));
      } else {
        toast.error(t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSavingCheckout(false);
    }
  };

  const regenerateToken = async () => {
    if (!window.confirm(t("automation.regenerateConfirm"))) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/reseller/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate_webhook_token: true }),
      });
      const json = await res.json();
      if (json.ok) {
        setWebhookToken(json.webhook_token ?? null);
        toast.success(t("automation.regenerated"));
      } else {
        toast.error(t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setRegenerating(false);
    }
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("copied"));
    } catch {
      toast.error(t("toasts.error"));
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const webhookBase = webhookToken
    ? `${origin}/api/reseller-webhook/${webhookToken}`
    : null;

  const createClient = async () => {
    const email = newEmail.trim();
    if (!email) return;
    setCreating(true);
    try {
      const res = await fetch("/api/reseller/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, first_name: newFirstName.trim(), plan: newPlan }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(
          json.already_exists ? t("toasts.alreadyExists") : t("toasts.created", { email }),
        );
        setNewEmail("");
        setNewFirstName("");
        fetchClients();
      } else if (json.error === "email_taken") {
        toast.error(t("toasts.emailTaken"));
      } else if (json.error === "invalid_email") {
        toast.error(t("toasts.invalidEmail"));
      } else {
        toast.error(t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setCreating(false);
    }
  };

  const resendAccess = async (client: Client) => {
    setBusyUserId(client.user_id);
    try {
      const res = await fetch("/api/reseller/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: client.user_id }),
      });
      const json = await res.json();
      if (json.ok) toast.success(t("toasts.accessSent", { email: client.email ?? "" }));
      else toast.error(t("toasts.error"));
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setBusyUserId(null);
    }
  };

  const stats = useMemo(() => {
    const total = clients.length;
    const paid = clients.filter((c) => c.is_paid).length;
    const active30 = clients.filter((c) => {
      const d = daysAgo(c.last_sign_in);
      return d !== null && d <= 30;
    }).length;
    const active7 = clients.filter((c) => {
      const d = daysAgo(c.last_sign_in);
      return d !== null && d <= 7;
    }).length;
    const never = clients.filter((c) => !c.last_sign_in).length;
    const withProject = clients.filter(
      (c) => c.quiz_count + c.survey_count + c.popquiz_count > 0,
    ).length;
    const totalLeads = clients.reduce((s, c) => s + c.lead_count, 0);
    return { total, paid, active30, active7, never, withProject, totalLeads };
  }, [clients]);

  const filtered = useMemo(() => {
    return clients
      .filter((c) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.first_name ?? "").toLowerCase().includes(q) ||
          (c.last_name ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "leads") return b.lead_count - a.lead_count;
        if (sortBy === "projects") {
          const pa = a.quiz_count + a.survey_count + a.popquiz_count;
          const pb = b.quiz_count + b.survey_count + b.popquiz_count;
          return pb - pa;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [clients, search, sortBy]);

  const planBadge = (plan: string, isPaid: boolean) => {
    const cls = isPaid
      ? "bg-green-100 text-green-700"
      : "bg-gray-100 text-gray-600";
    return <Badge className={cls}>{plan}</Badge>;
  };

  const activationRow = (label: string, value: number) => {
    const pct = stats.total > 0 ? Math.round((value / stats.total) * 100) : 0;
    return (
      <div key={label} className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">
            {value} ({pct}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle", { name: resellerName })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchClients}>
          <RefreshCw className="w-4 h-4 mr-1" />
          {t("refresh")}
        </Button>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t("stats.totalClients"), value: stats.total, icon: Users },
          { label: t("stats.paidClients"), value: stats.paid, icon: Wallet },
          { label: t("stats.active30"), value: stats.active30, icon: BarChart3 },
          { label: t("stats.totalLeads"), value: stats.totalLeads, icon: BarChart3 },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
              <div className="text-xl font-bold mt-1">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activation : qui utilise vraiment l'outil */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h2 className="text-sm font-semibold">{t("activation.title")}</h2>
          {activationRow(t("activation.withProject"), stats.withProject)}
          {activationRow(t("activation.active7"), stats.active7)}
          {activationRow(t("activation.active30"), stats.active30)}
          {activationRow(t("activation.never"), stats.never)}
        </CardContent>
      </Card>

      {/* Création de compte client */}
      <Card>
        <CardContent className="pt-4">
          <h2 className="text-sm font-semibold mb-3">{t("create.title")}</h2>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-xs font-medium">{t("create.email")}</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="w-40 space-y-1">
              <label className="text-xs font-medium">{t("create.firstName")}</label>
              <Input
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                placeholder={t("create.firstNamePlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">{t("create.plan")}</label>
              <select
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value)}
                className="border rounded-lg px-2 py-2 text-sm block bg-background"
              >
                {CREATABLE_PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={createClient} disabled={creating || !newEmail.trim()}>
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  {t("create.btn")}
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{t("create.hint")}</p>
        </CardContent>
      </Card>

      {/* Bons de commande du revendeur */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h2 className="text-sm font-semibold">{t("checkout.title")}</h2>
          <p className="text-xs text-muted-foreground">{t("checkout.desc")}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {CHECKOUT_PLAN_KEYS.map((key) => {
              const orderUrl =
                slug && (checkoutUrls[key] ?? "").trim()
                  ? `${origin}/order/${slug}/${key}`
                  : null;
              return (
                <div key={key} className="space-y-1.5 rounded-lg border p-3">
                  <div className="text-xs font-semibold">{t(`checkout.plans.${key}`)}</div>
                  <label className="text-[11px] text-muted-foreground block">
                    {t("checkout.urlLabel")}
                  </label>
                  <Input
                    type="url"
                    value={checkoutUrls[key] ?? ""}
                    onChange={(e) =>
                      setCheckoutUrls((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder="https://..."
                  />
                  <label className="text-[11px] text-muted-foreground block">
                    {t("checkout.priceLabel")}
                  </label>
                  <Input
                    value={pricingLabels[key] ?? ""}
                    onChange={(e) =>
                      setPricingLabels((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={t("checkout.pricePlaceholder")}
                  />
                  {orderUrl ? (
                    <button
                      type="button"
                      onClick={() => copyText(orderUrl)}
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      title={orderUrl}
                    >
                      <Copy className="w-3 h-3" />
                      {t("checkout.copyOrderPage")}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <Button onClick={saveCheckoutUrls} disabled={savingCheckout} size="sm">
            {savingCheckout ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t("checkout.saveBtn")
            )}
          </Button>
          <p className="text-xs text-muted-foreground">{t("checkout.orderPageHint")}</p>
        </CardContent>
      </Card>

      {/* Automatisation : webhook de provisioning */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h2 className="text-sm font-semibold">{t("automation.title")}</h2>
          <p className="text-xs text-muted-foreground">{t("automation.desc")}</p>
          {webhookBase ? (
            <>
              <div className="space-y-2">
                {CHECKOUT_PLAN_KEYS.map((key) => (
                  <div key={key} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium shrink-0">
                      {t("automation.activateFor", { plan: t(`checkout.plans.${key}`) })}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(`${webhookBase}?plan=${key}&action=activate`)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-muted text-[11px] font-mono truncate max-w-[60%]"
                      title={`${webhookBase}?plan=${key}&action=activate`}
                    >
                      <Copy className="w-3 h-3 shrink-0" />
                      <span className="truncate">{`...?plan=${key}&action=activate`}</span>
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium shrink-0">{t("automation.cancelLabel")}</span>
                  <button
                    type="button"
                    onClick={() => copyText(`${webhookBase}?action=cancel`)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-muted text-[11px] font-mono truncate max-w-[60%]"
                    title={`${webhookBase}?action=cancel`}
                  >
                    <Copy className="w-3 h-3 shrink-0" />
                    <span className="truncate">...?action=cancel</span>
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t("automation.hint")}</p>
              <button
                type="button"
                onClick={regenerateToken}
                disabled={regenerating}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {regenerating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  t("automation.regenerateBtn")
                )}
              </button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{t("automation.noToken")}</p>
          )}
        </CardContent>
      </Card>

      {/* Recherche + tri */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <button
          onClick={() =>
            setSortBy((s) => (s === "date" ? "leads" : s === "leads" ? "projects" : "date"))
          }
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {t("sortLabel", { sort: t(`sort.${sortBy}`) })}
        </button>
      </div>

      {/* Table clients */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">{t("columns.client")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.plan")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.quiz")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.surveys")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.popquiz")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.leads")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.lastLogin")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.user_id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                      </div>
                    </td>
                    <td className="px-4 py-3">{planBadge(c.plan, c.is_paid)}</td>
                    <td className="px-4 py-3">{c.quiz_count}</td>
                    <td className="px-4 py-3">{c.survey_count}</td>
                    <td className="px-4 py-3">{c.popquiz_count}</td>
                    <td className="px-4 py-3">{c.lead_count}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {c.last_sign_in
                        ? new Date(c.last_sign_in).toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : t("never")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => resendAccess(c)}
                        disabled={busyUserId === c.user_id}
                        title={t("actions.resendAccessTitle")}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border hover:bg-muted disabled:opacity-50"
                      >
                        {busyUserId === c.user_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Mail className="w-3 h-3" />
                        )}
                        {t("actions.resendAccess")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center py-8 text-sm text-muted-foreground">
                {clients.length === 0 ? t("emptyState") : t("noResults")}
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
