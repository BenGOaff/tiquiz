"use client";

import { useEffect, useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users, Download, RefreshCw, Search, Mail, Calendar,
  CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";

type Lead = {
  id: string;
  quiz_id: string;
  quiz_title: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country: string | null;
  result_title: string | null;
  sio_synced: boolean;
  sio_tag_applied: string | null;
  has_shared: boolean;
  created_at: string;
  quiz_results: { title: string; sio_tag_name: string | null } | null;
};

export default function LeadsShell({ userEmail }: { userEmail: string }) {
  const tNav = useTranslations("nav");
  const t = useTranslations("leads");
  const locale = useLocale();
  const localeTag = locale === "en" ? "en-US" : `${locale}-${locale.toUpperCase()}`;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterQuiz, setFilterQuiz] = useState<string>("all");
  const [quizzes, setQuizzes] = useState<{ id: string; title: string }[]>([]);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setLeads(data.leads ?? []);
          setQuizzes(data.quizzes ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = leads;
    if (filterQuiz !== "all") {
      result = result.filter((l) => l.quiz_id === filterQuiz);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.email.toLowerCase().includes(s) ||
          (l.first_name ?? "").toLowerCase().includes(s) ||
          (l.last_name ?? "").toLowerCase().includes(s)
      );
    }
    return result;
  }, [leads, filterQuiz, search]);

  function exportCSV() {
    const headers = [
      t("csv.email"),
      t("csv.firstName"),
      t("csv.lastName"),
      t("csv.phone"),
      t("csv.country"),
      t("csv.quiz"),
      t("csv.result"),
      t("csv.sioTag"),
      t("csv.syncSio"),
      t("csv.date"),
    ];
    const rows = filtered.map((l) => [
      l.email,
      l.first_name ?? "",
      l.last_name ?? "",
      l.phone ?? "",
      l.country ?? "",
      l.quiz_title,
      l.result_title ?? l.quiz_results?.title ?? "",
      l.sio_tag_applied ?? l.quiz_results?.sio_tag_name ?? "",
      l.sio_synced ? t("csv.yes") : t("csv.no"),
      new Date(l.created_at).toLocaleDateString(localeTag),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tiquiz-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("exportDone"));
  }

  async function syncLead(leadId: string, quizId: string) {
    setSyncing((prev) => new Set(prev).add(leadId));
    try {
      const res = await fetch(`/api/quiz/${quizId}/sync-systeme`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: [leadId] }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(t("syncSuccess"));
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, sio_synced: true } : l))
        );
      } else {
        toast.error(data.error ?? t("syncError"));
      }
    } catch {
      toast.error(t("networkError"));
    } finally {
      setSyncing((prev) => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
    }
  }

  return (
    <AppShell userEmail={userEmail} headerTitle={tNav("leads")}>
      {/* Banner */}
      <div className="gradient-primary rounded-xl px-5 py-4 md:px-6 md:py-5 flex items-center gap-4 text-white">
        <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold">{t("title")}</h2>
          <p className="text-sm text-white/70">{t("captured", { count: filtered.length })}</p>
        </div>
        <Button onClick={exportCSV} variant="secondary" className="shrink-0" disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-2" /> {t("exportCsv")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterQuiz}
          onChange={(e) => setFilterQuiz(e.target.value)}
          className="text-sm border border-input rounded-lg px-3 py-2 bg-background"
        >
          <option value="all">{t("allQuizzes")}</option>
          {quizzes.map((q) => (
            <option key={q.id} value={q.id}>{q.title}</option>
          ))}
        </select>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t("stats.total"), value: leads.length, icon: Users },
          { label: t("stats.syncedSio"), value: leads.filter((l) => l.sio_synced).length, icon: CheckCircle2 },
          { label: t("stats.notSynced"), value: leads.filter((l) => !l.sio_synced).length, icon: XCircle },
          { label: t("stats.thisMonth"), value: leads.filter((l) => new Date(l.created_at).getMonth() === new Date().getMonth()).length, icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("empty")}</h3>
            <p className="text-muted-foreground">{t("emptyDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">{t("cols.email")}</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">{t("cols.name")}</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">{t("cols.quiz")}</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">{t("cols.result")}</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">{t("cols.sioTag")}</th>
                  <th className="text-center px-4 py-3 font-medium">{t("cols.sync")}</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">{t("cols.date")}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium truncate max-w-[200px]">{lead.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                      {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="truncate max-w-[150px] block text-muted-foreground">{lead.quiz_title}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant="secondary" className="text-xs">
                        {lead.result_title ?? lead.quiz_results?.title ?? "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {lead.sio_tag_applied ?? lead.quiz_results?.sio_tag_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {lead.sio_synced ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString(localeTag)}
                    </td>
                    <td className="px-4 py-3">
                      {!lead.sio_synced && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => syncLead(lead.id, lead.quiz_id)}
                          disabled={syncing.has(lead.id)}
                          className="text-xs"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncing.has(lead.id) ? "animate-spin" : ""}`} />
                          Sync
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppShell>
  );
}
