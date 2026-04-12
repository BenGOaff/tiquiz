"use client";

import AppShell from "@/components/AppShell";
import SettingsClient from "@/components/settings/SettingsClient";
import { useTranslations } from "next-intl";

export default function SettingsShell({ userEmail }: { userEmail: string }) {
  const t = useTranslations("nav");
  return (
    <AppShell userEmail={userEmail} headerTitle={t("settings")}>
      <SettingsClient />
    </AppShell>
  );
}
