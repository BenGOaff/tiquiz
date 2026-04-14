"use client";

import QuizDetailClient from "@/components/quiz/QuizDetailClient";

export default function QuizEditShell({ quizId }: { quizId: string; userEmail: string }) {
  return <QuizDetailClient quizId={quizId} />;
}
