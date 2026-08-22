// app/api/admin/sio-tags/route.ts
//
// LE CONTRÔLE QUI AURAIT RATTRAPÉ IVAN LE JOUR MÊME.
//
// Il portait `tiquiz-mensuel` chez Systeme.io et `free` chez nous, et on
// l'a appris par lui, le lendemain. Cet écran compare les deux.
//
// -- AUCUNE CLÉ À POSER (Béné, 22 août) --------------------------------
//
// "QUELLE clé il te manque et pour quoi ? On en a déjà créé et
// connecté... en plus j'ai moi même ma clé connectée en tant qu'user :
// on peut l'utiliser en tant qu'admin aussi ?"
//
// Oui, et j'avais tort de demander autre chose. La clé vit déjà dans
// `sio_api_keys`, chiffrée, et `resolveApiKey` la rend. C'est SA clé,
// donc SON compte Systeme.io, donc exactement les contacts qu'il faut
// regarder. Rien à poser sur le serveur.
//
// -- CE QU'ON NE SAIT PAS, ON LE DIT -----------------------------------
//
// Je n'ai jamais vu un contact renvoyé par leur API : je ne sais pas où
// les tags y sont écrits. Le lecteur essaie les formes plausibles et
// COMPTE ce qu'il n'a pas su lire. Zéro écart sur zéro contact lisible
// se lirait "tout va bien", et c'est le pire écran possible.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { auditerTags, lireContacts } from "@/lib/sio/contacts";
import { resolveApiKey } from "@/lib/sio/resolveApiKey";
import { sioUserRequest } from "@/lib/sio/userApiClient";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/** Combien de pages au maximum. Borne un compte à des dizaines de milliers de contacts. */
const MAX_PAGES = 20;
const PAR_PAGE = 200;

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 401 });
  }

  // SA clé, celle des Paramètres. Pas de variable d'environnement.
  const resolved = await resolveApiKey(user.id);
  if (!resolved) {
    return NextResponse.json({
      ok: false,
      reason: "no_key",
    });
  }

  // Nos comptes : c'est d'eux qu'on part. Sa liste Systeme.io porte des
  // années de contacts venus de tous ses produits, et la confronter en
  // entier produirait un écran de bruit.
  const { data: profils, error: errProfils } = await supabaseAdmin
    .from("profiles")
    .select("email, plan");
  if (errProfils) {
    return NextResponse.json({ ok: false, reason: "read_failed", detail: errProfils.message });
  }
  const personnes = (profils ?? [])
    .map((p) => ({
      email: String((p as { email?: string | null }).email ?? ""),
      plan: (p as { plan?: string | null }).plan ?? null,
    }))
    .filter((p) => p.email);

  // Les contacts, page par page.
  const items: unknown[] = [];
  let page = 1;
  let pagesLues = 0;
  let tronque = false;
  while (page <= MAX_PAGES) {
    const res = await sioUserRequest<{ items?: unknown[] }>(
      resolved.apiKey,
      `/contacts?limit=${PAR_PAGE}&page=${page}`,
    );
    if (!res.ok) {
      // Un refus se NOMME. Sans ça, on chercherait un bug dans le code
      // alors que la clé n'a peut être pas le droit de lire les contacts.
      return NextResponse.json({
        ok: false,
        reason: res.status === 401 || res.status === 403 ? "key_refused" : "api_failed",
        status: res.status,
        detail: res.error?.slice(0, 200) ?? null,
      });
    }
    const lot = Array.isArray(res.data?.items) ? res.data!.items! : [];
    items.push(...lot);
    pagesLues += 1;
    if (lot.length < PAR_PAGE) break;
    page += 1;
    if (page > MAX_PAGES) tronque = true;
  }

  const lecture = lireContacts(items);
  const audit = auditerTags(personnes, lecture);

  return NextResponse.json({
    ok: true,
    ...audit,
    contactsLus: items.length,
    pagesLues,
    // On DIT quand on a arrêté avant la fin : un audit partiel présenté
    // comme complet ferait conclure "aucun écart" à tort.
    tronque,
  });
}
