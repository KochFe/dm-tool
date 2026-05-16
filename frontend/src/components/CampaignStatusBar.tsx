"use client";

import { useTranslations } from "next-intl";
import { useCampaign } from "@/contexts/CampaignContext";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock } from "lucide-react";

export default function CampaignStatusBar() {
  const t = useTranslations("locationDrawer");
  const { campaign, currentLocation, openLocationDrawer } = useCampaign();

  return (
    <div className="h-10 shrink-0 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-3 text-sm">
      {/* Campaign name */}
      <span className="font-semibold text-foreground truncate max-w-[200px]">
        {campaign.name}
      </span>

      <Separator orientation="vertical" className="h-4 bg-accent" />

      {/* In-game time */}
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate max-w-[120px]">{campaign.in_game_time}</span>
      </span>

      <Separator orientation="vertical" className="h-4 bg-accent" />

      {/* Current location chip — always a button now */}
      <button
        onClick={openLocationDrawer}
        title={t("openTooltip")}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md px-1.5 py-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-ring/50"
      >
        <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/70" />
        {currentLocation ? (
          <span className="truncate max-w-[160px]">{currentLocation.name}</span>
        ) : (
          <span className="italic text-muted-foreground/80">{t("setLocationButton")}</span>
        )}
      </button>
    </div>
  );
}
