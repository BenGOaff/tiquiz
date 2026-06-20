"use client";

// components/reseller/ResellerDashboard.tsx
//
// Panel revendeur organisé en 5 onglets (demande Béné 12 juin 2026,
// même pattern que Réglages) :
//   1. Mes clients      : créer un compte, gérer les plans, renvoyer l'accès
//   2. Activité         : qui utilise vraiment l'outil
//   3. Bons de commande : option Systeme.io OU option Tiquiz hébergé,
//                         expliqué pas à pas
//   4. Modes de paiement: connecter Stripe / PayPal (liens de paiement)
//                         + livraison automatique des accès (webhooks)
//   5. Facturation      : ce qu'il doit à Tipote, expliqué simplement
//
// RGPD : compteurs uniquement, jamais le contenu des quiz ni les leads.

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  Copy,
  CreditCard,
  AlertTriangle,
  ExternalLink,
  FileText,
  History,
  Loader2,
  Lock,
  Mail,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type ProviderStatus = { connected: boolean; env: string | null; label: string | null };
type PaymentConn = {
  cryptoReady: boolean;
  stripe: ProviderStatus;
  paypal: ProviderStatus;
};

type BillingInvoice = {
  id: string;
  period: string;
  licence_count: number;
  rate: number;
  currency: string;
  total_cents: number;
  lines: Array<{ plan: string; licences: number; missing_price: boolean }>;
  status: "pending" | "paid";
  paid_at: string | null;
};

type Billing = {
  licences: number;
  rate: number;
  tiers: Array<{ max_active: number | null; rate: number }>;
  estimateCents: number;
  estimateMissingPrice: boolean;
  invoices: BillingInvoice[];
  payoutStripe: string | null;
  payoutPaypal: string | null;
};

const CREATABLE_PLANS = ["free", "monthly", "yearly", "monthly_plus", "yearly_plus"] as const;
const PAID_PLAN_KEYS = ["monthly", "yearly", "monthly_plus", "yearly_plus"] as const;

// Montant suggéré par plan, affiché en placeholder du champ "Tarif déclaré"
// pour guider le revendeur. Chiffre SEUL (pas de "(mensuel)" qui poussait a
// recopier le texte dans le champ -> NaN, drame Sebastien 15 juin 2026).
const AMOUNT_PLACEHOLDER: Record<string, string> = {
  monthly: "9",
  monthly_plus: "29",
  yearly: "90",
  yearly_plus: "290",
};

const DAY_MS = 24 * 3600 * 1000;

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
}

function eur(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} EUR`;
}

export default function ResellerDashboard({ resellerName }: { resellerName: string }) {
  const t = useTranslations("reseller");

  // ----- données -----
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<Billing | null>(null);

  // tarifs (un montant par plan) + slug des bons de commande hostes
  const [pricingAmounts, setPricingAmounts] = useState<Record<string, string>>({});
  const [slug, setSlug] = useState<string | null>(null);
  // page de vente repliquee : identifiant lisible /<handle>/tiquiz
  const [handle, setHandle] = useState<string | null>(null);
  const [handleInput, setHandleInput] = useState("");
  const [savingHandle, setSavingHandle] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");
  const [savingSupport, setSavingSupport] = useState(false);

  // ----- connexion paiement native (checkout Tiquiz) -----
  const [conn, setConn] = useState<PaymentConn | null>(null);
  const [stripeKeyInput, setStripeKeyInput] = useState("");
  const [paypalIdInput, setPaypalIdInput] = useState("");
  const [paypalSecretInput, setPaypalSecretInput] = useState("");
  const [connBusy, setConnBusy] = useState<
    null | "stripe" | "paypal" | "stripe-off" | "paypal-off"
  >(null);

  // ----- suivi paiements (journal) -----
  type PayEvent = {
    id: number;
    provider: string | null;
    stage: string;
    event: string;
    ok: boolean;
    email: string | null;
    plan: string | null;
    detail: string | null;
    created_at: string;
  };
  const [payEvents, setPayEvents] = useState<PayEvent[]>([]);
  const [payEventsLoading, setPayEventsLoading] = useState(true);

  // ----- état UI -----
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "leads" | "projects">("date");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newPlan, setNewPlan] = useState<string>("free");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const fetchBilling = async () => {
    try {
      const res = await fetch("/api/reseller/billing", { cache: "no-store" });
      const json = await res.json();
      if (json?.ok) {
        setBilling({
          licences: json.licences ?? 0,
          rate: json.rate ?? 0,
          tiers: json.tiers ?? [],
          estimateCents: json.estimate_cents ?? 0,
          estimateMissingPrice: !!json.estimate_missing_price,
          invoices: json.invoices ?? [],
          payoutStripe: json.payout_urls?.stripe ?? null,
          payoutPaypal: json.payout_urls?.paypal ?? null,
        });
      }
    } catch {
      /* silencieux */
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/reseller/settings", { cache: "no-store" });
      const json = await res.json();
      if (json?.ok) {
        const amounts: Record<string, string> = {};
        for (const [k, v] of Object.entries(
          (json.pricing ?? {}) as Record<string, { amount_cents?: number }>,
        )) {
          if (typeof v?.amount_cents === "number") amounts[k] = String(v.amount_cents / 100);
        }
        setPricingAmounts(amounts);
        setSlug(json.slug ?? null);
        setHandle(json.handle ?? null);
        setHandleInput(json.handle ?? "");
        setSupportEmail(json.support_email ?? "");
      }
    } catch {
      /* silencieux */
    }
  };

  const fetchPaymentConn = async () => {
    try {
      const res = await fetch("/api/reseller/payment-keys", { cache: "no-store" });
      const json = await res.json();
      if (json?.ok) {
        setConn({ cryptoReady: !!json.crypto_ready, stripe: json.stripe, paypal: json.paypal });
      }
    } catch {
      /* silencieux */
    }
  };

  const fetchPayEvents = async () => {
    setPayEventsLoading(true);
    try {
      const res = await fetch("/api/reseller/payment-events", { cache: "no-store" });
      const json = await res.json();
      if (json?.ok) setPayEvents(json.events ?? []);
    } catch {
      /* silencieux */
    } finally {
      setPayEventsLoading(false);
    }
  };

  const applyConn = (json: { stripe: ProviderStatus; paypal: ProviderStatus }) => {
    setConn((c) => ({ cryptoReady: c?.cryptoReady ?? true, stripe: json.stripe, paypal: json.paypal }));
  };

  const connectStripe = async () => {
    const secret = stripeKeyInput.trim();
    if (!secret) return;
    setConnBusy("stripe");
    try {
      const res = await fetch("/api/reseller/payment-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "stripe", secret }),
      });
      const json = await res.json();
      if (json.ok) {
        applyConn(json);
        setStripeKeyInput("");
        toast.success(t("connect.toastConnected"));
      } else if (json.error === "stripe_invalid") {
        toast.error(t("connect.errStripe"));
      } else if (json.error === "crypto_unavailable") {
        toast.error(t("connect.errCrypto"));
      } else {
        toast.error(t("connect.errGeneric"));
      }
    } catch {
      toast.error(t("connect.errGeneric"));
    } finally {
      setConnBusy(null);
    }
  };

  const connectPaypal = async () => {
    const client_id = paypalIdInput.trim();
    const secret = paypalSecretInput.trim();
    if (!client_id || !secret) return;
    setConnBusy("paypal");
    try {
      const res = await fetch("/api/reseller/payment-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "paypal", client_id, secret }),
      });
      const json = await res.json();
      if (json.ok) {
        applyConn(json);
        setPaypalIdInput("");
        setPaypalSecretInput("");
        toast.success(t("connect.toastConnected"));
      } else if (json.error === "paypal_invalid") {
        toast.error(t("connect.errPaypal"));
      } else if (json.error === "crypto_unavailable") {
        toast.error(t("connect.errCrypto"));
      } else {
        toast.error(t("connect.errGeneric"));
      }
    } catch {
      toast.error(t("connect.errGeneric"));
    } finally {
      setConnBusy(null);
    }
  };

  const disconnectProvider = async (provider: "stripe" | "paypal") => {
    setConnBusy(provider === "stripe" ? "stripe-off" : "paypal-off");
    try {
      const res = await fetch("/api/reseller/payment-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, disconnect: true }),
      });
      const json = await res.json();
      if (json.ok) {
        applyConn(json);
        toast.success(t("connect.toastDisconnected"));
      } else {
        toast.error(t("connect.errGeneric"));
      }
    } catch {
      toast.error(t("connect.errGeneric"));
    } finally {
      setConnBusy(null);
    }
  };

  const saveSupportEmail = async () => {
    setSavingSupport(true);
    try {
      const res = await fetch("/api/reseller/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ support_email: supportEmail.trim() }),
      });
      const json = await res.json();
      if (json.ok) {
        setSupportEmail(json.support_email ?? "");
        toast.success(t("saved"));
      } else if (json.error === "invalid_support_email") {
        toast.error(t("toasts.invalidEmail"));
      } else {
        toast.error(t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSavingSupport(false);
    }
  };

  const saveHandle = async () => {
    setSavingHandle(true);
    try {
      const res = await fetch("/api/reseller/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handleInput.trim() }),
      });
      const json = await res.json();
      if (json.ok) {
        setHandle(json.handle ?? null);
        setHandleInput(json.handle ?? "");
        toast.success(t("saved"));
      } else if (json.error === "handle_taken") {
        toast.error(t("salesPage.handleTaken"));
      } else if (json.error === "invalid_handle") {
        toast.error(t("salesPage.invalidHandle"));
      } else {
        toast.error(t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSavingHandle(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchSettings();
    fetchBilling();
    fetchPaymentConn();
    fetchPayEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- actions -----

  const saveSettings = async () => {
    setSaving(true);
    try {
      const pricing: Record<string, { amount?: string }> = {};
      for (const key of PAID_PLAN_KEYS) {
        const amount = (pricingAmounts[key] ?? "").trim();
        if (!amount) continue;
        pricing[key] = { amount };
      }
      const res = await fetch("/api/reseller/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricing }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(t("saved"));
        fetchBilling();
      } else if (json.error === "invalid_url") {
        toast.error(t("invalidUrl", { plan: json.plan ?? "" }));
      } else if (json.error === "invalid_amount") {
        toast.error(t("invalidAmount", { plan: json.plan ?? "" }));
      } else if (json.error === "invalid_price") {
        toast.error(t("invalidPrice", { plan: json.plan ?? "" }));
      } else {
        // Dernier recours : on expose le code serveur pour ne plus avoir
        // un message opaque impossible a diagnostiquer (drame Sebastien).
        toast.error(t("toasts.error") + (json.error ? ` (${json.error})` : ""));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSaving(false);
    }
  };

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
        fetchBilling();
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

  const setClientPlan = async (client: Client, plan: string) => {
    if (plan === client.plan) return;
    setBusyUserId(client.user_id);
    try {
      const res = await fetch("/api/reseller/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: client.user_id, op: "set_plan", plan }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(t("toasts.planUpdated", { plan }));
        setClients((prev) =>
          prev.map((c) =>
            c.user_id === client.user_id ? { ...c, plan, is_paid: plan !== "free" } : c,
          ),
        );
        fetchBilling();
      } else {
        toast.error(t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setBusyUserId(null);
    }
  };

  const resendAccess = async (client: Client) => {
    setBusyUserId(client.user_id);
    try {
      const res = await fetch("/api/reseller/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: client.user_id, op: "resend" }),
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

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("copied"));
    } catch {
      toast.error(t("toasts.error"));
    }
  };

  // ----- dérivés -----

  const origin = typeof window !== "undefined" ? window.location.origin : "";

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

  // Barème lisible : "1 à 200 : 40%", dernier palier "3001 et plus".
  const tierRows = useMemo(() => {
    if (!billing) return [];
    const sorted = [...billing.tiers].sort((a, b) => {
      if (a.max_active === null) return 1;
      if (b.max_active === null) return -1;
      return a.max_active - b.max_active;
    });
    let from = 1;
    return sorted.map((tier) => {
      const range =
        tier.max_active === null
          ? t("billing.tierLast", { from })
          : t("billing.tierRange", { from, to: tier.max_active });
      const row = {
        range,
        rate: Math.round(tier.rate * 100),
        current:
          billing.licences >= from &&
          (tier.max_active === null || billing.licences <= tier.max_active),
      };
      from = (tier.max_active ?? 0) + 1;
      return row;
    });
  }, [billing, t]);

  const planBadge = (plan: string, isPaid: boolean) => (
    <Badge className={isPaid ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
      {plan}
    </Badge>
  );

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

  const copyButton = (value: string, label: string) => (
    <button
      type="button"
      onClick={() => copyText(value)}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border hover:bg-muted"
      title={value}
    >
      <Copy className="w-3 h-3 shrink-0" />
      {label}
    </button>
  );

  const pendingTotal = billing
    ? billing.invoices
        .filter((i) => i.status === "pending")
        .reduce((s, i) => s + i.total_cents, 0)
    : 0;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle", { name: resellerName })}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchClients();
            fetchBilling();
          }}
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          {t("refresh")}
        </Button>
      </div>

      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList className="h-auto p-1 gap-1 flex-wrap">
          <TabsTrigger value="clients" className="gap-1.5 px-4 py-2">
            <Users className="h-4 w-4" />
            {t("tabs.clients")}
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 px-4 py-2">
            <BarChart3 className="h-4 w-4" />
            {t("tabs.activity")}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5 px-4 py-2">
            <FileText className="h-4 w-4" />
            {t("tabs.orders")}
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5 px-4 py-2">
            <CreditCard className="h-4 w-4" />
            {t("tabs.payments")}
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5 px-4 py-2">
            <ReceiptText className="h-4 w-4" />
            {t("tabs.billing")}
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5 px-4 py-2">
            <History className="h-4 w-4" />
            {t("tabs.events")}
          </TabsTrigger>
        </TabsList>

        {/* ================= ONGLET 1 : MES CLIENTS ================= */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <h2 className="text-sm font-semibold mb-1">{t("create.title")}</h2>
              <p className="text-xs text-muted-foreground mb-3">{t("create.hint")}</p>
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
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <h2 className="text-sm font-semibold mb-1">{t("support.title")}</h2>
              <p className="text-xs text-muted-foreground mb-3">{t("support.desc")}</p>
              <div className="flex items-end gap-3 flex-wrap">
                <div className="flex-1 min-w-[220px] space-y-1">
                  <label className="text-xs font-medium">{t("support.label")}</label>
                  <Input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="support@monsite.com"
                  />
                </div>
                <Button onClick={saveSupportEmail} disabled={savingSupport} size="sm">
                  {savingSupport ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("saveBtn")
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{t("support.hint")}</p>
            </CardContent>
          </Card>

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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <select
                              value={c.plan}
                              onChange={(e) => setClientPlan(c, e.target.value)}
                              disabled={busyUserId === c.user_id}
                              className="border rounded px-2 py-1 text-xs bg-background disabled:opacity-50"
                              title={t("actions.setPlanTitle")}
                            >
                              {CREATABLE_PLANS.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                              {!CREATABLE_PLANS.includes(
                                c.plan as (typeof CREATABLE_PLANS)[number],
                              ) ? (
                                <option value={c.plan}>{c.plan}</option>
                              ) : null}
                            </select>
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
                          </div>
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
        </TabsContent>

        {/* ================= ONGLET 2 : ACTIVITÉ ================= */}
        <TabsContent value="activity" className="space-y-4">
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

          <Card>
            <CardContent className="pt-4 space-y-3">
              <h2 className="text-sm font-semibold">{t("activation.title")}</h2>
              <p className="text-xs text-muted-foreground">{t("activation.desc")}</p>
              {activationRow(t("activation.withProject"), stats.withProject)}
              {activationRow(t("activation.active7"), stats.active7)}
              {activationRow(t("activation.active30"), stats.active30)}
              {activationRow(t("activation.never"), stats.never)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= ONGLET 3 : BONS DE COMMANDE ================= */}
        <TabsContent value="orders" className="space-y-4">
          {/* Page de vente repliquee */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h2 className="text-sm font-semibold">{t("salesPage.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("salesPage.intro")}</p>
              {handle ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {copyButton(`${origin}/${handle}/tiquiz`, t("orders.copyLink"))}
                  <a
                    href={`${origin}/${handle}/tiquiz`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {t("orders.openPage")}
                  </a>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground block">
                  {t("salesPage.handleLabel")}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">{origin}/</span>
                  <Input
                    value={handleInput}
                    onChange={(e) => setHandleInput(e.target.value)}
                    placeholder="mon-nom"
                    className="w-48"
                  />
                  <span className="text-xs text-muted-foreground">/tiquiz</span>
                  <Button onClick={saveHandle} disabled={savingHandle} size="sm">
                    {savingHandle ? <Loader2 className="w-4 h-4 animate-spin" /> : t("saveBtn")}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">{t("salesPage.handleHint")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 space-y-2">
              <h2 className="text-sm font-semibold">{t("orders.nativeTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("orders.nativeIntro")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                {PAID_PLAN_KEYS.map((key) => {
                  const hasAmount = Boolean((pricingAmounts[key] ?? "").trim());
                  const anyProvider = Boolean(
                    conn?.stripe.connected || conn?.paypal.connected,
                  );
                  const orderUrl =
                    slug && hasAmount && anyProvider ? `${origin}/order/${slug}/${key}` : null;
                  return (
                    <div key={key} className="space-y-1.5 rounded-lg border p-3">
                      <div className="text-xs font-semibold">{t(`plans.${key}`)}</div>
                      <label className="text-[11px] text-muted-foreground block">
                        {t("orders.amountLabel")}
                      </label>
                      <Input
                        inputMode="decimal"
                        value={pricingAmounts[key] ?? ""}
                        onChange={(e) =>
                          setPricingAmounts((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder={AMOUNT_PLACEHOLDER[key] ?? ""}
                      />
                      {orderUrl ? (
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          {copyButton(orderUrl, t("orders.copyLink"))}
                          <a
                            href={orderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {t("orders.openPage")}
                          </a>
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-600">{t("orders.needPriceOrPay")}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button onClick={saveSettings} disabled={saving} size="sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("saveBtn")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= ONGLET 4 : MODES DE PAIEMENT ================= */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-2">
              <h2 className="text-sm font-semibold">{t("payments.introTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("payments.intro")}</p>
            </CardContent>
          </Card>

          {/* Connexion native Stripe / PayPal (checkout Tiquiz, sans lien
              ni webhook a creer). Remplacera les sections plus bas. */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{t("connect.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{t("connect.intro")}</p>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {t("connect.secureNote")}
              </p>
              {conn && !conn.cryptoReady ? (
                <p className="text-xs text-amber-600">{t("connect.needAdmin")}</p>
              ) : null}
            </CardContent>
          </Card>

          {/* Stripe */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold">{t("connect.stripeTitle")}</h3>
                {conn?.stripe.connected ? (
                  <Badge className="bg-green-100 text-green-700 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t("connect.statusConnected")}
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-600">{t("connect.statusOff")}</Badge>
                )}
              </div>

              {conn?.stripe.connected ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t("connect.connectedAs", { label: conn.stripe.label ?? "Stripe" })}
                  </p>
                  {conn.stripe.env === "test" ? (
                    <p className="text-xs text-amber-600">{t("connect.testWarning")}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => disconnectProvider("stripe")}
                    disabled={connBusy === "stripe-off"}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    {connBusy === "stripe-off" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      t("connect.disconnectBtn")
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[11px] text-muted-foreground block">
                    {t("connect.stripeSecretLabel")}
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      type="password"
                      autoComplete="off"
                      value={stripeKeyInput}
                      onChange={(e) => setStripeKeyInput(e.target.value)}
                      placeholder={t("connect.stripeSecretPlaceholder")}
                      className="flex-1 min-w-[220px]"
                    />
                    <Button
                      onClick={connectStripe}
                      disabled={
                        connBusy === "stripe" ||
                        !stripeKeyInput.trim() ||
                        (conn ? !conn.cryptoReady : false)
                      }
                      size="sm"
                    >
                      {connBusy === "stripe" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t("connect.connectBtn")
                      )}
                    </Button>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                    <p className="text-[11px] font-semibold">{t("connect.stripeStepsTitle")}</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-muted-foreground">
                      <li>{t("connect.stripeStep1")}</li>
                      <li>{t("connect.stripeStep2")}</li>
                      <li>{t("connect.stripeStep3")}</li>
                      <li>{t("connect.stripeStep4")}</li>
                      <li>{t("connect.stripeStep5")}</li>
                    </ol>
                    <p className="text-[11px] text-muted-foreground">{t("connect.stripeStepAlt")}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PayPal */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold">{t("connect.paypalTitle")}</h3>
                {conn?.paypal.connected ? (
                  <Badge className="bg-green-100 text-green-700 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t("connect.statusConnected")}
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-600">{t("connect.statusOff")}</Badge>
                )}
              </div>

              {conn?.paypal.connected ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t("connect.connectedAs", { label: conn.paypal.label ?? "PayPal" })}
                  </p>
                  {conn.paypal.env === "sandbox" ? (
                    <p className="text-xs text-amber-600">{t("connect.testWarning")}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => disconnectProvider("paypal")}
                    disabled={connBusy === "paypal-off"}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    {connBusy === "paypal-off" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      t("connect.disconnectBtn")
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[11px] text-muted-foreground block">
                    {t("connect.paypalIdLabel")}
                  </label>
                  <Input
                    autoComplete="off"
                    value={paypalIdInput}
                    onChange={(e) => setPaypalIdInput(e.target.value)}
                    placeholder="AeA1QIZ..."
                  />
                  <label className="text-[11px] text-muted-foreground block">
                    {t("connect.paypalSecretLabel")}
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      type="password"
                      autoComplete="off"
                      value={paypalSecretInput}
                      onChange={(e) => setPaypalSecretInput(e.target.value)}
                      placeholder="EFa1c..."
                      className="flex-1 min-w-[220px]"
                    />
                    <Button
                      onClick={connectPaypal}
                      disabled={
                        connBusy === "paypal" ||
                        !paypalIdInput.trim() ||
                        !paypalSecretInput.trim() ||
                        (conn ? !conn.cryptoReady : false)
                      }
                      size="sm"
                    >
                      {connBusy === "paypal" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t("connect.connectBtn")
                      )}
                    </Button>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                    <p className="text-[11px] font-semibold">{t("connect.paypalStepsTitle")}</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-muted-foreground">
                      <li>{t("connect.paypalStep1")}</li>
                      <li>{t("connect.paypalStep2")}</li>
                      <li>{t("connect.paypalStep3")}</li>
                      <li>{t("connect.paypalStep4")}</li>
                    </ol>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>

        {/* ================= ONGLET 5 : FACTURATION TIPOTE ================= */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-2">
              <h2 className="text-sm font-semibold">{t("billing.howTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("billing.howText")}</p>
            </CardContent>
          </Card>

          {billing ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground">{t("billing.rateTitle")}</div>
                    <div className="text-xl font-bold mt-1">
                      {Math.round(billing.rate * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("billing.rateNote", { licences: billing.licences })}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground">
                      {t("billing.estimateTitle")}
                    </div>
                    <div className="text-xl font-bold mt-1">{eur(billing.estimateCents)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("billing.estimateNote")}
                    </div>
                    {billing.estimateMissingPrice ? (
                      <div className="text-xs text-amber-600 mt-1">
                        {t("billing.missingPrice")}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground">
                      {t("billing.pendingTitle")}
                    </div>
                    <div className="text-xl font-bold mt-1">{eur(pendingTotal)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("billing.pendingNote")}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="pt-4 space-y-2">
                  <h3 className="text-sm font-semibold">{t("billing.tiersTitle")}</h3>
                  <div className="space-y-1">
                    {tierRows.map((row) => (
                      <div
                        key={row.range}
                        className={`flex items-center justify-between text-sm rounded px-2 py-1 ${
                          row.current ? "bg-primary/10 font-medium" : "text-muted-foreground"
                        }`}
                      >
                        <span>{row.range}</span>
                        <span>{row.rate}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{t("billing.tiersNote")}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-3">
                  <h3 className="text-sm font-semibold">{t("billing.invoicesTitle")}</h3>
                  {billing.invoices.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("billing.empty")}</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 text-left">
                          <th className="px-3 py-2 font-medium">{t("billing.period")}</th>
                          <th className="px-3 py-2 font-medium">{t("billing.licences")}</th>
                          <th className="px-3 py-2 font-medium">{t("billing.rate")}</th>
                          <th className="px-3 py-2 font-medium">{t("billing.total")}</th>
                          <th className="px-3 py-2 font-medium">{t("billing.status")}</th>
                          <th className="px-3 py-2 font-medium">{t("billing.actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billing.invoices.map((inv) => {
                          const hasMissing = (inv.lines ?? []).some((l) => l.missing_price);
                          return (
                            <tr key={inv.id} className="border-b last:border-0">
                              <td className="px-3 py-2 font-medium">{inv.period}</td>
                              <td className="px-3 py-2">{inv.licence_count}</td>
                              <td className="px-3 py-2">{Math.round(inv.rate * 100)}%</td>
                              <td className="px-3 py-2 font-medium">
                                {eur(inv.total_cents)}
                                {hasMissing ? (
                                  <span
                                    className="ml-1 text-amber-600"
                                    title={t("billing.missingPrice")}
                                  >
                                    *
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2">
                                <Badge
                                  className={
                                    inv.status === "paid"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-amber-100 text-amber-700"
                                  }
                                >
                                  {inv.status === "paid"
                                    ? t("billing.statusPaid")
                                    : t("billing.statusPending")}
                                </Badge>
                              </td>
                              <td className="px-3 py-2">
                                {inv.status === "pending" ? (
                                  <div className="flex gap-1.5 flex-wrap">
                                    {billing.payoutStripe ? (
                                      <a
                                        href={billing.payoutStripe}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2 py-1 rounded text-xs border hover:bg-muted"
                                      >
                                        {t("billing.payStripe")}
                                      </a>
                                    ) : null}
                                    {billing.payoutPaypal ? (
                                      <a
                                        href={billing.payoutPaypal}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2 py-1 rounded text-xs border hover:bg-muted"
                                      >
                                        {t("billing.payPaypal")}
                                      </a>
                                    ) : null}
                                  </div>
                                ) : inv.paid_at ? (
                                  <span className="text-xs text-muted-foreground">
                                    {t("billing.paidOn", {
                                      date: new Date(inv.paid_at).toLocaleDateString(),
                                    })}
                                  </span>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-8">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            </div>
          )}
        </TabsContent>

        {/* ================= ONGLET 6 : SUIVI PAIEMENTS ================= */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-2">
              <h2 className="text-sm font-semibold">{t("events.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("events.intro")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              {payEventsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </div>
              ) : payEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  {t("events.empty")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="px-2 py-2 font-medium">{t("events.colDate")}</th>
                        <th className="px-2 py-2 font-medium">{t("events.colStatus")}</th>
                        <th className="px-2 py-2 font-medium">{t("events.colClient")}</th>
                        <th className="px-2 py-2 font-medium">{t("events.colDetail")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payEvents.map((e) => (
                        <tr
                          key={e.id}
                          className={`border-b last:border-0 ${e.ok ? "" : "bg-red-50"}`}
                        >
                          <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">
                            {new Date(e.created_at).toLocaleString(undefined, {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-2 py-2">
                            {e.ok ? (
                              <Badge className="bg-green-100 text-green-700 gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {t("events.statusOk")}
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {t("events.statusFail")}
                              </Badge>
                            )}
                          </td>
                          <td className="px-2 py-2 text-muted-foreground">{e.email ?? "-"}</td>
                          <td className="px-2 py-2 text-muted-foreground">{e.detail ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
