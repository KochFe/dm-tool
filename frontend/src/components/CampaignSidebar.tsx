"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Scroll,
  Users,
  MapPin,
  Drama,
  Flag,
  Sword,
  Swords,
  BookOpen,
  Settings,
  ArrowLeft,
  Menu,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

function NavLink({
  item,
  active,
  variant = "default",
}: {
  item: NavItem;
  active: boolean;
  variant?: "default" | "session";
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
        "group",
        variant === "session" && !active
          ? "text-primary/80 hover:text-primary hover:bg-primary/10"
          : active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
      )}
    >
      {active && (
        <>
          <motion.span
            layoutId="sidebar-active-bg"
            className="absolute inset-0 rounded-lg bg-primary/12"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
          <motion.span
            layoutId="sidebar-active-rail"
            className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-primary"
            style={{ boxShadow: "0 0 12px var(--color-primary)" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        </>
      )}
      <Icon
        className={cn(
          "relative shrink-0 w-5 h-5 transition-transform duration-200 group-hover:scale-[1.08]",
          variant === "session" && !active
            ? "text-primary/80 group-hover:text-primary"
            : active
            ? "text-primary"
            : "text-muted-foreground group-hover:text-foreground/85"
        )}
      />
      <span className="relative hidden xl:block truncate">{item.label}</span>
    </Link>
  );
}

export default function CampaignSidebar({ campaignId }: { campaignId: string }) {
  const pathname = usePathname();
  const base = `/campaigns/${campaignId}`;
  const [sheetOpen, setSheetOpen] = useState(false);
  const t = useTranslations("sidebar");

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const mainNav: NavItem[] = [
    { href: `${base}/overview`, label: t("overview"), icon: Scroll },
    { href: `${base}/characters`, label: t("characters"), icon: Users },
    { href: `${base}/locations`, label: t("locations"), icon: MapPin },
    { href: `${base}/npcs`, label: t("npcs"), icon: Drama },
    { href: `${base}/quests`, label: t("quests"), icon: Flag },
    { href: `${base}/encounters`, label: t("encounters"), icon: Sword },
    { href: `${base}/session-log`, label: t("sessionLog"), icon: BookOpen },
  ];

  const sessionNav: NavItem[] = [
    { href: `${base}/session`, label: t("session"), icon: Swords },
  ];

  const bottomNav: NavItem[] = [
    { href: `${base}/settings`, label: t("settings"), icon: Settings },
  ];

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-14 xl:w-56 shrink-0 border-r border-border bg-card/60 flex-col py-3 px-2 gap-1 overflow-y-auto">
        {/* Main navigation */}
        <nav className="flex flex-col gap-1">
          {mainNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href, item.exact)} />
          ))}
        </nav>

        <div className="mt-4 mb-1 px-3 hidden xl:block text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 font-display italic">
          Live
        </div>
        <div className="my-2 xl:hidden border-t border-border" />

        {/* Session — styled as a prominent action */}
        <nav className="flex flex-col gap-1">
          {sessionNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href, item.exact)} variant="session" />
          ))}
        </nav>

        <div className="mt-4 mb-1 px-3 hidden xl:block text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 font-display italic">
          System
        </div>
        <div className="my-2 xl:hidden border-t border-border" />

        {/* Settings */}
        <nav className="flex flex-col gap-1">
          {bottomNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href, item.exact)} />
          ))}
        </nav>

        {/* Spacer pushes back link to bottom */}
        <div className="flex-1" />

        {/* Back to all campaigns */}
        <Link
          href="/campaigns"
          prefetch={false}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground/80 hover:bg-accent transition-colors duration-150"
        >
          <ArrowLeft className="shrink-0 w-5 h-5" />
          <span className="hidden xl:block truncate">{t("allCampaigns")}</span>
        </Link>
      </aside>

      {/* Mobile menu trigger — only visible below md */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-4 left-4 z-40 md:hidden bg-muted border border-border text-foreground/80 p-3 rounded-full shadow-lg hover:bg-accent transition-colors"
        aria-label={t("openNavMenu")}
      >
        <Menu className="w-5 h-5" />
      </button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-64 bg-card border-border p-0 md:hidden">
          <nav className="flex flex-col gap-1 p-3 pt-8">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={() => setSheetOpen(false)}
                aria-current={isActive(item.href, item.exact) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href, item.exact)
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5",
                    isActive(item.href, item.exact) ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="my-2 border-t border-border" />
            {sessionNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={() => setSheetOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary/15 text-primary"
                    : "text-primary/70 hover:text-primary hover:bg-primary/10"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="my-2 border-t border-border" />
            {bottomNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={() => setSheetOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="flex-1" />
            <Link
              href="/campaigns"
              prefetch={false}
              onClick={() => setSheetOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground/80 hover:bg-accent transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>{t("allCampaigns")}</span>
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
