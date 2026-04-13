"use client";

import { ReactNode } from "react";
import AppShell from "@/components/AppShell";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  userEmail?: string;
  contentClassName?: string;
  headerRight?: ReactNode;
}

export default function DashboardLayout({
  children,
  title,
  userEmail = "",
  contentClassName,
  headerRight,
}: DashboardLayoutProps) {
  return (
    <AppShell userEmail={userEmail} headerTitle={title} headerRight={headerRight} contentClassName={contentClassName}>
      {children}
    </AppShell>
  );
}
