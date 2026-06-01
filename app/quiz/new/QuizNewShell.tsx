"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import AppShell from "@/components/AppShell";
import QuizFormClient from "@/components/quiz/QuizFormClient";
import { useTranslations } from "next-intl";

export default function QuizNewShell({ userEmail }: { userEmail: string }) {
  const t = useTranslations("nav");
  return (
    <AppShell userEmail={userEmail} headerTitle={t("create")}>
      {/* Entrée vers la galerie de modèles métier. Discret, non intrusif :
          ne change rien au formulaire de création existant. */}
      <Link
        href="/templates"
        className="mb-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 hover:bg-primary/10 transition"
      >
        <Sparkles className="w-5 h-5 text-primary shrink-0" />
        <span className="text-sm">
          <span className="font-medium text-foreground">
            Pas d&apos;inspiration ? Pars d&apos;un modèle prêt à l&apos;emploi.
          </span>{" "}
          <span className="text-muted-foreground">
            Des quiz déjà rédigés pour ton métier — à personnaliser en 5 min.
          </span>
        </span>
      </Link>
      <QuizFormClient />
    </AppShell>
  );
}
