"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Download,
  Mail,
  Megaphone,
  Users,
  MessageSquare,
  Boxes,
  ExternalLink,
  Target,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FunnelAssets, FunnelEmail, FunnelResultEmail, SioTemplate } from "@/lib/types";
import {
  FUNNEL_INTENTIONS,
  DEFAULT_INTENTION,
  type IntentionMap,
  type FunnelIntention,
} from "@/lib/funnelIntentions";

interface ProfileOption {
  title: string;
  hasCta: boolean;
}

export function FunnelClient({
  initialAssets,
  generatedAt,
  templates = [],
  profiles = [],
  initialIntentions = {},
}: {
  initialAssets: FunnelAssets | null;
  generatedAt: string | null;
  templates?: SioTemplate[];
  profiles?: ProfileOption[];
  initialIntentions?: IntentionMap;
}) {
  const router = useRouter();
  const [assets, setAssets] = useState<FunnelAssets | null>(initialAssets);
  const [busy, setBusy] = useState(false);
  const [intentions, setIntentions] = useState<IntentionMap>(initialIntentions);

  async function saveIntentions(next: IntentionMap) {
    setIntentions(next);
    try {
      await fetch("/api/me/funnel/intentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentions: next }),
      });
    } catch {
      toast.error("Enregistrement impossible. Réessaie.");
    }
  }

  const intentionsBlock =
    profiles.length > 0 ? (
      <IntentionsBlock profiles={profiles} intentions={intentions} onChange={saveIntentions} />
    ) : null;

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/me/funnel", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.assets) throw new Error("gen failed");
      setAssets(json.assets as FunnelAssets);
      toast.success("Ta campagne est prête.");
      router.refresh();
    } catch {
      toast.error("Génération impossible pour le moment. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  function downloadAll() {
    if (!assets) return;
    download("ma-campagne-quizing.md", toMarkdown(assets));
  }

  const templatesBlock = templates.length > 0 ? <SioTemplatesBlock templates={templates} /> : null;

  if (!assets) {
    return (
      <div className="flex flex-col gap-6">
        {templatesBlock}
        {intentionsBlock}
        <Card>
        <CardContent className="flex flex-col items-start gap-4 py-8">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Megaphone className="size-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-semibold">Génère ta campagne complète</h2>
            <p className="text-sm text-muted-foreground">
              À partir de ton carnet et de ton métier, on t'écrit ta séquence de bienvenue, un email
              par profil de résultat, ta séquence de vente douce et ton kit de lancement (posts, DM,
              email partenaire). Plus ton carnet est rempli, meilleure est la campagne.
            </p>
          </div>
          <Button size="lg" onClick={generate} disabled={busy}>
            <Sparkles />
            {busy ? "Je rédige ta campagne..." : "Générer ma campagne"}
          </Button>
        </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {templatesBlock}
      {intentionsBlock}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {generatedAt ? `Générée le ${new Date(generatedAt).toLocaleDateString("fr-FR")}.` : ""} Tu
          peux la régénérer après avoir avancé dans ton carnet.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadAll}>
            <Download />
            Tout télécharger
          </Button>
          <Button variant="ghost" size="sm" onClick={generate} disabled={busy}>
            <RefreshCw className={busy ? "animate-spin" : undefined} />
            {busy ? "..." : "Régénérer"}
          </Button>
        </div>
      </div>

      {assets.raw ? (
        <Card>
          <CardContent className="py-5">
            <CopyBlock label="Ma campagne" text={assets.raw} />
          </CardContent>
        </Card>
      ) : (
        <>
          <Section icon={Mail} title="Séquence de bienvenue">
            {assets.welcome.map((e, i) => (
              <EmailCard key={i} email={e} />
            ))}
          </Section>

          <Section icon={Users} title="Un email par profil de résultat">
            {assets.byResult.map((e, i) => (
              <ResultEmailCard key={i} email={e} />
            ))}
          </Section>

          <Section icon={Mail} title="Séquence de vente douce">
            {assets.sales.map((e, i) => (
              <EmailCard key={i} email={e} />
            ))}
          </Section>

          <Section icon={Megaphone} title="Kit de lancement">
            {assets.launch.posts.map((p, i) => (
              <Card key={i}>
                <CardContent className="flex flex-col gap-2 py-4">
                  <CopyBlock label={`Post ${i + 1}`} text={p} />
                </CardContent>
              </Card>
            ))}
            {assets.launch.dm && (
              <Card>
                <CardContent className="flex flex-col gap-2 py-4">
                  <CopyBlock label="Script de message direct" text={assets.launch.dm} icon={MessageSquare} />
                </CardContent>
              </Card>
            )}
            {assets.launch.partnerEmail && (
              <Card>
                <CardContent className="flex flex-col gap-2 py-4">
                  <CopyBlock label="Email d'échange partenaire" text={assets.launch.partnerEmail} />
                </CardContent>
              </Card>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Mail;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmailCard({ email }: { email: FunnelEmail }) {
  const full = `Objet : ${email.subject}\n\n${email.body}`;
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">Objet : {email.subject}</p>
          <CopyButton text={full} />
        </div>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{email.body}</p>
      </CardContent>
    </Card>
  );
}

function ResultEmailCard({ email }: { email: FunnelResultEmail }) {
  const full = `Objet : ${email.subject}\n\n${email.body}`;
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">{email.result}</p>
            <p className="text-sm font-semibold">Objet : {email.subject}</p>
          </div>
          <CopyButton text={full} />
        </div>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{email.body}</p>
      </CardContent>
    </Card>
  );
}

function CopyBlock({
  label,
  text,
  icon: Icon,
}: {
  label: string;
  text: string;
  icon?: typeof Mail;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {Icon && <Icon className="size-4 text-primary" />}
          {label}
        </span>
        <CopyButton text={text} />
      </div>
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{text}</p>
    </>
  );
}

function CopyButton({ text }: { text: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.success("Copié.");
        } catch {
          toast.error("Copie impossible.");
        }
      }}
    >
      <Copy />
      Copier
    </Button>
  );
}

function toMarkdown(a: FunnelAssets): string {
  if (a.raw) return `# Ma campagne L'Atelier du Quiz\n\n${a.raw}\n`;
  const lines: string[] = ["# Ma campagne L'Atelier du Quiz", ""];
  const emailMd = (e: FunnelEmail) => `**Objet :** ${e.subject}\n\n${e.body}\n`;
  lines.push("## Séquence de bienvenue", "");
  a.welcome.forEach((e) => lines.push(emailMd(e), "---", ""));
  lines.push("## Un email par profil de résultat", "");
  a.byResult.forEach((e) => lines.push(`### ${e.result}`, emailMd(e), "---", ""));
  lines.push("## Séquence de vente douce", "");
  a.sales.forEach((e) => lines.push(emailMd(e), "---", ""));
  lines.push("## Kit de lancement", "");
  a.launch.posts.forEach((p, i) => lines.push(`### Post ${i + 1}`, p, ""));
  if (a.launch.dm) lines.push("### Script de message direct", a.launch.dm, "");
  if (a.launch.partnerEmail) lines.push("### Email d'échange partenaire", a.launch.partnerEmail, "");
  return lines.join("\n");
}

function IntentionsBlock({
  profiles,
  intentions,
  onChange,
}: {
  profiles: ProfileOption[];
  intentions: IntentionMap;
  onChange: (next: IntentionMap) => void;
}) {
  return (
    <Card className="border-primary/30 bg-surface-soft">
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-center gap-2">
          <Target className="size-5 text-primary" />
          <h2 className="font-display font-semibold">L'objectif de chaque email</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Par défaut, chaque email suit le bouton (CTA) de ton résultat de quiz. Tu peux imposer une
          intention pour un profil : l'IA écrira l'email dans ce sens.
        </p>
        <div className="flex flex-col gap-2">
          {profiles.map((p) => (
            <div
              key={p.title}
              className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.hasCta ? "Un CTA est défini sur ce résultat." : "Pas de CTA sur ce résultat."}
                </p>
              </div>
              <select
                value={intentions[p.title] ?? DEFAULT_INTENTION}
                onChange={(e) =>
                  onChange({ ...intentions, [p.title]: e.target.value as FunnelIntention })
                }
                className="h-9 shrink-0 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-64"
              >
                {FUNNEL_INTENTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Régénère ta campagne après avoir changé une intention pour l'appliquer.
        </p>
      </CardContent>
    </Card>
  );
}

function SioTemplatesBlock({ templates }: { templates: SioTemplate[] }) {
  return (
    <Card className="border-primary/30 bg-surface-soft">
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-center gap-2">
          <Boxes className="size-5 text-primary" />
          <h2 className="font-display font-semibold">Modèles à importer en 1 clic</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Des modèles Systeme.io prêts à l'emploi (séquences, tunnels). Clique, importe sur ton
          compte, puis personnalise avec les textes générés ci-dessous.
        </p>
        <div className="flex flex-col gap-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.label}</p>
                {t.description && (
                  <p className="truncate text-xs text-muted-foreground">{t.description}</p>
                )}
              </div>
              <Button asChild size="sm">
                <a href={t.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Importer
                </a>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
