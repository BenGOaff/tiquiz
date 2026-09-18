// app/api/public/vue/route.ts
//
// LA PORTE OÙ LE NAVIGATEUR DÉPOSE UNE VUE DE PAGE.
//
// Elle remplace le comptage du middleware, qui ne voyait rien : depuis
// le 7 septembre, Cloudflare répondait à la place du serveur sur les
// pages publiques (`cf-cache-status: HIT`, mesuré le 18). Le détail de
// la panne et des trois mesures est dans `lib/trafic/vueNavigateur.ts`.
//
// -- ELLE NE DÉCIDE RIEN ----------------------------------------------
//
// Ce qui compte comme une vue, le chemin retenu et la source vivent
// dans `lib/trafic/vueNavigateur.ts` et `lib/trafic/vueASignaler.ts`,
// en fonctions pures et testées. Ici on borne ce qui arrive, on limite,
// et on incrémente.
//
// -- POURQUOI ELLE EST PUBLIQUE, ET CE QUE ÇA COÛTE --------------------
//
// L'ancienne porte (`/api/interne/trafic`) exige `CRON_SECRET`, parce
// qu'elle était appelée par le serveur. Un navigateur ne peut porter
// aucun secret : tout ce qu'on lui confierait serait lisible dans la
// page. Celle ci est donc ouverte, et bornée autrement :
//
//   - l'hôte doit être un de nos domaines publics ;
//   - `sec-fetch-site: same-origin`, que seul le navigateur pose ;
//   - l'agent ne doit pas être un robot ;
//   - 40 appels par minute et par adresse, au plus.
//
// Ça n'empêche pas quelqu'un de décidé d'y envoyer du faux avec un
// outil en ligne de commande, et il faut l'écrire plutôt que de le
// laisser croire. Ce que ça empêche, c'est le bruit : une page tierce
// qui inclurait notre adresse, un aspirateur, un onglet qui recharge.
// Et l'alternative mesurée aujourd'hui, c'est zéro.
//
// -- TOUJOURS 200 ------------------------------------------------------
//
// Un refus métier lu par un NAVIGATEUR répond 200 avec `ok: false` et
// une RAISON : Cloudflare remplace le corps d'un 5xx, et la raison
// serait perdue au moment précis où on en a besoin. Règle du 3
// septembre. Ici en plus personne ne réessaie : c'est une statistique.

import { NextResponse, type NextRequest } from "next/server";

import { creerLimiteur, ipDeLaRequete } from "@/lib/rateLimit/parIp";
import { SALES_HOSTS } from "@/lib/sales/salesHosts";
import { compterVue } from "@/lib/trafic/compterVue";
import { sourceDeLaVue } from "@/lib/trafic/vueASignaler";
import { vueNavigateurASignaler } from "@/lib/trafic/vueNavigateur";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 40 par minute : un visiteur qui navigue vite reste très en dessous,
// une boucle est arrêtée. Le limiteur purge ce qui a expiré d'abord et
// ne fait JAMAIS `clear()` (audit du 24 août).
const limiteur = creerLimiteur({ max: 40, fenetreMs: 60_000 });

/** Borne ce qui arrive de l'extérieur, sans rien décider. */
function borne(brut: unknown, max: number): string {
  return String(brut ?? "").trim().slice(0, max);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const hote = String(req.headers.get("host") ?? "").toLowerCase().split(":")[0];

  const verdict = vueNavigateurASignaler({
    hote,
    chemin: borne((await lireCorps(req)).chemin, 200),
    secFetchSite: req.headers.get("sec-fetch-site"),
    origin: req.headers.get("origin"),
    userAgent: req.headers.get("user-agent"),
    hotesConnus: SALES_HOSTS,
  });

  if (!verdict.compte) {
    return NextResponse.json({ ok: false, reason: verdict.raison });
  }

  if (limiteur.trop(ipDeLaRequete(req.headers), Date.now())) {
    return NextResponse.json({ ok: false, reason: "trop_d_appels" });
  }

  const corps = await lireCorps(req);
  await compterVue({
    hote: verdict.hote,
    chemin: verdict.chemin,
    // La source vient du referrer que LA PAGE a vu, pas de l'en-tête
    // `referer` de cette requête ci : celui là vaut toujours notre
    // propre page, donc il dirait `interne` pour tout le monde.
    source: sourceDeLaVue({
      referrer: borne(corps.referrer, 500),
      canal: borne(corps.canal, 40),
      utmSource: borne(corps.utmSource, 40),
      host: verdict.hote,
    }),
  });

  return NextResponse.json({ ok: true });
}

/** Le corps, lu une seule fois et mémorisé sur la requête. */
const corpsLus = new WeakMap<NextRequest, CorpsVue>();
interface CorpsVue {
  chemin?: unknown;
  referrer?: unknown;
  canal?: unknown;
  utmSource?: unknown;
}
async function lireCorps(req: NextRequest): Promise<CorpsVue> {
  const deja = corpsLus.get(req);
  if (deja) return deja;
  let corps: CorpsVue = {};
  try {
    corps = ((await req.json()) ?? {}) as CorpsVue;
  } catch {
    corps = {};
  }
  corpsLus.set(req, corps);
  return corps;
}
