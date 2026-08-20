"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Users, BarChart3, RefreshCw, Plus, ArrowUpDown, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";

import ResellersCard from "@/components/admin/ResellersCard";
import ResellerPaymentEventsCard from "@/components/admin/ResellerPaymentEventsCard";
import WebhookLogsCard from "@/components/admin/WebhookLogsCard";

type User = {
  user_id?: string; id?: string; email: string; first_name?: string; last_name?: string;
  plan: string; quiz_count: number; lead_count: number; last_sign_in: string | null;
  created_at?: string;
  // Renseigné si le compte appartient au portefeuille d'un revendeur.
  reseller_name?: string | null;
};

export default function AdminDashboard() {
  const t = useTranslations("admin");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "leads" | "quizzes">("date");
  const [newEmail, setNewEmail] = useState("");
  const [newPlan, setNewPlan] = useState("free");
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (json.ok) setUsers(json.users ?? []);
      else toast.error(json.error);
    } catch { toast.error(t("toasts.loadError")); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const updatePlan = async (userId: string, plan: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, plan }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(t("toasts.planUpdated", { plan }));
        setUsers(prev => prev.map(u => (u.user_id ?? u.id) === userId ? { ...u, plan } : u));
      } else toast.error(json.error);
    } catch { toast.error(t("toasts.error")); }
  };

  const createUser = async () => {
    if (!newEmail.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim(), plan: newPlan, send_magic_link: true }),
      });
      const json = await res.json();
      if (json.ok) { toast.success(t("toasts.userCreated")); setNewEmail(""); fetchUsers(); }
      else toast.error(json.error);
    } catch { toast.error(t("toasts.error")); }
    finally { setCreating(false); }
  };

  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const resendMagicLink = async (email: string) => {
    if (!email) return;
    setBusyUserId(email);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (json.ok) toast.success(t("toasts.magicLinkResent", { email }));
      else toast.error(json.error || t("toasts.error"));
    } catch { toast.error(t("toasts.error")); }
    finally { setBusyUserId(null); }
  };

  // Suppression irréversible : on prévient l'admin avec un confirm()
  // natif qui rappelle ce qui sera détruit (auth + quizs + leads).
  // Pas de undo possible — toutes les FKs ont ON DELETE CASCADE.
  const deleteUser = async (userId: string, email: string) => {
    if (!userId) return;
    const ok = window.confirm(t("confirmDelete", { email }));
    if (!ok) return;
    setBusyUserId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(t("toasts.userDeleted", { email }));
        setUsers(prev => prev.filter(u => (u.user_id ?? u.id) !== userId));
      } else toast.error(json.error || t("toasts.error"));
    } catch { toast.error(t("toasts.error")); }
    finally { setBusyUserId(null); }
  };

  const filtered = users
    .filter(u => planFilter === "all" || u.plan === planFilter)
    .filter(u => !search || u.email.toLowerCase().includes(search.toLowerCase()) || (u.first_name ?? "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "leads") return b.lead_count - a.lead_count;
      if (sortBy === "quizzes") return b.quiz_count - a.quiz_count;
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    });

  const stats = {
    total: users.length,
    free: users.filter(u => u.plan === "free").length,
    monthly: users.filter(u => u.plan === "monthly").length,
    monthlyPlus: users.filter(u => u.plan === "monthly_plus").length,
    yearly: users.filter(u => u.plan === "yearly").length,
    yearlyPlus: users.filter(u => u.plan === "yearly_plus").length,
    lifetime: users.filter(u => u.plan === "lifetime").length,
    totalLeads: users.reduce((s, u) => s + u.lead_count, 0),
    totalQuizzes: users.reduce((s, u) => s + u.quiz_count, 0),
  };

  const planBadge = (plan: string) => {
    const paid = plan === "monthly" || plan === "monthly_plus" || plan === "yearly" || plan === "yearly_plus";
    const cls = plan === "lifetime" ? "bg-purple-100 text-purple-700" : paid ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600";
    return <Badge className={cls}>{plan}</Badge>;
  };

  // Plans disponibles (ordre logique). Source unique pour les selects.
  const PLAN_OPTIONS: Array<{ value: string; key: string }> = [
    { value: "free", key: "plans.free" },
    { value: "monthly", key: "plans.monthly" },
    { value: "monthly_plus", key: "plans.monthlyPlus" },
    { value: "yearly", key: "plans.yearly" },
    { value: "yearly_plus", key: "plans.yearlyPlus" },
    { value: "lifetime", key: "plans.lifetime" },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button variant="outline" size="sm" onClick={fetchUsers}><RefreshCw className="w-4 h-4 mr-1" />{t("refresh")}</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: t("stats.totalUsers"), value: stats.total, icon: Users },
          { label: t("stats.free"), value: stats.free, icon: Users },
          { label: t("stats.monthly"), value: stats.monthly, icon: Users },
          { label: t("stats.monthlyPlus"), value: stats.monthlyPlus, icon: Users },
          { label: t("stats.yearly"), value: stats.yearly, icon: Users },
          { label: t("stats.yearlyPlus"), value: stats.yearlyPlus, icon: Users },
          { label: t("stats.lifetime"), value: stats.lifetime, icon: Users },
          { label: t("stats.totalQuiz"), value: stats.totalQuizzes, icon: BarChart3 },
          { label: t("stats.totalLeads"), value: stats.totalLeads, icon: BarChart3 },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="w-3.5 h-3.5" />{label}</div>
            <div className="text-xl font-bold mt-1">{value}</div>
          </CardContent></Card>
        ))}
      </div>

      {/* Create user */}
      <Card><CardContent className="pt-4 flex items-end gap-3">
        <div className="flex-1 space-y-1"><label className="text-xs font-medium">{t("inviteLabel")}</label><Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@example.com" /></div>
        <select value={newPlan} onChange={e => setNewPlan(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
          {PLAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{t(o.key)}</option>)}
        </select>
        <Button onClick={createUser} disabled={creating}>{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" />{t("createMagicLink")}</>}</Button>
      </CardContent></Card>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("searchPlaceholder")} className="pl-9" /></div>
        <div className="flex gap-1">
          {["all", "free", "monthly", "monthly_plus", "yearly", "yearly_plus", "lifetime"].map(p => (
            <button key={p} onClick={() => setPlanFilter(p)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${planFilter === p ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
              {p === "all" ? t("filterAll") : p}
            </button>
          ))}
        </div>
        <button onClick={() => setSortBy(s => s === "date" ? "leads" : s === "leads" ? "quizzes" : "date")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowUpDown className="w-3.5 h-3.5" />{t("sortLabel", { sort: sortBy })}
        </button>
      </div>

      {/* User table */}
      {loading ? <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div> : (
        <Card><div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">{t("columns.email")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.name")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.plan")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.quiz")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.leads")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.lastLogin")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.actions")}</th>
            </tr></thead>
            <tbody>
              {filtered.map(u => {
                const uid = u.user_id ?? u.id ?? "";
                return (
                  <tr key={uid} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      {u.email}
                      {u.reseller_name ? (
                        <Badge className="ml-2 bg-indigo-100 text-indigo-700">
                          {u.reseller_name}
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-4 py-3">{planBadge(u.plan)}</td>
                    <td className="px-4 py-3">{u.quiz_count}</td>
                    <td className="px-4 py-3">{u.lead_count}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : t("never")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <select value={u.plan} onChange={e => updatePlan(uid, e.target.value)} className="border rounded px-2 py-1 text-xs bg-background">
                          {PLAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{t(o.key)}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => resendMagicLink(u.email)}
                          disabled={busyUserId === u.email || busyUserId === uid}
                          title={t("actions.resendMagicLinkTitle")}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border hover:bg-muted disabled:opacity-50"
                        >
                          {busyUserId === u.email ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                          {t("actions.link")}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteUser(uid, u.email)}
                          disabled={busyUserId === uid || busyUserId === u.email}
                          title={t("actions.deletePermanently")}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          {busyUserId === uid ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">{t("noUsersFound")}</p>}
        </div></Card>
      )}

      {/* Revendeurs */}
      <ResellersCard />

      {/* Suivi des paiements revendeurs (diagnostic) */}
      <ResellerPaymentEventsCard />

      {/* Appels Systeme.io recus : repond a "est-ce que la vente est
          arrivee jusqu'a nous ?" (drame Ivan, 7 aout 2026). */}
      {/* Un ecran qu'on ne montre pas n'existe pas (retour Jocelyne, 3 aout).
          Le lien vit ici, au dessus du journal des appels, parce que c'est
          exactement l'endroit ou on se demande "et cette vente, elle est
          passee ?". */}
      <div className="rounded-lg border p-4">
        <p className="font-semibold">Ventes directes</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Les abonnements encaisses par Tiquiz lui-meme, avec le bouton pour rembourser
          sans passer par Stripe.
        </p>
        <a href="/admin/ventes" className="mt-3 inline-block text-sm font-semibold text-primary underline">
          Ouvrir mes ventes directes
        </a>
      </div>

      <WebhookLogsCard />
    </div>
  );
}
