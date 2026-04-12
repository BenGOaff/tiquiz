"use client";

import AppShell from "@/components/AppShell";
import QuizFormClient from "@/components/quiz/QuizFormClient";
import { useTranslations } from "next-intl";

export default function QuizNewShell({ userEmail }: { userEmail: string }) {
  const t = useTranslations("nav");
  return (
    <AppShell userEmail={userEmail} headerTitle={t("create")}>
      <QuizFormClient />
    </AppShell>
  );
}
