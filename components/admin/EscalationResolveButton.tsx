"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Bouton "Marquer résolu" pour une escalade du coach (admin). */
export function EscalationResolveButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function resolve() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coach/escalations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resolved: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error("Impossible de marquer comme résolu.");
        return;
      }
      toast.success("Escalade marquée comme résolue.");
      router.refresh();
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={resolve} disabled={loading}>
      <Check />
      {loading ? "..." : "Marquer résolu"}
    </Button>
  );
}
