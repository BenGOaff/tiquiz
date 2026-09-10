"use client";

// components/embed/EmbedForm.tsx
//
// L'ÉCRAN QUI LANCE LE GÉNÉRATEUR PUBLIC, ALIGNÉ SUR LE VRAI TIQUIZ.
//
// Béné, 8 septembre 2026 : "pour obtenir la même qualité de quiz, il
// faut réutiliser la fonction 'créer un quiz avec l'ia' du vrai tiquiz.
// Mais en rendant ça un peu plus UX UI friendly, plus joli. On doit
// coller au mieux à l'intérieur de tiquiz en fait." Et : "il faudrait
// aussi demander au départ si le visiteur veut un quiz scoré ou profil,
// en expliquant brièvement ce que c'est, pour montrer que les deux sont
// dispo."
//
// Les réglages, leurs valeurs et leurs MOTS viennent donc de
// `components/quiz/QuizFormClient.tsx` et du namespace `quizForm` :
// format, type de quiz, nombre de résultats, personnalisation
// dynamique, "Pourquoi tu crées ce quiz ?". Les réécrire ici donnerait
// deux façons de dire la même chose, et c'est l'écran public qui
// finirait par mentir sur le produit.
//
// LES DEUX CARTES DE TYPE NE SONT PAS DÉCORATIVES : c'est LA décision
// qui bloque (drame Véronique, 2 août 2026, deux jours perdus sur un
// quiz scoré qu'elle voulait par profil). Elles disent donc le
// QUESTIONNEMENT ("qui es-tu ?" / "où en es-tu ?"), jamais la mécanique.

import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

/** Une carte cliquable, l'idiome exact du vrai formulaire. */
function CarteChoix({
  actif, titre, desc, onClick,
}: { actif: boolean; titre: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`p-3 rounded-xl border text-left transition-all ${
        actif
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-primary/40"
      }`}
    >
      <p className="font-medium text-sm">{titre}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}

export default function EmbedForm({ locale, inputs, onChange, onSubmit, error }: Props) {
  const t = getEmbedStrings(locale);
  const scoring = inputs.quizType === "scoring";

  // Plain div, no Card. The shadcn Card carries its own bg-card token
  // which sits a hair off-white on the page background and looks like
  // a tight gray-blue panel against the text. The page wrapper already
  // pads + centers; we just need a vertical-rhythm container here.
  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          {t.formTitle}
        </h2>
        <p className="text-muted-foreground mt-1">{t.formLead}</p>
        <p className="text-xs text-muted-foreground mt-2">{t.reqLegend}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tq-topic">
          {t.lblTopic}<span aria-hidden className="text-destructive"> *</span>
        </Label>
        <Input
          id="tq-topic"
          value={inputs.topic}
          onChange={(e) => onChange({ topic: e.target.value })}
          placeholder={t.phTopic}
          maxLength={200}
          aria-required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tq-audience">
            {t.lblAudience}<span aria-hidden className="text-destructive"> *</span>
          </Label>
          <Input
            id="tq-audience"
            value={inputs.audience}
            onChange={(e) => onChange({ audience: e.target.value })}
            placeholder={t.phAudience}
            maxLength={200}
            aria-required
          />
        </div>
        <div className="space-y-2">
          <Label>{t.lblObjective}</Label>
          <Select
            value={inputs.objective}
            onValueChange={(v) => onChange({ objective: v })}
          >
            <SelectTrigger className="h-11 py-2 px-3 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {OBJECTIVE_KEYS.map((k) => (
                <SelectItem key={k} value={k} className="py-2.5 px-3">
                  {t["obj" + k.charAt(0).toUpperCase() + k.slice(1)] ?? k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* FORMAT : c'est lui qui décide du nombre de questions, exactement
          comme dans le vrai formulaire. Un compteur à côté ferait deux
          réglages pour une seule décision. */}
      <div className="space-y-2">
        <Label>{t.lblFormat}</Label>
        <div className="grid grid-cols-2 gap-3">
          <CarteChoix
            actif={inputs.format === "short"}
            titre={t.formatShort}
            desc={t.formatShortDesc}
            onClick={() => onChange({ format: "short" })}
          />
          <CarteChoix
            actif={inputs.format === "long"}
            titre={t.formatLong}
            desc={t.formatLongDesc}
            onClick={() => onChange({ format: "long" })}
          />
        </div>
      </div>

      {/* TYPE DE QUIZ : la demande du 8 septembre. Les deux mécaniques
          existent, et le visiteur doit le VOIR avant de générer. */}
      <div className="space-y-2">
        <Label>{t.lblType}</Label>
        <div className="grid grid-cols-2 gap-3">
          <CarteChoix
            actif={!scoring}
            titre={t.typeProfile}
            desc={t.typeProfileDesc}
            onClick={() => onChange({ quizType: "profile" })}
          />
          <CarteChoix
            actif={scoring}
            titre={t.typeScoring}
            desc={t.typeScoringDesc}
            onClick={() => onChange({ quizType: "scoring" })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          {/* Le libellé CHANGE avec la mécanique : en scoring ce ne sont
              pas des profils mais des tranches de score, et les appeler
              pareil est exactement ce qui a fait perdre deux jours à
              Véronique. */}
          <Label>{scoring ? t.lblResultCountScoring : t.lblResultCountProfile}</Label>
          <Select
            value={String(inputs.resultCount)}
            onValueChange={(v) => onChange({ resultCount: Number(v) })}
          >
            <SelectTrigger className="h-11 py-2 px-3 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)} className="py-2.5 px-3">{n}</SelectItem>
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
            <SelectTrigger className="h-11 py-2 px-3 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TONE_KEYS.map((k) => (
                <SelectItem key={k} value={k} className="py-2.5 px-3">
                  {t["tone" + k.charAt(0).toUpperCase() + k.slice(1)] ?? k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* POURQUOI TU CRÉES CE QUIZ : c'est l'INTENTION BUSINESS du
          prompt, et sans elle le modèle écrit des CTA génériques. Elle
          reste facultative : sur une page publique, un champ de plus
          qui bloque, c'est un visiteur qui part. */}
      <div className="space-y-2">
        <Label htmlFor="tq-intention">{t.lblIntention}</Label>
        <Textarea
          id="tq-intention"
          value={inputs.intention}
          onChange={(e) => onChange({ intention: e.target.value })}
          placeholder={t.phIntention}
          className="h-16"
          maxLength={400}
        />
        <p className="text-xs text-muted-foreground">{t.hintIntention}</p>
      </div>

      <div className="space-y-2">
        <Label>{t.lblPersonalize}</Label>
        <p className="text-xs text-muted-foreground">{t.hintPersonalize}</p>
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
    </div>
  );
}
