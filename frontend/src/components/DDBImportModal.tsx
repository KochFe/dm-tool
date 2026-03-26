"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { DDBImportPreview } from "@/types";

const INPUT_CLS =
  "bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 w-full focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder-gray-500 transition-colors";

function abilityMod(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export default function DDBImportModal({
  campaignId,
  onImported,
  onClose,
}: {
  campaignId: string;
  onImported: () => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DDBImportPreview | null>(null);
  const [importing, setImporting] = useState(false);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api.importFromDDB(campaignId, url);
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setImporting(true);
    setError(null);
    try {
      await api.createCharacter(campaignId, preview.preview as unknown as Record<string, unknown>);
      onImported();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create character");
      setImporting(false);
    }
  };

  const p = preview?.preview;
  const ABILITY_KEYS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
  const ABILITY_LABELS: Record<string, string> = { strength: "STR", dexterity: "DEX", constitution: "CON", intelligence: "INT", wisdom: "WIS", charisma: "CHA" };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">Import from D&D Beyond</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors text-xl">&times;</button>
        </div>

        {!preview ? (
          <form onSubmit={handlePreview} className="space-y-3">
            <p className="text-sm text-gray-400">
              Paste your D&D Beyond character URL. The character must be set to <span className="text-amber-400">Public</span> in D&D Beyond privacy settings.
            </p>
            <input
              placeholder="https://www.dndbeyond.com/characters/12345"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={INPUT_CLS}
              required
            />
            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-gray-950 font-medium px-4 py-2 rounded-lg transition-colors w-full"
            >
              {loading ? "Fetching..." : "Preview Import"}
            </button>
          </form>
        ) : p ? (
          <div className="space-y-4">
            {/* Character header */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <p className="font-semibold text-gray-100 text-lg">{p.name}</p>
              <p className="text-sm text-gray-400">{p.race} {p.character_class} (Lv {p.level})</p>
              <div className="mt-2 flex gap-4 text-sm text-gray-300">
                <span>HP {p.hp_current}/{p.hp_max}</span>
                <span>AC {p.armor_class}</span>
                <span>Speed {p.speed}ft</span>
                <span>Prof +{p.proficiency_bonus}</span>
              </div>
            </div>

            {/* Ability scores */}
            <div className="grid grid-cols-6 gap-1.5">
              {ABILITY_KEYS.map((key) => (
                <div key={key} className="bg-gray-800/60 border border-gray-700 rounded-lg py-1.5 text-center">
                  <p className="text-xs text-gray-500 uppercase">{ABILITY_LABELS[key]}</p>
                  <p className="text-sm font-semibold text-gray-100">{p[key]}</p>
                  <p className="text-xs text-amber-400">{abilityMod(p[key])}</p>
                </div>
              ))}
            </div>

            {/* Proficiencies summary */}
            {p.saving_throw_proficiencies.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Saving Throws</p>
                <div className="flex flex-wrap gap-1">
                  {p.saving_throw_proficiencies.map((s) => (
                    <span key={s} className="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {p.skill_proficiencies.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {p.skill_proficiencies.map((s) => (
                    <span key={s} className="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-amber-400">Warnings</p>
                {preview.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-300/80">{w}</p>
                ))}
              </div>
            )}

            {/* Unmapped data */}
            {Object.keys(preview.unmapped_data).length > 0 && (
              <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-gray-500">Not yet imported (future support)</p>
                {Object.entries(preview.unmapped_data).map(([key, val]) => (
                  <p key={key} className="text-xs text-gray-500">
                    <span className="text-gray-400 capitalize">{key}:</span>{" "}
                    {Array.isArray(val) ? val.join(", ") : String(val)}
                  </p>
                ))}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={importing}
                className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-gray-950 font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {importing ? "Importing..." : "Confirm Import"}
              </button>
              <button
                onClick={() => { setPreview(null); setError(null); }}
                className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
