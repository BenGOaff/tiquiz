"use client";

// components/embed/EmbedForm.tsx
// Step 1 of the iframe preview — the visitor describes the quiz they
// want and the AI builds it. Mirrors /quiz/new in Tiquiz so what they
// see here is what they'll see post-checkout, minus the SIO-specific
// knobs (tags, course, community).

import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { EmbedInputs, EmbedLocale } from "./embed-types";
import { getEmbedStrings, OBJECTIVE_KEYS, TONE_KEYS } from "./embed-i18n";

type Props = {
  locale: EmbedLocale;
  inputs: EmbedInputs;
  onChange: (patch: Partial<EmbedInputs>) => void;
  onSubmit: () => void;
  error: string;
};

export default function EmbedForm({ locale, inputs, onChange, onSubmit, error }: Props) {
  const t = getEmbedStrings(locale);

  return (
    <Card className="w-full max-w-2xl mx-auto border-0 shadow-none">
      <CardContent className="p-0 space-y-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {t.formTitle}
          </h2>
          <p className="text-muted-foreground mt-1">{t.formLead}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tq-topic">{t.lblTopic}</Label>
          <Input
            id="tq-topic"
            value={inputs.topic}
            onChange={(e) => onChange({ topic: e.target.value })}
            placeholder={t.phTopic}
            maxLength={200}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tq-audience">{t.lblAudience}</Label>
            <Input
              id="tq-audience"
              value={inputs.audience}
              onChange={(e) => onChange({ audience: e.target.value })}
              placeholder={t.phAudience}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label>{t.lblObjective}</Label>
            <Select
              value={inputs.objective}
              onValueChange={(v) => onChange({ objective: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OBJECTIVE_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {t["obj" + k.charAt(0).toUpperCase() + k.slice(1)] ?? k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t.lblQuestionCount}</Label>
            <Select
              value={String(inputs.questionCount)}
              onValueChange={(v) => onChange({ questionCount: Number(v) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[3, 5, 7, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t.lblTone}</Label>
            <Select
              value={inputs.tone}
              onValueChange={(v) => onChange({ tone: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONE_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {t["tone" + k.charAt(0).toUpperCase() + k.slice(1)] ?? k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-1">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={inputs.askFirstName}
              onChange={(e) => onChange({ askFirstName: e.target.checked })}
            />
            <span>{t.lblAskFirstName}</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={inputs.askGender}
              onChange={(e) => onChange({ askGender: e.target.checked })}
            />
            <span>{t.lblAskGender}</span>
          </label>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button
          type="button"
          onClick={onSubmit}
          className="w-full h-12 text-base font-semibold"
        >
          <Sparkles className="size-4 mr-1" />
          {t.submit}
        </Button>
        {/* removed: 'no email asked' note — internal noise that the
            visitor doesn't need to be reassured about explicitly. */}
      </CardContent>
    </Card>
  );
}
