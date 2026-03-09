"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Campaign } from "@/types";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(data);
    } catch (e) {
      console.error("Failed to load campaigns", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.createCampaign({ name: name.trim() });
    setName("");
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign and all its data?")) return;
    await api.deleteCampaign(id);
    load();
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Campaigns</h1>

      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New campaign name..."
          className="border rounded px-3 py-2 flex-1"
        />
        <button
          type="submit"
          className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Create
        </button>
      </form>

      {campaigns.length === 0 ? (
        <p className="text-gray-500">No campaigns yet. Create one above.</p>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="border rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <Link
                  href={`/campaigns/${c.id}`}
                  className="text-lg font-semibold hover:underline"
                >
                  {c.name}
                </Link>
                <p className="text-sm text-gray-500">
                  Level {c.party_level} &middot; {c.in_game_time}
                </p>
              </div>
              <button
                onClick={() => handleDelete(c.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
