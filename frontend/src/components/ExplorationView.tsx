"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCampaign } from "@/contexts/CampaignContext";
import { Badge } from "@/components/ui/badge";
import SmartPrompts from "@/components/SmartPrompts";
import GeneratorResultModal from "@/components/GeneratorResultModal";
import SessionNotes from "@/components/SessionNotes";
import SessionRecapPanel from "@/components/SessionRecapPanel";
import { FadeIn } from "@/components/motion";
import type { GeneratedEncounter, GeneratedNpc, GeneratedLoot } from "@/types";

const STATUS_BADGE: Record<string, string> = {
  not_started: "bg-accent text-foreground/80",
  in_progress: "bg-primary/20 text-primary",
  completed: "bg-green-900 text-green-400",
  failed: "bg-red-900 text-red-400",
};

export default function ExplorationView() {
  const t = useTranslations("explorationView");
  const { campaign, currentLocation, npcs, quests, characters, reload } = useCampaign();
  const [generatorResult, setGeneratorResult] = useState<{
    type: "encounter" | "npc" | "loot";
    result: GeneratedEncounter | GeneratedNpc | GeneratedLoot;
  } | null>(null);

  const currentLocationName = currentLocation?.name ?? null;

  const partyLevel = (() => {
    if (characters.length === 0) return 1;
    const avg = characters.reduce((sum, c) => sum + c.level, 0) / characters.length;
    return Math.max(1, Math.min(20, Math.round(avg)));
  })();
  const lootAutoContext = {
    partyLevel,
    hasPcs: characters.length > 0,
    locationName: currentLocationName,
    biome: currentLocation?.biome ?? null,
  };
  const locationNpcs = currentLocation
    ? npcs.filter((n) => n.location_id === currentLocation.id)
    : [];
  const locationQuests = currentLocation
    ? quests.filter((q) => q.location_id === currentLocation.id && q.status !== "completed")
    : [];

  if (!currentLocation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">{t("noLocation")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Current Location */}
      <FadeIn>
        <div className="relative overflow-hidden bg-card border border-primary/25 rounded-2xl p-5 shadow-elev-1">
          <div aria-hidden className="absolute inset-0 bg-hearth pointer-events-none opacity-60" />
          <div className="relative flex items-center gap-2 mb-2">
            <h3 className="font-display text-2xl text-foreground tracking-tight">{currentLocation.name}</h3>
            <Badge variant="secondary" className="text-xs capitalize">{currentLocation.biome}</Badge>
          </div>
          {currentLocation.description && (
            <p className="relative text-muted-foreground text-sm leading-relaxed">{currentLocation.description}</p>
          )}
        </div>
      </FadeIn>

      {/* NPCs at this location */}
      {locationNpcs.length > 0 && (
        <FadeIn delay={0.06}>
          <h4 className="font-display italic text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-2">{t("npcsHere")}</h4>
          <div className="space-y-2">
            {locationNpcs.map((npc) => (
              <div key={npc.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm">{npc.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {npc.race}{npc.npc_class ? ` · ${npc.npc_class}` : ""}
                  </span>
                  {!npc.is_alive && (
                    <Badge variant="destructive" className="text-xs">{t("dead")}</Badge>
                  )}
                </div>
                {npc.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{npc.description}</p>
                )}
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      {/* Active quests at this location */}
      {locationQuests.length > 0 && (
        <FadeIn delay={0.12}>
          <h4 className="font-display italic text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-2">{t("questsHere")}</h4>
          <div className="space-y-2">
            {locationQuests.map((q) => (
              <div key={q.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm">{q.title}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_BADGE[q.status] ?? ""}`}
                  >
                    {t(`questStatus.${q.status as "not_started" | "in_progress" | "completed" | "failed"}`)}
                  </span>
                </div>
                {q.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{q.description}</p>
                )}
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      {/* AI Generators */}
      <SmartPrompts
        campaignId={campaign.id}
        currentLocationName={currentLocationName}
        lootAutoContext={lootAutoContext}
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

      {/* Recap panel above session notes — ephemeral, regenerated on demand */}
      <SessionRecapPanel campaignId={campaign.id} />

      {/* Session notes — auto-saves on blur and after 2s debounce */}
      <SessionNotes />
    </div>
  );
}
