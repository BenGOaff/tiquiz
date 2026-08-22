// app/depart/[token]/page.tsx
//
// LA PAGE OÙ ELLE DIT POURQUOI ELLE EST PARTIE.
//
// Publique, atteignable par le lien signé de l'email. Elle n'a plus
// d'abonnement, elle peut même ne plus avoir de compte : lui demander de
// se connecter pour répondre à notre question serait le meilleur moyen
// de n'avoir aucune réponse.
//
// -- CE QUE LA PAGE NE FAIT PAS ----------------------------------------
//
// Elle n'affiche NI son adresse, NI son nom, NI ce qu'elle payait. Un
// lien qui traîne dans un historique de navigation ne doit pas devenir
// un moyen de lire des données personnelles. Le jeton sert à écrire.
//
// Et elle ne cherche pas à la retenir. Pas de remise, pas de "es-tu
// sûre", pas de lien de réabonnement. Une question, un champ, un bouton.
//
// -- `noindex` -----------------------------------------------------------
//
// Cette adresse ne doit jamais remonter dans un moteur de recherche.

import type { Metadata } from "next";

import { readChurnSecret, readChurnToken } from "@/lib/churn/replyToken";
import { DepartForm } from "./DepartForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Une question avant de se quitter",
  robots: { index: false, follow: false },
};

export default async function DepartPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const valide = Boolean(readChurnToken(token, readChurnSecret(process.env)));

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      {valide ? (
        <>
          <h1 className="text-2xl font-bold">Qu&apos;est-ce qui n&apos;allait pas ?</h1>
          <p className="mt-3 text-muted-foreground">
            Ce qui manquait, ce qui coinçait, ce que tu cherchais et que tu n&apos;as pas
            trouvé. Même si c&apos;est sec, même si c&apos;est un détail. Je lis tout moi
            même, et c&apos;est avec ça que je corrige Tiquiz.
          </p>
          <DepartForm token={token} />
          <p className="mt-8 text-sm text-muted-foreground">
            Ton compte reste ouvert et tes quiz restent à toi. Tu repasses simplement en
            gratuit.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold">Ce lien n&apos;est plus valable</h1>
          {/* On ne dit PAS s'il a existe : un jeton invalide et un jeton
              inconnu donnent exactement la meme page. */}
          <p className="mt-3 text-muted-foreground">
            Il a peut être été coupé en deux par ta messagerie. Réponds directement à
            l&apos;email que tu as reçu, ça marche aussi bien.
          </p>
        </>
      )}
    </main>
  );
}
