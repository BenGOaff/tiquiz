// app/api/newsletter/route.ts
//
// L'INSCRIPTION À LA NEWSLETTER.
//
// Béné, 30 août 2026 : "envoyer les contacts vers systeme io avec tag
// déjà existant et règle aussi".
//
// Les emails restent chez Systeme.io : cette route n'écrit donc RIEN
// dans notre base. Elle crée le contact chez elle et pose le tag
// `newsletter`, qui est le segment qu'elle adresse. C'est exactement
// l'état d'un inscrit venu de son formulaire, vérifié dans son compte
// le 30 août (règle 1273770, active).
//
// -- PUBLIQUE, DONC LIMITÉE PAR IP -------------------------------------
//
// Une route publique qui écrit chez un tiers est une route qu'on
// inondera. La limite vit dans `lib/rateLimit/parIp.ts`, partagée avec
// le support : c'est là qu'on a trouvé, ce jour là, un compteur qui se
// désarmait tout seul.
//
// -- ET ELLE DIT CE QUI S'EST PASSÉ ------------------------------------
//
// Le serveur rend une RAISON, jamais une phrase : l'interface la
// traduit. Un `ok: false` muet envoie la personne réessayer dix fois
// (règle du 3 août).

import { NextRequest, NextResponse } from "next/server";

import { jugerInscription, TAG_NEWSLETTER } from "@/lib/newsletter/inscription";
import { poserTagParNomDetaille } from "@/lib/sio/appliquerTag";
import { creerLimiteur, ipDeLaRequete } from "@/lib/rateLimit/parIp";
import { ACHETEUR_VIDE } from "@/lib/facture/identite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiteur = creerLimiteur({ max: 5, fenetreMs: 3_600_000 });

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (limiteur.trop(ipDeLaRequete(req.headers))) {
    return NextResponse.json({ ok: false, raison: "trop_de_demandes" }, { status: 429 });
  }

  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ ok: false, raison: "email_manquant" }, { status: 400 });
  }

  const verdict = jugerInscription(corps);
  if (!verdict.ok) {
    return NextResponse.json({ ok: false, raison: verdict.raison }, { status: 400 });
  }

  // LE PRÉNOM VOYAGE DANS L'IDENTITÉ DU CONTACT.
  //
  // `corpsCreationContact` sait poser `first_name` chez Systeme.io à
  // partir d'un acheteur. On réutilise ce chemin plutôt que d'en écrire
  // un deuxième : une newsletter qui dit "Hey" au lieu de "Hey Gwenn"
  // est une newsletter qui ressemble à toutes les autres.
  const pose = await poserTagParNomDetaille(verdict.email, TAG_NEWSLETTER, {
    locale: "fr",
    // `ACHETEUR_VIDE` et pas un objet partiel : le type porte dix
    // champs, et en oublier un ferait passer `undefined` là où le
    // reste du code attend `null`.
    acheteur: verdict.prenom
      ? { ...ACHETEUR_VIDE, email: verdict.email, prenom: verdict.prenom }
      : null,
  });

  if (!pose.ok) {
    // ON NE MENT PAS À LA PERSONNE.
    //
    // Elle a cliqué, on n'a pas su l'inscrire : lui afficher "c'est
    // bon" la ferait attendre des emails qui n'arriveront jamais, et
    // elle conclurait que la newsletter n'existe pas. On le dit, et ça
    // crie dans le journal pour qu'on puisse la rattraper.
    // LA CAUSE EST NOMMEE, pas devinee (31 aout 2026). Ce bloc disait
    // "verifier la cle API et l'existence du tag", c'est a dire DEUX
    // pistes parmi cinq, sans dire laquelle. Un journal se lit, il ne
    // se deduit pas.
    console.error(
      `[newsletter] inscription NON enregistree pour ${verdict.email} : ${pose.raison}. ` +
        `(aucune_cle = la cle Systeme.io n'est pas connectee ; contact_impossible = ` +
        `Systeme.io a refuse la creation ; tag_inconnu = l'etiquette "${TAG_NEWSLETTER}" ` +
        `est introuvable dans le compte.)`,
    );
    // La raison SORT dans la reponse : sans elle, diagnostiquer demande
    // un acces au serveur, et c'est ce qui a coute la matinee. Aucune de
    // ces valeurs n'est un secret, elles nomment un etat de
    // configuration.
    return NextResponse.json(
      { ok: false, raison: "indisponible", cause: pose.raison },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
