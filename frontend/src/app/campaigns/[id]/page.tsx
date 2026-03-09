"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Campaign, PlayerCharacter, Location } from "@/types";
import CharacterSection from "@/components/CharacterSection";
import LocationSection from "@/components/LocationSection";

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

  if (!campaign) return <p>Loading...</p>;

  return (
    <div>
      <Link href="/campaigns" className="text-sm text-gray-500 hover:underline">
        &larr; Back to Campaigns
      </Link>

      <div className="mt-4 mb-8">
        {editing ? (
          <form onSubmit={handleUpdate} className="space-y-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border rounded px-3 py-2 w-full text-xl font-bold"
            />
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                Level:
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.party_level}
                  onChange={(e) =>
                    setForm({ ...form, party_level: parseInt(e.target.value) || 1 })
                  }
                  className="border rounded px-2 py-1 w-16"
                />
              </label>
              <label className="flex items-center gap-2">
                Time:
                <input
                  value={form.in_game_time}
                  onChange={(e) =>
                    setForm({ ...form, in_game_time: e.target.value })
                  }
                  className="border rounded px-2 py-1"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-gray-900 text-white px-4 py-1 rounded hover:bg-gray-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-1 rounded border hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-gray-500 hover:underline"
              >
                Edit
              </button>
            </div>
            <p className="text-gray-500">
              Level {campaign.party_level} &middot; {campaign.in_game_time}
            </p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
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
    </div>
  );
}
