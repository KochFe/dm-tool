"use client";

import { use } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const isBuilder = pathname.endsWith("/builder");

  if (isBuilder) {
    return (
      <main className="h-[calc(100vh-57px)] overflow-y-auto p-6 bg-background">
        {children}
      </main>
    );
  }

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
