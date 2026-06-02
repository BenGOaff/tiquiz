"use client";

// One-shot client guard qui garantit que chaque nouvelle session
// navigateur réouvre Tiquiz sur le projet PRINCIPAL de l'user
// (is_default = true), même s'il avait switché vers un projet
// secondaire la veille. Port direct du pattern Tipote
// (Béné 2 juin 2026 — alignement "même emplacement, même design").
//
// Mécanisme :
//   sessionStorage est wipé automatiquement quand le process navigateur
//   se ferme. Au mount, si le flag "tiquiz_session_active" est absent,
//   on sait que c'est une session fraîche → fetch les projets de l'user,
//   pointer le cookie tiquiz_active_project sur is_default.
//
// Cas pris en compte : user mono-projet → on ne touche RIEN (rien à
// switcher, l'éventuel cookie legacy reste valide).

import { useEffect } from "react";

const ACTIVE_PROJECT_COOKIE = "tiquiz_active_project";
const SESSION_FLAG = "tiquiz_session_active";

function setActiveProjectCookie(projectId: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${ACTIVE_PROJECT_COOKIE}=${projectId};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

export function SessionResetGate() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    void (async () => {
      try {
        const flag = window.sessionStorage.getItem(SESSION_FLAG);
        if (flag === "1") return; // continuation de session existante

        // Session fraîche : on demande à l'API la liste des projets
        // pour pointer le cookie déterministiquement sur is_default.
        // Pas de reload après — la prochaine nav lira le nouveau cookie.
        const res = await fetch("/api/projects", { credentials: "include" });
        if (cancelled) return;
        if (!res.ok) {
          // User pas encore loggé (page de login). On marque la session
          // active pour ne pas retry en boucle et on bail.
          window.sessionStorage.setItem(SESSION_FLAG, "1");
          return;
        }
        const json = await res.json().catch(() => null);
        const projects: { id: string; is_default: boolean }[] = Array.isArray(
          json?.projects,
        )
          ? json.projects
          : [];

        if (projects.length <= 1) {
          // User mono-projet : rien à switcher. On ne touche pas au
          // cookie — préserve ce qui était posé, y compris pour les
          // users sans default explicite.
          window.sessionStorage.setItem(SESSION_FLAG, "1");
          return;
        }

        const principal =
          projects.find((p) => p.is_default) ?? projects[0] ?? null;
        if (principal?.id) {
          setActiveProjectCookie(principal.id);
        }
        window.sessionStorage.setItem(SESSION_FLAG, "1");
      } catch {
        // Fail-open : ne JAMAIS bloquer le load app sur ce gate.
        try {
          window.sessionStorage.setItem(SESSION_FLAG, "1");
        } catch {
          /* sessionStorage disabled */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
