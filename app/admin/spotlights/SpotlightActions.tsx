"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SpotlightActions({ id, draft }: { id: string; draft: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(status: "published" | "dismissed") {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/spotlights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("fail");
      toast.success(status === "published" ? "Marqué comme publié." : "Écarté.");
      router.refresh();
    } catch {
      toast.error("Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {draft && (
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(draft);
              toast.success("Brouillon copié.");
            } catch {
              toast.error("Copie impossible.");
            }
          }}
        >
          <Copy />
          Copier le brouillon
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={() => setStatus("published")} disabled={busy}>
        <Check />
        Marquer publié
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setStatus("dismissed")} disabled={busy}>
        <X />
        Écarter
      </Button>
    </div>
  );
}
