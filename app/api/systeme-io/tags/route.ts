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

    const explicitKeyId = req.nextUrl.searchParams.get("keyId");
    const projectId = await getActiveProjectId(supabase, user.id);
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
