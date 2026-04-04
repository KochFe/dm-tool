"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Scroll,
  Users,
  MapPin,
  Drama,
  Flag,
  Swords,
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

export default function CampaignSidebar({ campaignId }: { campaignId: string }) {
  const pathname = usePathname();
  const base = `/campaigns/${campaignId}`;
  const [sheetOpen, setSheetOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const mainNav: NavItem[] = [
    { href: base, label: "Overview", icon: Scroll, exact: true },
    { href: `${base}/characters`, label: "Characters", icon: Users },
    { href: `${base}/locations`, label: "Locations", icon: MapPin },
    { href: `${base}/npcs`, label: "NPCs", icon: Drama },
    { href: `${base}/quests`, label: "Quests", icon: Flag },
  ];

  const sessionNav: NavItem[] = [
    { href: `${base}/session`, label: "Session", icon: Swords },
  ];

  const bottomNav: NavItem[] = [
    { href: `${base}/settings`, label: "Settings", icon: Settings },
  ];

  const NavLink = ({
    item,
    variant = "default",
  }: {
    item: NavItem;
    variant?: "default" | "session";
  }) => {
    const active = isActive(item.href, item.exact);
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        prefetch={false}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
          "group relative",
          variant === "session" && !active
            ? "text-primary/70 hover:text-primary hover:bg-primary/10"
            : active
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        <Icon
          className={cn(
            "shrink-0 w-5 h-5",
            variant === "session" && !active
              ? "text-primary/70 group-hover:text-primary"
              : active
              ? "text-primary"
              : "text-muted-foreground group-hover:text-foreground/80"
          )}
        />
        <span className="hidden xl:block truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-14 xl:w-56 shrink-0 border-r border-border bg-card/60 flex-col py-3 px-2 gap-1 overflow-y-auto">
        {/* Main navigation */}
        <nav className="flex flex-col gap-1">
          {mainNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* Separator */}
        <div className="my-2 border-t border-border" />

        {/* Session — styled as a prominent action */}
        <nav className="flex flex-col gap-1">
          {sessionNav.map((item) => (
            <NavLink key={item.href} item={item} variant="session" />
          ))}
        </nav>

        {/* Separator */}
        <div className="my-2 border-t border-border" />

        {/* Settings */}
        <nav className="flex flex-col gap-1">
          {bottomNav.map((item) => (
            <NavLink key={item.href} item={item} />
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
          <span className="hidden xl:block truncate">All Campaigns</span>
        </Link>
      </aside>

      {/* Mobile menu trigger — only visible below md */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-4 left-4 z-40 md:hidden bg-muted border border-border text-foreground/80 p-3 rounded-full shadow-lg hover:bg-accent transition-colors"
        aria-label="Open navigation menu"
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
              <span>All Campaigns</span>
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
