"use client";

import Link from "next/link";
import { useCampaign } from "@/contexts/CampaignContext";
import { Badge } from "@/components/ui/badge";

export default function OverviewPage() {
  const { campaign, characters, locations, npcs, quests, currentLocation } = useCampaign();

  const activeQuests = quests.filter((q) => q.status === "in_progress");
  const base = `/campaigns/${campaign.id}`;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-100 mb-2">Overview</h2>
        {campaign.description ? (
          <p className="text-gray-400 text-sm leading-relaxed">{campaign.description}</p>
        ) : (
          <p className="text-gray-500 text-sm italic">
            No description yet.{" "}
            <Link href={`${base}/settings`} className="text-amber-400 hover:text-amber-300">
              Add one in Settings
            </Link>
          </p>
        )}
      </div>

      {currentLocation && (
        <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Location</p>
          <p className="text-gray-100 font-medium">{currentLocation.name}</p>
          <p className="text-sm text-gray-400 capitalize">{currentLocation.biome}</p>
          {currentLocation.description && (
            <p className="text-sm text-gray-500 mt-1">{currentLocation.description}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Characters", count: characters.length, href: `${base}/characters` },
          { label: "Locations", count: locations.length, href: `${base}/locations` },
          { label: "NPCs", count: npcs.length, href: `${base}/npcs` },
          { label: "Quests", count: quests.length, href: `${base}/quests` },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="bg-gray-900 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600 transition-colors group"
          >
            <p className="text-2xl font-bold text-gray-100">{item.count}</p>
            <p className="text-sm text-gray-400 group-hover:text-amber-400 transition-colors">
              {item.label} →
            </p>
          </Link>
        ))}
      </div>

      {activeQuests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Active Quests</h3>
          <div className="space-y-2">
            {activeQuests.map((q) => (
              <div key={q.id} className="bg-gray-900 border border-gray-700/50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-100">{q.title}</p>
                  {q.description && (
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{q.description}</p>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs">In Progress</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
