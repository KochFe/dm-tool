"use client";

import { useCampaign } from "@/contexts/CampaignContext";
import SessionLogTab from "@/components/SessionLogTab";

export default function SessionLogPage() {
  const { campaign } = useCampaign();
  return (
    <div className="max-w-4xl">
      <SessionLogTab campaignId={campaign.id} />
    </div>
  );
}
