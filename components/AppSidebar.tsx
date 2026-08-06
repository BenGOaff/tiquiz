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
  Play,
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
import { helpUrl } from "@/lib/help";
import { Button } from "@/components/ui/button";
import { TutorialSpotlight } from "@/components/tutorial/TutorialSpotlight";
import { TutorialNudge } from "@/components/tutorial/TutorialNudge";
import { useTutorial } from "@/hooks/useTutorial";
import { useAtelierStatus } from "@/hooks/useAtelierStatus";

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

// Entree discrete "Refaire le tour guide", montree seulement quand la
// carte TutorialNudge n'est pas visible (fermee via sa croix ou opt-out) :
// le tour doit toujours rester relancable quelque part (drame testeuse
// 31 juillet 2026).
function RestartTourItem() {
  const t = useTranslations("tutorial");
  const { tutorialOptOut, nudgeDismissed, isLoading, resetTutorial, setShowWelcome, setPhase } =
    useTutorial();

  if (isLoading || (!tutorialOptOut && !nudgeDismissed)) return null;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <button
          type="button"
          className={cx(MENU_ITEM_CLASS, "w-full text-left")}
          onClick={() => {
            if (tutorialOptOut) {
              resetTutorial();
              return;
            }
            setShowWelcome(true);
            setPhase("welcome");
          }}
        >
          <Play className="w-5 h-5" />
          <span>{tutorialOptOut ? t("helpReactivate") : t("helpRestart")}</span>
        </button>
      </SidebarMenuButton>
    </SidebarMenuItem>
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

  // Eleve de l'Atelier ou pas ? Sert a choisir la carte affichee.
  // Mecanique (cache, repli) dans hooks/useAtelierStatus, partagee avec
  // la page de creation de quiz.
  const hasAtelier = useAtelierStatus(locale === "fr");

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

        {/* Cartes tour guide + Atelier : DANS la zone scrollable, APRES le
            menu. Avant elles vivaient dans le footer (hauteur fixe) et
            comprimaient le menu sur petit ecran : une testeuse ne voyait
            plus "Mes projets" ni rien apres "Creer un sondage" (31 juillet
            2026). Ici le menu garde toujours la priorite, les cartes
            passent sous le pli et se scrollent. */}
        <div className="mt-4">
        <TutorialNudge />

        {/* Carte de conversion vers L'Atelier du Quiz (demande Bene
            28 juillet 2026). FR uniquement (la formation n'existe qu'en
            francais). Tiquiz seulement, pas Tipote. Deux variantes :
            non-eleve -> decouvrir l'Atelier ; eleve -> recommander
            l'Atelier (70% de commission, espace affiliation de
            l'Atelier). Rien tant que le statut n'est pas connu, pour ne
            jamais montrer le mauvais message. */}
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
        {/* Affiliation ouverte a tout le monde (demande Bene 1er aout
            2026) : on n'a PAS besoin d'avoir l'Atelier pour le
            recommander. La page explique Tiquiz + l'Atelier et renvoie
            ensuite vers affiliate.tipote.com pour l'inscription. Les
            eleves, eux, gardent le lien vers LEUR espace affiliation
            dans l'Atelier (carte ci-dessous). */}
        {locale === "fr" && hasAtelier === false && (
          <a
            href="https://www.tipote.fr/tiquiz/affiliation"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 block rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 transition-colors hover:bg-primary/10"
          >
            <span className="block text-[11px] leading-snug text-muted-foreground">
              {t("atelierAffJoinText")}
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <HandCoins className="h-4 w-4 shrink-0" />
              {t("atelierAffJoinCta")}
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
        </div>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a
                // Le centre d'aide vit sur le domaine de Tipote, qui ne
                // connaît pas la langue choisie ici : sans `?lang=`, une
                // cliente espagnole cliquait sur "Ayuda" et arrivait sur
                // une aide en français (audit du 6 août 2026). Elle n'a
                // pas de compte Tipote, donc aucun cookie de langue
                // là-bas, et l'entête du navigateur ne dit pas forcément
                // la même chose que le sélecteur de cette sidebar.
                href={helpUrl(locale)}
                target="_blank"
                rel="noopener noreferrer"
                className={MENU_ITEM_CLASS}
              >
                <HelpCircle className="w-5 h-5" />
                <span>{t("support")}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <RestartTourItem />
          {/* Programme affilié — accessible à tout moment depuis chaque app. */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a
                href="https://www.tipote.fr/tiquiz/affiliation"
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
