"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Stethoscope, RefreshCw, AlertTriangle, Lightbulb, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QuizAudit, QuizIssue } from "@/lib/quizDoctor";

export function QuizDoctor({ connected }: { connected: boolean }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [quizzes, setQuizzes] = useState<QuizAudit[]>([]);

  async function run() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/me/quiz-audit");
      const json = await res.json();
      if (!json.ok || json.error) {
        setError(true);
        setQuizzes([]);
      } else {
        setQuizzes((json.quizzes ?? []) as QuizAudit[]);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (connected) run();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Re-audit quand l'user change de projet/quiz dans le panel Tiquiz
  // (le sélecteur émet cet évènement après avoir mémorisé le choix).
  useEffect(() => {
    if (!connected) return;
    const onScopeChange = () => run();
    window.addEventListener("tiquiz-scope-changed", onScopeChange);
    return () => window.removeEventListener("tiquiz-scope-changed", onScopeChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  if (!connected) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Stethoscope className="size-4" />
          Quiz Doctor
        </h2>
        <Button variant="ghost" size="sm" onClick={run} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : undefined} />
          {loading ? "..." : "Re-diagnostiquer"}
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            On ausculte ton quiz...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Diagnostic indisponible pour le moment. Réessaie dans un instant.
          </CardContent>
        </Card>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Aucun quiz détecté sur ton compte Tiquiz. Crée et publie ton quiz (Jour 4), reviens
            ici, on l'auditera.
          </CardContent>
        </Card>
      ) : (
        quizzes.map((q, i) => <QuizCard key={i} quiz={q} />)
      )}
    </section>
  );
}

function QuizCard({ quiz }: { quiz: QuizAudit }) {
  const published = quiz.status === "active";
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">{quiz.title || "Quiz sans titre"}</span>
          <Badge variant={published ? "success" : "muted"}>
            {published ? "Publié" : "Brouillon"}
          </Badge>
        </div>

        {quiz.issues.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="size-4" />
            Bien réglé. Rien à corriger, continue à le diffuser.
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {quiz.issues.map((issue, i) => (
              <IssueRow key={i} issue={issue} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function IssueRow({ issue }: { issue: QuizIssue }) {
  const isAlert = issue.severity === "alerte";
  const Icon = isAlert ? AlertTriangle : Lightbulb;
  return (
    <li className="flex items-start gap-2">
      <Icon className={cn("mt-0.5 size-4 shrink-0", isAlert ? "text-amber-600" : "text-primary")} />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium leading-snug">{issue.title}</span>
        <span className="text-sm text-muted-foreground">{issue.fix}</span>
        {issue.dayNumber !== undefined && (
          <Link
            href={`/jour/${issue.dayNumber}`}
            className="inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Revoir le Jour {issue.dayNumber}
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
    </li>
  );
}
