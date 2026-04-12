"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Settings, Key, Trash2, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

type Props = { userEmail: string };

export function UserAvatarMenu({ userEmail }: Props) {
  const t = useTranslations("header");
  const router = useRouter();

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "?";

  const handleLogout = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/");
    } catch {
      router.push("/");
    }
  }, [router]);

  const menuItems = [
    { key: "settings", icon: Settings, tab: "general" },
    { key: "systemeio", icon: Key, tab: "systemeio" },
    { key: "account", icon: Trash2, tab: "account" },
  ] as const;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={t("account")}
        >
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate">{userEmail}</p>
        </div>
        <DropdownMenuSeparator />
        {menuItems.map(({ key, icon: Icon, tab }) => (
          <DropdownMenuItem
            key={key}
            onClick={() => router.push(`/settings?tab=${tab}`)}
            className="cursor-pointer"
          >
            <Icon className="mr-2 h-4 w-4" />
            {t(`menu.${key}`)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
