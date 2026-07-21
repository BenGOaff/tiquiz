"use client";

// app/templates/[slug]/TemplateDetailClient.tsx
//
// Détail d'un template : aperçu complet (intro, questions, résultats) +
// bouton "Utiliser ce modèle".
//
// Instanciation : on POST le payload du template vers /api/quiz EXISTANT
// (même endpoint que la création manuelle/IA) → zéro code d'INSERT
// custom, zéro divergence, aucun risque pour les quiz existants. Au
// succès, redirection vers l'éditeur du nouveau quiz.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

import type { QuizTemplate } from "@/lib/templates/types";
import { TemplatesChrome } from "../TemplatesChrome";

export default function TemplateDetailClient({
  template,
  isLoggedIn,
}: {
  template: QuizTemplate;
  isLoggedIn: boolean;
}) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const p = template.payload;

  async function handleUse() {
    if (!isLoggedIn) {
      // Flux non-connecté : on envoie vers l'inscription. Le visiteur
      // reviendra choisir son modèle une fois connecté (V1 simple).
      router.push(`/signup?from=template-${template.slug}`);
      return;
    }

    setCreating(true);
    try {
      // Le payload calque la shape attendue par /api/quiz. status reste
      // "draft" (défaut) → le user atterrit dans l'éditeur et publie
      // quand il est prêt.
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          title: p.title,
          introduction: p.introduction,
          cta_text: p.cta_text,
          share_message: p.share_message,
          virality_enabled: p.virality_enabled,
          address_form: p.address_form,
          questions: p.questions,
          results: p.results,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        if (data?.error === "FREE_PLAN_QUIZ_LIMIT") {
          toast.error(data.message ?? t("fqoLimitFree"));
        } else {
          toast.error(t("fqoCreateFailed"));
        }
        setCreating(false);
        return;
      }

      toast.success(t("fqoReady"));
      router.push(`/quiz/${data.quizId}`);
    } catch {
      toast.error(t("fqoNetworkErr"));
      setCreating(false);
    }
  }

  return (
    <TemplatesChrome isLoggedIn={isLoggedIn}>
      <div className="max-w-[820px] mx-auto w-full px-4 sm:px-6 py-8">
        <Link
          href="/templates"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Tous les modèles
        </Link>

        {/* En-tête */}
        <div className="mt-5 flex items-start gap-4">
          <div className="text-4xl">{template.emoji}</div>
          <div className="min-w-0">
            <span className="text-xs font-medium rounded-full bg-muted/50 px-2 py-0.5 text-muted-foreground">
              {template.metier}
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-display font-bold leading-tight">
              {template.cardTitle}
            </h1>
            <p className="mt-2 text-muted-foreground">{template.tagline}</p>
          </div>
        </div>

        {/* Pour qui / pourquoi ça marche */}
        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Pour qui
            </p>
            <p className="mt-1.5 text-sm text-foreground">{template.whoFor}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Pourquoi ça marche
            </p>
            <p className="mt-1.5 text-sm text-foreground">{template.whyItWorks}</p>
          </div>
        </div>

        {/* CTA principal */}
        <div className="mt-6 sticky top-16 z-[1]">
          <button
            onClick={handleUse}
            disabled={creating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-medium px-6 py-3 hover:opacity-90 transition disabled:opacity-60"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Création…
              </>
            ) : isLoggedIn ? (
              "Utiliser ce modèle"
            ) : (
              "Utiliser ce modèle gratuitement"
            )}
          </button>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Tu pourras tout modifier ensuite : textes, questions, résultats,
            couleurs.
          </p>
        </div>

        {/* Aperçu : intro */}
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Aperçu du modèle
          </h2>

          <div className="mt-3 rounded-xl border border-border/60 bg-card p-5">
            <p className="text-base font-medium text-foreground">{p.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{p.introduction}</p>
          </div>

          {/* Questions */}
          <div className="mt-5 space-y-3">
            {p.questions.map((q, qi) => (
              <div
                key={qi}
                className="rounded-xl border border-border/60 bg-card p-4"
              >
                <p className="text-sm font-medium text-foreground">
                  <span className="text-primary">Q{qi + 1}.</span>{" "}
                  {q.question_text}
                </p>
                <ul className="mt-2 space-y-1">
                  {q.options.map((o, oi) => (
                    <li
                      key={oi}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-border shrink-0" />
                      {o.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Résultats */}
          <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Les {p.results.length} résultats
          </h3>
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            {p.results.map((r, ri) => (
              <div
                key={ri}
                className="rounded-xl border border-border/60 bg-card p-4"
              >
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary" />
                  {r.title}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {r.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA bas de page */}
        <div className="mt-10 rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
          <p className="font-medium text-foreground">
            Ce modèle te parle ? Rends-le tien en 5 minutes.
          </p>
          <button
            onClick={handleUse}
            disabled={creating}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-medium px-6 py-3 hover:opacity-90 transition disabled:opacity-60"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Création…
              </>
            ) : isLoggedIn ? (
              "Utiliser ce modèle"
            ) : (
              "Utiliser ce modèle gratuitement"
            )}
          </button>
        </div>
      </div>
    </TemplatesChrome>
  );
}
