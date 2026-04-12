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

function SidebarOpenButton({ title }: { title?: ReactNode }) {
  const { open, toggleSidebar, isMobile } = useSidebar();
  // Only show when sidebar is collapsed or on mobile
  if (!isMobile && open) return null;
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={toggleSidebar}
        aria-label="Open sidebar"
      >
        <PanelLeftOpen className="h-5 w-5 text-muted-foreground" />
      </Button>
      {title && (
        <h1 className="text-lg font-sans font-bold truncate">{title}</h1>
      )}
    </>
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

        <main className="flex-1 overflow-auto bg-muted/30 flex flex-col">
          {/* Header — logo always visible + title shows when sidebar is collapsed */}
          <header className="h-14 flex items-center justify-between px-4 lg:px-6 bg-background sticky top-0 z-10 border-b border-border/40">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarOpenButton title={headerTitle} />
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

          {/* Content — centered in the available space between sidebar and right edge */}
          <div className={contentClassName ?? "flex-1 flex flex-col p-5 sm:p-6 lg:p-8"}>
            <div className="w-full max-w-[1100px] mx-auto space-y-5">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
