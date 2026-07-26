"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, Sparkles, ScrollText, Languages, Boxes, Inbox, Star, Image, Award, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/jours", label: "Jours", icon: CalendarDays },
  { href: "/admin/eleves", label: "Élèves", icon: Users },
  { href: "/admin/coach", label: "Coach", icon: Sparkles },
  { href: "/admin/coach/journal", label: "Journal", icon: ScrollText },
  { href: "/admin/personas", label: "Personas", icon: Languages },
  { href: "/admin/modeles", label: "Modèles SIO", icon: Boxes },
  { href: "/admin/feedback", label: "Retours", icon: Inbox },
  { href: "/admin/spotlights", label: "Mises en avant", icon: Star },
  { href: "/admin/visuels", label: "Visuels affiliés", icon: Image },
  { href: "/admin/certificats", label: "Certificats", icon: Award },
];

export function AdminNav() {
  const pathname = usePathname();
  // Onglet actif = le lien le PLUS spécifique qui préfixe le chemin courant
  // (sinon "Coach" et "Journal" s'allumeraient tous les deux sur le journal).
  const activeHref = links
    .filter((l) => pathname === l.href || pathname.startsWith(l.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav className="flex items-center gap-1">
      {links.map((l) => {
        const active = l.href === activeHref;
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
