"use client";

import { useCampaign } from "@/contexts/CampaignContext";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock } from "lucide-react";

export default function CampaignStatusBar() {
  const { campaign, currentLocation } = useCampaign();
  const t = useTranslations("statusBar");

  return (
    <div className="h-10 shrink-0 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-3 text-sm">
      {/* Campaign name */}
      <span className="font-semibold text-foreground truncate max-w-[200px]">
        {campaign.name}
      </span>

      <Separator orientation="vertical" className="h-4 bg-accent" />

      {/* Party level */}
      <Badge
        variant="outline"
        className="border-ring text-primary bg-primary/10 text-xs"
      >
        {t("level", { level: campaign.party_level })}
      </Badge>

      <Separator orientation="vertical" className="h-4 bg-accent" />

      {/* In-game time */}
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate max-w-[120px]">{campaign.in_game_time}</span>
      </span>

      {currentLocation && (
        <>
          <Separator orientation="vertical" className="h-4 bg-accent" />
          <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/70" />
            <span className="truncate max-w-[160px]">{currentLocation.name}</span>
          </span>
        </>
      )}
    </div>
  );
}
