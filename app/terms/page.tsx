import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import LegalPageView from "@/components/legal/LegalPageView";
import { getLegalPage } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const page = getLegalPage("terms", locale);
  return { title: page.title, robots: { index: true, follow: true } };
}

export default async function TermsPage() {
  const locale = await getLocale();
  const page = getLegalPage("terms", locale);
  return <LegalPageView page={page} locale={locale} />;
}
