"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { VideoField } from "@/components/admin/VideoField";
import { MultiVideoField } from "@/components/admin/MultiVideoField";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import type { Day, DayResource, DayVideo } from "@/lib/types";

export function DayEditor({ day }: { day: Day }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    day_number: day.day_number,
    title: day.title,
    subtitle: day.subtitle ?? "",
    video_url: day.video_url ?? "",
    video_id: day.video_id ?? (null as string | null),
    video_title: day.video_title ?? "",
    video2_url: day.video2_url ?? "",
    video2_id: day.video2_id ?? (null as string | null),
    video2_title: day.video2_title ?? "",
    intro_html: day.intro_html ?? "",
    pepite_html: day.pepite_html ?? "",
    result_html: day.result_html ?? "",
    is_bonus: day.is_bonus ?? false,
  });
  const [resources, setResources] = useState<DayResource[]>(day.resources ?? []);
  // Multi-vidéos : liste ordonnée (une par réseau, etc.). Non vide =>
  // remplace le couple video/video2 ci-dessus. Vide => mode classique.
  const [videos, setVideos] = useState<DayVideo[]>(
    Array.isArray(day.videos) ? day.videos : [],
  );
  const multiMode = videos.length > 0;
  // Nombre de slots [[video:N]] disponibles pour l'insertion dans le
  // contenu : la liste multi si active, sinon les 2 vidéos classiques.
  const videoSlotCount = multiMode ? videos.length : 2;

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/admin/days/${day.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day_number: form.day_number,
        title: form.title,
        subtitle: form.subtitle || null,
        // Une vidéo uploadée (video_id) prend le pas sur l'URL externe.
        video_id: form.video_id,
        video_url: form.video_id ? null : form.video_url || null,
        video_title: form.video_title.trim() || null,
        video2_id: form.video2_id,
        video2_url: form.video2_id ? null : form.video2_url || null,
        video2_title: form.video2_title.trim() || null,
        // Liste multi-vidéos (nettoyée : titre trimé, url vidée si upload).
        videos: videos.map((v) => ({
          title: v.title.trim(),
          url: v.video_id ? null : (v.url ?? "").trim() || null,
          video_id: v.video_id,
        })),
        intro_html: form.intro_html || null,
        pepite_html: form.pepite_html || null,
        result_html: form.result_html || null,
        is_bonus: form.is_bonus,
        resources: resources.filter((r) => r.label.trim() && r.url.trim()),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.reason === "duplicate" ? "Ce numéro de jour est déjà pris." : "Sauvegarde impossible.");
      return;
    }
    toast.success("Jour enregistré.");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="num">Jour n°</Label>
            <Input
              id="num"
              type="number"
              value={form.day_number}
              onChange={(e) => set("day_number", Number.parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="subtitle">Sous-titre</Label>
          <Input
            id="subtitle"
            value={form.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
            placeholder="Une phrase qui situe le jour"
          />
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-border bg-surface-soft px-4 py-3">
          <input
            type="checkbox"
            checked={form.is_bonus}
            onChange={(e) => set("is_bonus", e.target.checked)}
            className="mt-0.5 size-4 accent-primary"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Contenu bonus</span>
            <span className="text-xs text-muted-foreground">
              Un bonus est accessible à tout moment, hors de la séquence quotidienne. Il ne
              débloque pas le jour suivant.
            </span>
          </span>
        </label>

        {/* Deux modes exclusifs. Par défaut : jusqu'à 2 vidéos (video +
            video 2). Pour un module qui en a plus (une par réseau...), on
            bascule sur la liste multi-vidéos, illimitée et ordonnée. */}
        {!multiMode ? (
          <>
            <VideoField
              videoUrl={form.video_url}
              videoId={form.video_id}
              title={form.video_title}
              onUrlChange={(v) => set("video_url", v)}
              onUploaded={(id) => setForm((f) => ({ ...f, video_id: id, video_url: "" }))}
              onClearUpload={() => set("video_id", null)}
              onTitleChange={(v) => set("video_title", v)}
            />

            <VideoField
              label="Vidéo 2 (optionnelle)"
              videoUrl={form.video2_url}
              videoId={form.video2_id}
              title={form.video2_title}
              onUrlChange={(v) => set("video2_url", v)}
              onUploaded={(id) => setForm((f) => ({ ...f, video2_id: id, video2_url: "" }))}
              onClearUpload={() => set("video2_id", null)}
              onTitleChange={(v) => set("video2_title", v)}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => {
                // Bascule vers le mode liste : reprend la vidéo 1 et 2 déjà
                // saisies comme deux premières entrées, puis en ajoute une.
                const seed: DayVideo[] = [];
                if (form.video_id || form.video_url.trim())
                  seed.push({ title: form.video_title, url: form.video_url || null, video_id: form.video_id });
                if (form.video2_id || form.video2_url.trim())
                  seed.push({ title: form.video2_title, url: form.video2_url || null, video_id: form.video2_id });
                seed.push({ title: "", url: "", video_id: null });
                setVideos(seed);
              }}
            >
              <Plus />
              Passer en plusieurs vidéos (une par réseau, etc.)
            </Button>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <Label>Vidéos du module (une par réseau, etc.)</Label>
            <p className="text-xs text-muted-foreground">
              Ajoute autant de vidéos que nécessaire, chacune avec son titre (le nom du réseau).
              Place-les dans le texte avec les boutons Vidéo N de l'éditeur ci-dessous. Vide la
              liste pour revenir au mode simple (1 à 2 vidéos).
            </p>
            <MultiVideoField videos={videos} onChange={setVideos} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit text-muted-foreground"
              onClick={() => setVideos([])}
            >
              Revenir au mode simple (1 à 2 vidéos)
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>Contenu du jour</Label>
          <p className="text-xs text-muted-foreground">
            Mets en forme avec la barre d'outils, insère un schéma si ça aide à comprendre.
            Les boutons Vidéo N placent tes vidéos à l'endroit du texte où se trouve ton
            curseur : tu peux écrire avant et après. Une vidéo non placée dans le texte
            reste affichée en haut de page.
          </p>
          <RichTextEditor
            value={form.intro_html}
            onChange={(v) => set("intro_html", v)}
            placeholder="Écris le contenu du jour..."
            videoSlots={videoSlotCount}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>La pépite (nugget avancé et actionnable)</Label>
          <p className="text-xs text-muted-foreground">
            Un conseil malin (persuasion, growth hack) à appliquer tout de suite. Affiché dans un
            encart distinct. Les variables {"{prenom}"}, {"{offre}"}, {"{client}"}, {"{audience}"}{" "}
            s'adaptent au persona.
          </p>
          <RichTextEditor
            value={form.pepite_html}
            onChange={(v) => set("pepite_html", v)}
            placeholder="La pépite du jour..."
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Page de résultat (fin de jour)</Label>
          <p className="text-xs text-muted-foreground">
            Le récap affiché une fois le quiz validé.
          </p>
          <RichTextEditor
            value={form.result_html}
            onChange={(v) => set("result_html", v)}
            placeholder="Écris le récap de fin de jour..."
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Ressources</Label>
          {resources.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={r.label}
                onChange={(e) =>
                  setResources((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                }
                placeholder="Nom de la ressource"
                className="flex-1"
              />
              <Input
                value={r.url}
                onChange={(e) =>
                  setResources((prev) => prev.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                }
                placeholder="https://..."
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setResources((prev) => prev.filter((_, j) => j !== i))}
                aria-label="Retirer"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResources((prev) => [...prev, { label: "", url: "", type: "link" }])}
            className="w-fit"
          >
            <Plus />
            Ajouter une ressource
          </Button>
        </div>

        <div className="flex justify-end pt-1">
          <Button onClick={save} disabled={busy}>
            <Save />
            {busy ? "Enregistrement..." : "Enregistrer le jour"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
