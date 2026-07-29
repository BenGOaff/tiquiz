"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  LayoutDashboard,
  ClipboardList,
  Sparkles,
  Users,
  BarChart3,
  PanelLeftClose,
  HelpCircle,
  MessageCircleQuestion,
  ShieldCheck,
  Video,
  HandCoins,
  GraduationCap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { TutorialSpotlight } from "@/components/tutorial/TutorialSpotlight";
import { TutorialNudge } from "@/components/tutorial/TutorialNudge";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function NavLink(props: {
  to: string;
  end?: boolean;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
}) {
  const { to, end, className, activeClassName, children } = props;
  const pathname = usePathname();
  const isActive = end
    ? pathname === to
    : pathname === to || (to !== "/" && pathname.startsWith(to));

  return (
    <Link href={to} className={cx(className, isActive ? activeClassName : "")}>
      {children}
    </Link>
  );
}

const MENU_ITEM_CLASS =
  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-sidebar-accent relative font-semibold text-[#5a5a7a]";
const MENU_ITEM_ACTIVE_CLASS = "bg-sidebar-accent !text-primary font-semibold";

// Settings deliberately moved out of the sidebar — accessible via the
// profile avatar dropdown in the header (UserAvatarMenu). Keeps the
// sidebar focused on day-to-day work, not configuration.
const MENU_ITEMS = [
  { key: "dashboard", url: "/dashboard", icon: LayoutDashboard, end: true },
  { key: "create", url: "/quiz/new", icon: Sparkles, end: false },
  // Surveys get their own creation entry — different mental model (feedback,
  // not lead-magnet) and a different AI prompt, so a dedicated route avoids
  // overloading the quiz creator with an extra mode toggle. Both flows save
  // into the same `quizzes` table, just with mode='quiz' vs 'survey'.
  { key: "createSurvey", url: "/survey/new", icon: MessageCircleQuestion, end: false },
  // "projects" = umbrella label covering quizzes + surveys. Route stays
  // /quizzes for now; the page filters by mode (commit 6).
  { key: "projects", url: "/quizzes", icon: ClipboardList, end: false },
  // Popquiz : quiz interactifs incrustés dans une vidéo. Route /popquizzes
  // pour la liste, /popquiz/new pour la création — convention identique
  // au reste du module (singulier pour la création, pluriel pour la liste).
  { key: "popquiz", url: "/popquizzes", icon: Video, end: false },
  { key: "leads", url: "/leads", icon: Users, end: false },
  { key: "stats", url: "/stats", icon: BarChart3, end: false },
] as const;

// Entrees admin / revendeur de la sidebar. Le statut vient de
// /api/reseller/me, verifie SERVEUR a chaque mount (pas de cache) :
//  - is_admin    -> lien "Admin" vers /admin (gestion des revendeurs)
//  - is_reseller -> lien "Espace revendeur" vers /reseller (son panel)
// Un client normal recoit false sur les deux et ne voit rien. La
// securite reelle reste cote serveur (page + API re-verifient).
function ResellerAdminItem() {
  const t = useTranslations("nav");
  const [isReseller, setIsReseller] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/reseller/me", { credentials: "same-origin", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        setIsReseller(Boolean(json?.ok && json?.is_reseller));
        setIsAdmin(Boolean(json?.ok && json?.is_admin));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isReseller && !isAdmin) return null;

  return (
    <>
      {isAdmin ? (
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <NavLink
              to="/admin"
              className={MENU_ITEM_CLASS}
              activeClassName={MENU_ITEM_ACTIVE_CLASS}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{t("adminPanel")}</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : null}
      {isReseller ? (
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <NavLink
              to="/reseller"
              className={MENU_ITEM_CLASS}
              activeClassName={MENU_ITEM_ACTIVE_CLASS}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{t("resellerAdmin")}</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : null}
    </>
  );
}

function SidebarCollapseButton() {
  const { toggleSidebar } = useSidebar();
  const t = useTranslations("common");
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
      onClick={toggleSidebar}
      aria-label={t("close")}
    >
      <PanelLeftClose className="h-4 w-4" />
    </Button>
  );
}

export function AppSidebar() {
  const t = useTranslations("nav");
  // L'Atelier du Quiz (formation de Bene) n'existe qu'en francais : la
  // carte de conversion ci-dessous n'est montree qu'aux interfaces FR.
  const locale = useLocale();

  // Eleve de l'Atelier ou pas ? null = pas encore su (aucune carte
  // affichee, pour ne jamais montrer le mauvais message). Verifie
  // aupres de l'Atelier via /api/me/atelier-status, memorise pour la
  // session navigateur (une seule requete cross-app par session).
  const [hasAtelier, setHasAtelier] = useState<boolean | null>(null);
  useEffect(() => {
    if (locale !== "fr") return;
    try {
      const cached = window.sessionStorage.getItem("tiquiz_atelier_status");
      if (cached !== null) {
        setHasAtelier(cached === "1");
        return;
      }
    } catch { /* sessionStorage indispo (navigation privee stricte) */ }
    let cancelled = false;
    fetch("/api/me/atelier-status")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const v = j?.hasAtelier === true;
        setHasAtelier(v);
        try { window.sessionStorage.setItem("tiquiz_atelier_status", v ? "1" : "0"); } catch { /* noop */ }
      })
      .catch(() => { if (!cancelled) setHasAtelier(false); });
    return () => { cancelled = true; };
  }, [locale]);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-4 flex flex-row items-center justify-between">
        <Link href="/dashboard" className="block">
          <img
            src="/tiquiz-logo.png"
            alt="Tiquiz"
            className="h-10 w-auto"
          />
        </Link>
        <SidebarCollapseButton />
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto overflow-x-visible px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {MENU_ITEMS.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <TutorialSpotlight
                    elementId={item.key}
                    showNextButton
                    tooltipPosition="right"
                  >
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.end}
                        className={MENU_ITEM_CLASS}
                        activeClassName={MENU_ITEM_ACTIVE_CLASS}
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{t(item.key)}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </TutorialSpotlight>
                </SidebarMenuItem>
              ))}
              <ResellerAdminItem />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-1">
        <TutorialNudge />

        {/* Carte de conversion vers L'Atelier du Quiz (demande Bene
            28 juillet 2026). Emplacement : pied de sidebar, toujours
            visible sans encombrer le menu. FR uniquement (la formation
            n'existe qu'en francais). Tiquiz seulement, pas Tipote.
            Deux variantes : non-eleve -> decouvrir l'Atelier ; eleve
            -> recommander l'Atelier (70% de commission, espace
            affiliation de l'Atelier). Rien tant que le statut n'est
            pas connu, pour ne jamais montrer le mauvais message. */}
        {locale === "fr" && hasAtelier === false && (
          <a
            href="https://www.tipote.fr/atelier-du-quiz"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 block rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 transition-colors hover:bg-primary/10"
          >
            <span className="block text-[11px] leading-snug text-muted-foreground">
              {t("atelierNudgeQuestion")}
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <GraduationCap className="h-4 w-4 shrink-0" />
              {t("atelierNudgeCta")}
            </span>
          </a>
        )}
        {locale === "fr" && hasAtelier === true && (
          <a
            href="https://quizing.tipote.com/affiliation"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 block rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 transition-colors hover:bg-primary/10"
          >
            <span className="block text-[11px] leading-snug text-muted-foreground">
              {t("atelierAffNudgeText")}
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <HandCoins className="h-4 w-4 shrink-0" />
              {t("atelierAffNudgeCta")}
            </span>
          </a>
        )}

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a
                href="https://app.tipote.com/support/tiquiz"
                target="_blank"
                rel="noopener noreferrer"
                className={MENU_ITEM_CLASS}
              >
                <HelpCircle className="w-5 h-5" />
                <span>{t("support")}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* Programme affilié — accessible à tout moment depuis chaque app. */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a
                href="https://affiliate.tipote.com"
                target="_blank"
                rel="noopener noreferrer"
                className={MENU_ITEM_CLASS}
              >
                <HandCoins className="w-5 h-5" />
                <span>{t("becomeAffiliate")}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="px-1 pt-1">
          <LanguageSwitcher variant="sidebar" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
