"use client";

// components/legal/LegalFooterLinks.tsx
//
// LES LIENS LÉGAUX S'OUVRENT DANS UN NOUVEL ONGLET, TOUJOURS.
//
// Béné, 24 août 2026 : "un lien vers la politique de confi etc. doit
// s'ouvrir dans un nouvel onglet et JAMAIS faire quitter la page à un
// visiteur !! D'autant que sur le quiz, la personne doit tout
// recommencer suivant les situations... c'est infernal."
//
// Ce composant est rendu sous les formulaires de CONNEXION et
// d'INSCRIPTION. Quelqu'un qui a déjà saisi son adresse et son mot de
// passe et qui clique sur "CGV" perdait sa saisie et devait tout
// retaper. Même famille que le quiz : on ne fait jamais quitter une
// page où la personne a commencé quelque chose.
//
// `<Link>` de Next fait une navigation INTERNE : c'est le contraire de
// ce qu'on veut ici. On utilise donc `<a target="_blank">`, et `rel`
// va avec (sans `noopener`, la page ouverte garde une poignée sur la
// nôtre via `window.opener`).
//
// Le garde-fou est `tests/logic/liens-legaux.test.mts` : cette règle a
// déjà été demandée, codée, puis perdue une fois.
//
// Labels follow the current UI locale (ui_locale cookie), resolved
// client-side via next-intl's useLocale() so the component is drop-in
// anywhere.

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
      <a
        href="/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground transition-colors"
      >{labels.privacy}</a>
      <span aria-hidden>·</span>
      <a
        href="/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground transition-colors"
      >{labels.terms}</a>
      <span aria-hidden>·</span>
      <a
        href="/cookies"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground transition-colors"
      >{labels.cookies}</a>
      <span aria-hidden>·</span>
      <a
        href="/legal"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground transition-colors"
      >{labels.legal}</a>
    </p>
  );
}
