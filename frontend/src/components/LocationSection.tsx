"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { Location } from "@/types";

const EMPTY_LOC = { name: "", description: "", biome: "urban" };

export default function LocationSection({
  campaignId,
  locations,
  onUpdate,
}: {
  campaignId: string;
  locations: Location[];
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
      biome: loc.biome,
    });
    setEditId(loc.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this location?")) return;
    await api.deleteLocation(id);
    onUpdate();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Locations</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditId(null);
            setForm(EMPTY_LOC);
          }}
          className="text-sm bg-gray-900 text-white px-3 py-1 rounded hover:bg-gray-700"
        >
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border rounded p-4 mb-4 space-y-2">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded px-2 py-1 w-full"
            required
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border rounded px-2 py-1 w-full"
          />
          <input
            placeholder="Biome (e.g. forest, urban, mountain)"
            value={form.biome}
            onChange={(e) => setForm({ ...form, biome: e.target.value })}
            className="border rounded px-2 py-1 w-full"
          />
          <button
            type="submit"
            className="bg-gray-900 text-white px-4 py-1 rounded hover:bg-gray-700"
          >
            {editId ? "Update" : "Create"}
          </button>
        </form>
      )}

      {locations.length === 0 ? (
        <p className="text-gray-500 text-sm">No locations yet.</p>
      ) : (
        <div className="space-y-2">
          {locations.map((loc) => (
            <div key={loc.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{loc.name}</p>
                <p className="text-sm text-gray-500">
                  {loc.biome}
                  {loc.description && ` — ${loc.description}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(loc)}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(loc.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
