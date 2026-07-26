"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, KeyRound } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Level = "debutant" | "intermediaire" | "avance";
type Objective = "capter" | "qualifier" | "segmenter" | "vendre";

const LEVEL_OPTIONS: { value: Level; label: string }[] = [
  { value: "debutant", label: "Débutant" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "avance", label: "Avancé" },
];

const OBJECTIVE_OPTIONS: { value: Objective; label: string }[] = [
  { value: "capter", label: "Capter des leads" },
  { value: "qualifier", label: "Qualifier mes prospects" },
  { value: "segmenter", label: "Segmenter mon audience" },
  { value: "vendre", label: "Vendre directement" },
];

export function ProfileForm({
  email,
  firstName: initialFirstName,
  niche: initialNiche,
  level: initialLevel,
  objective: initialObjective,
}: {
  email: string | null;
  firstName: string;
  niche: string;
  level: Level | null;
  objective: Objective | null;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [niche, setNiche] = useState(initialNiche);
  const [level, setLevel] = useState<Level | null>(initialLevel);
  const [objective, setObjective] = useState<Objective | null>(initialObjective);
  const [savingInfo, setSavingInfo] = useState(false);

  const [password, setPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !niche.trim() || !level || !objective) {
      toast.error("Remplis tous les champs pour enregistrer.");
      return;
    }
    setSavingInfo(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), niche: niche.trim(), level, objective }),
      });
      if (!res.ok) throw new Error("save failed");
      toast.success("Profil mis à jour.");
      router.refresh();
    } catch {
      toast.error("Enregistrement impossible. Réessaie.");
    } finally {
      setSavingInfo(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Choisis un mot de passe d'au moins 8 caractères.");
      return;
    }
    setSavingPwd(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPwd(false);
    if (error) {
      toast.error("Le mot de passe n'a pas pu être changé. Réessaie.");
      return;
    }
    setPassword("");
    toast.success("Mot de passe mis à jour.");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Mes infos */}
      <Card>
        <CardContent className="py-5">
          <form onSubmit={saveInfo} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email ?? ""} disabled />
              <p className="text-xs text-muted-foreground">
                L'email de ton compte ne se change pas ici. Écris-moi si besoin.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ton prénom"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="niche">Ma niche</Label>
              <Textarea
                id="niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                rows={2}
                placeholder="J'aide..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Mon niveau</Label>
              <div className="flex flex-col gap-2">
                {LEVEL_OPTIONS.map((opt) => (
                  <Choice
                    key={opt.value}
                    label={opt.label}
                    selected={level === opt.value}
                    onClick={() => setLevel(opt.value)}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Mon objectif n°1</Label>
              <div className="flex flex-col gap-2">
                {OBJECTIVE_OPTIONS.map((opt) => (
                  <Choice
                    key={opt.value}
                    label={opt.label}
                    selected={objective === opt.value}
                    onClick={() => setObjective(opt.value)}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingInfo}>
                <Save />
                {savingInfo ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Securite */}
      <Card>
        <CardContent className="py-5">
          <form onSubmit={changePassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="size-4 text-primary" />
                Changer mon mot de passe
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Au moins 8 caractères"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="outline" disabled={savingPwd}>
                {savingPwd ? "Un instant..." : "Mettre à jour"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Choice({
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
