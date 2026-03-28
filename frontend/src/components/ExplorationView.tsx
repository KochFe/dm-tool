"use client";

import { useState } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Badge } from "@/components/ui/badge";
import SmartPrompts from "@/components/SmartPrompts";
import GeneratorResultModal from "@/components/GeneratorResultModal";
import SessionNotes from "@/components/SessionNotes";
import type { GeneratedEncounter, GeneratedNpc, GeneratedLoot } from "@/types";

const STATUS_BADGE: Record<string, string> = {
  not_started: "bg-gray-700 text-gray-300",
  in_progress: "bg-amber-900 text-amber-400",
  completed: "bg-green-900 text-green-400",
  failed: "bg-red-900 text-red-400",
};

export default function ExplorationView() {
  const { campaign, currentLocation, npcs, quests, characters, reload } = useCampaign();
  const [generatorResult, setGeneratorResult] = useState<{
    type: "encounter" | "npc" | "loot";
    result: GeneratedEncounter | GeneratedNpc | GeneratedLoot;
  } | null>(null);

  const currentLocationName = currentLocation?.name ?? null;
  const locationNpcs = currentLocation
    ? npcs.filter((n) => n.location_id === currentLocation.id)
    : [];
  const locationQuests = currentLocation
    ? quests.filter((q) => q.location_id === currentLocation.id && q.status !== "completed")
    : [];

  if (!currentLocation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Set a current location to see location-specific info.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Current Location */}
      <div className="bg-gray-900 border border-amber-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-semibold text-gray-100">{currentLocation.name}</h3>
          <Badge variant="secondary" className="text-xs capitalize">{currentLocation.biome}</Badge>
        </div>
        {currentLocation.description && (
          <p className="text-gray-400 text-sm leading-relaxed">{currentLocation.description}</p>
        )}
      </div>

      {/* NPCs at this location */}
      {locationNpcs.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">NPCs Here</h4>
          <div className="space-y-2">
            {locationNpcs.map((npc) => (
              <div key={npc.id} className="bg-gray-900 border border-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-100 text-sm">{npc.name}</span>
                  <span className="text-xs text-gray-500">
                    {npc.race}{npc.npc_class ? ` · ${npc.npc_class}` : ""}
                  </span>
                  {!npc.is_alive && (
                    <Badge variant="destructive" className="text-xs">Dead</Badge>
                  )}
                </div>
                {npc.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{npc.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active quests at this location */}
      {locationQuests.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Quests Here</h4>
          <div className="space-y-2">
            {locationQuests.map((q) => (
              <div key={q.id} className="bg-gray-900 border border-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-100 text-sm">{q.title}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_BADGE[q.status] ?? ""}`}
                  >
                    {q.status.replace("_", " ")}
                  </span>
                </div>
                {q.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{q.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Generators */}
      <SmartPrompts
        campaignId={campaign.id}
        currentLocationName={currentLocationName}
        partyLevel={campaign.party_level}
        onResult={(type, result) => setGeneratorResult({ type, result })}
      />

      {generatorResult && (
        <GeneratorResultModal
          type={generatorResult.type}
          result={generatorResult.result}
          campaignId={campaign.id}
          characters={characters}
          onClose={() => setGeneratorResult(null)}
          onSaved={() => {
            reload();
            setGeneratorResult(null);
          }}
        />
      )}

      {/* Session notes — auto-saves on blur and after 2s debounce */}
      <SessionNotes />
    </div>
  );
}
