"use client";

// Popquiz player — Vidstack MediaPlayer wrapped in our cue state
// machine and dressed in a custom Apple-style chrome (no default
// Vidstack layout). Visual identity comes from the active theme
// via --pq-* CSS custom properties on the container.
//
// Layout breakdown:
//   • black rounded container with deep shadow (Apple feel)
//   • big centred play button while paused (auto-fades on play)
//   • bottom controls bar with auto-fade on hover/idle: scrub +
//     small play, time, mute, fullscreen
//   • cue markers (accent-coloured dots) painted onto the scrub
//   • quiz overlay with one X close button rendered by the player
//     chrome (so every renderOverlay caller doesn't reimplement it)

import "@vidstack/react/player/styles/default/theme.css";

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
  Controls,
  FullscreenButton,
  MuteButton,
  PlayButton,
  Time,
  TimeSlider,
  useMediaState,
  type MediaPlayerInstance,
} from "@vidstack/react";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

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

// Cue markers painted on the scrub. Lives inside the MediaPlayer
// subtree so it can read duration via useMediaState. Pure visual,
// pointer-events: none so it never steals clicks from the slider.
function CueMarkers({ cues }: { cues: PopquizCue[] }) {
  const duration = useMediaState("duration");
  if (!duration || duration <= 0) return null;
  return (
    <div className="absolute inset-y-0 left-0 right-0 pointer-events-none">
      {cues.map((c) => {
        const pct = (c.timestampMs / 1000 / duration) * 100;
        if (pct < 0 || pct > 100) return null;
        return (
          <span
            key={c.id}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-1.5 rounded-full bg-[var(--pq-accent,#5D6CDB)] ring-2 ring-white/80"
            style={{ left: `${pct}%` }}
            aria-hidden
          />
        );
      })}
    </div>
  );
}

// Big centred play button while paused. Faded out (and click-through
// disabled) once playback starts so it doesn't sit on top of the
// content during playback.
function CenterPlay() {
  const paused = useMediaState("paused");
  return (
    <div
      className={`absolute inset-0 grid place-items-center transition-opacity duration-300 ${
        paused ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <PlayButton className="group/cpb size-20 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:bg-white/25 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
        <Play className="size-9 text-white fill-white ml-1" />
      </PlayButton>
    </div>
  );
}

function PlayPauseSmall() {
  const paused = useMediaState("paused");
  return (
    <PlayButton className="size-9 grid place-items-center rounded-full hover:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
      {paused ? (
        <Play className="size-4 text-white fill-white" />
      ) : (
        <Pause className="size-4 text-white fill-white" />
      )}
    </PlayButton>
  );
}

function MuteToggle() {
  const muted = useMediaState("muted");
  return (
    <MuteButton className="size-9 grid place-items-center rounded-full hover:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
      {muted ? (
        <VolumeX className="size-4 text-white" />
      ) : (
        <Volume2 className="size-4 text-white" />
      )}
    </MuteButton>
  );
}

function FullscreenToggle() {
  const isFs = useMediaState("fullscreen");
  return (
    <FullscreenButton className="size-9 grid place-items-center rounded-full hover:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
      {isFs ? (
        <Minimize2 className="size-4 text-white" />
      ) : (
        <Maximize2 className="size-4 text-white" />
      )}
    </FullscreenButton>
  );
}

// The full custom controls layout. Vidstack's <Controls.Root>
// handles the auto-hide-on-idle behaviour for us — children get a
// `data-visible` attribute we hook into for opacity transitions.
function CustomControls({ cues }: { cues: PopquizCue[] }) {
  return (
    <>
      {/* Centre play button sits outside Controls.Root so its
          visibility is driven by paused-state alone, not idle
          timeout. It stays put while the user reads the page. */}
      <CenterPlay />

      <Controls.Root className="absolute inset-0 pointer-events-none">
        <Controls.Group className="absolute bottom-0 left-0 right-0 px-3 sm:px-4 pb-2 sm:pb-3 pt-12 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-auto opacity-0 data-[visible]:opacity-100 transition-opacity duration-300">
          <div className="relative">
            <TimeSlider.Root className="relative h-5 flex items-center group/scrub w-full select-none">
              <TimeSlider.Track className="relative h-1 w-full rounded-full bg-white/25 group-hover/scrub:h-1.5 transition-all">
                <TimeSlider.TrackFill className="absolute h-full rounded-full bg-[var(--pq-accent,#5D6CDB)]" />
                <TimeSlider.Progress className="absolute h-full rounded-full bg-white/35" />
              </TimeSlider.Track>
              <CueMarkers cues={cues} />
              <TimeSlider.Thumb className="absolute size-3 rounded-full bg-white shadow-lg opacity-0 group-hover/scrub:opacity-100 transition-opacity" />
            </TimeSlider.Root>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <PlayPauseSmall />
            <div className="text-[11px] font-medium text-white/90 font-mono ml-1 tabular-nums">
              <Time type="current" />
              <span className="text-white/40 mx-1">/</span>
              <Time type="duration" />
            </div>
            <div className="flex-1" />
            <MuteToggle />
            <FullscreenToggle />
          </div>
        </Controls.Group>
      </Controls.Root>
    </>
  );
}

export interface PopquizPlayerProps {
  popquiz: Popquiz;
  // Forwarded so the host can persist analytics events; the player
  // itself stays opinion-free about where they go.
  onEvent?: (event: PlayerEvent) => void;
  // Slot for the cue overlay content. The player chrome already
  // renders the dimmed background and X close button — callers
  // only provide the inner surface (iframe, custom card, etc.).
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

  const cues = useMemo(
    () => [...popquiz.cues].sort((a, b) => a.timestampMs - b.timestampMs),
    [popquiz.cues],
  );

  const containerStyle: CSSProperties = useMemo(
    () => applyThemeVars(popquiz.theme?.config ?? {}),
    [popquiz.theme],
  );

  // Pause / resume the underlying player on cue open / close. Side
  // effects stay outside the reducer so the reducer remains pure
  // and replayable for analytics.
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    if (snap.state === "quiz_open" && !p.paused) {
      p.pause();
    } else if (snap.state === "resuming" && p.paused) {
      void p.play().catch(() => {
        // Autoplay may be blocked after an overlay; the user will
        // tap play themselves. Nothing actionable here.
      });
    }
  }, [snap.state]);

  // Forward newly-emitted events to the host.
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
      <div className="aspect-video w-full grid place-items-center bg-black text-white/70 text-sm rounded-2xl">
        Source vidéo indisponible.
      </div>
    );
  }

  const activeCue =
    snap.currentCueId !== null
      ? cues.find((c) => c.id === snap.currentCueId) ?? null
      : null;

  function dismissCue() {
    if (!activeCue) return;
    // Treat manual dismiss as "answered" — it consumes the cue so
    // the video doesn't immediately re-trigger it on resume.
    dispatch({ type: "QUIZ_ANSWERED", cueId: activeCue.id });
  }

  return (
    <div
      className="popquiz-player relative w-full aspect-video overflow-hidden rounded-2xl bg-black shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]"
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
        <CustomControls cues={cues} />
      </MediaPlayer>

      {activeCue ? (
        <div
          className="absolute inset-0 z-20"
          style={{
            background: "var(--pq-bg, rgba(0,0,0,0.85))",
            backdropFilter: "var(--pq-backdrop, blur(12px))",
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Question Popquiz"
        >
          {/* Close button — single source of truth for "dismiss the
              overlay" so each renderOverlay caller doesn't have to
              reinvent it. */}
          <button
            type="button"
            onClick={dismissCue}
            className="absolute top-3 right-3 z-30 size-9 rounded-full bg-white/95 hover:bg-white grid place-items-center text-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Reprendre la vidéo"
          >
            <X className="size-4" />
          </button>
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
      ) : null}
    </div>
  );
}

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
