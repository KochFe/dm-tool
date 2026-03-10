"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Campaign, PlayerCharacter, Location } from "@/types";
import CharacterSection from "@/components/CharacterSection";
import LocationSection from "@/components/LocationSection";
import DiceRoller from "@/components/DiceRoller";
import InitiativeTracker from "@/components/InitiativeTracker";

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

  return (
    <div>
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
        </div>
      </section>
    </div>
  );
}
