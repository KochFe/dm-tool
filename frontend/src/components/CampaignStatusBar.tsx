"use client";

import { useTranslations } from "next-intl";
import { useCampaign } from "@/contexts/CampaignContext";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock } from "lucide-react";

export default function CampaignStatusBar() {
  const t = useTranslations("locationDrawer");
  const { campaign, currentLocation, openLocationDrawer } = useCampaign();

  return (
    <div className="h-10 shrink-0 border-b border-border bg-card/70 backdrop-blur-md flex items-center px-4 gap-3 text-sm shadow-elev-1">
      {/* Campaign name */}
      <span className="font-display italic text-foreground/90 text-base tracking-tight truncate max-w-[260px]">
        {campaign.name}
      </span>

      <Separator orientation="vertical" className="h-4 bg-border" />

      {/* In-game time */}
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate max-w-[120px] tabular-nums">{campaign.in_game_time}</span>
      </span>

      <Separator orientation="vertical" className="h-4 bg-border" />

      {/* Current location chip — always a button now */}
      <button
        onClick={openLocationDrawer}
        title={t("openTooltip")}
        className="group flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 hover:shadow-glow-amber rounded-full px-2.5 py-1 transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-ring/60"
      >
        <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/80 group-hover:text-primary transition-colors" />
        {currentLocation ? (
          <span className="truncate max-w-[160px]">{currentLocation.name}</span>
        ) : (
          <span className="italic text-muted-foreground/80">{t("setLocationButton")}</span>
        )}
      </button>
    </div>
  );
}
