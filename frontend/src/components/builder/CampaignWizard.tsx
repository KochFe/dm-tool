"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Campaign, CampaignIdea } from "@/types";
import WizardTabBar from "./WizardTabBar";
import BasicsTab from "./BasicsTab";
import StoryTab from "./StoryTab";
import LocationsTab from "./LocationsTab";
import CharactersTab from "./CharactersTab";

const TAB_NAMES = ["Basics", "Story & Phases", "Locations", "Characters"];
const TOTAL_TABS = TAB_NAMES.length;

interface CampaignWizardProps {
  campaign: Campaign;
  onCampaignUpdate: (campaign: Campaign) => void;
}

export default function CampaignWizard({
  campaign,
  onCampaignUpdate,
}: CampaignWizardProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [completedTabs, setCompletedTabs] = useState<Set<number>>(new Set());
  const [finishing, setFinishing] = useState(false);
  const [ideas, setIdeas] = useState<CampaignIdea[]>([]);
  const router = useRouter();

  const reloadIdeas = useCallback(async () => {
    try {
      const loaded = await api.getIdeas(campaign.id);
      setIdeas(loaded);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load ideas");
    }
  }, [campaign.id]);

  const handleToggleIdea = useCallback(
    async (id: string, isDone: boolean) => {
      try {
        await api.updateIdea(id, { is_done: isDone });
        await reloadIdeas();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update idea");
      }
    },
    [reloadIdeas]
  );

  useEffect(() => {
    reloadIdeas();
  }, [reloadIdeas]);

  const goNext = () => {
    setCompletedTabs((prev) => new Set(prev).add(activeTab));
    setActiveTab((t) => Math.min(t + 1, TOTAL_TABS - 1));
  };

  const goBack = () => {
    setActiveTab((t) => Math.max(t - 1, 0));
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      const updated = await api.activateCampaign(campaign.id);
      onCampaignUpdate(updated);
      toast.success("Campaign activated!");
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(`Failed to activate campaign: ${message}`);
      setFinishing(false);
    }
  };

  const isLastTab = activeTab === TOTAL_TABS - 1;
  const isFirstTab = activeTab === 0;
  const prevTabName = isFirstTab ? null : TAB_NAMES[activeTab - 1];
  const nextTabName = isLastTab ? null : TAB_NAMES[activeTab + 1];

  function renderTabContent() {
    switch (activeTab) {
      case 0:
        return (
          <BasicsTab
            campaign={campaign}
            onCampaignUpdate={onCampaignUpdate}
            ideas={ideas}
            reloadIdeas={reloadIdeas}
          />
        );
      case 1:
        return (
          <StoryTab
            campaign={campaign}
            onCampaignUpdate={onCampaignUpdate}
            ideas={ideas}
            onToggleIdea={handleToggleIdea}
          />
        );
      case 2:
        return (
          <LocationsTab
            campaign={campaign}
            ideas={ideas}
            onToggleIdea={handleToggleIdea}
          />
        );
      case 3:
        return (
          <CharactersTab
            campaign={campaign}
            ideas={ideas}
            onToggleIdea={handleToggleIdea}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card rounded-t-lg">
        <Link
          href="/campaigns"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          &#8592; Back to Campaigns
        </Link>
        <span className="text-sm text-muted-foreground">Draft auto-saved</span>
      </div>

      {/* Campaign title */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-foreground">{campaign.name}</h1>
      </div>

      {/* Tab bar */}
      <div className="px-4">
        <WizardTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          completedTabs={completedTabs}
        />
      </div>

      {/* Tab content */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        {renderTabContent()}
      </div>

      {/* Bottom navigation bar */}
      <div className="flex items-center justify-between px-4 py-4 border-t border-border bg-card rounded-b-lg">
        <div>
          {!isFirstTab && prevTabName && (
            <button
              onClick={goBack}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 px-4 py-2 rounded-lg border border-border hover:border-border"
            >
              &#8592; Back: {prevTabName}
            </button>
          )}
        </div>
        <div>
          {isLastTab ? (
            <button
              onClick={handleFinish}
              disabled={finishing}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg transition-colors duration-150"
            >
              {finishing ? "Activating..." : "\u2713 Finish Campaign"}
            </button>
          ) : (
            nextTabName && (
              <button
                onClick={goNext}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2 rounded-lg transition-colors duration-150"
              >
                Next: {nextTabName} &#8594;
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
