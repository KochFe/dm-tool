"use client";

import { useCampaign } from "@/contexts/CampaignContext";
import InitiativeTracker from "@/components/InitiativeTracker";
import type { Combatant } from "@/types";

interface CombatViewProps {
  onCombatEnd?: () => void;
  onSelectionChange?: (combatant: Combatant | null) => void;
}

export default function CombatView({ onCombatEnd, onSelectionChange }: CombatViewProps) {
  const { campaign, characters } = useCampaign();

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-4xl mx-auto">
        <InitiativeTracker
          campaignId={campaign.id}
          characters={characters}
          onCombatEnd={onCombatEnd}
          onSelectionChange={onSelectionChange}
        />
      </div>
    </div>
  );
}
