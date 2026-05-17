"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCampaign } from "@/contexts/CampaignContext";
import PartyPanel from "@/components/PartyPanel";
import ExplorationView from "@/components/ExplorationView";
import CombatView from "@/components/CombatView";
import CombatantDetailPanel from "@/components/combat/CombatantDetailPanel";
import CompactDiceRoller from "@/components/CompactDiceRoller";
import ChatSidebar from "@/components/ChatSidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Combatant } from "@/types";

type SessionMode = "exploration" | "combat";

export default function SessionPage() {
  const t = useTranslations("session");
  const { campaign, characters, currentLocation } = useCampaign();
  const searchParams = useSearchParams();
  const initialMode: SessionMode =
    searchParams?.get("mode") === "combat" ? "combat" : "exploration";
  const [mode, setMode] = useState<SessionMode>(initialMode);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [selectedCombatant, setSelectedCombatant] = useState<Combatant | null>(null);
  const switchToExploration = useCallback(() => setMode("exploration"), []);

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
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <Tabs value={mode} onValueChange={(v) => setMode(v as SessionMode)}>
          <TabsList className="bg-muted">
            <TabsTrigger value="exploration" className="text-xs">{t("tabExploration")}</TabsTrigger>
            <TabsTrigger value="combat" className="text-xs">{t("tabCombat")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <button
          onClick={() => setIsChatOpen((v) => !v)}
          className="text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1"
        >
          {isChatOpen ? t("hideOracle") : t("showOracle")}
        </button>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Party Panel — hidden below lg */}
        <div className="hidden lg:block w-52 shrink-0 border-r border-border bg-card/30">
          <PartyPanel characters={characters} />
        </div>

        {/* Combatant detail panel — only in Combat mode */}
        {mode === "combat" && (
          <div className="hidden xl:block w-64 shrink-0 border-r border-border bg-card/20">
            <CombatantDetailPanel
              combatant={selectedCombatant}
              characters={characters}
            />
          </div>
        )}

        {/* Center: Main content */}
        {mode === "exploration" ? (
          <ExplorationView />
        ) : (
          <CombatView
            onCombatEnd={switchToExploration}
            onSelectionChange={setSelectedCombatant}
          />
        )}

        {/* Right: Chat Panel (inline panel mode) — hidden below lg */}
        {isChatOpen && (
          <div className="hidden lg:block w-[360px] shrink-0 border-l border-border">
            <ChatSidebar
              campaignId={campaign.id}
              isOpen={true}
              onClose={() => setIsChatOpen(false)}
              currentLocationName={currentLocationName}
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
