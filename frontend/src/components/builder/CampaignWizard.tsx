"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Campaign } from "@/types";
import WizardTabBar from "./WizardTabBar";

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
  const router = useRouter();

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

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900 rounded-t-lg">
        <Link
          href="/campaigns"
          className="text-sm text-gray-400 hover:text-gray-200 transition-colors duration-150"
        >
          &#8592; Back to Campaigns
        </Link>
        <span className="text-sm text-gray-500">Draft auto-saved</span>
      </div>

      {/* Campaign title */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-100">{campaign.name}</h1>
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
        <p className="text-gray-400">Tab {activeTab + 1} placeholder</p>
      </div>

      {/* Bottom navigation bar */}
      <div className="flex items-center justify-between px-4 py-4 border-t border-gray-800 bg-gray-900 rounded-b-lg">
        <div>
          {!isFirstTab && prevTabName && (
            <button
              onClick={goBack}
              className="text-sm text-gray-400 hover:text-gray-200 transition-colors duration-150 px-4 py-2 rounded-lg border border-gray-700 hover:border-gray-500"
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
              {finishing ? "Activating..." : "&#10003; Finish Campaign"}
            </button>
          ) : (
            nextTabName && (
              <button
                onClick={goNext}
                className="bg-amber-600 hover:bg-amber-500 text-gray-950 font-semibold px-5 py-2 rounded-lg transition-colors duration-150"
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
