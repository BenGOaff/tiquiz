import { Suspense } from "react";
import { SetPasswordFlow } from "@/components/auth/SetPasswordFlow";

// Atterrissage du lien de reinitialisation (email de reset). Publique :
// la session de recuperation s'etablit cote client a partir des jetons
// du lien, puis l'eleve choisit son nouveau mot de passe.
export default function NouveauMotDePassePage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordFlow mode="reset" />
    </Suspense>
  );
}
