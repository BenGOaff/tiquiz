"use client";

// components/dashboard/FirstQuizOnboarding.tsx
//
// Affiché dans le dashboard quand l'user n'a AUCUN quiz (post-signup).
// Au lieu d'envoyer sur /quiz/new vide ou /templates (intimidant : 15
// modèles), on propose 6 templates "phares" qui couvrent les niches les
// plus fréquentes. Un clic = instanciation du quiz + redirect direct
// dans l'éditeur → user passe de signup à "premier quiz prêt à publier"
// en quelques secondes.
//
// Bénéfice conversion (Béné 2 juin 2026) : exploite directement les 15
// templates V2 livrés dans la session précédente. Le user voit la
// VALEUR avant même de savoir comment fonctionne Tiquiz.
//
// Fallback : un bouton "Partir de zéro" pour ceux qui préfèrent +
// un lien "Voir les 15 modèles" qui mène à /templates.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/ui/mascot";
import { getTemplateBySlug } from "@/lib/templates/catalog";

/**
 * Sélection éditoriale des templates "first quiz". Choisis pour la
 * diversité de niches (business, mindset, bien-être, nutrition,
 * parentalité, finance) — chaque user devrait y trouver quelque chose
 * qui résonne directement avec son audience.
 */
const FIRST_QUIZ_SLUGS = [
  "profil-entrepreneur",
  "croyance-limitante",
  "moteur-interieur",
  "rapport-nourriture",
  "style-parental",
  "rapport-argent",
] as const;

export function FirstQuizOnboarding() {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const [instantiating, setInstantiating] = useState<string | null>(null);

  const recommended = FIRST_QUIZ_SLUGS.map(getTemplateBySlug).filter(
    (t): t is NonNullable<typeof t> => t !== null,
  );

  async function handleUseTemplate(slug: string) {
    const tpl = getTemplateBySlug(slug);
    if (!tpl) return;

    setInstantiating(slug);
    try {
      // Payload calqué sur TemplateDetailClient pour cohérence — POST
      // /api/quiz attend les champs top-level (pas un wrapper).
      const p = tpl.payload;
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

      if (!res.ok || !data?.ok || !data?.quizId) {
        if (data?.error === "FREE_PLAN_QUIZ_LIMIT") {
          toast.error(data.message ?? t("fqoLimitFree"));
        } else {
          toast.error(t("fqoCreateFailed"));
        }
        return;
      }

      toast.success(t("fqoReady"));
      router.push(`/quiz/${data.quizId}`);
    } catch {
      toast.error(t("fqoNetworkErr"));
    } finally {
      setInstantiating(null);
    }
  }

  return (
    <div className="rounded-2xl gradient-primary p-6 text-white">
      <div className="flex items-center gap-5 mb-5">
        <div className="hidden sm:flex shrink-0 w-20 h-20 rounded-2xl bg-white/15 items-center justify-center">
          <Mascot expression="celebrate" size={64} tone="soft" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold mb-1">{t("fqoHeading")}</h2>
          <p className="text-white/80 text-sm max-w-2xl">{t("fqoSubtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {recommended.map((tpl) => (
          <button
            key={tpl.slug}
            onClick={() => handleUseTemplate(tpl.slug)}
            disabled={!!instantiating}
            className="group text-left rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 transition-colors p-4 border border-white/15 disabled:opacity-50 disabled:cursor-wait"
          >
            <div className="flex items-start gap-2 mb-1.5">
              <span className="text-2xl shrink-0" aria-hidden>
                {tpl.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">
                  {tpl.cardTitle}
                </p>
                <p className="text-[11px] text-white/70 mt-0.5">{tpl.metier}</p>
              </div>
            </div>
            <p className="text-xs text-white/80 line-clamp-2">{tpl.tagline}</p>
            <div className="flex items-center gap-1 mt-2.5 text-xs text-white/90">
              {instantiating === tpl.slug ? (
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  {t("fqoCreating")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
                  {t("fqoUseTemplate")}
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-white/20">
        <Button
          asChild
          variant="secondary"
          size="sm"
          className="rounded-full bg-white/15 hover:bg-white/25 text-white border-white/25"
        >
          <Link href="/templates">{t("fqoSeeAll")}</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-full text-white hover:bg-white/15"
        >
          <Link href="/quiz/new">
            <Plus className="w-4 h-4 mr-1" />
            {t("fqoFromScratch")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
