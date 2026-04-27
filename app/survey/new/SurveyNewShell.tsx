"use client";

import AppShell from "@/components/AppShell";
import SurveyFormClient from "@/components/quiz/SurveyFormClient";
import { useTranslations } from "next-intl";

export default function SurveyNewShell({ userEmail }: { userEmail: string }) {
  const t = useTranslations("survey");
  return (
    <AppShell userEmail={userEmail} headerTitle={t("createTitle")}>
      <SurveyFormClient />
    </AppShell>
  );
}
