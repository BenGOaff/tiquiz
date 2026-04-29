"use client";

// components/embed/EmbedEditor.tsx
// Step 3 of the iframe preview — the visitor edits the AI-generated
// quiz with the same Tiquiz UI primitives (Card, Input, Textarea,
// Button, lucide icons) so the look matches the post-checkout editor.
// SIO-specific knobs (tags, course, community) are deliberately
// hidden — they live in the real /quiz/[id] editor only.

import { useState } from "react";
import { Plus, X, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { EmbedQuiz, EmbedLocale, EmbedQuestion, EmbedResult } from "./embed-types";
import { getEmbedStrings } from "./embed-i18n";

type Props = {
  locale: EmbedLocale;
  quiz: EmbedQuiz;
  onChange: (next: EmbedQuiz) => void;
  onPublish: () => void;
};

type Tab = "questions" | "profiles";

export default function EmbedEditor({ locale, quiz, onChange, onPublish }: Props) {
  const t = getEmbedStrings(locale);
  const [tab, setTab] = useState<Tab>("questions");

  function patch(p: Partial<EmbedQuiz>) {
    onChange({ ...quiz, ...p });
  }

  function patchQuestion(idx: number, p: Partial<EmbedQuestion>) {
    const next = quiz.questions.map((q, i) => (i === idx ? { ...q, ...p } : q));
    patch({ questions: next });
  }

  function deleteQuestion(idx: number) {
    patch({ questions: quiz.questions.filter((_, i) => i !== idx) });
  }

  function addQuestion() {
    patch({
      questions: [
        ...quiz.questions,
        {
          question_text: t.newQ,
          options: [{ text: t.optA }, { text: t.optB }, { text: t.optC }],
        },
      ],
    });
  }

  function patchOption(qIdx: number, oIdx: number, value: string) {
    const next = quiz.questions.map((q, i) => {
      if (i !== qIdx) return q;
      return {
        ...q,
        options: q.options.map((o, j) => (j === oIdx ? { ...o, text: value } : o)),
      };
    });
    patch({ questions: next });
  }

  function deleteOption(qIdx: number, oIdx: number) {
    const next = quiz.questions.map((q, i) => {
      if (i !== qIdx) return q;
      return { ...q, options: q.options.filter((_, j) => j !== oIdx) };
    });
    patch({ questions: next });
  }

  function addOption(qIdx: number) {
    const next = quiz.questions.map((q, i) => {
      if (i !== qIdx) return q;
      return { ...q, options: [...q.options, { text: t.newOpt }] };
    });
    patch({ questions: next });
  }

  function patchProfile(idx: number, p: Partial<EmbedResult>) {
    const next = quiz.results.map((r, i) => (i === idx ? { ...r, ...p } : r));
    patch({ results: next });
  }

  function deleteProfile(idx: number) {
    patch({ results: quiz.results.filter((_, i) => i !== idx) });
  }

  function addProfile() {
    patch({
      results: [...quiz.results, { title: t.newQ, description: "", insight: "", cta_text: "", cta_url: "" }],
    });
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sticky header: title + tabs */}
      <div className="sticky top-0 bg-background z-10 pb-3 mb-2 border-b">
        <Input
          value={quiz.title || t.defaultTitle}
          onChange={(e) => patch({ title: e.target.value })}
          className="text-xl font-bold border-0 px-2 py-1 h-auto focus-visible:ring-0 focus-visible:bg-muted/40"
        />
        <p className="text-sm text-muted-foreground px-2 mt-1">{t.editLead}</p>
        <div className="mt-3 flex gap-1 bg-muted p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setTab("questions")}
            className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition ${tab === "questions" ? "bg-background shadow text-primary" : "text-muted-foreground"}`}
          >
            {t.tabQuestions} ({quiz.questions.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("profiles")}
            className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition ${tab === "profiles" ? "bg-background shadow text-primary" : "text-muted-foreground"}`}
          >
            {t.tabProfiles} ({quiz.results.length})
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {tab === "questions"
          ? quiz.questions.map((q, idx) => (
              <Card key={idx} className="bg-muted/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <Input
                      value={q.question_text}
                      onChange={(e) => patchQuestion(idx, { question_text: e.target.value })}
                      className="font-semibold border-0 bg-transparent focus-visible:bg-background focus-visible:ring-1"
                    />
                    <Button
                      type="button" variant="ghost" size="icon"
                      onClick={() => deleteQuestion(idx)}
                      title={t.delQ}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 pl-8">
                    {q.options.map((o, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <Input
                          value={o.text}
                          onChange={(e) => patchOption(idx, oIdx, e.target.value)}
                        />
                        <Button
                          type="button" variant="ghost" size="icon"
                          onClick={() => deleteOption(idx, oIdx)}
                          title={t.delOpt}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button" variant="ghost" size="sm"
                      onClick={() => addOption(idx)}
                      className="text-muted-foreground"
                    >
                      <Plus className="size-3 mr-1" /> {t.addOpt}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          : quiz.results.map((r, idx) => (
              <Card key={idx} className="bg-muted/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <Input
                      value={r.title || ""}
                      onChange={(e) => patchProfile(idx, { title: e.target.value })}
                      className="font-semibold border-0 bg-transparent focus-visible:bg-background focus-visible:ring-1"
                    />
                    <Button
                      type="button" variant="ghost" size="icon"
                      onClick={() => deleteProfile(idx)}
                      title={t.delProfile}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  <div className="space-y-3 pl-8">
                    <div className="space-y-1">
                      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{t.fldDescription}</Label>
                      <Textarea
                        rows={2}
                        value={r.description || ""}
                        onChange={(e) => patchProfile(idx, { description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{t.fldInsight}</Label>
                      <Textarea
                        rows={2}
                        value={r.insight || ""}
                        onChange={(e) => patchProfile(idx, { insight: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{t.fldCtaText}</Label>
                        <Input
                          value={r.cta_text || ""}
                          onChange={(e) => patchProfile(idx, { cta_text: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{t.fldCtaUrl}</Label>
                        <Input
                          value={r.cta_url || ""}
                          onChange={(e) => patchProfile(idx, { cta_url: e.target.value })}
                          placeholder="https://"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

        <Button
          type="button" variant="outline"
          onClick={tab === "questions" ? addQuestion : addProfile}
          className="w-full border-dashed text-muted-foreground"
        >
          <Plus className="size-4 mr-1" />
          {tab === "questions" ? t.addQ : t.addProfile}
        </Button>
      </div>

      {/* Sticky footer CTA */}
      <div className="sticky bottom-0 bg-gradient-to-t from-background via-background pt-3 mt-2 flex justify-end">
        <Button onClick={onPublish} size="lg" className="font-semibold">
          <Sparkles className="size-4 mr-1" /> {t.publishCta}
        </Button>
      </div>
    </div>
  );
}
