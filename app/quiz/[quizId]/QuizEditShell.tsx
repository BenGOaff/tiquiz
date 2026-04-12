"use client";

import AppShell from "@/components/AppShell";
import QuizDetailClient from "@/components/quiz/QuizDetailClient";

export default function QuizEditShell({ quizId, userEmail }: { quizId: string; userEmail: string }) {
  return (
    <AppShell userEmail={userEmail} headerTitle="Modifier le quiz">
      <QuizDetailClient quizId={quizId} />
    </AppShell>
  );
}
