"use client";

import { useCampaign } from "@/contexts/CampaignContext";
import LocationSection from "@/components/LocationSection";
import NpcHoverCard from "@/components/NpcHoverCard";
import { Badge } from "@/components/ui/badge";

export default function LocationsPage() {
  const { campaign, locations, npcs, quests, reload } = useCampaign();

  return (
    <div className="max-w-4xl space-y-6">
      <LocationSection
        campaignId={campaign.id}
        locations={locations}
        currentLocationId={campaign.current_location_id}
        onUpdate={reload}
      />

      {/* Cross-references: NPCs and quests by location */}
      {locations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Location Cross-References</h3>
          <div className="space-y-3">
            {locations.map((loc) => {
              const locNpcs = npcs.filter((n) => n.location_id === loc.id);
              const locQuests = quests.filter((q) => q.location_id === loc.id);
              if (locNpcs.length === 0 && locQuests.length === 0) return null;
              return (
                <div key={loc.id} className="bg-gray-900 border border-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-100">{loc.name}</span>
                    <Badge variant="secondary" className="text-xs capitalize">{loc.biome}</Badge>
                    {campaign.current_location_id === loc.id && (
                      <Badge className="text-xs bg-amber-600/20 text-amber-400">Current</Badge>
                    )}
                  </div>
                  {locNpcs.length > 0 && (
                    <div className="mb-1.5">
                      <span className="text-xs text-gray-500">NPCs: </span>
                      {locNpcs.map((npc, i) => (
                        <NpcHoverCard key={npc.id} npc={npc}>
                          <span className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer">
                            {npc.name}{i < locNpcs.length - 1 ? ", " : ""}
                          </span>
                        </NpcHoverCard>
                      ))}
                    </div>
                  )}
                  {locQuests.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500">Quests: </span>
                      {locQuests.map((q, i) => (
                        <span key={q.id} className="text-xs text-gray-300">
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
