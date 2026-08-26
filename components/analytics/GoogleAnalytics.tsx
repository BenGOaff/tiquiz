"use client";

// components/analytics/GoogleAnalytics.tsx
//
// La mesure d'audience Google, chargée UNIQUEMENT là où elle a du sens.
//
// Composant CLIENT, et ce n'est pas un détail : la décision a besoin du
// chemin que le NAVIGATEUR voit. Le middleware ne pose aucun en-tête de
// chemin, donc un repli côté serveur aurait charge la mesure sur les
// quiz publics de nos clientes, en silence (cf. lib/analytics/google.ts).
//
// L'hôte, lui, reste décidé côté SERVEUR et arrive en prop : c'est la
// seule source qui ne peut pas être contournée depuis le navigateur.

import Script from "next/script";
import { usePathname } from "next/navigation";

import { chargerAnalytics, GA_MEASUREMENT_ID } from "@/lib/analytics/google";

export default function GoogleAnalytics({ estNotreHote }: { estNotreHote: boolean }) {
  const pathname = usePathname() ?? "/";
  if (!chargerAnalytics({ estNotreHote, pathname })) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
