import { SioTemplatesManager } from "@/components/admin/SioTemplatesManager";

export const dynamic = "force-dynamic";

export default function AdminModelesPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Modèles Systeme.io</h1>
        <p className="text-sm text-muted-foreground">
          Crée un modèle dans Systeme.io (séquence, tunnel...), copie son URL de partage, ajoute-la
          ici. L'élève l'importe sur son compte en 1 clic depuis sa page Campagne.
        </p>
      </header>
      <SioTemplatesManager />
    </div>
  );
}
