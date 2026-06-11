"use client";

// components/admin/ResellersCard.tsx
//
// Section "Revendeurs" du dashboard admin Béné : promouvoir un user
// Tiquiz existant en revendeur, voir la taille des portefeuilles,
// suspendre/réactiver. La suspension coupe l'accès au panel /reseller
// mais ne touche PAS aux comptes de ses clients.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Handshake, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Invoice = {
  id: string;
  reseller_name: string;
  period: string;
  licence_count: number;
  rate: number;
  total_cents: number;
  lines: Array<{ plan: string; licences: number; missing_price: boolean }>;
  status: "pending" | "paid";
};

type Reseller = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  status: "active" | "suspended";
  client_count: number;
  // Licence = compte payant (mensuel, annuel, plus ou normal). Un
  // compte gratuit n'est PAS une licence (définition Béné 11 juin 2026).
  licence_count: number;
  free_count: number;
  by_plan: Record<string, number>;
  current_rate: number;
  created_at: string;
};

export default function ResellersCard() {
  const t = useTranslations("admin.resellers");

  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [generating, setGenerating] = useState(false);
  const [busyInvoiceId, setBusyInvoiceId] = useState<string | null>(null);

  const fetchResellers = async () => {
    try {
      const res = await fetch("/api/admin/resellers", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setResellers(json.resellers ?? []);
    } catch {
      /* table absente pré-migration : section vide, pas d'erreur */
    } finally {
      setLoaded(true);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/admin/reseller-invoices", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setInvoices(json.invoices ?? []);
    } catch {
      /* table absente pré-migration */
    }
  };

  useEffect(() => {
    fetchResellers();
    fetchInvoices();
  }, []);

  const generateInvoices = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/reseller-invoices", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        toast.success(t("invoices.generated"));
        fetchInvoices();
      } else {
        toast.error(json.error || t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setGenerating(false);
    }
  };

  const markInvoice = async (inv: Invoice, status: "paid" | "pending") => {
    setBusyInvoiceId(inv.id);
    try {
      const res = await fetch("/api/admin/reseller-invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: inv.id, status }),
      });
      const json = await res.json();
      if (json.ok) {
        setInvoices((prev) =>
          prev.map((x) => (x.id === inv.id ? { ...x, status } : x)),
        );
        toast.success(status === "paid" ? t("invoices.markedPaid") : t("invoices.markedPending"));
      } else {
        toast.error(json.error || t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setBusyInvoiceId(null);
    }
  };

  const promote = async () => {
    if (!email.trim() || !name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/resellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(
          json.account_created
            ? t("toasts.promotedNew", { email: email.trim() })
            : t("toasts.promoted", { email: email.trim() }),
        );
        setEmail("");
        setName("");
        fetchResellers();
      } else if (json.error === "user_not_found") {
        toast.error(t("toasts.userNotFound"));
      } else if (json.error === "already_reseller") {
        toast.error(t("toasts.alreadyReseller"));
      } else {
        toast.error(json.error || t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (r: Reseller) => {
    const next = r.status === "active" ? "suspended" : "active";
    setBusyId(r.id);
    try {
      const res = await fetch("/api/admin/resellers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reseller_id: r.id, status: next }),
      });
      const json = await res.json();
      if (json.ok) {
        setResellers((prev) =>
          prev.map((x) => (x.id === r.id ? { ...x, status: next } : x)),
        );
        toast.success(next === "active" ? t("toasts.activated") : t("toasts.suspended"));
      } else {
        toast.error(json.error || t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setBusyId(null);
    }
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Handshake className="w-4 h-4" />
          {t("title")}
        </h2>

        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs font-medium">{t("emailLabel")}</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="w-48 space-y-1">
            <label className="text-xs font-medium">{t("nameLabel")}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>
          <Button onClick={promote} disabled={creating || !email.trim() || !name.trim()}>
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                {t("promoteBtn")}
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("hint")}</p>

        {resellers.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">{t("columns.name")}</th>
                <th className="px-3 py-2 font-medium">{t("columns.email")}</th>
                <th className="px-3 py-2 font-medium">{t("columns.accounts")}</th>
                <th className="px-3 py-2 font-medium">{t("columns.licences")}</th>
                <th className="px-3 py-2 font-medium">{t("columns.free")}</th>
                <th className="px-3 py-2 font-medium">{t("columns.plans")}</th>
                <th className="px-3 py-2 font-medium">{t("columns.rate")}</th>
                <th className="px-3 py-2 font-medium">{t("columns.status")}</th>
                <th className="px-3 py-2 font-medium">{t("columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {resellers.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                  <td className="px-3 py-2">{r.client_count}</td>
                  <td className="px-3 py-2">
                    <Badge className="bg-green-100 text-green-700">{r.licence_count}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.free_count}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {Object.entries(r.by_plan)
                      .filter(([plan]) => plan !== "free")
                      .map(([plan, n]) => `${plan}: ${n}`)
                      .join(", ") || "-"}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {Math.round(r.current_rate * 100)}%
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      className={
                        r.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }
                    >
                      {r.status === "active" ? t("statusActive") : t("statusSuspended")}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleStatus(r)}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border hover:bg-muted disabled:opacity-50"
                    >
                      {busyId === r.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : r.status === "active" ? (
                        t("suspendBtn")
                      ) : (
                        t("activateBtn")
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Factures de commission */}
        {resellers.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("invoices.title")}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={generateInvoices}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("invoices.generateBtn")
                )}
              </Button>
            </div>
            {invoices.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("invoices.empty")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">{t("invoices.reseller")}</th>
                    <th className="px-3 py-2 font-medium">{t("invoices.period")}</th>
                    <th className="px-3 py-2 font-medium">{t("invoices.licences")}</th>
                    <th className="px-3 py-2 font-medium">{t("invoices.rate")}</th>
                    <th className="px-3 py-2 font-medium">{t("invoices.total")}</th>
                    <th className="px-3 py-2 font-medium">{t("invoices.status")}</th>
                    <th className="px-3 py-2 font-medium">{t("invoices.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const hasMissing = (inv.lines ?? []).some((l) => l.missing_price);
                    return (
                      <tr key={inv.id} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{inv.reseller_name}</td>
                        <td className="px-3 py-2">{inv.period}</td>
                        <td className="px-3 py-2">{inv.licence_count}</td>
                        <td className="px-3 py-2">{Math.round(inv.rate * 100)}%</td>
                        <td className="px-3 py-2 font-medium">
                          {(inv.total_cents / 100).toFixed(2)} EUR
                          {hasMissing ? (
                            <span
                              className="ml-1 text-amber-600"
                              title={t("invoices.missingPrice")}
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
                              ? t("invoices.statusPaid")
                              : t("invoices.statusPending")}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              markInvoice(inv, inv.status === "paid" ? "pending" : "paid")
                            }
                            disabled={busyInvoiceId === inv.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border hover:bg-muted disabled:opacity-50"
                          >
                            {busyInvoiceId === inv.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : inv.status === "paid" ? (
                              t("invoices.markPending")
                            ) : (
                              t("invoices.markPaid")
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {invoices.some((inv) => (inv.lines ?? []).some((l) => l.missing_price)) ? (
              <p className="text-xs text-amber-600">{t("invoices.missingPrice")}</p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
