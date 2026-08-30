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
//   3. l'écriture, en `en_attente`.
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
import { creerLimiteur } from "@/lib/rateLimit/parIp";

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

  const ecrit = await enregistrerCommentaire(verdict.valeur, ip);
  if (!ecrit.ok) {
    return NextResponse.json(
      { ok: false, raison: ecrit.raison },
      { status: ecrit.raison === "table_absente" ? 503 : 500 },
    );
  }

  // `en_attente` est dit EXPLICITEMENT : sans ça, la lectrice cherche son
  // commentaire sur la page et conclut que le bouton n'a pas marché.
  return NextResponse.json({ ok: true, statut: "en_attente" });
}
