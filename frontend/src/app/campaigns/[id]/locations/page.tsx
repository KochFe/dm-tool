"use client";

import { useTranslations } from "next-intl";
import { useCampaign } from "@/contexts/CampaignContext";
import LocationsEditor from "@/components/locations/LocationsEditor";
import NpcHoverCard from "@/components/NpcHoverCard";
import { Badge } from "@/components/ui/badge";

export default function LocationsPage() {
  const t = useTranslations("locations");
  const { campaign, locations, npcs, quests, reload } = useCampaign();

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Editor: tree + detail */}
      <div className="flex-1 min-h-[600px]">
        <LocationsEditor
          campaignId={campaign.id}
          currentLocationId={campaign.current_location_id}
          onCurrentLocationChanged={reload}
        />
      </div>

      {/* Cross-references: NPCs and quests by location (preserved from prior implementation) */}
      {locations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground/80 mb-3">{t("crossRefsHeading")}</h3>
          <div className="space-y-3">
            {locations.map((loc) => {
              const locNpcs = npcs.filter((n) => n.location_id === loc.id);
              const locQuests = quests.filter((q) => q.location_id === loc.id);
              if (locNpcs.length === 0 && locQuests.length === 0) return null;
              return (
                <div key={loc.id} className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-foreground">{loc.name}</span>
                    <Badge variant="secondary" className="text-xs capitalize">{loc.biome}</Badge>
                    {campaign.current_location_id === loc.id && (
                      <Badge className="text-xs bg-primary/20 text-primary">{t("currentBadge")}</Badge>
                    )}
                  </div>
                  {locNpcs.length > 0 && (
                    <div className="mb-1.5">
                      <span className="text-xs text-muted-foreground">{t("npcsLabel")}</span>
                      {locNpcs.map((npc, i) => (
                        <NpcHoverCard key={npc.id} npc={npc}>
                          <span className="text-xs text-primary hover:text-primary cursor-pointer">
                            {npc.name}{i < locNpcs.length - 1 ? ", " : ""}
                          </span>
                        </NpcHoverCard>
                      ))}
                    </div>
                  )}
                  {locQuests.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">{t("questsLabel")}</span>
                      {locQuests.map((q, i) => (
                        <span key={q.id} className="text-xs text-foreground/80">
                          {q.title}{i < locQuests.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
