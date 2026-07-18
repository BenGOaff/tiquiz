"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, Sparkles, Languages, Boxes, Inbox, Star, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/jours", label: "Jours", icon: CalendarDays },
  { href: "/admin/eleves", label: "Élèves", icon: Users },
  { href: "/admin/coach", label: "Coach", icon: Sparkles },
  { href: "/admin/personas", label: "Personas", icon: Languages },
  { href: "/admin/modeles", label: "Modèles SIO", icon: Boxes },
  { href: "/admin/feedback", label: "Retours", icon: Inbox },
  { href: "/admin/spotlights", label: "Mises en avant", icon: Star },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {links.map((l) => {
        const active = pathname.startsWith(l.href);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{l.label}</span>
          </Link>
        );
      })}
      <Link
        href="/dashboard"
        className="ml-1 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
      >
        <span className="hidden sm:inline">Voir l'app</span>
        <ArrowUpRight className="size-4" />
      </Link>
    </nav>
  );
}
