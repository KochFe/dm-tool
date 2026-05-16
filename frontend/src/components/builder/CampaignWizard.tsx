"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Campaign, CampaignIdea } from "@/types";
import WizardTabBar from "./WizardTabBar";
import BasicsTab from "./BasicsTab";
import StoryTab from "./StoryTab";
import LocationsTab from "./LocationsTab";
import CharactersTab from "./CharactersTab";
import AssistantDrawer from "./AssistantDrawer";

const TAB_KEYS = ["basics", "story", "locations", "characters"] as const;
const TOTAL_TABS = TAB_KEYS.length;

interface CampaignWizardProps {
  campaign: Campaign;
  onCampaignUpdate: (campaign: Campaign) => void;
}

export default function CampaignWizard({
  campaign,
  onCampaignUpdate,
}: CampaignWizardProps) {
  const t = useTranslations("builder");
  const [activeTab, setActiveTab] = useState(0);
  const [completedTabs, setCompletedTabs] = useState<Set<number>>(new Set());
  const [finishing, setFinishing] = useState(false);
  const [ideas, setIdeas] = useState<CampaignIdea[]>([]);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const campaignDraft = {
    name: campaign.name || undefined,
    world_description: campaign.description || undefined,
  };
  const router = useRouter();

  const reloadIdeas = useCallback(async () => {
    try {
      const loaded = await api.getIdeas(campaign.id);
      setIdeas(loaded);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("loadIdeasError"));
    }
  }, [campaign.id, t]);

  const handleToggleIdea = useCallback(
    async (id: string, isDone: boolean) => {
      try {
        await api.updateIdea(id, { is_done: isDone });
        await reloadIdeas();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("updateIdeaError"));
      }
    },
    [reloadIdeas, t]
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
      toast.success(t("campaignActivated"));
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(t("activateError", { message }));
      setFinishing(false);
    }
  };

  const isLastTab = activeTab === TOTAL_TABS - 1;
  const isFirstTab = activeTab === 0;
  const prevTabKey = isFirstTab ? null : TAB_KEYS[activeTab - 1];
  const nextTabKey = isLastTab ? null : TAB_KEYS[activeTab + 1];
  const prevTabName = prevTabKey ? t(`tabs.${prevTabKey}`) : null;
  const nextTabName = nextTabKey ? t(`tabs.${nextTabKey}`) : null;

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
            reloadIdeas={reloadIdeas}
          />
        );
      case 2:
        return (
          <LocationsTab
            campaign={campaign}
            ideas={ideas}
            onToggleIdea={handleToggleIdea}
            reloadIdeas={reloadIdeas}
          />
        );
      case 3:
        return (
          <CharactersTab
            campaign={campaign}
            ideas={ideas}
            onToggleIdea={handleToggleIdea}
            reloadIdeas={reloadIdeas}
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
          {t("backToCampaigns")}
        </Link>
        <span className="text-sm text-muted-foreground">{t("draftAutosaved")}</span>
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
              {t("back", { tab: prevTabName })}
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
              {finishing ? t("activating") : t("finishCampaign")}
            </button>
          ) : (
            nextTabName && (
              <button
                onClick={goNext}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2 rounded-lg transition-colors duration-150"
              >
                {t("next", { tab: nextTabName })}
              </button>
            )
          )}
        </div>
      </div>
      {/* Assistant FAB */}
      <button
        onClick={() => setAssistantOpen(true)}
        aria-label="Open assistant"
        className="fixed bottom-20 right-6 z-30 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-14 h-14 shadow-lg flex items-center justify-center text-xl"
      >
        ✨
      </button>

      <AssistantDrawer
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        campaignDraft={campaignDraft}
      />
    </div>
  );
}
