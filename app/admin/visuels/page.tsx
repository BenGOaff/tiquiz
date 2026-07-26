import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AffiliateAssetsManager, type AssetRow } from "@/components/admin/AffiliateAssetsManager";

export const dynamic = "force-dynamic";

export default async function AdminVisuelsPage() {
  const { data } = await supabaseAdmin
    .from("affiliate_assets")
    .select("id, title, description, kind, url, file_type, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as AssetRow[];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Visuels affiliés</h1>
        <p className="text-sm text-muted-foreground">
          Dépose ici les logos, mockups et bannières que tes affiliés pourront récupérer depuis
          leur espace Affiliation (onglet Contenus). 10 Mo max par fichier.
        </p>
      </header>
      <AffiliateAssetsManager initialRows={rows} />
    </div>
  );
}
