import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import LegalPageView from "@/components/legal/LegalPageView";
import { getLegalPage } from "@/lib/legal";
import { SUPPORTED_LOCALES } from "@/i18n/config";

const SLUG = "cookies" as const;

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resolveLocale(searchParams?: Promise<{ lang?: string }>): Promise<string> {
  const raw = (await searchParams)?.lang;
  if (raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw)) return raw;
  return await getLocale();
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const locale = await resolveLocale(searchParams);
  const page = getLegalPage(SLUG, locale);
  return { title: page.title, robots: { index: true, follow: true } };
}

export default async function LegalRoute({ searchParams }: PageProps) {
  const locale = await resolveLocale(searchParams);
  const page = getLegalPage(SLUG, locale);
  return <LegalPageView page={page} locale={locale} activeSlug={SLUG} />;
}
