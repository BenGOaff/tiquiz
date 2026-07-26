import { PersonaVocabManager } from "@/components/admin/PersonaVocabManager";

export const dynamic = "force-dynamic";

export default function AdminPersonasPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Vocabulaire par persona</h1>
        <p className="text-sm text-muted-foreground">
          Les mots {"{offre}"}, {"{client}"}, {"{audience}"}, {"{expertise}"} placés dans le contenu
          des jours se remplacent par le vocabulaire du métier de l'élève. Adapte-les ici.
        </p>
      </header>
      <PersonaVocabManager />
    </div>
  );
}
