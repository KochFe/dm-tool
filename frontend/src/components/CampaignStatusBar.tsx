"use client";

import { useCampaign } from "@/contexts/CampaignContext";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock } from "lucide-react";

export default function CampaignStatusBar() {
  const { campaign, currentLocation } = useCampaign();

  return (
    <div className="h-10 shrink-0 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm flex items-center px-4 gap-3 text-sm">
      {/* Campaign name */}
      <span className="font-semibold text-gray-100 truncate max-w-[200px]">
        {campaign.name}
      </span>

      <Separator orientation="vertical" className="h-4 bg-gray-700" />

      {/* Party level */}
      <Badge
        variant="outline"
        className="border-amber-500/50 text-amber-400 bg-amber-400/10 text-xs"
      >
        Level {campaign.party_level}
      </Badge>

      <Separator orientation="vertical" className="h-4 bg-gray-700" />

      {/* In-game time */}
      <span className="flex items-center gap-1.5 text-gray-400 text-xs">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate max-w-[120px]">{campaign.in_game_time}</span>
      </span>

      {currentLocation && (
        <>
          <Separator orientation="vertical" className="h-4 bg-gray-700" />
          <span className="flex items-center gap-1.5 text-gray-400 text-xs">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-400/70" />
            <span className="truncate max-w-[160px]">{currentLocation.name}</span>
          </span>
        </>
      )}
    </div>
  );
}
