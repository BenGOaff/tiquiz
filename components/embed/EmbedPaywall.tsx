"use client";

// components/embed/EmbedPaywall.tsx
// Step 4 — paywall overlay shown on top of a blurred preview of the
// quiz the visitor just edited. The primary CTA emits a postMessage
// to the parent window so the bridge script can open the right
// checkout URL (each sales page has its own pricing anchor).

import { Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { EmbedQuiz, EmbedLocale } from "./embed-types";
import { getEmbedStrings } from "./embed-i18n";

type Props = {
  locale: EmbedLocale;
  quiz: EmbedQuiz;
  sessionToken: string;
  savedForLater: boolean;
  onSaveForLater: () => void;
  onUnlock: () => void;
  onBack: () => void;
};

export default function EmbedPaywall({
  locale, quiz, sessionToken, savedForLater, onSaveForLater, onUnlock, onBack,
}: Props) {
  const t = getEmbedStrings(locale);

  return (
    <div className="relative h-full">
      {/* Blurred preview underneath */}
      <div className="filter blur-sm saturate-50 pointer-events-none select-none p-4 space-y-3">
        <h3 className="text-xl font-bold">{quiz.title || t.defaultTitle}</h3>
        <p className="text-sm text-muted-foreground">{quiz.introduction || quiz.description}</p>
        {quiz.questions.slice(0, 3).map((q, i) => (
          <Card key={i} className="bg-muted/30">
            <CardContent className="p-3 space-y-2">
              <div className="font-semibold">{i + 1}. {q.question_text}</div>
              {q.options.map((o, j) => (
                <div key={j} className="text-sm border rounded px-3 py-2 bg-background">{o.text}</div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/95 to-background flex flex-col items-center justify-center text-center px-6">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wide">
          <Sparkles className="size-3" />
          {t.paywallBadge}
        </span>
        <h3 className="text-2xl font-bold mt-3">{t.paywallTitle}</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">{t.paywallText}</p>
        <Button
          onClick={onUnlock}
          size="lg"
          className="mt-5 font-semibold w-full max-w-xs"
        >
          <Lock className="size-4 mr-1" />
          {t.paywallCta}
        </Button>
        {savedForLater ? (
          <p className="mt-3 text-sm text-emerald-600 font-semibold">{t.paywallSavedOk}</p>
        ) : (
          <button
            type="button"
            onClick={onSaveForLater}
            className="mt-3 text-sm underline text-muted-foreground hover:text-foreground"
          >
            {t.paywallSaveLater}
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {t.back}
        </button>
        {/* Hidden, useful for support: lets a curious visitor copy
            the token if they want to retrieve their draft from another
            device. Not advertised. */}
        <p className="mt-4 text-[10px] text-muted-foreground/60 font-mono">
          ref: {sessionToken.slice(0, 8)}…
        </p>
      </div>
    </div>
  );
}
