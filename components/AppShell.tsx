"use client";

import { ReactNode } from "react";
import { PanelLeftOpen } from "lucide-react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";
import { Button } from "@/components/ui/button";
import { TutorialOverlay } from "@/components/tutorial/TutorialOverlay";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";

interface AppShellProps {
  children: ReactNode;
  userEmail: string;
  headerTitle?: ReactNode;
  headerRight?: ReactNode;
  contentClassName?: string;
}

/** Reopen button — only visible when sidebar is collapsed (desktop) or on mobile */
function SidebarOpenButton() {
  const { open, toggleSidebar, isMobile } = useSidebar();
  if (!isMobile && open) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={toggleSidebar}
      aria-label="Open sidebar"
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
      </div>
    </SidebarProvider>
  );
}
