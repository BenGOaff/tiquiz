"use client";

// Client wrapper for the public play page. The overlay placeholder
// here will be replaced by the real Tiquiz quiz renderer in the
// next iteration; for now we just unblock the video so the
// pause/resume mechanics can be exercised end-to-end with real DB
// rows.

import { PopquizPlayer } from "@/components/popquiz/PopquizPlayer";
import { Button } from "@/components/ui/button";
import type { Popquiz } from "@/lib/popquiz";

export default function PopquizPlayClient({
  popquiz,
}: {
  popquiz: Popquiz;
}) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-3">
        <h1 className="text-white/90 text-sm font-medium">{popquiz.title}</h1>
        <PopquizPlayer
          popquiz={popquiz}
          renderOverlay={({ cue, onAnswered, onSkipped }) => (
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold">Question — quiz lié</h2>
                <p className="text-sm text-muted-foreground">
                  Le rendu complet du quiz arrive dans la prochaine
                  itération. « Reprendre la vidéo » relance la lecture.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => onAnswered()}>Reprendre la vidéo</Button>
                {cue.behavior === "optional" ? (
                  <Button variant="outline" onClick={onSkipped}>
                    Passer
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
