"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { Location } from "@/types";
import ConfirmButton from "@/components/ConfirmButton";

const BIOMES = [
  "Arctic",
  "Coastal",
  "Desert",
  "Dungeon",
  "Forest",
  "Grassland",
  "Mountain",
  "Swamp",
  "Underdark",
  "Urban",
] as const;

const EMPTY_LOC = { name: "", description: "", biome: "urban" };

export default function LocationSection({
  campaignId,
  locations,
  currentLocationId,
  onUpdate,
}: {
  campaignId: string;
  locations: Location[];
  currentLocationId: string | null;
  onUpdate: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_LOC);
  const [editId, setEditId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await api.updateLocation(editId, form);
    } else {
      await api.createLocation(campaignId, form);
    }
    setForm(EMPTY_LOC);
    setShowForm(false);
    setEditId(null);
    onUpdate();
  };

  const startEdit = (loc: Location) => {
    setForm({
      name: loc.name,
      description: loc.description || "",
      biome: loc.biome.toLowerCase(),
    });
    setEditId(loc.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await api.deleteLocation(id);
    onUpdate();
  };

  const handleSetCurrent = async (locationId: string) => {
    await api.updateCampaign(campaignId, { current_location_id: locationId });
    onUpdate();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-100">Locations</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditId(null);
            setForm(EMPTY_LOC);
          }}
          className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 mb-4 space-y-3"
        >
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 w-full focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder-gray-500 transition-colors"
            required
          />
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 w-full focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder-gray-500 transition-colors"
          />
          <div>
            <label className="text-xs text-gray-400 block mb-1">Biome</label>
            <select
              value={form.biome}
              onChange={(e) => setForm({ ...form, biome: e.target.value })}
              className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 w-full focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors"
            >
              {BIOMES.map((b) => (
                <option key={b} value={b.toLowerCase()}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-amber-600 hover:bg-amber-500 text-gray-950 font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {editId ? "Update" : "Create"}
          </button>
        </form>
      )}

      {locations.length === 0 ? (
        <p className="text-gray-400 text-sm">No locations yet.</p>
      ) : (
        <div className="space-y-2">
          {locations.map((loc) => {
            const isCurrent = loc.id === currentLocationId;
            return (
              <div
                key={loc.id}
                className={`bg-gray-800/50 border rounded-xl p-4 flex items-start justify-between gap-3 ${
                  isCurrent
                    ? "border-amber-500/50 ring-1 ring-amber-500/20"
                    : "border-gray-700/50"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-100">
                    {loc.name}
                    {isCurrent && (
                      <span className="ml-2 text-xs text-amber-400 font-normal">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-400 capitalize">
                    {loc.biome}
                    {loc.description && (
                      <span className="text-gray-500"> &mdash; {loc.description}</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!isCurrent && (
                    <button
                      onClick={() => handleSetCurrent(loc.id)}
                      className="text-sm bg-amber-700/30 hover:bg-amber-700/60 text-amber-300 px-3 py-1 rounded-lg transition-colors"
                    >
                      Set Current
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(loc)}
                    className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <ConfirmButton
                    onConfirm={() => handleDelete(loc.id)}
                    label="Delete"
                    confirmLabel="Are you sure?"
                    className="text-sm bg-red-700/50 hover:bg-red-700 text-red-200 px-3 py-1 rounded-lg transition-colors"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
