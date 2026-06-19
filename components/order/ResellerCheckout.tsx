"use client";

// components/order/ResellerCheckout.tsx
//
// Tunnel de paiement du bon de commande hoste. L'acheteur saisit son
// email, choisit Stripe (carte) ou PayPal : on appelle l'API checkout du
// revendeur, qui cree l'abonnement sur SON compte et renvoie l'URL de
// paiement. On redirige ensuite l'acheteur dessus.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ResellerCheckout({
  slug,
  plan,
  stripeAvailable,
  paypalAvailable,
}: {
  slug: string;
  plan: string;
  stripeAvailable: boolean;
  paypalAvailable: boolean;
}) {
  const t = useTranslations("order");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<null | "stripe" | "paypal">(null);

  const pay = async (provider: "stripe" | "paypal") => {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      toast.error(t("emailRequired"));
      return;
    }
    setBusy(provider);
    try {
      const res = await fetch(`/api/order/${slug}/${plan}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, provider }),
      });
      const json = await res.json();
      if (json.ok && json.url) {
        window.location.href = json.url as string;
        return;
      }
      toast.error(t("checkoutError"));
    } catch {
      toast.error(t("checkoutError"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1 text-left">
        <label className="text-xs font-medium">{t("emailLabel")}</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        />
      </div>

      {stripeAvailable ? (
        <button
          type="button"
          onClick={() => pay("stripe")}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 w-full rounded-full bg-primary text-primary-foreground font-semibold py-3 hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {busy === "stripe" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {t("payCardCta")}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      ) : null}

      {paypalAvailable ? (
        <button
          type="button"
          onClick={() => pay("paypal")}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 w-full rounded-full border border-primary text-primary font-semibold py-3 hover:bg-primary/5 transition-colors disabled:opacity-60"
        >
          {busy === "paypal" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {t("payPaypalCta")}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      ) : null}

      <p className="text-xs text-muted-foreground text-center">{t("accessNote")}</p>
    </div>
  );
}
