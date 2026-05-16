"use client";

import { useTranslations } from "next-intl";
import type { Campaign, CampaignIdea } from "@/types";
import LocationsEditor from "@/components/locations/LocationsEditor";
import IdeasHelper from "./IdeasHelper";

interface LocationsTabProps {
  campaign: Campaign;
  ideas: CampaignIdea[];
  onToggleIdea: (id: string, isDone: boolean) => void;
  reloadIdeas: () => Promise<void>;
}

export default function LocationsTab({
  campaign,
  ideas,
  onToggleIdea,
  reloadIdeas,
}: LocationsTabProps) {
  const t = useTranslations("builder.locationsTab");

  return (
    <div className="flex gap-4 h-full">
      <LocationsEditor
        campaignId={campaign.id}
        currentLocationId={campaign.current_location_id}
        // No onCurrentLocationChanged — wizard is planning context, no "set current" action.
      />

      {/* Right panel: ideas */}
      <div className="w-56 flex-shrink-0">
        <div className="sticky top-0 bg-card/80 backdrop-blur-sm rounded-xl border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            {t("locationIdeas")}
          </p>
          <IdeasHelper
            campaignId={campaign.id}
            tag="location"
            ideas={ideas}
            onToggleDone={onToggleIdea}
            onIdeaCreated={reloadIdeas}
          />
        </div>
      </div>
    </div>
  );
}
