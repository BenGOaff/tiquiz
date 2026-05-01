"use client";

// Popquiz player — wraps Vidstack's MediaPlayer with our cue state
// machine and a quiz-overlay slot. The component itself stays
// unbranded: visual identity comes from the active theme via
// --pq-* CSS custom properties on the container.
//
// Public API is intentionally minimal so the future
// @tipote/popquiz package can re-export it without leaking Next.js
// or Tailwind specifics.

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  MediaPlayer,
  MediaProvider,
  type MediaPlayerInstance,
} from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";

import {
  initialSnapshot,
  reducer,
} from "@/lib/popquiz/state-machine";
import { applyThemeVars } from "@/lib/popquiz/theme";
import type {
  PlayerEvent,
  Popquiz,
  PopquizCue,
  PopquizVideo,
} from "@/lib/popquiz/types";

export interface PopquizPlayerProps {
  popquiz: Popquiz;
  // Forwarded to the host so the analytics POST happens at the app
  // layer (the player has no opinion about where events go).
  onEvent?: (event: PlayerEvent) => void;
  // Render-prop for the quiz overlay. The host owns this so the
  // same player can shell either tiquiz's quiz UI or tipote's,
  // without the player knowing the difference.
  renderOverlay: (args: {
    cue: PopquizCue;
    onAnswered: (meta?: Record<string, unknown>) => void;
    onSkipped: () => void;
  }) => ReactNode;
}

export function PopquizPlayer({
  popquiz,
  onEvent,
  renderOverlay,
}: PopquizPlayerProps) {
  const playerRef = useRef<MediaPlayerInstance>(null);
  const [snap, dispatch] = useReducer(reducer, undefined, initialSnapshot);

  // Sort once. The state machine assumes ascending timestamps.
  const cues = useMemo(
    () => [...popquiz.cues].sort((a, b) => a.timestampMs - b.timestampMs),
    [popquiz.cues],
  );

  const containerStyle: CSSProperties = useMemo(
    () => applyThemeVars(popquiz.theme?.config ?? {}),
    [popquiz.theme],
  );

  // Side-effect: pause the underlying player whenever a cue opens,
  // resume it on `resuming`. We keep this out of the reducer so the
  // reducer remains pure (and therefore replayable on the server
  // for analytics drop-off charts).
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    if (snap.state === "quiz_open" && !p.paused) {
      p.pause();
    } else if (snap.state === "resuming" && p.paused) {
      void p.play().catch(() => {
        // Autoplay can be blocked after an overlay; the user will
        // hit play again. Nothing actionable here.
      });
    }
  }, [snap.state]);

  // Forward newly-emitted events to the host. Slicing by a ref
  // counter avoids re-emitting the whole log on every render.
  const emittedCountRef = useRef(0);
  useEffect(() => {
    if (!onEvent) {
      emittedCountRef.current = snap.events.length;
      return;
    }
    const fresh = snap.events.slice(emittedCountRef.current);
    emittedCountRef.current = snap.events.length;
    for (const e of fresh) onEvent(e);
  }, [snap.events, onEvent]);

  const src = mediaSourceFor(popquiz.video);
  if (!src) {
    return (
      <div className="aspect-video w-full grid place-items-center bg-black/80 text-white/70 text-sm">
        Source vidéo indisponible.
      </div>
    );
  }

  const activeCue =
    snap.currentCueId !== null
      ? cues.find((c) => c.id === snap.currentCueId) ?? null
      : null;

  return (
    <div
      className="popquiz-player relative w-full aspect-video overflow-hidden rounded-[var(--pq-radius,12px)] bg-black"
      style={containerStyle}
    >
      <MediaPlayer
        ref={playerRef}
        src={src}
        playsInline
        crossOrigin
        className="w-full h-full"
        onPlay={() => dispatch({ type: "PLAY" })}
        onPause={() => dispatch({ type: "PAUSE" })}
        onEnded={() => dispatch({ type: "ENDED" })}
        onTimeUpdate={(detail) => {
          dispatch({
            type: "TIME_UPDATE",
            ms: Math.floor(detail.currentTime * 1000),
            cues,
          });
        }}
      >
        <MediaProvider />
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>

      {activeCue ? (
        <div
          className="absolute inset-0 flex items-center justify-center p-4 transition-opacity"
          style={{
            background: "var(--pq-bg, rgba(0,0,0,0.55))",
            backdropFilter: "var(--pq-backdrop, none)",
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Question Popquiz"
        >
          <div className="w-full max-w-xl rounded-[var(--pq-radius,12px)] bg-white text-foreground shadow-2xl overflow-hidden">
            {renderOverlay({
              cue: activeCue,
              onAnswered: (meta) =>
                dispatch({
                  type: "QUIZ_ANSWERED",
                  cueId: activeCue.id,
                  meta,
                }),
              onSkipped: () =>
                dispatch({ type: "QUIZ_SKIPPED", cueId: activeCue.id }),
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Maps our domain video to whatever Vidstack expects. For YouTube
// and Vimeo it natively understands `youtube/<id>` / `vimeo/<id>`;
// for direct URLs and HLS we hand over the URL and let Vidstack
// pick the right loader.
function mediaSourceFor(video: PopquizVideo): string | null {
  switch (video.source) {
    case "youtube":
      return video.externalId ? `youtube/${video.externalId}` : null;
    case "vimeo":
      return video.externalId ? `vimeo/${video.externalId}` : null;
    case "url":
      return video.externalUrl;
    case "upload":
      return video.hlsPath ?? null;
    default:
      return null;
  }
}
