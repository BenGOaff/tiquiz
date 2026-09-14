// app/api/systeme-io/tags/route.ts
// GET user's Systeme.io tags (paginated). Accepts ?keyId= so the quiz
// editor can preview the tags of a specific key without changing the
// user's default.
//
// Drame Christelle 8 juin 2026 : sans projectId, resolveApiKey saute
// directement a la cle legacy (compte SIO principal) quand l'user a
// uniquement des cles scopees a un sous-projet. Christelle avait cree
// une cle API dans son sous-compte SIO et l'avait stockee sur son
// projet secondaire Tiquiz -> les tags affiches dans le selecteur
// etaient ceux du compte principal, pas du sous-compte. On passe donc
// le projectId actif pour que la cascade (default / any DU PROJET)
// pointe la bonne cle.
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { sioUserRequest } from "@/lib/sio/userApiClient";
import { resolveApiKey } from "@/lib/sio/resolveApiKey";
import { getActiveProjectId } from "@/lib/projects/activeProject";
import { resoudreDestination } from "@/lib/integrations/store";
import { listerTagsGhl } from "@/lib/integrations/adaptateurs/gohighlevel";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    let explicitKeyId = req.nextUrl.searchParams.get("keyId");
    let projectId = await getActiveProjectId(supabase, user.id);

    // Si un quizId est fourni, on resout la cle DETERMINISTIQUEMENT depuis
    // le quiz (la cle qu'il utilise vraiment pour syncer ses leads), et non
    // depuis le cookie de projet actif. Corrige le retour Christelle
    // (12 juillet 2026) : les tags de son sous-compte SIO n'apparaissaient
    // pas quand le cookie de projet actif pointait un autre projet que
    // celui du quiz. La cle choisie par quiz (QuizSioKeyPicker) prime.
    const quizId = req.nextUrl.searchParams.get("quizId");
    let quizConnexionId: string | null = null;
    if (quizId) {
      const { data: quizRow } = await supabase
        .from("quizzes")
        .select("sio_api_key_id, connexion_id, project_id")
        .eq("id", quizId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (quizRow) {
        const qKey = (quizRow as { sio_api_key_id?: string | null }).sio_api_key_id;
        const qProject = (quizRow as { project_id?: string | null }).project_id;
        quizConnexionId = (quizRow as { connexion_id?: string | null }).connexion_id ?? null;
        if (!explicitKeyId && qKey) explicitKeyId = String(qKey);
        if (qProject) projectId = String(qProject);
      }
    }

    // LA DESTINATION DU QUIZ DÉCIDE (14 septembre 2026). Un quiz relié à
    // GoHighLevel n'a pas de clé Systeme.io, et répondre NO_API_KEY ici
    // ferait afficher "configure ta clé Systeme.io" sous chaque profil
    // d'un client qui n'en aura jamais. On rend ses tags GoHighLevel
    // quand on peut les lire, et une liste VIDE sinon : les sélecteurs
    // savent créer un tag à la main, c'est tout ce qu'il leur faut.
    //
    // `fournisseur` part dans la réponse : l'onglet Automatiser écrit la
    // recette de l'outil qui recevra vraiment les tags.
    if (!explicitKeyId) {
      const destination = await resoudreDestination(user.id, {
        connexionId: quizConnexionId,
        sioKeyId: null,
        projectId,
      });
      if (destination && destination.type === "gohighlevel") {
        const r = await listerTagsGhl({ token: destination.token, locationId: destination.locationId });
        const tags = r.ok ? r.tags.map((name, i) => ({ id: i + 1, name })) : [];
        return NextResponse.json({ ok: true, tags, fournisseur: "gohighlevel" });
      }
      if (destination && destination.type === "pause" && destination.fournisseur !== "systemeio") {
        return NextResponse.json({ ok: true, tags: [], fournisseur: destination.fournisseur, pause: true });
      }
      if (destination && destination.type === "deconnecte") {
        return NextResponse.json({ ok: true, tags: [], fournisseur: destination.fournisseur, deconnecte: true });
      }
    }

    const resolved = await resolveApiKey(user.id, { explicitKeyId, projectId });
    if (!resolved) {
      return NextResponse.json({ ok: false, error: "NO_API_KEY", tags: [] });
    }

    const res = await sioUserRequest<{ items: { id: number; name: string }[] }>(
      resolved.apiKey,
      "/tags?limit=100",
    );
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error, tags: [] }, { status: 400 });
    }

    return NextResponse.json({ ok: true, tags: res.data?.items ?? [], fournisseur: "systemeio" });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
