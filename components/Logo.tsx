import { cn } from "@/lib/utils";

/**
 * Logo L'Atelier du Quiz. Utilise public/quizing.png (fourni par Béné).
 * Hauteur par défaut h-8, surchargeable via className.
 */
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/quizing.png" alt="L'Atelier du Quiz" className={cn("h-8 w-auto", className)} />
  );
}
