"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Campaign } from "@/types";
import CampaignWizard from "@/components/builder/CampaignWizard";

export default function CampaignBuilderPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getCampaign(campaignId);
        if (data.status !== "draft") {
          router.replace(`/campaigns/${campaignId}`);
          return;
        }
        setCampaign(data);
      } catch {
        router.replace("/campaigns");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [campaignId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  return (
    <CampaignWizard
      campaign={campaign}
      onCampaignUpdate={setCampaign}
    />
  );
}
