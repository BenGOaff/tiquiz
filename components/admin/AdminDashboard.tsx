"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Users, BarChart3, RefreshCw, Plus, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

type User = {
  user_id?: string; id?: string; email: string; first_name?: string; last_name?: string;
  plan: string; quiz_count: number; lead_count: number; last_sign_in: string | null;
  created_at?: string;
};

export default function AdminDashboard() {
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
    } catch { toast.error("Erreur chargement"); }
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
        toast.success(`Plan mis à jour: ${plan}`);
        setUsers(prev => prev.map(u => (u.user_id ?? u.id) === userId ? { ...u, plan } : u));
      } else toast.error(json.error);
    } catch { toast.error("Erreur"); }
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
      if (json.ok) { toast.success(`User créé + magic link envoyé`); setNewEmail(""); fetchUsers(); }
      else toast.error(json.error);
    } catch { toast.error("Erreur"); }
    finally { setCreating(false); }
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
    yearly: users.filter(u => u.plan === "yearly").length,
    lifetime: users.filter(u => u.plan === "lifetime").length,
    totalLeads: users.reduce((s, u) => s + u.lead_count, 0),
    totalQuizzes: users.reduce((s, u) => s + u.quiz_count, 0),
  };

  const planBadge = (plan: string) => {
    const cls = plan === "lifetime" ? "bg-purple-100 text-purple-700" : (plan === "monthly" || plan === "yearly") ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600";
    return <Badge className={cls}>{plan}</Badge>;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Tiquiz</h1>
        <Button variant="outline" size="sm" onClick={fetchUsers}><RefreshCw className="w-4 h-4 mr-1" />Rafraîchir</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Total users", value: stats.total, icon: Users },
          { label: "Free", value: stats.free, icon: Users },
          { label: "Mensuel", value: stats.monthly, icon: Users },
          { label: "Annuel", value: stats.yearly, icon: Users },
          { label: "Lifetime", value: stats.lifetime, icon: Users },
          { label: "Total quiz", value: stats.totalQuizzes, icon: BarChart3 },
          { label: "Total leads", value: stats.totalLeads, icon: BarChart3 },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="w-3.5 h-3.5" />{label}</div>
            <div className="text-xl font-bold mt-1">{value}</div>
          </CardContent></Card>
        ))}
      </div>

      {/* Create user */}
      <Card><CardContent className="pt-4 flex items-end gap-3">
        <div className="flex-1 space-y-1"><label className="text-xs font-medium">Inviter un user</label><Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@example.com" /></div>
        <select value={newPlan} onChange={e => setNewPlan(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
          <option value="free">Free</option><option value="monthly">Mensuel</option><option value="yearly">Annuel</option><option value="lifetime">Lifetime</option>
        </select>
        <Button onClick={createUser} disabled={creating}>{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" />Créer + Magic Link</>}</Button>
      </CardContent></Card>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par email…" className="pl-9" /></div>
        <div className="flex gap-1">
          {["all", "free", "monthly", "yearly", "lifetime"].map(p => (
            <button key={p} onClick={() => setPlanFilter(p)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${planFilter === p ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
              {p === "all" ? "Tous" : p}
            </button>
          ))}
        </div>
        <button onClick={() => setSortBy(s => s === "date" ? "leads" : s === "leads" ? "quizzes" : "date")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowUpDown className="w-3.5 h-3.5" />Tri: {sortBy}
        </button>
      </div>

      {/* User table */}
      {loading ? <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div> : (
        <Card><div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Quiz</th>
              <th className="px-4 py-3 font-medium">Leads</th>
              <th className="px-4 py-3 font-medium">Dernière co.</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(u => {
                const uid = u.user_id ?? u.id ?? "";
                return (
                  <tr key={uid} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-4 py-3">{planBadge(u.plan)}</td>
                    <td className="px-4 py-3">{u.quiz_count}</td>
                    <td className="px-4 py-3">{u.lead_count}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Jamais"}</td>
                    <td className="px-4 py-3">
                      <select value={u.plan} onChange={e => updatePlan(uid, e.target.value)} className="border rounded px-2 py-1 text-xs bg-background">
                        <option value="free">Free</option><option value="monthly">Mensuel</option><option value="yearly">Annuel</option><option value="lifetime">Lifetime</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">Aucun utilisateur trouvé</p>}
        </div></Card>
      )}
    </div>
  );
}
