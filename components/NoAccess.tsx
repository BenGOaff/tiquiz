import { Card, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";

/**
 * Affiché quand l'élève est connecté mais sans enrollment actif (achat
 * non encore propagé, ou accès révoqué). On ne donne aucun détail
 * technique, juste un message rassurant.
 */
export function NoAccess({ email }: { email: string | null }) {
  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-soft text-primary">
            <Mail className="size-6" />
          </div>
          <h1 className="font-display text-xl font-semibold">Ton accès n'est pas encore actif</h1>
          <p className="text-sm text-muted-foreground">
            Si tu viens d'acheter, ton accès s'active en quelques minutes. Reviens d'ici peu.
            Si ça persiste, écris-moi avec l'email {email ? <strong>{email}</strong> : "de ton achat"} et je règle ça.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
