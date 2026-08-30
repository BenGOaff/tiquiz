// app/api/admin/blog-commentaires/route.ts
//
// LA FILE DE MODÉRATION DES COMMENTAIRES DU BLOG.
//
// Un commentaire arrive en `en_attente` et n'apparaît nulle part tant
// qu'il n'a pas été vu. Sans cet écran, la modération n'existerait que
// dans Supabase, c'est à dire nulle part pour Béné, et la
// fonctionnalité entière serait morte à la première semaine.
//
// C'est la même leçon que `webhook_logs` le 7 août : une donnée qu'on
// n'affiche pas est une donnée qui ne sert à personne.

import { NextRequest, NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { lireFileModeration, modererCommentaire } from "@/lib/blog/commentairesStore";

export const dynamic = "force-dynamic";

async function emailAdmin(): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? null;
  return email && isAdminEmail(email) ? email : null;
}

export async function GET() {
  if (!(await emailAdmin())) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ ok: true, commentaires: await lireFileModeration() });
}

export async function PATCH(req: NextRequest) {
  const admin = await emailAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const { id, statut } = (await req.json().catch(() => ({}))) as {
    id?: string;
    statut?: string;
  };
  if (!id || (statut !== "publie" && statut !== "refuse")) {
    return NextResponse.json({ ok: false, reason: "requete_invalide" }, { status: 400 });
  }

  const fait = await modererCommentaire(id, statut, admin);
  if (!fait) return NextResponse.json({ ok: false, reason: "write_failed" }, { status: 500 });

  // La page de l'article est statique : elle reprendra le commentaire
  // publié à sa prochaine revalidation (une heure). On le DIT, sinon
  // Béné publie, recharge l'article, ne voit rien, et conclut que le
  // bouton ne marche pas (scénario Jocelyne du 1er août).
  return NextResponse.json({ ok: true, delaiMinutes: 60 });
}
