"use client";

import { ReactNode } from "react";
import AppShell from "@/components/AppShell";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  userEmail?: string;
  contentClassName?: string;
}

export default function DashboardLayout({
  children,
  title,
  userEmail = "",
  contentClassName,
}: DashboardLayoutProps) {
  return (
    <AppShell userEmail={userEmail} headerTitle={title} contentClassName={contentClassName}>
      {children}
    </AppShell>
  );
}
