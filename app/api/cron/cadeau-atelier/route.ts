// app/api/cron/cadeau-atelier/route.ts
//
// UNE FOIS PAR JOUR : ON REPROPOSE L'ATELIER AUX COMPTES GRATUITS.
//
// Béné, 18 septembre 2026 : "6 mois après son inscription gratos, on lui
// repropose ce cadeau pour le réactiver : on lui donne 2 jours pour
// upgrader et recevoir l'atelier gratos. Idem 1 an après sa première
// inscription."
//
// À programmer une fois par jour sur le VPS. Ligne à coller
// (`crontab -e` sous l'utilisateur `tipote`) :
//
//   30 9 * * * curl -fsS -H "Authorization: Bearer $(grep -m1 -h '^CRON_SECRET=' /home/tipote/tiquiz-app/.env.local /home/tipote/tiquiz-app/.env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"\r')" https://quiz.tipote.com/api/cron/cadeau-atelier >> /tmp/cadeau-atelier.log 2>&1
//
// (forme de la crontab du serveur depuis le 11 septembre 2026 : elle
// tourne sous `sh`, qui ne sait pas faire `. .env`, et elle ne lit que
// la seule clé dont elle a besoin, `.env.local` devant `.env`.)
//
// Vérification : `crontab -l | grep cadeau-atelier`
//
// -- ON RÉSERVE AVANT D'ENVOYER, MÊME CHOIX QUE `churn-ask` ------------
//
// Deux exécutions qui se chevauchent enverraient le même email deux
// fois. Un `select` puis un `update` ne protège de rien : les deux
// passages lisent la ligne avant que l'un des deux n'écrive.
//
// La parade est celle qu'on utilise partout ici : **c'est la base qui
// tranche.** Un UPDATE CONDITIONNEL (`... where id = ? and colonne is
// null`) est atomique. S'il ne rend aucune ligne, quelqu'un d'autre l'a
// prise.
//
// **ET LA DATE RÉSERVÉE EST CELLE QUI OUVRE LA FENÊTRE.** Ce n'est pas
// un détail de mise en oeuvre : `cadeauAtelierOuvert` lit cette colonne
// là pour savoir si les 2 jours courent. Réserver, c'est donc ouvrir la
// porte, et envoyer l'email revient à l'annoncer. Si l'envoi échoue
// derrière, la fenêtre reste ouverte 2 jours pour quelqu'un qui ne l'a
// pas su : c'est un cadeau possible et non réclamé, jamais une promesse
// trahie. L'inverse (envoyer puis marquer) enverrait un email annonçant
// une fenêtre que le marquage raté n'aurait jamais ouverte.
//
// -- LE SECRET SE COMPARE EN TEMPS CONSTANT ---------------------------
//
// Et il ne s'imprime pas : un contrôle dit "les deux valeurs diffèrent"
// et s'arrête là.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { relanceAEnvoyer, RELANCES_JOURS, RATTRAPAGE_JOURS, JOURS_FENETRE_RELANCE } from "@/lib/cadeau/atelierOffert";
import { sendCadeauAtelierEmail } from "@/lib/email/cadeauAtelierEmail";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Au delà, on s'arrête et on repassera demain : un cron ne doit pas durer. */
const MAX_PAR_PASSAGE = 200;

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * OÙ ON L'ENVOIE. Le bon de commande du mensuel, le palier d'entrée.
 *
 * Écrit à partir du domaine canonique de vente, jamais d'une variable
 * d'environnement qui pourrait valoir `localhost` : c'est ce qui a
 * envoyé des liens `localhost` à des clientes (drame Véronique, 2 août).
 */
const LIEN_COMMANDE = "https://tiquiz.fr/commande/mensuel";

function secretOk(recu: string | null): boolean {
  const attendu = (process.env.CRON_SECRET ?? "").trim();
  if (!attendu || !recu) return false;
  const a = Buffer.from(recu.replace(/^Bearer\s+/i, "").trim());
  const b = Buffer.from(attendu);
  // La longueur d'abord : `timingSafeEqual` LÈVE sur deux tampons de
  // tailles différentes, elle ne rend pas `false`.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface LigneCompte {
  user_id: string;
  email: string | null;
  first_name: string | null;
  plan: string | null;
  created_at: string | null;
  cadeau_atelier_offert_le: string | null;
  cadeau_atelier_relance_6mois_le: string | null;
  cadeau_atelier_relance_1an_le: string | null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return traiter(req);
}
export async function GET(req: NextRequest): Promise<NextResponse> {
  return traiter(req);
}

async function traiter(req: NextRequest): Promise<NextResponse> {
  if (
    !secretOk(req.headers.get("authorization")) &&
    !secretOk(req.headers.get("x-cron-secret"))
  ) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 401 });
  }

  const maintenant = new Date();

  // LA FENÊTRE DE LECTURE EST BORNÉE PAR LA PLUS ANCIENNE ÉCHÉANCE.
  // Sans ça, on relit toute la table des comptes à chaque passage.
  const plusVieuxUtile = new Date(
    maintenant.getTime() - (RELANCES_JOURS[1] + RATTRAPAGE_JOURS) * JOUR_MS,
  ).toISOString();
  const plusRecentUtile = new Date(
    maintenant.getTime() - RELANCES_JOURS[0] * JOUR_MS,
  ).toISOString();

  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "user_id, email, first_name, plan, created_at, cadeau_atelier_offert_le, " +
          "cadeau_atelier_relance_6mois_le, cadeau_atelier_relance_1an_le",
      )
      .is("cadeau_atelier_offert_le", null)
      .gte("created_at", plusVieuxUtile)
      .lte("created_at", plusRecentUtile)
      .order("created_at", { ascending: true })
      .limit(1000);
    if (error) throw error;

    const lignes = (data ?? []) as unknown as LigneCompte[];
    let envoyes = 0;
    let echecs = 0;
    const parFenetre: Record<string, number> = {};

    for (const l of lignes) {
      if (envoyes + echecs >= MAX_PAR_PASSAGE) break;

      const email = String(l.email ?? "").trim().toLowerCase();
      if (!email) continue;

      // ON NE RELANCE QUE LES COMPTES GRATUITS. Quelqu'un qui paie déjà
      // n'a rien à upgrader, et lui proposer un cadeau pour le faire
      // serait absurde. Le cadeau, lui, s'est déjà joué à son upgrade.
      const plan = String(l.plan ?? "").trim().toLowerCase();
      if (plan && plan !== "free") continue;

      // LA DÉCISION, dans le module pur.
      const quoi = relanceAEnvoyer(
        {
          inscritLe: l.created_at,
          relance6moisLe: l.cadeau_atelier_relance_6mois_le,
          relance1anLe: l.cadeau_atelier_relance_1an_le,
          offertLe: l.cadeau_atelier_offert_le,
        },
        maintenant,
      );
      if (!quoi) continue;

      const colonne =
        quoi === "relance_6_mois"
          ? "cadeau_atelier_relance_6mois_le"
          : "cadeau_atelier_relance_1an_le";

      // ── ON RÉSERVE, ET C'EST LA BASE QUI TRANCHE ──
      const { data: prise, error: errPrise } = await supabaseAdmin
        .from("profiles")
        .update({ [colonne]: maintenant.toISOString() })
        .eq("user_id", l.user_id)
        .is(colonne, null)
        .select("user_id");
      if (errPrise) {
        console.error(`[cron/cadeau-atelier] reservation impossible pour ${email} : ${errPrise.message}`);
        echecs += 1;
        continue;
      }
      if (!prise || prise.length === 0) continue; // quelqu'un d'autre l'a prise

      const finLe = new Date(
        maintenant.getTime() + JOURS_FENETRE_RELANCE * JOUR_MS,
      ).toISOString();
      const parti = await sendCadeauAtelierEmail({
        email,
        prenom: l.first_name,
        fenetre: quoi,
        finLe,
        lien: LIEN_COMMANDE,
      });

      if (parti) {
        envoyes += 1;
        parFenetre[quoi] = (parFenetre[quoi] ?? 0) + 1;
      } else {
        echecs += 1;
        // LA FENÊTRE EST OUVERTE MALGRÉ TOUT (voir l'en tête). On le dit
        // fort : quelqu'un a deux jours pour un cadeau qu'il ignore.
        console.error(
          `[cron/cadeau-atelier] email NON parti a ${email} (${quoi}), mais sa fenetre ` +
            `est ouverte jusqu'au ${finLe}. A lui redire a la main.`,
        );
      }
    }

    console.log(
      `[cron/cadeau-atelier] ${lignes.length} compte(s) regarde(s), ${envoyes} relance(s) ` +
        `envoyee(s) (${JSON.stringify(parFenetre)}), ${echecs} echec(s)`,
    );
    return NextResponse.json({ ok: true, regardes: lignes.length, envoyes, echecs, parFenetre });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      `[cron/cadeau-atelier] passage impossible : ${message}. ` +
        `Si les colonnes sont absentes, appliquer supabase/migrations/20260918_cadeau_atelier.sql.`,
    );
    return NextResponse.json({ ok: false, reason: "read_failed" }, { status: 500 });
  }
}
