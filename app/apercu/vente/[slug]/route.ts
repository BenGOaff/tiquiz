// app/apercu/vente/[slug]/route.ts
//
// L'APERÇU DE LA PAGE DE VENTE TIQUIZ, FERMÉ PAR DÉFAUT.
//
// Elle vit ICI et pas dans Tipote : c'est l'app qui OUVRE L'ACCÈS après
// paiement. Le pire incident possible sur une vente, c'est "le client a
// payé et n'a rien reçu" (drame Ivan, 7 août). On garde donc l'argent et
// l'accès dans la même app, sans saut entre deux serveurs.
//
// Béné, 19 août : "je te propose de me designer les pages de ventes et
// de m'envoyer un lien ici pour que je valide le pixel perfect avant
// d'envoyer quoi que ce soit en ligne."
//
// Une page de vente n'a pas de session : le visiteur est anonyme. La
// porte ne peut donc pas être la liste d'emails du reste du chantier,
// c'est une CLÉ dans l'URL (`?k=...`), comparée à `SALES_PREVIEW_TOKEN`.
//
// Même règle que partout ailleurs : **l'absence de configuration FERME.**
// Pas de variable, variable vide, clé absente ou fausse -> 404. Un `.env`
// oublié ne peut pas publier une page en chantier.
//
// Et 404, jamais 403 : un refus explicite annoncerait qu'il y a quelque
// chose derrière.

import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { renderSalesPage, type SalesPageMeta } from "@/lib/sales/servePage";
import { isSalesOpen } from "@/lib/sales/previewGate";
import { isPublicSalesHost, publicSalesCanonical } from "@/lib/sales/salesHosts";
import { SALES_CHECKOUT_TARGETS } from "@/lib/sales/salesPageLinks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Le référencement de chaque page, écrit par nous.
 *
 * Il vit ICI et pas dans le HTML capturé : le HTML sera remplacé à
 * chaque nouvelle capture, alors que ces textes sont des décisions.
 */
const PAGES: Record<string, Omit<SalesPageMeta, "slug">> = {
  tiquiz: {
    canonical: "https://www.tipote.fr/tiquiz",
    title: "Tiquiz : le générateur de quiz qui transforme tes visiteurs en leads",
    description:
      "Crée un quiz personnalisé en quelques minutes, capture des emails qualifiés et envoie à chaque visiteur le résultat qui lui parle. Sans code, en 7 langues.",
    locale: "fr_FR",
  },
};

// LA PORTE VIT DANS `lib/sales/previewGate.ts`, PLUS ICI.
//
// Cette route en avait sa propre copie (`porteOuverte` + `memeCle`),
// pendant que le bon de commande appelait `isSalesPreviewOpen`. Deux
// copies d'une meme decision, et le 20 aout il a fallu en ouvrir une des
// deux sur un domaine public : c'est exactement le moment ou une copie
// oubliee produit une page de vente en 404 le jour du lancement.

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await ctx.params;

  // Sans la bonne cle, on ne dit RIEN : ni que la page existe, ni
  // pourquoi elle est refusee.
  if (!isSalesOpen(req.nextUrl.searchParams.get("k"), req.headers.get("host"), process.env)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // À PARTIR D'ICI, LA CLÉ EST BONNE : on peut donc dire ce qui cloche,
  // et on le DOIT.
  //
  // Les trois causes de 404 renvoyaient le même "Not found" : impossible
  // de savoir si c'était la variable d'environnement, un slug inconnu ou
  // un fichier non déployé. Un cul-de-sac de diagnostic, alors que la
  // règle de ce dépôt est que le serveur DIT ce qui s'est passé (drame
  // de la suppression d'un quiz, 3 août ; import PDF, 7 août).
  //
  // Ce n'est pas une fuite : seul quelqu'un qui détient déjà la clé lit
  // ces messages.
  const meta = PAGES[slug];
  if (!meta || !/^[a-z0-9-]+$/.test(slug)) {
    return new NextResponse(
      `Page inconnue : "${slug}".\nPages servies par cette app : ${Object.keys(PAGES).join(", ")}`,
      { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const fichier = path.join(process.cwd(), "content", "sales", `${slug}.html`);
  if (!fs.existsSync(fichier)) {
    // Le dossier de travail est la donnée qui manque toujours quand on
    // cherche un fichier "pourtant deploye".
    console.error(`[apercu/vente] fichier absent : ${fichier}`);
    return new NextResponse(
      `Fichier absent : content/sales/${slug}.html\n` +
        `Cherché depuis : ${process.cwd()}\n` +
        `Le dossier content/sales/ n'est probablement pas arrivé sur le serveur.`,
      { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  // LE DOMAINE PUBLIC N'EST PAS UN APERÇU.
  //
  // Sur `tiquiz.fr`, la page est la vraie page : elle doit être
  // indexable, et sa canonique doit désigner ce domaine. Derrière la
  // clé, elle reste un chantier : `noindex`, canonique vers l'originale.
  //
  // L'hôte est un PARAMÈTRE de la décision, jamais deviné ailleurs.
  const publique = isPublicSalesHost(req.headers.get("host"));
  const canonique = (publique && publicSalesCanonical(slug)) || meta.canonical;

  const html = renderSalesPage(
    fs.readFileSync(fichier, "utf8"),
    { slug, ...meta, canonical: canonique },
    {
      indexable: publique,
      // LES BOUTONS PAYANTS MÈNENT CHEZ NOUS.
      //
      // Sans ça, ils pointent vers les pages de plan Systeme.io capturées
      // avec la page : le visiteur quitte le domaine et notre bon de
      // commande ne sert jamais. Corrigé AVANT de brancher `tiquiz.fr`,
      // parce que sur l'Atelier on l'a découvert en direct.
      checkoutTargets: SALES_CHECKOUT_TARGETS[slug] ?? null,
      onRewrite: (info) => {
        if (info.rewritten.length === 0) {
          console.error(
            `[apercu/vente] ${slug} : AUCUN bouton payant reecrit. ` +
              `Les visiteurs paient chez Systeme.io.`,
          );
        }
        if (info.unmapped.length > 0) {
          // Une page recapturée peut avoir gagné un bouton payant qu'on
          // continuerait d'envoyer chez Systeme.io. Ça se dit.
          console.warn(
            `[apercu/vente] ${slug} : lien(s) de tunnel Tiquiz laisse(s) tels quels ` +
              `et absents des deux listes : ${info.unmapped.join(", ")}`,
          );
        }
      },
    },
  );

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      // L'en-tête suit la même décision que la balise. Les deux se
      // contredisant, c'est l'en-tête qui gagne : le laisser en dur
      // aurait rendu `indexable` décoratif.
      ...(publique ? {} : { "X-Robots-Tag": "noindex, nofollow" }),
    },
  });
}
