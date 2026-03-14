'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type {
  GeneratedEncounter,
  GeneratedNpc,
  GeneratedLoot,
  GeneratedLootItem,
} from '@/types';

interface GeneratorResultModalProps {
  type: 'encounter' | 'npc' | 'loot';
  result: GeneratedEncounter | GeneratedNpc | GeneratedLoot;
  campaignId: string;
  onClose: () => void;
  onSaved?: () => void;
}

const DIFFICULTY_CLASSES: Record<string, string> = {
  easy: 'bg-green-900/40 text-green-300 border border-green-700/50',
  medium: 'bg-amber-900/40 text-amber-300 border border-amber-700/50',
  hard: 'bg-orange-900/40 text-orange-300 border border-orange-700/50',
  deadly: 'bg-red-900/40 text-red-300 border border-red-700/50',
};

const RARITY_CLASSES: Record<string, string> = {
  common: 'bg-gray-800 text-gray-300 border border-gray-700/50',
  uncommon: 'bg-green-900/40 text-green-300 border border-green-700/50',
  rare: 'bg-blue-900/40 text-blue-300 border border-blue-700/50',
  'very rare': 'bg-purple-900/40 text-purple-300 border border-purple-700/50',
  legendary: 'bg-amber-900/40 text-amber-300 border border-amber-700/50',
};

const ABILITY_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
const ABILITY_STAT_KEYS: Record<string, string> = {
  STR: 'strength',
  DEX: 'dexterity',
  CON: 'constitution',
  INT: 'intelligence',
  WIS: 'wisdom',
  CHA: 'charisma',
};

function rarityClass(rarity: string): string {
  return RARITY_CLASSES[rarity.toLowerCase()] ?? 'bg-gray-800 text-gray-300 border border-gray-700/50';
}

function difficultyClass(difficulty: string): string {
  return DIFFICULTY_CLASSES[difficulty.toLowerCase()] ?? 'bg-gray-800 text-gray-300 border border-gray-700/50';
}

function EncounterView({ encounter }: { encounter: GeneratedEncounter }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${difficultyClass(encounter.difficulty)}`}
        >
          {encounter.difficulty}
        </span>
      </div>

      <p className="text-gray-300 text-sm leading-relaxed">{encounter.description}</p>

      {encounter.monsters.length > 0 && (
        <div>
          <h3 className="text-gray-100 text-sm font-semibold mb-2">Monsters</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50 text-gray-400 text-left">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">CR</th>
                  <th className="pb-2 pr-4 font-medium">HP</th>
                  <th className="pb-2 pr-4 font-medium">AC</th>
                  <th className="pb-2 font-medium">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {encounter.monsters.map((m, i) => (
                  <tr key={i} className="text-gray-300">
                    <td className="py-2 pr-4">{m.name}</td>
                    <td className="py-2 pr-4">{m.cr}</td>
                    <td className="py-2 pr-4">{m.hp}</td>
                    <td className="py-2 pr-4">{m.ac}</td>
                    <td className="py-2">{m.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {encounter.tactical_notes && (
        <div>
          <h3 className="text-gray-100 text-sm font-semibold mb-1">Tactical Notes</h3>
          <p className="text-gray-400 text-sm leading-relaxed">{encounter.tactical_notes}</p>
        </div>
      )}
    </div>
  );
}

function NpcView({ npc }: { npc: GeneratedNpc }) {
  const hasStats = npc.stats && Object.keys(npc.stats).length > 0;

  const statValue = (abbr: string): number | null => {
    if (!npc.stats) return null;
    const key = ABILITY_STAT_KEYS[abbr];
    return npc.stats[key] ?? npc.stats[abbr.toLowerCase()] ?? null;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-gray-100 text-lg font-bold">{npc.name}</h3>
        <p className="text-gray-400 text-sm">
          {npc.race}
          {npc.npc_class ? ` · ${npc.npc_class}` : ''}
        </p>
      </div>

      <p className="text-gray-300 text-sm leading-relaxed">{npc.description}</p>

      <div className="space-y-3">
        {npc.personality && (
          <div>
            <span className="text-amber-400 text-xs font-semibold uppercase tracking-wide">
              Personality
            </span>
            <p className="text-gray-300 text-sm mt-1 leading-relaxed">{npc.personality}</p>
          </div>
        )}
        {npc.motivation && (
          <div>
            <span className="text-amber-400 text-xs font-semibold uppercase tracking-wide">
              Motivation
            </span>
            <p className="text-gray-300 text-sm mt-1 leading-relaxed">{npc.motivation}</p>
          </div>
        )}
        {npc.secrets && (
          <div>
            <span className="text-amber-400 text-xs font-semibold uppercase tracking-wide">
              Secrets
            </span>
            <p className="text-gray-300 text-sm mt-1 leading-relaxed">{npc.secrets}</p>
          </div>
        )}
      </div>

      {hasStats && (
        <div>
          <span className="text-amber-400 text-xs font-semibold uppercase tracking-wide">
            Ability Scores
          </span>
          <div className="grid grid-cols-6 gap-2 mt-2">
            {ABILITY_KEYS.map((abbr) => {
              const val = statValue(abbr);
              return (
                <div
                  key={abbr}
                  className="flex flex-col items-center bg-gray-800 border border-gray-700/50 rounded px-1 py-2"
                >
                  <span className="text-gray-400 text-xs font-medium">{abbr}</span>
                  <span className="text-gray-100 text-sm font-bold mt-0.5">
                    {val !== null ? val : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LootView({ loot }: { loot: GeneratedLoot }) {
  return (
    <div className="space-y-4">
      {loot.context && (
        <p className="text-gray-400 text-sm leading-relaxed italic">{loot.context}</p>
      )}

      {loot.items.length > 0 && (
        <div>
          <h3 className="text-gray-100 text-sm font-semibold mb-2">Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50 text-gray-400 text-left">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Rarity</th>
                  <th className="pb-2 pr-4 font-medium">Value</th>
                  <th className="pb-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loot.items.map((item: GeneratedLootItem, i: number) => (
                  <tr key={i} className="text-gray-300">
                    <td className="py-2 pr-4 font-medium">{item.name}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs capitalize ${rarityClass(item.rarity)}`}
                      >
                        {item.rarity}
                      </span>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">{item.value}</td>
                    <td className="py-2 text-gray-400 text-xs leading-relaxed">{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loot.total_value && (
        <div className="flex items-center justify-end pt-2 border-t border-gray-700/50">
          <span className="text-gray-400 text-sm mr-2">Total Value:</span>
          <span className="text-amber-400 font-semibold text-sm">{loot.total_value}</span>
        </div>
      )}
    </div>
  );
}

const TITLES: Record<string, string> = {
  encounter: 'Generated Encounter',
  npc: 'Generated NPC',
  loot: 'Generated Loot',
};

export default function GeneratorResultModal({
  type,
  result,
  campaignId,
  onClose,
  onSaved,
}: GeneratorResultModalProps) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSave() {
    if (type !== 'npc') return;
    const npc = result as GeneratedNpc;
    setSaving(true);
    setSaveError(null);
    try {
      await api.createNpc(campaignId, {
        name: npc.name,
        race: npc.race,
        npc_class: npc.npc_class ?? undefined,
        description: npc.description,
        personality: npc.personality,
        secrets: npc.secrets,
        motivation: npc.motivation,
        stats: npc.stats ?? undefined,
        is_alive: true,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save NPC');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-gray-900 border border-gray-700/50 rounded-lg shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 flex-shrink-0">
          <h2 className="text-amber-400 text-lg font-semibold">{TITLES[type]}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {type === 'encounter' && (
            <EncounterView encounter={result as GeneratedEncounter} />
          )}
          {type === 'npc' && <NpcView npc={result as GeneratedNpc} />}
          {type === 'loot' && <LootView loot={result as GeneratedLoot} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700/50 flex-shrink-0">
          <div className="flex-1">
            {saveError && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
                {saveError}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 ml-4">
            {type === 'npc' && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-500 text-gray-950 font-semibold px-4 py-1.5 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save to Campaign'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded border border-gray-700/50 text-gray-300 hover:bg-gray-800 text-sm transition-colors"
            >
              {type === 'npc' ? 'Discard' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
