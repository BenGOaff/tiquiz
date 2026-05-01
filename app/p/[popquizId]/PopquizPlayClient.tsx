"use client";

// Client wrapper for the public play page. The overlay slot now
// hosts the linked quiz — we iframe /q/[quizId] for guaranteed
// style isolation (PublicQuizClient is a 100KB+ component with its
// own full-screen layout; embedding it directly inside an absolute
// overlay would fight the parent in a hundred subtle ways).
//
// The X button is rendered by PopquizPlayer's chrome (one source of
// truth for "close the overlay"), so the slot just owns the quiz
// surface. When iframe-to-parent messaging is wired in a follow-up,
// quiz completion will auto-resume the video; today the viewer
// dismisses manually with X.

import { PopquizPlayer } from "@/components/popquiz/PopquizPlayer";
import type { Popquiz } from "@/lib/popquiz";

export default function PopquizPlayClient({
  popquiz,
}: {
  popquiz: Popquiz;
}) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-5xl">
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
