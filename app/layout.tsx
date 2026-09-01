// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/Providers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { RTL_LOCALES, SUPPORTED_LOCALES } from "@/i18n/config";
import { codeVerificationPinterest } from "@/lib/site/pinterest";
import { resolvePublicUrl } from "@/lib/authLinks";
import { headers } from "next/headers";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import { isPublicSalesHost } from "@/lib/sales/salesHosts";
import { hoteCanonique } from "@/lib/publicHost";

/**
 * Cette page est-elle servie sur le DOMAINE DE VENTE ?
 *
 * Béné, 26 août : "je m'en fous de faire ranker les app, je veux faire
 * ranker les pages de vente." L'app derrière connexion ne reçoit donc
 * plus rien du tout : ni jeton, ni mesure.
 *
 * Ce qui reste à couvrir ICI, c'est le BON DE COMMANDE : il vit sur
 * `tiquiz.fr/commande/...`, donc sur le domaine de vente, mais il est
 * rendu par React et non par le route handler de la page de vente. Sans
 * cette ligne, on mesurerait l'arrivée sur la page et plus rien ensuite,
 * c'est à dire précisément l'endroit où la vente se joue.
 *
 * Décidé côté serveur, à partir du `Host` : c'est la seule source qui ne
 * peut pas être contournée depuis le navigateur. Le CHEMIN, lui, est lu
 * côté client par `GoogleAnalytics` (cf. lib/analytics/google.ts).
 */
async function estHoteDeVente(): Promise<boolean> {
  const h = await headers();
  return isPublicSalesHost(h.get("host"));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "metadata" });

  // `metadataBase` gouverne la canonique et les images OG de TOUTE
  // l'app : un repli sur un domaine qui n'est pas à nous les envoyait
  // toutes chez quelqu'un d'autre. Le repli se calcule maintenant
  // (cf. lib/publicHost.ts).
  const siteUrl = resolvePublicUrl(
    process.env.NEXT_PUBLIC_SITE_URL,
    hoteCanonique({ host: (await headers()).get("host") }),
  );
  const languages: Record<string, string> = {};
  for (const l of SUPPORTED_LOCALES) {
    languages[l] = siteUrl;
  }
  languages["x-default"] = siteUrl;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t("title"),
      template: `%s · ${t("title")}`,
    },
    description: t("description"),
    applicationName: "Tiquiz",
    alternates: {
      canonical: "/",
      languages,
    },
    openGraph: {
      type: "website",
      siteName: "Tiquiz",
      title: t("title"),
      description: t("description"),
      url: siteUrl,
      locale: locale === "ar" ? "ar_AR" : `${locale}_${locale.toUpperCase()}`,
      alternateLocale: SUPPORTED_LOCALES.filter((l) => l !== locale).map((l) =>
        l === "ar" ? "ar_AR" : `${l}_${l.toUpperCase()}`,
      ),
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    icons: {
      icon: "/favicon.ico",
    },
    // LA REVENDICATION DU DOMAINE CHEZ PINTEREST (Béné, 1er septembre).
    //
    // Elle met son nom et sa photo sur chaque épingle qui vient de
    // tiquiz.fr, y compris celles épinglées par quelqu'un d'autre.
    // Absente ou illisible, la balise ne sort pas : une balise fausse
    // fait échouer la revendication en silence.
    ...(codeVerificationPinterest()
      ? { other: { "p:domain_verify": codeVerificationPinterest()! } }
      : {}),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = (RTL_LOCALES as string[]).includes(locale) ? "rtl" : "ltr";
  const hoteDeVente = await estHoteDeVente();

  return (
    <html lang={locale} dir={dir}>
      {/* color-scheme : empeche les browsers (Brave Force Dark, Chrome
          force-dark flag, Edge "dark mode pour les sites web") d'appliquer
          un filtre d'inversion qui tinte la page en gris uniforme.
          Place directement dans <html> sans wrapper <head> : en App Router
          Next.js gere automatiquement le head via Metadata API. Un <head>
          litteral cassait le rendu metadata sur prod (E2E Playwright failed
          le 4 juin 2026 sur les tests og:url + body content). */}
      <meta name="color-scheme" content="light" />
      {/* MESURE D'AUDIENCE : le domaine de vente, et lui seul. Le
          composant est CLIENT parce que la décision a besoin du chemin
          que le navigateur voit (cf. lib/analytics/google.ts).
          Le JETON de propriété, lui, n'est pas ici : Google le lit à la
          racine de tiquiz.fr, qui est servie par le route handler de la
          page de vente. */}
      <GoogleAnalytics estHoteDeVente={hoteDeVente} />
      <body className="font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

