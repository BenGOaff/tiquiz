"use client";

// components/pilotage/InviterCompte.tsx
//
// OUVRIR UN COMPTE À QUELQU'UN, DEPUIS LA CONSOLE (Béné, 18 septembre 2026).
//
// "Oui tu peux enlever ça de l'admin, je veux tout suivre dans pilotage."
//
// Ce formulaire vivait dans `AdminDashboard`, qui n'existe plus. C'est
// la SEULE chose de cet écran là qui n'avait pas d'équivalent dans la
// console : tout le reste (la liste, la fiche, les actions, les ventes,
// le support) y était déjà.
//
// -- ET ÇA CHANGE LA RÈGLE 1 DE LA CONSOLE, ALORS ON LE DIT ------------
//
// `lib/pilotage/sections.ts` disait "LA CONSOLE PILOTE, ELLE N'ÉDITE
// PAS". Cette règle était une règle d'ÉTAPE, pas une règle de fond :
// elle existait pour que la console ne redevienne pas l'empilement
// qu'on venait de défaire, tant que les deux écrans cohabitaient. Elle
// était d'ailleurs déjà contredite dans les faits, puisque
// `/pilotage/clients/<adresse>` rend `ClientFiche`, qui change un
// palier, renvoie un accès et rembourse.
//
// La cible, elle, n'a jamais bougé : "à terme on supprime les /admin de
// toutes les app pour tout gérer sur pilotage." C'est ce qui est fait.
//
// Le composant ne DÉCIDE rien : il poste, il dit ce qui s'est passé.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CARTE } from "@/components/pilotage/carte";

const PLANS: Array<{ value: string; key: string }> = [
  { value: "free", key: "plans.free" },
  { value: "monthly", key: "plans.monthly" },
  { value: "monthly_plus", key: "plans.monthlyPlus" },
  { value: "yearly", key: "plans.yearly" },
  { value: "yearly_plus", key: "plans.yearlyPlus" },
  { value: "lifetime", key: "plans.lifetime" },
];

export function InviterCompte({ surCreation }: { surCreation?: () => void }) {
  const t = useTranslations("admin");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("free");
  const [enCours, setEnCours] = useState(false);

  const creer = async () => {
    if (!email.trim()) return;
    setEnCours(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), plan, send_magic_link: true }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(t("toasts.userCreated"));
        setEmail("");
        // LA LISTE SE RECHARGE, sinon la personne qu'on vient de créer
        // n'apparaît pas et on la recrée. L'appelant sait comment.
        surCreation?.();
      } else {
        toast.error(json.error ?? t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <section className={`${CARTE} flex flex-wrap items-end gap-3 p-4`}>
      <div className="min-w-[220px] flex-1 space-y-1">
        <label className="text-xs font-medium" htmlFor="pilotage-inviter">
          {t("inviteLabel")}
        </label>
        <Input
          id="pilotage-inviter"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
        />
      </div>
      <select
        value={plan}
        onChange={(e) => setPlan(e.target.value)}
        aria-label="Palier du compte à créer"
        className="rounded-lg border bg-card px-2 py-2 text-sm"
      >
        {PLANS.map((o) => (
          <option key={o.value} value={o.value}>
            {t(o.key)}
          </option>
        ))}
      </select>
      <Button onClick={creer} disabled={enCours}>
        {enCours ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Plus className="mr-1 size-4" />
            {t("createMagicLink")}
          </>
        )}
      </Button>
    </section>
  );
}
