"use client";

import { useCampaign } from "@/contexts/CampaignContext";
import InitiativeTracker from "@/components/InitiativeTracker";

export default function CombatView() {
  const { campaign, characters } = useCampaign();

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-4xl mx-auto">
        <InitiativeTracker
          campaignId={campaign.id}
          characters={characters}
        />
      </div>
    </div>
  );
}
