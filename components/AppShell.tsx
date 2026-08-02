"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { PanelLeftOpen } from "lucide-react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";
import { Button } from "@/components/ui/button";
import { TutorialOverlay } from "@/components/tutorial/TutorialOverlay";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { SessionResetGate } from "@/components/projects/SessionResetGate";
import { CoachWidget } from "@/components/coach/CoachWidget";

interface AppShellProps {
  children: ReactNode;
  userEmail: string;
  headerTitle?: ReactNode;
  headerRight?: ReactNode;
  contentClassName?: string;
}

/** Reopen button — only visible when sidebar is collapsed (desktop) or on mobile */
function SidebarOpenButton() {
  const t = useTranslations("common");
  const { open, toggleSidebar, isMobile } = useSidebar();
  if (!isMobile && open) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={toggleSidebar}
      aria-label={t("openSidebar")}
    >
      <PanelLeftOpen className="h-5 w-5 text-muted-foreground" />
    </Button>
  );
}

export default function AppShell({
  children,
  userEmail,
  headerTitle,
  headerRight,
  contentClassName,
}: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />

        {/* Coach en bas a droite, sur toutes les pages authentifiees
            (demande Bene, 2 aout 2026). Monte ICI et pas dans le layout
            racine : le viewer public d'un quiz ne doit jamais le voir. */}
        <CoachWidget />

        <main className="flex-1 overflow-auto bg-background flex flex-col">
          {/* Header */}
          <header className="h-14 flex items-center justify-between px-4 lg:px-6 bg-background sticky top-0 z-10">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarOpenButton />
              {headerTitle ? (
                <h1 className="text-lg font-display font-bold truncate">{headerTitle}</h1>
              ) : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Multiprofils — auto-caché si user a 1 seul projet et
                  qu'il n'est pas éligible canCreateMore (cf. phase 2
                  chantier multiprofils ROADMAP_RETENTION). */}
              <ProjectSwitcher />
              {headerRight}
              <UserAvatarMenu userEmail={userEmail} />
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-5 lg:p-6">
            <div className={contentClassName ?? "max-w-[1200px] mx-auto w-full space-y-5"}>
              {children}
            </div>
          </div>
        </main>

        {/* Tutorial system */}
        <TutorialOverlay />

        {/* Au démarrage d'une nouvelle session navigateur, force le
            cookie sur le projet par défaut (parité Tipote — évite que
            l'user reprenne sur un side project la veille). */}
        <SessionResetGate />
      </div>
    </SidebarProvider>
  );
}
