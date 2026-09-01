// app/api/blog/commentaires/route.ts
//
// LA PORTE PUBLIQUE DES COMMENTAIRES.
//
// -- CE QUE CETTE ROUTE FAIT, ET DANS QUEL ORDRE ----------------------
//
//   1. la LIMITE PAR IP, AVANT tout le reste. Un formulaire public sans
//      limite est une table qu'on remplit en une nuit ;
//   2. le VERDICT PUR (`jugerCommentaire`), qui ne connaît ni la requête
//      ni la base et qui est testé ;
//   3. l'écriture, avec le STATUT que le verdict a décidé ;
//   4. l'ALERTE à Béné, best-effort, après l'écriture.
//
// L'ordre n'est pas décoratif : valider avant de limiter reviendrait à
// faire travailler le serveur pour chaque envoi d'un robot, et à ne
// compter que les envois BIEN FORMÉS. Un robot en envoie surtout des
// mauvais.
//
// -- UN REFUS N'EST PAS UNE PANNE -------------------------------------
//
// La route répond 400 avec une RAISON quand le formulaire est mauvais,
// 429 quand c'est trop rapide, et 503 quand la migration n'est pas
// passée. Jamais un "erreur serveur" nu : c'est ce qui envoie chercher
// au mauvais endroit (règle du 3 août). Le serveur renvoie la raison,
// l'écran écrit la phrase.

import { NextRequest, NextResponse } from "next/server";

import { tousLesSlugs } from "@/lib/blog/articles";
import { jugerCommentaire } from "@/lib/blog/commentaires";
import { enregistrerCommentaire } from "@/lib/blog/commentairesStore";
import { envoyerAlerteCommentaire } from "@/lib/email/commentaireBlogAlerte";
import { creerLimiteur } from "@/lib/rateLimit/parIp";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * Cinq commentaires par heure et par adresse.
 *
 * C'est large pour une lectrice (qui en laisse un) et étroit pour un
 * robot. La limite vit DANS le processus : elle ne survit pas à un
 * redémarrage, et c'est assumé. Une limite en base coûterait une requête
 * à chaque envoi pour un gain nul face à quelqu'un qui change d'IP.
 */
const limiteur = creerLimiteur({ max: 5, fenetreMs: 60 * 60 * 1000 });

function adresse(req: NextRequest): string {
  const entete = req.headers.get("x-forwarded-for") ?? "";
  return entete.split(",")[0]?.trim() || "inconnue";
}

export async function POST(req: NextRequest) {
  const ip = adresse(req);
  if (limiteur.trop(ip)) {
    return NextResponse.json(
      { ok: false, raison: "trop-rapide" },
      { status: 429 },
    );
  }

  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ ok: false, raison: "corps-illisible" }, { status: 400 });
  }

  const verdict = jugerCommentaire(
    corps as Parameters<typeof jugerCommentaire>[0],
    tousLesSlugs(),
  );
  if (!verdict.ok) {
    // Le piège attrapé répond 200 : dire à un robot qu'il a été repéré
    // lui apprend comment ne plus l'être. Rien n'est écrit.
    if (verdict.raison === "piege") return NextResponse.json({ ok: true, statut: "en_attente" });
    return NextResponse.json({ ok: false, raison: verdict.raison }, { status: 400 });
  }

  const ecrit = await enregistrerCommentaire(
    verdict.valeur,
    ip,
    verdict.statut,
    verdict.motifs,
  );
  if (!ecrit.ok) {
    return NextResponse.json(
      { ok: false, raison: ecrit.raison },
      { status: ecrit.raison === "table_absente" ? 503 : 500 },
    );
  }

  // L'ALERTE PART APRÈS L'ÉCRITURE, et son échec ne change rien à la
  // réponse : le commentaire est déjà enregistré. Répondre "erreur"
  // parce que NOTRE email n'est pas parti ferait renvoyer le message
  // cinq fois.
  await envoyerAlerteCommentaire({
    slug: verdict.valeur.slug,
    auteur: verdict.valeur.auteur,
    message: verdict.valeur.message,
    email: verdict.valeur.email,
    statut: verdict.statut,
    motifs: verdict.motifs,
  }).catch(() => false);

  // « RECHARGE LA PAGE POUR LE VOIR » DOIT ÊTRE VRAI (Béné, 1er
  // septembre 2026).
  //
  //   "J'ai essayé de laisser un commentaire, il m'a dit c'est en ligne
  //    actualise la page pour le voir, mais non je vois rien."
  //
  // Elle avait raison, et le code le savait sans le dire : l'article est
  // en `force-static` avec `revalidate = 600`. Le commentaire était bien
  // publié en base, mais la page servie venait du cache, et jusqu'à DIX
  // MINUTES pouvaient passer avant qu'elle ne le voie. Le commentaire au
  // dessus de la page disait "dix minutes de retard sur une
  // conversation, personne ne les voit" : c'est faux pour la seule
  // personne à qui on demande de recharger, celle qui vient d'écrire.
  //
  // On invalide donc la page tout de suite. La régénération a lieu à la
  // requête suivante, c'est à dire au rechargement qu'on lui demande.
  //
  // UNIQUEMENT SUR UN COMMENTAIRE PUBLIÉ : un message retenu en
  // modération ne change rien à la page, et régénérer pour rien
  // gaspillerait un rendu à chaque tentative de spam.
  if (verdict.statut === "publie") {
    try {
      revalidatePath(`/blog/${verdict.valeur.slug}`);
    } catch (err) {
      // Le commentaire est ENREGISTRÉ : un cache qui ne s'invalide pas
      // coûte dix minutes d'attente, pas le message. On ne transforme
      // pas ça en erreur, ça ferait renvoyer le commentaire.
      console.error("[commentaires] invalidation du cache impossible :", err);
    }
  }

  // LE STATUT EST DIT EXPLICITEMENT, et c'est lui qui décide la phrase
  // affichée. Annoncer "en cours de validation" à quelqu'un dont le
  // commentaire est DÉJÀ en ligne l'enverrait le chercher au mauvais
  // endroit, et l'inverse le ferait conclure que le bouton n'a pas
  // marché (règle du `ok: false`, 3 août).
  return NextResponse.json({ ok: true, statut: verdict.statut });
}
