"use client";

import { use } from "react";
import { CampaignProvider } from "@/contexts/CampaignContext";
import CampaignSidebar from "@/components/CampaignSidebar";
import CampaignStatusBar from "@/components/CampaignStatusBar";
import CommandPalette from "@/components/CommandPalette";

export default function CampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <CampaignProvider campaignId={id}>
      <div className="flex flex-col h-[calc(100vh-57px)]">
        <CampaignStatusBar />
        <div className="flex flex-1 overflow-hidden">
          <CampaignSidebar campaignId={id} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
      <CommandPalette />
    </CampaignProvider>
  );
}
