// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/Providers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { RTL_LOCALES } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Tiquiz",
  description: "Tiquiz – Crée des quiz engageants et capture des leads",
  icons: {
    icon: "/favicon.ico",
  },
};

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
      <body className="font-sans antialiased min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
