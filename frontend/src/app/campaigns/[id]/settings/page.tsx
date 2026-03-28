"use client";

import { useState } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function SettingsPage() {
  const { campaign, reload } = useCampaign();
  const [form, setForm] = useState({
    name: campaign.name,
    description: campaign.description ?? "",
    party_level: campaign.party_level,
    in_game_time: campaign.in_game_time,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateCampaign(campaign.id, {
        name: form.name,
        description: form.description.trim() || null,
        party_level: form.party_level,
        in_game_time: form.in_game_time,
      });
      await reload();
      toast.success("Campaign updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update campaign");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 w-full focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-colors";

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-100 mb-6">Campaign Settings</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Campaign Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={`${inputCls} resize-none`}
            rows={4}
            placeholder="Campaign description (optional)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Party Level</label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.party_level}
              onChange={(e) => setForm({ ...form, party_level: parseInt(e.target.value) || 1 })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">In-Game Time</label>
            <input
              value={form.in_game_time}
              onChange={(e) => setForm({ ...form, in_game_time: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-gray-950 font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
