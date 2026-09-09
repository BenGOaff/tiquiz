"use client";

// components/embed/EmbedPreviewClient.tsx
// Orchestrator for the iframe-based sales-page preview. Manages the
// 3-phase funnel (form → generating → edit) and the
// data wiring against /api/embed/quiz/*. The actual UI is split into
// focused step components (EmbedForm, EmbedEditor, EmbedPaywall) so
// the look stays close to the rest of Tiquiz via shared shadcn UI.

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import EmbedForm from "./EmbedForm";
import { getEmbedStrings } from "./embed-i18n";
import type {
  EmbedInputs, EmbedLocale, EmbedPhase,
} from "./embed-types";
import { cadreDuGenerateur, type ContexteGenerateur } from "@/lib/embed/remise";
import { lancementAutomatiqueAutorise, lirePrefill } from "@/lib/generateur/prefillUrl";
import { envoyerEvenement } from "@/lib/analytics/envoi";
import {
  evenementGenerationLancee,
  evenementGenerationReussie,
  parcoursDeLAdresse,
} from "@/lib/analytics/parcours";

// QuizDetailClient is heavy (drag-and-drop, dnd-kit, recharts in some
// imports). Code-split it so the form step doesn't pull the whole
// editor bundle on first paint.
const QuizDetailClient = dynamic(
  () => import("@/components/quiz/QuizDetailClient"),
  { ssr: false, loading: () => null },
);

type Props = {
  initialSessionToken: string;
  locale: EmbedLocale;
  source: string;
  checkoutUrl: string;
  /**
   * OÙ LE GÉNÉRATEUR EST POSÉ, et ce n'est jamais deviné.
   *
   * `iframe` sur la page de vente (le pont de la page hôte écoute et
   * le document est à nous tout seuls), `page` sur la page dédiée
   * `/generateur-de-quiz`, où `window.parent` est `window` (le message
   * ne serait entendu par personne) et où le générateur vit à
   * l'intérieur d'une section du site. Voir `lib/embed/remise.ts` : un
   * seul paramètre décide des deux, parce que deux paramètres séparés
   * finiraient par se contredire.
   */
  contexte: ContexteGenerateur;
};

const STORAGE_KEY = "tiquiz_embed_session";

// Les mêmes défauts que le vrai formulaire "Générer avec l'IA"
// (`components/quiz/QuizFormClient.tsx`) : format court, quiz par
// profil, trois résultats. Un visiteur qui ne touche à rien obtient
// donc exactement ce qu'une créatrice connectée obtient.
const DEFAULT_INPUTS: EmbedInputs = {
  topic: "", audience: "", objective: "qualifier",
  intention: "", tone: "inspirant",
  format: "short", quizType: "profile", resultCount: 3,
  askFirstName: false, askGender: false,
};

export default function EmbedPreviewClient({
  initialSessionToken, locale, source, checkoutUrl, contexte,
}: Props) {
  const t = getEmbedStrings(locale);
  // Le cadre dépend de l'endroit où le générateur est posé : plein écran
  // dans une iframe, borné dans une section de page. Une seule source
  // (`lib/embed/remise.ts`), donc l'enveloppe et la remise ne peuvent
  // pas se contredire.
  const cadre = cadreDuGenerateur(contexte);
  const [phase, setPhase] = useState<EmbedPhase>(initialSessionToken ? "loading" : "form");
  const [sessionToken, setSessionToken] = useState(initialSessionToken);
  const [quizId, setQuizId] = useState<string>("");
  const [inputs, setInputs] = useState<EmbedInputs>(DEFAULT_INPUTS);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  // ── LE CHRONO DE `generation_reussie` ─────────────────────────────
  //
  // Béné : "Ajoute aussi la durée médiane de generation_reussie : c'est
  // le chiffre qui justifiera le chantier 3."
  //
  // Il part au clic et s'arrête à l'AFFICHAGE, pas à la fin de l'appel
  // au modèle : ce que le visiteur vit, c'est l'attente devant son
  // écran, réseau et rendu compris. La colonne `duree_ms` en base, elle,
  // ne mesure que l'appel : les deux chiffres répondent à deux questions
  // et ne se confondent jamais.
  //
  // Un `useRef` et pas un `useState` : le remettre à zéro ne doit pas
  // re-rendre l'écran pendant qu'un flux arrive.
  const departGeneration = useRef<number | null>(null);

  // ── LE BRIEF QUI VIENT DU LIEN ────────────────────────────────────
  //
  // Béné, 9 septembre : « /generateur-de-quiz ne lit aucun paramètre
  // aujourd'hui. Sans ça, les six boutons "Générer ce quiz" de la
  // landing et ceux du quiz du hero ne mènent nulle part. »
  //
  // La DÉCISION vit dans `lib/generateur/prefillUrl.ts`, pur et testé.
  // Ici il ne reste que la lecture du navigateur, et elle vit dans un
  // effet : lire `window.location.search` PENDANT le rendu donnerait un
  // rendu serveur et un rendu client différents.
  //
  // Un seul lecteur d'adresse dans ce composant : `handleSubmit` lit
  // déjà `window.location.search` pour la mesure, et les deux passent
  // par un module pur. Un `useSearchParams` en plus aurait exigé une
  // enveloppe `Suspense` et fabriqué un deuxième lecteur.
  const prefillApplique = useRef(false);
  const lancementFait = useRef(false);
  const [lancerLeBrief, setLancerLeBrief] = useState(false);
  useEffect(() => {
    if (prefillApplique.current) return;
    // Il revient sur un quiz déjà écrit : on ne réécrit pas son brief
    // par dessus, et on ne relance surtout pas une génération payante.
    if (initialSessionToken) return;
    prefillApplique.current = true;
    const brief = lirePrefill(window.location.search);
    if (!brief.sujet && !brief.audience && !brief.objectif) return;
    setInputs((v) => ({
      ...v,
      ...(brief.sujet ? { topic: brief.sujet } : null),
      ...(brief.audience ? { audience: brief.audience } : null),
      ...(brief.objectif ? { objective: brief.objectif } : null),
    }));
    if (!brief.pret) return;
    if (!lancementAutomatiqueAutorise({
      referrer: typeof document === "undefined" ? "" : document.referrer,
      hote: window.location.host,
    })) return;
    setLancerLeBrief(true);
  }, [initialSessionToken]);

  // LE LANCEMENT ATTEND QUE LE FORMULAIRE PORTE VRAIMENT LE BRIEF.
  //
  // `setInputs` ne se voit pas dans le rendu qui l'appelle : lancer dans
  // le même effet enverrait le formulaire VIDE, donc le lancement
  // automatique se ferait refuser par sa propre validation. On dépend
  // donc de l'état, jamais d'un délai (un délai est une course, et elle
  // se perd sur une machine lente).
  //
  // Et on re-teste les DEUX seuils de `handleSubmit` : un lancement
  // automatique ne peut pas se faire rejeter, jamais. C'est sa règle,
  // « un clic rejeté sur Générer fait partir des gens », appliquée au
  // clic qu'on donne à sa place.
  useEffect(() => {
    if (!lancerLeBrief || lancementFait.current) return;
    if (inputs.topic.trim().length < 3 || inputs.audience.trim().length < 2) return;
    lancementFait.current = true;
    void handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lancerLeBrief, inputs.topic, inputs.audience]);
  // Persist the latest token in localStorage so the dashboard claim
  // hook (components/dashboard/EmbedAutoClaim.tsx) can pick it up
  // after signup.
  useEffect(() => {
    if (sessionToken) {
      try { localStorage.setItem("tiquiz_embed_session", sessionToken); } catch { /* private mode */ }
    }
  }, [sessionToken]);

  // L'ÉDITEUR EN SURCOUCHE VERROUILLE LA PAGE DERRIÈRE LUI.
  // Sans ça, la molette traverse la surcouche et fait défiler la page
  // marketing sous l'éditeur : on montre un outil qui a l'air de
  // flotter, sur la page exacte qui doit donner envie. Le style est
  // RESTAURÉ à la sortie (et pas mis à "auto") : la page pourrait en
  // porter un à elle, et on ne le lui vole pas.
  const editeurEnSurcouche = phase === "edit" && cadre.verrouillerLeDefilement;
  useEffect(() => {
    if (!editeurEnSurcouche) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = avant; };
  }, [editeurEnSurcouche]);

  // QuizDetailClient calls window.parent.postMessage directly when
  // the visitor clicks 'Débloquer Tiquiz', which lands on the host
  // page's bridge.js (one window hop, no relay needed). The host
  // page's iframe data-checkout takes priority for the URL choice;
  // checkoutUrl here is the URL we initially passed to the iframe
  // src, kept as a hard fallback when the bridge isn't installed.
  void checkoutUrl;

  // ── Hydrate from existing session ───────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!initialSessionToken) return;
    (async () => {
      try {
        const res = await fetch(`/api/embed/quiz/${encodeURIComponent(initialSessionToken)}`);
        const json = await res.json();
        if (cancelled) return;
        if (json?.ok && json?.quiz_id) {
          // The session was generated post-migration: a real anonymous
          // quiz row is in place, mount QuizDetailClient against it.
          setQuizId(String(json.quiz_id));
          setPhase("edit");
        } else if (json?.ok && json?.quiz) {
          // Legacy session: only the JSON blob exists. Fall back to
          // the form so the visitor regenerates — we don't try to
          // back-fill the row server-side here.
          setPhase("form");
        } else {
          // Token gone (purged) — start fresh.
          setPhase("form");
        }
      } catch {
        setPhase("form");
      }
    })();
    return () => { cancelled = true; };
  }, [initialSessionToken]);

  // ── Submit form → SSE generate ──────────────────────────────────
  // Save / save-for-later helpers from the previous architecture are
  // gone: QuizDetailClient now PATCHes /api/quiz/[id]?embed=token
  // directly with its own debounce. Single source of truth.
  async function handleSubmit() {
    if (!inputs.topic || inputs.topic.trim().length < 3) {
      return setError(t.errTopic);
    }
    if (!inputs.audience || inputs.audience.trim().length < 2) {
      return setError(t.errAudience);
    }
    setError("");
    setPhase("generating");
    setProgress(t.genConnect);

    // ── `generation_lancee` : LE DÉNOMINATEUR DU SEUL RATIO QU'ELLE LIT
    //
    // Il part ICI, quand l'appel démarre vraiment, pas au clic sur la
    // landing : un clic qui navigue et repart sans rien générer ne doit
    // pas gonfler le dénominateur de `generation_lancee -> compte_cree`.
    //
    // LA SOURCE SE LIT SUR L'ADRESSE, et c'est la page du générateur qui
    // la porte : "direct" veut dire "arrivée sans paramètres", donc ça ne
    // peut se savoir que d'ici. Rien dans l'URL, ou une valeur qu'on ne
    // reconnaît pas : "direct", jamais rien (une génération sans source
    // rétrécirait le dénominateur, donc flatterait le ratio).
    const parcours = parcoursDeLAdresse(
      typeof window === "undefined" ? "" : window.location.search,
    );
    departGeneration.current = Date.now();
    envoyerEvenement(
      evenementGenerationLancee({ source: parcours.source, profil: parcours.profil }),
    );

    try {
      const res = await fetch("/api/embed/quiz/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic: inputs.topic.trim(),
          audience: inputs.audience.trim(),
          objective: inputs.objective,
          intention: inputs.intention.trim(),
          tone: inputs.tone,
          // Le FORMAT décide du nombre de questions, exactement comme
          // dans le vrai formulaire : c'est lui qui porte le choix
          // éditorial ("court = conversions rapides"), et un compteur
          // à côté ferait deux réglages pour une seule décision.
          format: inputs.format,
          quizType: inputs.quizType,
          resultCount: inputs.resultCount,
          askFirstName: inputs.askFirstName,
          askGender: inputs.askGender,
          locale,
          source,
        }),
      });
      // Un echec repond 200 + application/json (le flux, lui, repond du
      // text/event-stream) : sans ce test, un 200 d'erreur passait pour un
      // flux et le visiteur attendait un quiz qui n'arrivait jamais.
      const typeReponse = res.headers.get("content-type") ?? "";
      if (!res.ok || !res.body || typeReponse.includes("application/json")) {
        const text = await res.text().catch(() => "");
        let msg = text || `HTTP ${res.status}`;
        try {
          const j = JSON.parse(text);
          if (j?.error) msg = String(j.error);
        } catch { /* not JSON */ }
        throw new Error(msg);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let token = sessionToken;
      // Read SSE stream until we get a "result" or "error" event.
      // Other events (progress / heartbeat / session) are surfaced
      // as live progress text.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          let ev = "message", data = "";
          for (const line of part.split("\n")) {
            if (line.startsWith("event:")) ev = line.slice(6).trim();
            else if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (!data) continue;
          let payload: Record<string, unknown> = {};
          try { payload = JSON.parse(data); } catch { continue; }
          if (ev === "session" && typeof payload.session_token === "string") {
            token = payload.session_token;
            setSessionToken(token);
            try { localStorage.setItem(STORAGE_KEY, token); } catch { /* private mode */ }
          } else if (ev === "progress" && typeof payload.step === "string") {
            setProgress(payload.step);
          } else if (ev === "result" && typeof payload.quiz_id === "string") {
            // The route now materializes a real anonymous quiz row
            // and returns its id; we mount QuizDetailClient against
            // it. The legacy `quiz` JSON is also forwarded for
            // backward-compat but ignored here.
            setQuizId(payload.quiz_id);
            if (typeof payload.session_token === "string") setSessionToken(payload.session_token);
            // `generation_reussie` part au moment de l'AFFICHAGE, avec la
            // durée vécue. Une durée absurde (horloge qui recule, onglet
            // resté ouvert) est refusée par `dureeEnMs` et le paramètre
            // est alors omis : une valeur fausse déplacerait la médiane
            // sans que rien ne le dise.
            envoyerEvenement(
              evenementGenerationReussie({
                dureeMs:
                  departGeneration.current === null
                    ? null
                    : Date.now() - departGeneration.current,
                source: parcours.source,
                profil: parcours.profil,
              }),
            );
            departGeneration.current = null;
            setPhase("edit");
            return;
          } else if (ev === "error") {
            setError(typeof payload.error === "string" ? payload.error : t.errGeneric);
            setPhase("form");
            return;
          }
        }
      }
      // Stream ended without result event — treat as error.
      setError(t.errGeneric);
      setPhase("form");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errGeneric);
      setPhase("form");
    }
  }

  // ── Render ──────────────────────────────────────────────────────
  // Edit phase is rendered full-bleed so QuizDetailClient gets the
  // whole iframe viewport (it uses h-screen + its own internal
  // grid). The earlier phases sit inside a centered, padded wrapper.
  if (phase === "edit" && quizId) {
    // `retourAuFormulaire` ne JETTE rien : le quiz existe en base, son
    // jeton est gardé, et revenir dessus est un clic sur "Générer".
    // On ne remet donc pas `sessionToken` à vide, sinon une deuxième
    // génération repartirait sans le quiz déjà écrit.
    const retour = () => { setPhase("form"); setError(""); };
    return cadre.editeur
      ? (
        <div className={cadre.editeur}>
          <QuizDetailClient
            quizId={quizId}
            embedSessionToken={sessionToken}
            embedContexte={contexte}
            onEmbedRetour={retour}
          />
        </div>
      )
      : <QuizDetailClient quizId={quizId} embedSessionToken={sessionToken} embedContexte={contexte} />;
  }

  return (
    <div className={cadre.enveloppe}>
      {/* Generous outer padding so neither the form nor the loader
          ever touches the iframe edge. The iframe itself carries the
          rounded corners + shadow — we keep the content area calm
          and centered with a comfortable gutter. */}
      <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col px-8 sm:px-12 py-10 sm:py-14">
        {phase === "loading" && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 mr-2 animate-spin" /> {t.genConnect}
          </div>
        )}

        {phase === "form" && (
          <div className="flex-1 flex items-center justify-center py-4">
            <EmbedForm
              locale={locale}
              inputs={inputs}
              error={error}
              onChange={(p) => setInputs((i) => ({ ...i, ...p }))}
              onSubmit={handleSubmit}
            />
          </div>
        )}

        {phase === "generating" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
            <Loader2 className="size-10 text-primary animate-spin mb-4" />
            <p className="font-semibold">{progress || t.genStep}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">{t.genSub}</p>
          </div>
        )}
      </div>
    </div>
  );
}
