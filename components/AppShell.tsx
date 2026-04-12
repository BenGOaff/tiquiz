"use client";

import { ReactNode } from "react";
import Link from "next/link";
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

/** On mobile, opens the sidebar Sheet overlay */
function MobileSidebarToggle() {
  const { isMobile, toggleSidebar } = useSidebar();
  if (!isMobile) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 md:hidden"
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
        {/* Sidebar: sticky in-flow on desktop, Sheet overlay on mobile */}
        <AppSidebar />

        <main className="flex-1 min-w-0 overflow-auto bg-muted/30 flex flex-col">
          <header className="h-14 flex items-center justify-between px-4 lg:px-6 bg-background sticky top-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <MobileSidebarToggle />
              {headerTitle && (
                <h1 className="text-lg font-sans font-bold truncate">{headerTitle}</h1>
              )}
              <Link href="/dashboard" className="shrink-0">
                <img
                  src="/tiquiz-logo.png"
                  alt="Tiquiz"
                  className="h-7 w-auto"
                />
              </Link>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              <UserAvatarMenu userEmail={userEmail} />
            </div>
          </header>

          <div className={contentClassName ?? "flex-1 p-4 lg:p-6"}>
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
