import { redirect } from "next/navigation";
import { getViewer } from "@/lib/parcours";
import { getFunnelAssets, getFunnelIntentions } from "@/lib/generate/funnel";
import { fetchQuizProfiles } from "@/lib/integrations/tiquiz";
import { getEnabledSioTemplates } from "@/lib/sioTemplates";
import { NoAccess } from "@/components/NoAccess";
import { FunnelClient } from "./FunnelClient";

export const dynamic = "force-dynamic";

export default async function FunnelPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.enrolled) return <NoAccess email={viewer.email} />;

  const [{ assets, generatedAt }, templates, profiles, intentions] = await Promise.all([
    getFunnelAssets(viewer.userId),
    getEnabledSioTemplates(),
    fetchQuizProfiles(viewer.userId),
    getFunnelIntentions(viewer.userId),
  ]);

  const profileOptions = profiles.map((p) => ({
    title: p.title,
    hasCta: Boolean((p.ctaText && p.ctaText.trim()) || (p.ctaUrl && p.ctaUrl.trim())),
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Ta campagne</h1>
        <p className="text-sm text-muted-foreground">
          Tiquiz écrit ton quiz. Ici, on écrit tout l'autour : tes emails et ton kit de lancement,
          à partir de ton carnet. Tu copies dans Systeme.io, tu personnalises, c'est parti.
        </p>
      </header>
      <FunnelClient
        initialAssets={assets}
        generatedAt={generatedAt}
        templates={templates}
        profiles={profileOptions}
        initialIntentions={intentions}
      />
    </div>
  );
}
