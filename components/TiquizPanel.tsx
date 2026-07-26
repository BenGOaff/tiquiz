"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BarChart3,
  ExternalLink,
  RefreshCw,
  Users,
  Eye,
  CheckCircle2,
  Share2,
  Unlink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TiquizMetrics } from "@/lib/types";

const STALE_MS = 15 * 60 * 1000;

export function TiquizPanel({
  connected,
  metrics,
  lastSyncedAt,
  connectedEmail = null,
}: {
  connected: boolean;
  metrics: TiquizMetrics | null;
  lastSyncedAt: string | null;
  connectedEmail?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const autoRan = useRef(false);

  async function disconnect() {
    if (!confirm("Déconnecter ce compte Tiquiz ? Tes badges déjà obtenus restent acquis.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/integrations/tiquiz/disconnect", { method: "POST" });
      router.refresh();
    } catch {
      toast.error("Déconnexion impossible pour le moment.");
    } finally {
      setDisconnecting(false);
    }
  }

  async function sync(showToast: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/tiquiz/sync", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        newBadges?: { code: string; label: string }[];
      };
      for (const b of data.newBadges ?? []) {
        toast.success(`Badge débloqué : ${b.label}`, { icon: "🏅", duration: 5000 });
      }
      router.refresh();
    } catch {
      if (showToast) toast.error("Synchro impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  // Synchro auto une fois au montage si le snapshot est ancien (ou absent).
  useEffect(() => {
    if (!connected || autoRan.current) return;
    autoRan.current = true;
    const stale = !lastSyncedAt || Date.now() - new Date(lastSyncedAt).getTime() > STALE_MS;
    if (stale) void sync(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  if (!connected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-5">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BarChart3 className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-display font-semibold">Suis tes vrais résultats</h3>
            <p className="text-sm text-muted-foreground">
              Connecte ton compte Tiquiz pour voir ici les leads, vues et partages de tes quiz,
              et débloquer les badges de résultat. En lecture seule, 1 clic.
            </p>
          </div>
          <Button asChild>
            <a href="/api/integrations/tiquiz/start">
              <ExternalLink />
              Connecter mon compte Tiquiz
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const m = metrics ?? { leads: 0, views: 0, completes: 0, shares: 0, topQuiz: null };
  const tiles = [
    { label: "Leads", value: m.leads, icon: Users },
    { label: "Vues", value: m.views, icon: Eye },
    { label: "Complétions", value: m.completes, icon: CheckCircle2 },
    { label: "Partages", value: m.shares, icon: Share2 },
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display font-semibold">
            <BarChart3 className="size-4 text-primary" />
            Tes résultats Tiquiz
          </h3>
          <Button variant="ghost" size="sm" onClick={() => sync(true)} disabled={busy}>
            <RefreshCw className={busy ? "animate-spin" : undefined} />
            {busy ? "..." : "Actualiser"}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="flex flex-col gap-1 rounded-xl border border-border bg-surface-soft p-3"
            >
              <t.icon className="size-4 text-primary" />
              <span className="text-2xl font-bold leading-none">{t.value}</span>
              <span className="text-xs text-muted-foreground">{t.label}</span>
            </div>
          ))}
        </div>

        {m.topQuiz && m.topQuiz.leads > 0 && (
          <p className="text-sm text-muted-foreground">
            Ton meilleur quiz : <strong className="text-foreground">{m.topQuiz.title}</strong> (
            {m.topQuiz.leads} leads).
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            {connectedEmail ? (
              <>
                Compte connecté : <strong className="text-foreground">{connectedEmail}</strong>.
                Mauvais compte ?
              </>
            ) : (
              "Mauvais compte Tiquiz connecté ?"
            )}
          </p>
          <Button variant="ghost" size="sm" onClick={disconnect} disabled={disconnecting}>
            <Unlink />
            {disconnecting ? "..." : "Déconnecter mon Tiquiz"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
