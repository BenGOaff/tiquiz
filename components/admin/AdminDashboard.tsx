"use client";

// components/admin/AdminDashboard.tsx
//
// CINQ ONGLETS, ET UNE SEULE LISTE DE PERSONNES.
//
// Béné, 22 août, deux fois de suite :
//   "Fais moi un système d'onglets."
//   "Et pourquoi j'ai deux fois la liste des users ? Je peux pas avoir
//    une seule liste avec toutes les infos ?"
//
// Le doublon était mon empilement : une liste pour REGARDER
// (`PilotageCard`, avec l'état, l'Atelier, l'argent) et une autre pour
// AGIR (changer le palier, renvoyer un lien, supprimer). Deux tableaux
// des mêmes personnes, à tenir à jour tous les deux, et à comparer de
// tête quand ils ne disaient pas la même chose.
//
// Il n'en reste qu'un : les actions ont rejoint la liste, dans le tiroir
// de chaque ligne. Ce fichier ne garde que ce qui n'est PAS une liste :
// les onglets, et le bloc d'invitation.

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import AffiliesCard from "@/components/admin/AffiliesCard";
import PilotageCard from "@/components/admin/PilotageCard";
import ResellerPaymentEventsCard from "@/components/admin/ResellerPaymentEventsCard";
import ResellersCard from "@/components/admin/ResellersCard";
import StatistiquesCard from "@/components/admin/StatistiquesCard";
import SupportCard from "@/components/admin/SupportCard";
import TagsCard from "@/components/admin/TagsCard";
import WebhookLogsCard from "@/components/admin/WebhookLogsCard";

/**
 * Les questions que Béné se pose, dans son ordre à elle.
 *
 * Une par onglet, et un onglet ne répond qu'à la sienne : c'est ce qui
 * évite qu'un écran redevienne l'empilement qu'on vient de défaire.
 */
const ONGLETS = [
  { id: "clients", label: "Mes clients" },
  { id: "ventes", label: "Mes ventes" },
  { id: "stats", label: "Statistiques" },
  { id: "support", label: "Support" },
  { id: "revendeurs", label: "Mes revendeurs" },
  { id: "affilies", label: "Mes affiliés" },
] as const;

type OngletId = (typeof ONGLETS)[number]["id"];

const PLAN_OPTIONS: Array<{ value: string; key: string }> = [
  { value: "free", key: "plans.free" },
  { value: "monthly", key: "plans.monthly" },
  { value: "monthly_plus", key: "plans.monthlyPlus" },
  { value: "yearly", key: "plans.yearly" },
  { value: "yearly_plus", key: "plans.yearlyPlus" },
  { value: "lifetime", key: "plans.lifetime" },
];

export default function AdminDashboard() {
  const t = useTranslations("admin");
  const [onglet, setOnglet] = useState<OngletId>("clients");
  const [newEmail, setNewEmail] = useState("");
  const [newPlan, setNewPlan] = useState("free");
  const [creating, setCreating] = useState(false);

  const createUser = async () => {
    if (!newEmail.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim(), plan: newPlan, send_magic_link: true }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(t("toasts.userCreated"));
        setNewEmail("");
        // La liste se recharge d'elle meme : elle appartient a
        // PilotageCard, et son bouton Rafraichir est juste au dessus.
      } else {
        toast.error(json.error ?? t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {/* ── LES ONGLETS ── */}
      <div className="flex flex-wrap gap-1.5 border-b pb-2">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setOnglet(o.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              onglet === o.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* ── MES CLIENTS : UNE SEULE LISTE, TOUT DEDANS ── */}
      {onglet === "clients" && (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 pt-4">
              <div className="min-w-[220px] flex-1 space-y-1">
                <label className="text-xs font-medium">{t("inviteLabel")}</label>
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <select
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value)}
                className="rounded-lg border px-2 py-2 text-sm"
              >
                {PLAN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(o.key)}
                  </option>
                ))}
              </select>
              <Button onClick={createUser} disabled={creating}>
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="mr-1 size-4" />
                    {t("createMagicLink")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <PilotageCard vue="clients" />

          {/* LE CONTROLE DES TAGS vit ici, sous la liste : c'est la meme
              question ("est-ce que cette personne a bien ce qu'elle a
              paye ?"), et la correction se fait dans la liste juste au
              dessus. */}
          <TagsCard />
        </>
      )}

      {/* ── MES VENTES ── */}
      {onglet === "ventes" && (
        <>
          <PilotageCard vue="ventes" />

          {/* Un ecran qu'on ne montre pas n'existe pas (retour Jocelyne,
              3 aout). Le lien vit ici, au dessus du journal des appels,
              parce que c'est exactement l'endroit ou on se demande "et
              cette vente, elle est passee ?". */}
          <div className="rounded-lg border p-4">
            <p className="font-semibold">Ventes directes</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Les abonnements encaissés par Tiquiz lui même, avec le bouton pour rembourser
              sans passer par Stripe.
            </p>
            <Link
              href="/admin/ventes"
              className="mt-3 inline-block text-sm font-semibold text-primary underline"
            >
              Ouvrir mes ventes directes
            </Link>
          </div>

          {/* Appels Systeme.io recus : repond a "est-ce que la vente est
              arrivee jusqu'a nous ?" (drame Ivan, 7 aout 2026). */}
          <WebhookLogsCard />
        </>
      )}

      {/* ── STATISTIQUES : seulement ce qu'on sait juste ── */}
      {onglet === "stats" && <StatistiquesCard />}

      {/* ── SUPPORT : qui attend une reponse, et depuis quand ── */}
      {onglet === "support" && <SupportCard />}

      {/* ── MES REVENDEURS ──
          Ces deux cartes vivaient tout en bas de "Mes ventes", apres le
          journal des appels : il fallait scroller un ecran entier pour
          les trouver, donc elles n'existaient pas. */}
      {onglet === "revendeurs" && (
        <>
          <ResellersCard />
          <ResellerPaymentEventsCard />
        </>
      )}

      {onglet === "affilies" && <AffiliesCard />}
    </div>
  );
}
