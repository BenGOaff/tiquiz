// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/Providers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { RTL_LOCALES, SUPPORTED_LOCALES } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "metadata" });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tiquiz.com";
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

  return (
    <html lang={locale} dir={dir}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
