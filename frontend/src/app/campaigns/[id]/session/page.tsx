"use client";

import { useState, useEffect } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import PartyPanel from "@/components/PartyPanel";
import ExplorationView from "@/components/ExplorationView";
import CombatView from "@/components/CombatView";
import CompactDiceRoller from "@/components/CompactDiceRoller";
import ChatSidebar from "@/components/ChatSidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SessionMode = "exploration" | "combat";

export default function SessionPage() {
  const { campaign, characters, currentLocation } = useCampaign();
  const [mode, setMode] = useState<SessionMode>("exploration");
  const [isChatOpen, setIsChatOpen] = useState(true);

  const currentLocationName = currentLocation?.name ?? null;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "o" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setIsChatOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Mode toggle bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 shrink-0">
        <Tabs value={mode} onValueChange={(v) => setMode(v as SessionMode)}>
          <TabsList className="bg-gray-800">
            <TabsTrigger value="exploration" className="text-xs">Exploration</TabsTrigger>
            <TabsTrigger value="combat" className="text-xs">Combat</TabsTrigger>
          </TabsList>
        </Tabs>
        <button
          onClick={() => setIsChatOpen((v) => !v)}
          className="text-xs text-gray-400 hover:text-amber-400 transition-colors px-2 py-1"
        >
          {isChatOpen ? "Hide Oracle" : "Show Oracle"}
        </button>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Party Panel — hidden below lg */}
        <div className="hidden lg:block w-52 shrink-0 border-r border-gray-800 bg-gray-900/30">
          <PartyPanel characters={characters} />
        </div>

        {/* Center: Main content */}
        {mode === "exploration" ? <ExplorationView /> : <CombatView />}

        {/* Right: Chat Panel (inline panel mode) — hidden below lg */}
        {isChatOpen && (
          <div className="hidden lg:block w-[360px] shrink-0 border-l border-gray-800">
            <ChatSidebar
              campaignId={campaign.id}
              isOpen={true}
              onClose={() => setIsChatOpen(false)}
              currentLocationName={currentLocationName}
              partyLevel={campaign.party_level}
              mode="panel"
            />
          </div>
        )}
      </div>

      {/* Bottom: Compact Dice Roller */}
      <CompactDiceRoller />
    </div>
  );
}
