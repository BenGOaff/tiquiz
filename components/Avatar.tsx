import { cn } from "@/lib/utils";

function initials(name?: string | null, email?: string | null): string {
  const base = (name?.trim() || email?.split("@")[0] || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

/**
 * Avatar de l'eleve : photo si avatar_url, sinon initiales sur fond
 * indigo. Composant pur (utilisable cote serveur). Taille via className
 * (defaut size-9).
 */
export function Avatar({
  src,
  name,
  email,
  className,
}: {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  className?: string;
}) {
  if (src) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={src}
        alt=""
        className={cn("size-9 shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary",
        className,
      )}
    >
      {initials(name, email)}
    </span>
  );
}
