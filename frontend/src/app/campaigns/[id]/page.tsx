"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Campaign, PlayerCharacter, Location } from "@/types";
import CharacterSection from "@/components/CharacterSection";
import LocationSection from "@/components/LocationSection";
import NPCSection from "@/components/NPCSection";
import QuestSection from "@/components/QuestSection";
import DiceRoller from "@/components/DiceRoller";
import InitiativeTracker from "@/components/InitiativeTracker";
import ChatSidebar from "@/components/ChatSidebar";
import SmartPrompts from "@/components/SmartPrompts";
import GeneratorResultModal from "@/components/GeneratorResultModal";
import type { GeneratedEncounter, GeneratedNpc, GeneratedLoot } from "@/types";

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [characters, setCharacters] = useState<PlayerCharacter[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", party_level: 1, in_game_time: "" });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [generatorResult, setGeneratorResult] = useState<{
    type: "encounter" | "npc" | "loot";
    result: GeneratedEncounter | GeneratedNpc | GeneratedLoot;
  } | null>(null);

  const load = async () => {
    const [c, chars, locs] = await Promise.all([
      api.getCampaign(id),
      api.getCharacters(id),
      api.getLocations(id),
    ]);
    setCampaign(c);
    setCharacters(chars);
    setLocations(locs);
    setForm({
      name: c.name,
      party_level: c.party_level,
      in_game_time: c.in_game_time,
    });
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.updateCampaign(id, form);
    setEditing(false);
    load();
  };

  if (!campaign) {
    return (
      <p className="text-gray-400 text-sm">Loading campaign...</p>
    );
  }

  const currentLocation = locations.find(l => l.id === campaign.current_location_id);
  const currentLocationName = currentLocation?.name ?? null;

  return (
    <div className={`transition-[margin] duration-200 ease-in-out ${isChatOpen ? 'mr-[380px]' : ''}`}>
      {/* Back navigation */}
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-amber-400 transition-colors duration-150 mb-6"
      >
        &larr; Campaigns
      </Link>

      {/* Campaign header card */}
      <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-6 mb-6">
        {editing ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 w-full text-xl font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition"
            />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-gray-300 text-sm">
                Level:
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.party_level}
                  onChange={(e) =>
                    setForm({ ...form, party_level: parseInt(e.target.value) || 1 })
                  }
                  className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-2 py-1 w-16 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition"
                />
              </label>
              <label className="flex items-center gap-2 text-gray-300 text-sm">
                Time:
                <input
                  value={form.in_game_time}
                  onChange={(e) =>
                    setForm({ ...form, in_game_time: e.target.value })
                  }
                  className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-500 text-gray-950 font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors duration-150"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-4 py-1.5 rounded-lg text-sm transition-colors duration-150"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 mb-3">
                {campaign.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-gray-800 text-gray-300 border border-gray-700/50 px-3 py-1 rounded-full text-sm">
                  Level {campaign.party_level}
                </span>
                <span className="bg-gray-800 text-gray-300 border border-gray-700/50 px-3 py-1 rounded-full text-sm">
                  {campaign.in_game_time}
                </span>
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-600 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150 shrink-0"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Session Tools section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-300 mb-4">
          Session Tools
        </h2>
        <SmartPrompts
          campaignId={id}
          currentLocationName={currentLocationName}
          partyLevel={campaign.party_level}
          onResult={(type, result) => setGeneratorResult({ type, result })}
        />
        <div className="grid xl:grid-cols-[1fr_320px] gap-6">
          <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-5">
            <InitiativeTracker campaignId={id} characters={characters} />
          </div>
          <DiceRoller className="self-start" />
        </div>
      </section>

      {/* Campaign Data section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-300 mb-4">
          Campaign Data
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <CharacterSection
            campaignId={id}
            characters={characters}
            onUpdate={load}
          />
          <LocationSection
            campaignId={id}
            locations={locations}
            onUpdate={load}
          />
          <NPCSection
            campaignId={id}
            locations={locations}
          />
          <QuestSection
            campaignId={id}
            locations={locations}
            partyLevel={campaign.party_level}
          />
        </div>
      </section>

      {/* Lore Oracle floating trigger */}
      <button
        onClick={() => setIsChatOpen((v) => !v)}
        aria-label="Open Lore Oracle chat"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-gray-900 border border-gray-700/50 border-r-0 rounded-l-xl px-2 py-4 flex flex-col items-center gap-2 hover:bg-gray-800 hover:border-amber-500/30 transition-colors duration-150 group"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-amber-400 w-5 h-5"
        >
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
        </svg>
        <span className="text-xs font-medium text-gray-400 group-hover:text-amber-400 [writing-mode:vertical-lr] rotate-180 tracking-wider transition-colors duration-150">
          Oracle
        </span>
      </button>

      <ChatSidebar
        campaignId={campaign.id}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentLocationName={currentLocationName}
        partyLevel={campaign.party_level}
      />

      {generatorResult && (
        <GeneratorResultModal
          type={generatorResult.type}
          result={generatorResult.result}
          campaignId={id}
          onClose={() => setGeneratorResult(null)}
          onSaved={() => load()}
        />
      )}
    </div>
  );
}
