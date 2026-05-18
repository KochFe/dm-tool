"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { Campaign, PlayerCharacter, Location, Npc, Quest } from "@/types";
import { CardListSkeleton } from "@/components/skeletons/CardSkeleton";

interface CampaignContextValue {
  campaign: Campaign;
  characters: PlayerCharacter[];
  locations: Location[];
  npcs: Npc[];
  quests: Quest[];
  currentLocation: Location | null;
  loading: boolean;
  reload: () => Promise<void>;
  isLocationDrawerOpen: boolean;
  openLocationDrawer: () => void;
  closeLocationDrawer: () => void;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

export function useCampaign(): CampaignContextValue {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error("useCampaign must be used within CampaignProvider");
  return ctx;
}

export function CampaignProvider({
  campaignId,
  children,
}: {
  campaignId: string;
  children: ReactNode;
}) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [characters, setCharacters] = useState<PlayerCharacter[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocationDrawerOpen, setIsLocationDrawerOpen] = useState(false);
  const openLocationDrawer = useCallback(() => setIsLocationDrawerOpen(true), []);
  const closeLocationDrawer = useCallback(() => setIsLocationDrawerOpen(false), []);

  const load = useCallback(async () => {
    const [c, chars, locs, npcList, questList] = await Promise.all([
      api.getCampaign(campaignId),
      api.getCharacters(campaignId),
      api.getLocations(campaignId),
      api.getNpcs(campaignId),
      api.getQuests(campaignId),
    ]);
    setCampaign(c);
    setCharacters(chars);
    setLocations(locs);
    setNpcs(npcList);
    setQuests(questList);
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (!campaign || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <CardListSkeleton count={4} />
      </div>
    );
  }

  const currentLocation =
    locations.find((l) => l.id === campaign.current_location_id) ?? null;

  return (
    <CampaignContext.Provider
      value={{
        campaign,
        characters,
        locations,
        npcs,
        quests,
        currentLocation,
        loading,
        reload: load,
        isLocationDrawerOpen,
        openLocationDrawer,
        closeLocationDrawer,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}
