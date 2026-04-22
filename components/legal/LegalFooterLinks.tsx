"use client";

// Compact legal footer links row — used on auth pages, landing, quiz public footer.
// Labels follow the current UI locale (ui_locale cookie), resolved client-side
// via next-intl's useLocale() so the component is drop-in anywhere.

import Link from "next/link";
import { useLocale } from "next-intl";

const LABELS: Record<string, { privacy: string; terms: string; cookies: string; legal: string }> = {
  fr: { privacy: "Confidentialité", terms: "CGV", cookies: "Cookies", legal: "Mentions légales" },
  en: { privacy: "Privacy", terms: "Terms", cookies: "Cookies", legal: "Legal" },
  es: { privacy: "Privacidad", terms: "Términos", cookies: "Cookies", legal: "Aviso legal" },
  it: { privacy: "Privacy", terms: "Condizioni", cookies: "Cookie", legal: "Note legali" },
  ar: { privacy: "الخصوصية", terms: "الشروط", cookies: "الكوكيز", legal: "إشعار قانوني" },
};

export default function LegalFooterLinks({ className }: { className?: string }) {
  const locale = useLocale();
  const labels = LABELS[locale] ?? LABELS.en;
  return (
    <p
      className={`text-[11px] text-muted-foreground/70 space-x-2 text-center ${className ?? ""}`}
    >
      <Link href="/privacy" className="hover:text-foreground transition-colors">{labels.privacy}</Link>
      <span aria-hidden>·</span>
      <Link href="/terms" className="hover:text-foreground transition-colors">{labels.terms}</Link>
      <span aria-hidden>·</span>
      <Link href="/cookies" className="hover:text-foreground transition-colors">{labels.cookies}</Link>
      <span aria-hidden>·</span>
      <Link href="/legal" className="hover:text-foreground transition-colors">{labels.legal}</Link>
    </p>
  );
}
