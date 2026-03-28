"use client";

import { useCampaign } from "@/contexts/CampaignContext";
import CharacterSection from "@/components/CharacterSection";

export default function CharactersPage() {
  const { campaign, characters, reload } = useCampaign();

  return (
    <div className="max-w-4xl">
      <CharacterSection
        campaignId={campaign.id}
        characters={characters}
        onUpdate={reload}
      />
    </div>
  );
}
