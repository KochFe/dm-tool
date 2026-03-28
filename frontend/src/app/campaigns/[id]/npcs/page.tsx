"use client";

import { useCampaign } from "@/contexts/CampaignContext";
import NPCSection from "@/components/NPCSection";

export default function NpcsPage() {
  const { campaign, locations } = useCampaign();

  return (
    <div className="max-w-4xl">
      <NPCSection
        campaignId={campaign.id}
        locations={locations}
      />
    </div>
  );
}
