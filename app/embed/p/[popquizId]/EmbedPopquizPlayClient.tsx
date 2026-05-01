"use client";

// Iframe-friendly variant of the public play client. Uses
// `position: fixed; inset: 0` so the player always fills the iframe
// viewport regardless of the embedding page's CSS. The player itself
// keeps its 16:9 aspect-video, so when the snippet uses the standard
// padding-bottom 56.25% trick, the fit is pixel-perfect.

import { PopquizPlayer } from "@/components/popquiz/PopquizPlayer";
import type { Popquiz } from "@/lib/popquiz";

export default function EmbedPopquizPlayClient({
  popquiz,
}: {
  popquiz: Popquiz;
}) {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      <div className="w-full max-h-full">
        <PopquizPlayer
          popquiz={popquiz}
          renderOverlay={({ cue }) => (
            <iframe
              src={`/q/${cue.quizId}`}
              className="absolute inset-0 w-full h-full border-0 bg-background"
              title="Quiz"
              allow="autoplay; clipboard-write"
            />
          )}
        />
      </div>
    </div>
  );
}
