// app/api/partner/tag/route.ts
//
// POSER UNE ÉTIQUETTE SYSTEME.IO POUR UNE AUTRE DE NOS APPS.
//
// -- POURQUOI CETTE PORTE EXISTE (audit du 31 août 2026) ---------------
//
// Le bon de commande de l'ATELIER (`atelierduquiz.fr/commande`) n'a
// jamais posé la moindre tag : son propre fichier le disait, "le
// tag Systeme.io n'est pas encore branché". L'acheteur recevait son
// accès et sa facture, et sortait de TOUTES les séquences email de
// Béné, sans que rien ne le signale.
//
// Béné, 31 août : le tag d'un acheteur de l'Atelier est
// `atelier-clients`, celle que portent déjà ses clients actuels.
//
// -- POURQUOI ICI ET PAS LÀ-BAS ----------------------------------------
//
// Tout ce qui sait parler à Systeme.io vit dans ce dépôt : la clé du
// compte propriétaire, la création du contact avec ses champs, la
// recherche paginée de tag. Le recopier dans l'Atelier donnerait
// deux implémentations qui divergent (ce dépôt l'a payé quatre fois) et
// une deuxième clé à maintenir.
//
// -- L'ÉTIQUETTE N'EST JAMAIS CRÉÉE ------------------------------------
//
// `poserTagParNomDetaille` refuse un tag inconnue au lieu de la
// créer. C'est le garde-fou qui rend cette porte sûre : même si le nom
// envoyé était fautif, on ne peut pas polluer sa liste avec une
// tag en double. On répond `tag_inconnu`, et ça se lit.

import { NextRequest, NextResponse } from "next/server";

import { lireAcheteur } from "@/lib/facture/identite";
import { poserTagParNomDetaille } from "@/lib/sio/appliquerTag";
import { safeEqual } from "@/lib/partner/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHARED = (process.env.PARTNER_SHARED_SECRET ?? "").trim();

export async function POST(req: NextRequest) {
  if (!SHARED || !safeEqual(req.headers.get("x-partner-secret") ?? "", SHARED)) {
    return NextResponse.json({ ok: false, raison: "forbidden" }, { status: 401 });
  }

  const corps = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const email = String(corps?.email ?? "").trim().toLowerCase();
  const tag = String(corps?.tag ?? "").trim();
  if (!email || !tag) {
    return NextResponse.json({ ok: false, raison: "adresse_ou_tag_vide" }, { status: 400 });
  }

  // L'identité arrive d'une AUTRE app : elle passe par le même
  // nettoyage que ce qui arrive d'un formulaire. `lireAcheteur` borne
  // les longueurs et rend `null` sur tout ce qui n'est pas du texte.
  const acheteur = corps?.acheteur ? lireAcheteur(corps.acheteur) : null;
  const locale = typeof corps?.locale === "string" ? corps.locale : null;

  const pose = await poserTagParNomDetaille(email, tag, { locale, acheteur });
  if (!pose.ok) {
    console.error(`[partner/tag] ${tag} NON pose pour ${email} : ${pose.raison}`);
  }
  // 200 QUOI QU'IL ARRIVE. L'appelant est un webhook de paiement : un
  // 5xx ici lui ferait croire à une panne et déclencherait des réessais
  // sur une vente déjà traitée. Il lit la raison, il ne lit pas le
  // statut.
  return NextResponse.json({ ok: pose.ok, raison: pose.raison });
}
