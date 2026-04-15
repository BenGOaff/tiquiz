"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  ClipboardList,
  Sparkles,
  Users,
  BarChart3,
  PanelLeftClose,
  HelpCircle,
  Settings,
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

const MENU_ITEMS = [
  { key: "dashboard", url: "/dashboard", icon: LayoutDashboard, end: true },
  { key: "create", url: "/quiz/new", icon: Sparkles, end: false },
  { key: "quizzes", url: "/quizzes", icon: ClipboardList, end: false },
  { key: "leads", url: "/leads", icon: Users, end: false },
  { key: "stats", url: "/stats", icon: BarChart3, end: false },
  { key: "settings", url: "/settings", icon: Settings, end: false },
] as const;

function SidebarCollapseButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
      onClick={toggleSidebar}
      aria-label="Fermer"
    >
      <PanelLeftClose className="h-4 w-4" />
    </Button>
  );
}

export function AppSidebar() {
  const t = useTranslations("nav");

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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-1">
        <TutorialNudge />

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
                <span>{t("support") ?? "Aide"}</span>
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
