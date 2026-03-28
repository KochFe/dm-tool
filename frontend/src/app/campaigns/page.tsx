"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Campaign } from "@/types";
import ConfirmButton from "@/components/ConfirmButton";

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
    try {
      await api.createCampaign({ name: name.trim() });
      toast.success("Campaign created");
      setName("");
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(`Failed to create campaign: ${message}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteCampaign(id);
      toast.success("Campaign deleted");
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(`Failed to delete campaign: ${message}`);
    }
  };

  if (loading) {
    return (
      <p className="text-gray-400 text-sm">Loading campaigns...</p>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Campaigns</h1>

      <form onSubmit={handleCreate} className="flex gap-2 mb-8">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New campaign name..."
          className="bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 flex-1 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition"
        />
        <button
          type="submit"
          className="bg-amber-600 hover:bg-amber-500 text-gray-950 font-semibold px-5 py-2 rounded-lg transition-colors duration-150"
        >
          Create
        </button>
      </form>

      {campaigns.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm mb-3">No campaigns yet.</p>
          <p className="text-gray-600 text-sm">
            Create your first campaign above to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="bg-gray-900 border border-gray-700/50 rounded-xl p-4 flex items-center justify-between hover:border-gray-600 transition-colors duration-150"
            >
              <div>
                <Link
                  href={`/campaigns/${c.id}`}
                  className="text-lg font-semibold text-gray-100 hover:text-amber-400 transition-colors duration-150"
                >
                  {c.name}
                </Link>
                <p className="text-sm text-gray-400 mt-0.5">
                  Level {c.party_level} &middot; {c.in_game_time}
                </p>
              </div>
              <ConfirmButton
                onConfirm={() => handleDelete(c.id)}
                label="Delete"
                confirmLabel="Are you sure?"
                className="bg-red-900/40 hover:bg-red-800/60 text-red-400 hover:text-red-300 border border-red-800/50 hover:border-red-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
