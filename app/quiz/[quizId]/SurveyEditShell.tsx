"use client";

// SurveyEditShell — purposely NOT wrapped in AppShell so the WYSIWYG editor
// takes the full viewport (mirrors QuizEditShell). The editor's own top bar
// + sidebar provide all the navigation a creator needs while editing.
import SurveyDetailClient from "@/components/quiz/SurveyDetailClient";

export default function SurveyEditShell({ quizId }: { quizId: string; userEmail: string }) {
  return <SurveyDetailClient quizId={quizId} />;
}
