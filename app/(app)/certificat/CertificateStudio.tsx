"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Award, Sparkles, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CertificateShare } from "@/components/CertificateShare";
import { celebrate } from "@/lib/celebrate";

/**
 * Studio du certificat de reussite (espace eleve). L'eleve choisit le nom
 * affiche (nom + prenom, marque, surnom...), genere son certificat, puis
 * peut le telecharger et le partager. Accessible en permanence une fois le
 * parcours termine (retrouvable depuis le compte).
 */
export function CertificateStudio({
  appUrl,
  initialToken,
  initialName,
  initialNumber,
  suggestedName,
}: {
  appUrl: string;
  initialToken: string | null;
  initialName: string;
  initialNumber: string | null;
  suggestedName: string;
}) {
  const [name, setName] = useState(initialName || suggestedName);
  const [token, setToken] = useState<string | null>(initialToken);
  const [number, setNumber] = useState<string | null>(initialNumber);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(!initialToken);
  // Change a chaque generation pour forcer le rechargement de l'apercu.
  const [version, setVersion] = useState(0);

  async function generate() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Écris le nom à afficher sur ton certificat.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/certificat/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        token?: string;
        number?: string;
        name?: string;
        reason?: string;
      };
      if (!res.ok || !data.ok || !data.token) {
        throw new Error(data.reason ?? "fail");
      }
      const first = !token;
      setToken(data.token);
      setNumber(data.number ?? null);
      if (data.name) setName(data.name);
      setEditing(false);
      setVersion((v) => v + 1);
      celebrate({ intensity: "huge" });
      toast.success(first ? "Ton certificat est prêt." : "Nom mis à jour.");
    } catch {
      toast.error("La génération a échoué. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  const publicUrl = token ? `${appUrl}/cert/${token}` : "";
  const previewUrl = token
    ? `/cert/${token}/image?w=1400&v=${version}`
    : "";
  const downloadUrl = token ? `${appUrl}/cert/${token}/image?dl=1` : "";

  return (
    <div className="flex flex-col gap-6">
      {/* Champ nom : affiche a la premiere generation, ou quand on edite. */}
      {editing ? (
        <Card>
          <CardContent className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cert-name" className="text-sm font-medium">
                Le nom à afficher sur ton certificat
              </label>
              <p className="text-xs text-muted-foreground">
                Ton nom, ta marque, ton surnom, ce que tu veux voir apparaître.
              </p>
              <Input
                id="cert-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={48}
                placeholder="Ex : Camille Durand"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={generate} disabled={busy} size="lg">
                {busy ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Sparkles />
                )}
                {token ? "Mettre à jour mon certificat" : "Générer mon certificat"}
              </Button>
              {token && (
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setEditing(false)}
                  disabled={busy}
                >
                  Annuler
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Apercu du certificat genere. */}
      {token && !editing && (
        <div className="flex flex-col gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Ton certificat de réussite"
            className="w-full h-auto rounded-xl border border-border shadow-card"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {number ? (
                <>
                  Certificat n° <span className="font-medium text-foreground">{number}</span>
                </>
              ) : null}
            </p>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              Modifier le nom
            </Button>
          </div>

          <div className="rounded-xl border border-primary/30 bg-surface-soft p-4">
            <CertificateShare url={publicUrl} imageUrl={downloadUrl} />
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <Award className="mt-0.5 size-5 shrink-0 text-primary" />
            <p>
              Télécharge-le, partage-le pour célébrer tes nouvelles compétences,
              et sers-t'en même pour vendre une prestation de création de quiz à
              tes propres clients.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
