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
    if (quizId) {
      const { data: quizRow } = await supabase
        .from("quizzes")
        .select("sio_api_key_id, project_id")
        .eq("id", quizId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (quizRow) {
        const qKey = (quizRow as { sio_api_key_id?: string | null }).sio_api_key_id;
        const qProject = (quizRow as { project_id?: string | null }).project_id;
        if (!explicitKeyId && qKey) explicitKeyId = String(qKey);
        if (qProject) projectId = String(qProject);
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

    return NextResponse.json({ ok: true, tags: res.data?.items ?? [] });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
