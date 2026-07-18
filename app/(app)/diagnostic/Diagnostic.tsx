"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_OPTIONS,
  MATURITY_OPTIONS,
  MONETIZATION_OPTIONS,
  ADS_OPTIONS,
  labelOf,
  type ActivityType,
  type Maturity,
  type Monetization,
  type AdsBudget,
} from "@/lib/businessProfile";

const TOTAL = 6;

export function Diagnostic({ firstName: initialFirstName }: { firstName: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"quiz" | "plan">("quiz");
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(initialFirstName ?? "");
  const [activity, setActivity] = useState<ActivityType | null>(null);
  const [niche, setNiche] = useState("");
  const [maturity, setMaturity] = useState<Maturity | null>(null);
  const [monetization, setMonetization] = useState<Monetization | null>(null);
  const [ads, setAds] = useState<AdsBudget | null>(null);

  const canContinue =
    (step === 0 && name.trim() !== "") ||
    (step === 1 && activity) ||
    (step === 2 && niche.trim() !== "") ||
    (step === 3 && maturity) ||
    (step === 4 && monetization) ||
    (step === 5 && ads);

  async function finish() {
    if (!name.trim() || !activity || !niche.trim() || !maturity || !monetization || !ads) return;
    setSaving(true);
    try {
      const res = await fetch("/api/me/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: name.trim(),
          niche: niche.trim(),
          activityType: activity,
          maturity,
          monetization,
          adsBudget: ads,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      // Pas de router.refresh ici : la page /diagnostic redirige vers le
      // dashboard une fois le diagnostic marque complet. On garde l'ecran
      // de plan, le bouton "Commencer" navigue ensuite.
      setPhase("plan");
    } catch {
      toast.error("On n'a pas pu enregistrer. Réessaie dans un instant.");
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (!canContinue) {
      toast.error("Réponds pour continuer.");
      return;
    }
    if (step < TOTAL - 1) setStep(step + 1);
    else finish();
  }

  // Plan tailored au profil business.
  function planLines(): string[] {
    const lines: string[] = [];
    if (maturity === "demarrage")
      lines.push(
        "Tu pars d'une page blanche, et c'est parfait : on construit ton premier actif d'acquisition pas à pas, sans te noyer.",
      );
    else if (maturity === "audience")
      lines.push(
        "Tu as déjà une audience : on la transforme en liste email qualifiée avec ton quiz, la pièce qui te manque pour vendre en confiance.",
      );
    else if (maturity === "liste")
      lines.push(
        "Tu as déjà une liste : on la segmente finement avec ton quiz pour envoyer le bon message à la bonne personne.",
      );
    else if (maturity === "ventes")
      lines.push(
        "Tu vends déjà : on branche ton quiz comme un aiguilleur qui envoie chaque profil vers la bonne offre.",
      );

    if (monetization === "affiliation" || monetization === "les_deux")
      lines.push(
        "Comme tu fais de l'affiliation, on oriente ton quiz vers la recommandation : le résultat diagnostique le besoin et présente le produit affilié comme la solution logique, sans forcer.",
      );
    else if (monetization === "pas_encore")
      lines.push(
        "Pas encore monétisé : on commence par capter et comprendre ton audience, ton offre se dessinera naturellement ensuite.",
      );

    if (ads === "oui")
      lines.push(
        "Tu as un budget pub : une fois ton quiz validé en gratuit, le bonus trafic payant te montre comment l'amplifier presque sans risque.",
      );
    else
      lines.push(
        "On se concentre sur les leviers gratuits pour remplir ton quiz, sans dépenser un euro.",
      );

    return lines;
  }

  if (phase === "plan") {
    return (
      <div className="mx-auto max-w-2xl py-6">
        <Card>
          <CardContent className="flex flex-col gap-5 py-8">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="size-5" />
              <span className="font-semibold">Ton parcours, adapté à toi</span>
            </div>
            <p className="text-sm">
              {name.trim() ? `${name.trim()}, voici comment on va s'y prendre.` : "Voici comment on va s'y prendre."}
            </p>
            <ul className="flex flex-col gap-2">
              {planLines().map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-1 rounded-lg bg-surface-soft px-4 py-3 text-sm">
              <Recap label="Activité" value={labelOf(ACTIVITY_OPTIONS, activity)} />
              <Recap label="Niche" value={niche.trim()} />
              <Recap label="Où tu en es" value={labelOf(MATURITY_OPTIONS, maturity)} />
              <Recap label="Monétisation" value={labelOf(MONETIZATION_OPTIONS, monetization)} />
              <Recap label="Budget pub" value={labelOf(ADS_OPTIONS, ads)} />
            </div>
            <p className="text-sm text-muted-foreground">
              Ton coach et tes missions s'appuient sur ces infos. Tu peux les ajuster à tout moment
              dans ton profil.
            </p>
            <Button size="lg" onClick={() => router.replace("/dashboard")}>
              Commencer mon parcours
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-6">
      <header className="mb-6 flex flex-col gap-1 text-center">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Bienvenue !</h1>
        <p className="text-sm text-muted-foreground">
          Quelques questions sur ton activité pour adapter ton parcours et ton coach à TON business.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-5 py-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Question {step + 1} sur {TOTAL}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: TOTAL }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 w-6 rounded-full transition-colors",
                    i <= step ? "bg-primary" : "bg-muted",
                  )}
                />
              ))}
            </div>
          </div>

          <div key={step} className="flex animate-quiz-step-in flex-col gap-4">
            {step === 0 && (
              <>
                <h2 className="font-display text-lg font-semibold">Comment tu t'appelles ?</h2>
                <p className="text-sm text-muted-foreground">
                  Ton prénom, pour qu'on se parle vraiment tout au long du parcours.
                </p>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ton prénom"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") next();
                  }}
                />
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="font-display text-lg font-semibold">C'est quoi ton activité ?</h2>
                <div className="flex flex-col gap-2">
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      selected={activity === opt.value}
                      onClick={() => setActivity(opt.value)}
                    />
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="font-display text-lg font-semibold">
                  Tu aides qui à faire quoi ?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Ta niche en une phrase. Exemple : j'aide les coachs débordés à s'organiser sans
                  culpabiliser.
                </p>
                <Textarea
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  rows={3}
                  placeholder="J'aide..."
                  autoFocus
                />
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="font-display text-lg font-semibold">Où en es-tu aujourd'hui ?</h2>
                <div className="flex flex-col gap-2">
                  {MATURITY_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      selected={maturity === opt.value}
                      onClick={() => setMaturity(opt.value)}
                    />
                  ))}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="font-display text-lg font-semibold">
                  Comment tu gagnes (ou veux gagner) ta vie ?
                </h2>
                <div className="flex flex-col gap-2">
                  {MONETIZATION_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      selected={monetization === opt.value}
                      onClick={() => setMonetization(opt.value)}
                    />
                  ))}
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <h2 className="font-display text-lg font-semibold">
                  Pour amener du monde sur ton quiz ?
                </h2>
                <div className="flex flex-col gap-2">
                  {ADS_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      selected={ads === opt.value}
                      onClick={() => setAds(opt.value)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || saving}
            >
              <ArrowLeft />
              Retour
            </Button>
            <Button onClick={next} disabled={saving}>
              {saving ? "Un instant..." : step < TOTAL - 1 ? "Continuer" : "Voir mon plan"}
              {!saving && <ArrowRight />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p>
      {label} : <strong>{value}</strong>
    </p>
  );
}

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-4 py-3 text-left text-sm transition-colors",
        selected
          ? "border-primary bg-surface-soft font-medium ring-1 ring-primary"
          : "border-border bg-background hover:border-primary/50 hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}
