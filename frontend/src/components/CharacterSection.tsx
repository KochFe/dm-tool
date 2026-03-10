"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { hpColor, hpBarColor } from "@/lib/utils";
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    await api.deleteCharacter(id);
    onUpdate();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-100">Characters</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditId(null);
            setForm(EMPTY_CHAR);
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
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Race"
              value={form.race}
              onChange={(e) => setForm({ ...form, race: e.target.value })}
              className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder-gray-500 transition-colors"
              required
            />
            <input
              placeholder="Class"
              value={form.character_class}
              onChange={(e) => setForm({ ...form, character_class: e.target.value })}
              className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder-gray-500 transition-colors"
              required
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <label className="text-xs text-gray-400">
              Level
              <input
                type="number"
                min={1}
                max={20}
                value={form.level}
                onChange={(e) => setForm({ ...form, level: +e.target.value })}
                className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-2 py-1.5 w-full mt-1 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors"
              />
            </label>
            <label className="text-xs text-gray-400">
              HP
              <input
                type="number"
                value={form.hp_current}
                onChange={(e) => setForm({ ...form, hp_current: +e.target.value })}
                className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-2 py-1.5 w-full mt-1 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors"
              />
            </label>
            <label className="text-xs text-gray-400">
              Max HP
              <input
                type="number"
                min={1}
                value={form.hp_max}
                onChange={(e) => setForm({ ...form, hp_max: +e.target.value })}
                className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-2 py-1.5 w-full mt-1 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors"
              />
            </label>
            <label className="text-xs text-gray-400">
              AC
              <input
                type="number"
                min={0}
                value={form.armor_class}
                onChange={(e) => setForm({ ...form, armor_class: +e.target.value })}
                className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-2 py-1.5 w-full mt-1 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors"
              />
            </label>
          </div>
          <button
            type="submit"
            className="bg-amber-600 hover:bg-amber-500 text-gray-950 font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {editId ? "Update" : "Create"}
          </button>
        </form>
      )}

      {characters.length === 0 ? (
        <p className="text-gray-400 text-sm">No characters yet.</p>
      ) : (
        <div className="space-y-2">
          {characters.map((pc) => (
            <div
              key={pc.id}
              className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-100">
                    {pc.name}{" "}
                    <span className="text-sm text-gray-400">
                      {pc.race} {pc.character_class} (Lv {pc.level})
                    </span>
                  </p>
                  <div className="mt-1">
                    <p className="text-sm text-gray-400">
                      <span className={`font-semibold ${hpColor(pc.hp_current, pc.hp_max)}`}>
                        HP {pc.hp_current}/{pc.hp_max}
                      </span>
                      {" "}
                      <span className="text-gray-500">&middot;</span>
                      {" "}
                      AC {pc.armor_class}
                    </p>
                    {/* HP bar */}
                    <div className="mt-1.5 h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${hpBarColor(pc.hp_current, pc.hp_max)}`}
                        style={{
                          width: `${Math.min(100, Math.max(0, (pc.hp_current / pc.hp_max) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(pc)}
                    className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(pc.id, pc.name)}
                    aria-label={`Delete ${pc.name}`}
                    className="text-sm bg-red-700/50 hover:bg-red-700 text-red-200 px-3 py-1 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
