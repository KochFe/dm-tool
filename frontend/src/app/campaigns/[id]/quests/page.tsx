"use client";

import { useCampaign } from "@/contexts/CampaignContext";
import QuestSection from "@/components/QuestSection";

export default function QuestsPage() {
  const { campaign, locations } = useCampaign();

  return (
    <div className="max-w-4xl">
      <QuestSection
        campaignId={campaign.id}
        locations={locations}
        partyLevel={campaign.party_level}
      />
    </div>
  );
}
