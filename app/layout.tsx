// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/Providers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { RTL_LOCALES, SUPPORTED_LOCALES } from "@/i18n/config";
import { resolvePublicUrl } from "@/lib/authLinks";
import { headers } from "next/headers";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import { isOwnHost } from "@/lib/customDomains";
import {
  GOOGLE_SITE_VERIFICATION,
  hoteNormalise,
  servirVerification,
} from "@/lib/analytics/google";

/**
 * Cette page est-elle servie sur un de NOS domaines ?
 *
 * Décidé côté serveur, à partir du `Host` : c'est la seule source qui ne
 * peut pas être contournée depuis le navigateur. Le CHEMIN, lui, est lu
 * côté client par `GoogleAnalytics` (cf. lib/analytics/google.ts).
 */
async function estNotreHote(): Promise<boolean> {
  const h = await headers();
  return isOwnHost(hoteNormalise(h.get("host")));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "metadata" });

  const siteUrl = resolvePublicUrl(process.env.NEXT_PUBLIC_SITE_URL, "https://tiquiz.com");
  const notreHote = await estNotreHote();
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
    // LE JETON DE PROPRIÉTÉ SEARCH CONSOLE, sur NOS domaines seulement.
    // Servi sur le domaine personnalisé d'une créatrice, il permettrait
    // de revendiquer SON domaine dans notre Search Console.
    ...(servirVerification(notreHote)
      ? { verification: { google: GOOGLE_SITE_VERIFICATION } }
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
  const notreHote = await estNotreHote();

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
      {/* MESURE D'AUDIENCE : nos pages, jamais les quiz de nos clientes.
          Le composant est CLIENT parce que la décision a besoin du chemin
          que le navigateur voit (cf. lib/analytics/google.ts). */}
      <GoogleAnalytics estNotreHote={notreHote} />
      <body className="font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

