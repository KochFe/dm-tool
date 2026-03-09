"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { PlayerCharacter } from "@/types";

const EMPTY_CHAR = {
  name: "",
  race: "",
  character_class: "",
  level: 1,
  hp_current: 10,
  hp_max: 10,
  armor_class: 10,
  passive_perception: 10,
};

export default function CharacterSection({
  campaignId,
  characters,
  onUpdate,
}: {
  campaignId: string;
  characters: PlayerCharacter[];
  onUpdate: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_CHAR);
  const [editId, setEditId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await api.updateCharacter(editId, form);
    } else {
      await api.createCharacter(campaignId, form);
    }
    setForm(EMPTY_CHAR);
    setShowForm(false);
    setEditId(null);
    onUpdate();
  };

  const startEdit = (pc: PlayerCharacter) => {
    setForm({
      name: pc.name,
      race: pc.race,
      character_class: pc.character_class,
      level: pc.level,
      hp_current: pc.hp_current,
      hp_max: pc.hp_max,
      armor_class: pc.armor_class,
      passive_perception: pc.passive_perception,
    });
    setEditId(pc.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this character?")) return;
    await api.deleteCharacter(id);
    onUpdate();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Characters</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditId(null);
            setForm(EMPTY_CHAR);
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
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Race"
              value={form.race}
              onChange={(e) => setForm({ ...form, race: e.target.value })}
              className="border rounded px-2 py-1"
              required
            />
            <input
              placeholder="Class"
              value={form.character_class}
              onChange={(e) => setForm({ ...form, character_class: e.target.value })}
              className="border rounded px-2 py-1"
              required
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <label className="text-xs">
              Level
              <input
                type="number"
                min={1}
                max={20}
                value={form.level}
                onChange={(e) => setForm({ ...form, level: +e.target.value })}
                className="border rounded px-2 py-1 w-full"
              />
            </label>
            <label className="text-xs">
              HP
              <input
                type="number"
                value={form.hp_current}
                onChange={(e) => setForm({ ...form, hp_current: +e.target.value })}
                className="border rounded px-2 py-1 w-full"
              />
            </label>
            <label className="text-xs">
              Max HP
              <input
                type="number"
                min={1}
                value={form.hp_max}
                onChange={(e) => setForm({ ...form, hp_max: +e.target.value })}
                className="border rounded px-2 py-1 w-full"
              />
            </label>
            <label className="text-xs">
              AC
              <input
                type="number"
                min={0}
                value={form.armor_class}
                onChange={(e) => setForm({ ...form, armor_class: +e.target.value })}
                className="border rounded px-2 py-1 w-full"
              />
            </label>
          </div>
          <button
            type="submit"
            className="bg-gray-900 text-white px-4 py-1 rounded hover:bg-gray-700"
          >
            {editId ? "Update" : "Create"}
          </button>
        </form>
      )}

      {characters.length === 0 ? (
        <p className="text-gray-500 text-sm">No characters yet.</p>
      ) : (
        <div className="space-y-2">
          {characters.map((pc) => (
            <div key={pc.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {pc.name}{" "}
                  <span className="text-sm text-gray-500">
                    {pc.race} {pc.character_class} (Lv {pc.level})
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  HP {pc.hp_current}/{pc.hp_max} &middot; AC {pc.armor_class}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(pc)}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(pc.id)}
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
