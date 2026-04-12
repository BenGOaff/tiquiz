"use client";

import { ReactNode } from "react";
import { PanelLeftOpen } from "lucide-react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  children: ReactNode;
  userEmail: string;
  headerTitle?: ReactNode;
  headerRight?: ReactNode;
  contentClassName?: string;
}

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
  contentClassName = "flex-1 p-4 sm:p-5 lg:p-6",
}: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />

        <main className="flex-1 overflow-auto bg-muted/30 flex flex-col">
          {/* Header — copié de Tipote DashboardLayout */}
          <header className="h-14 flex items-center justify-between px-4 lg:px-6 bg-background sticky top-0 z-10 border-b border-border/40">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarOpenButton />
              {headerTitle && (
                <h1 className="text-lg font-display font-bold truncate">{headerTitle}</h1>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              <UserAvatarMenu userEmail={userEmail} />
            </div>
          </header>

          {/* Content */}
          <div className={contentClassName}>
            <div className="max-w-[1200px] mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
