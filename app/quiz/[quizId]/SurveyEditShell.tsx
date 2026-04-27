"use client";

import AppShell from "@/components/AppShell";
import SurveyDetailClient from "@/components/quiz/SurveyDetailClient";
import { useTranslations } from "next-intl";

export default function SurveyEditShell({ quizId, userEmail }: { quizId: string; userEmail: string }) {
  const t = useTranslations("survey");
  return (
    <AppShell userEmail={userEmail} headerTitle={t("editTitle")}>
      <SurveyDetailClient quizId={quizId} />
    </AppShell>
  );
}
