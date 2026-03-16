'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type {
  GeneratedEncounter,
  GeneratedNpc,
  GeneratedLoot,
  GeneratedLootItem,
  PlayerCharacter,
} from '@/types';

interface GeneratorResultModalProps {
  type: 'encounter' | 'npc' | 'loot';
  result: GeneratedEncounter | GeneratedNpc | GeneratedLoot;
  campaignId: string;
  characters: PlayerCharacter[];
  onClose: () => void;
  onSaved?: () => void;
}

interface StagedCombatant {
  name: string;
  initiative: number | '';
  hp_current: number | '';
  hp_max: number | '';
  armor_class: number | '';
  type: 'pc' | 'monster';
  player_character_id: string | null;
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

const COMPACT_INPUT_CLASS =
  'bg-gray-800 border border-gray-700 text-gray-100 rounded px-2 py-1 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors';

function buildInitialCombatants(encounter: GeneratedEncounter): StagedCombatant[] {
  const rows: StagedCombatant[] = [];
  for (const monster of encounter.monsters) {
    const useNumberSuffix = monster.count > 1;
    for (let i = 1; i <= monster.count; i++) {
      rows.push({
        name: useNumberSuffix ? `${monster.name} ${i}` : monster.name,
        initiative: '',
        hp_current: monster.hp,
        hp_max: monster.hp,
        armor_class: monster.ac,
        type: 'monster',
        player_character_id: null,
      });
    }
  }
  return rows;
}

interface EncounterCombatViewProps {
  encounter: GeneratedEncounter;
  characters: PlayerCharacter[];
  combatants: StagedCombatant[];
  onChange: (combatants: StagedCombatant[]) => void;
}

function EncounterCombatView({ encounter, characters, combatants, onChange }: EncounterCombatViewProps) {
  const addedPcIds = new Set(
    combatants
      .filter((c) => c.player_character_id !== null)
      .map((c) => c.player_character_id as string),
  );
  const availablePcs = characters.filter((pc) => !addedPcIds.has(pc.id));

  function updateRow(index: number, field: keyof StagedCombatant, value: StagedCombatant[keyof StagedCombatant]) {
    const next = combatants.map((c, i) => (i === index ? { ...c, [field]: value } : c));
    onChange(next);
  }

  function removeRow(index: number) {
    onChange(combatants.filter((_, i) => i !== index));
  }

  function addPc(pc: PlayerCharacter) {
    onChange([
      ...combatants,
      {
        name: pc.name,
        initiative: '',
        hp_current: pc.hp_current,
        hp_max: pc.hp_max,
        armor_class: pc.armor_class,
        type: 'pc',
        player_character_id: pc.id,
      },
    ]);
  }

  function addBlankRow() {
    onChange([
      ...combatants,
      {
        name: '',
        initiative: '',
        hp_current: '',
        hp_max: '',
        armor_class: '',
        type: 'monster',
        player_character_id: null,
      },
    ]);
  }

  function parseNumericInput(raw: string): number | '' {
    if (raw === '') return '';
    const n = parseInt(raw, 10);
    return isNaN(n) ? '' : n;
  }

  return (
    <div className="space-y-4">
      {/* Encounter info — read-only */}
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

      {/* Prepare Combat section */}
      <div className="border-t border-gray-700/50 pt-4 mt-4">
        <h3 className="text-amber-400 text-xs font-semibold uppercase tracking-wide mb-3">
          Prepare Combat
        </h3>

        {combatants.length > 0 && (
          <div className="mb-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50 text-gray-400 text-left">
                  <th className="pb-2 pr-2 font-medium">Name</th>
                  <th className="pb-2 pr-2 font-medium w-16">Init</th>
                  <th className="pb-2 pr-2 font-medium w-16">HP</th>
                  <th className="pb-2 pr-2 font-medium w-16">Max HP</th>
                  <th className="pb-2 pr-2 font-medium w-16">AC</th>
                  <th className="pb-2 w-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {combatants.map((c, i) => (
                  <tr key={i} className="align-middle">
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => updateRow(i, 'name', e.target.value)}
                        placeholder="Name"
                        className={`${COMPACT_INPUT_CLASS} w-full min-w-[100px]`}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        value={c.initiative}
                        onChange={(e) => updateRow(i, 'initiative', parseNumericInput(e.target.value))}
                        placeholder="—"
                        className={`${COMPACT_INPUT_CLASS} w-16 text-center`}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        min={0}
                        value={c.hp_current}
                        onChange={(e) => updateRow(i, 'hp_current', parseNumericInput(e.target.value))}
                        placeholder="—"
                        className={`${COMPACT_INPUT_CLASS} w-16 text-center`}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        min={0}
                        value={c.hp_max}
                        onChange={(e) => updateRow(i, 'hp_max', parseNumericInput(e.target.value))}
                        placeholder="—"
                        className={`${COMPACT_INPUT_CLASS} w-16 text-center`}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        min={0}
                        value={c.armor_class}
                        onChange={(e) => updateRow(i, 'armor_class', parseNumericInput(e.target.value))}
                        placeholder="—"
                        className={`${COMPACT_INPUT_CLASS} w-16 text-center`}
                      />
                    </td>
                    <td className="py-1.5">
                      <button
                        onClick={() => removeRow(i)}
                        aria-label={`Remove ${c.name || 'combatant'}`}
                        className="text-gray-500 hover:text-red-400 transition-colors text-base leading-none px-1"
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add PCs quick-add */}
        <div className="mb-3">
          <p className="text-gray-500 text-xs mb-1.5 uppercase tracking-wide font-medium">Add PCs</p>
          {availablePcs.length === 0 ? (
            <p className="text-gray-500 text-xs italic">
              {characters.length === 0 ? 'No characters in this campaign.' : 'All PCs added.'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availablePcs.map((pc) => (
                <button
                  key={pc.id}
                  onClick={() => addPc(pc)}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded text-xs cursor-pointer transition-colors"
                >
                  {pc.name}
                  <span className="text-gray-400 ml-1">({pc.character_class})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Manual add */}
        <button
          onClick={addBlankRow}
          className="text-xs text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1"
        >
          <span className="text-base leading-none">+</span> Add Combatant
        </button>
      </div>
    </div>
  );
}

const INPUT_CLASS =
  'bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 w-full focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder-gray-500 transition-colors';
const TEXTAREA_CLASS = `${INPUT_CLASS} resize-none`;
const LABEL_CLASS = 'block text-amber-400 text-xs font-semibold uppercase tracking-wide mb-1';

interface NpcEditViewProps {
  npc: GeneratedNpc;
  onChange: (updated: GeneratedNpc) => void;
}

function NpcEditView({ npc, onChange }: NpcEditViewProps) {
  function set<K extends keyof GeneratedNpc>(field: K, value: GeneratedNpc[K]) {
    onChange({ ...npc, [field]: value });
  }

  function setStatValue(abbr: string, raw: string) {
    const parsed = parseInt(raw, 10);
    const value = isNaN(parsed) ? 10 : Math.max(1, Math.min(30, parsed));
    const key = ABILITY_STAT_KEYS[abbr];
    onChange({
      ...npc,
      stats: {
        ...(npc.stats ?? {}),
        [key]: value,
      },
    });
  }

  function getStatValue(abbr: string): number {
    if (!npc.stats) return 10;
    const key = ABILITY_STAT_KEYS[abbr];
    return npc.stats[key] ?? npc.stats[abbr.toLowerCase()] ?? 10;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS}>Name</label>
          <input
            type="text"
            value={npc.name}
            onChange={(e) => set('name', e.target.value)}
            className={INPUT_CLASS}
            placeholder="NPC name"
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Race</label>
          <input
            type="text"
            value={npc.race}
            onChange={(e) => set('race', e.target.value)}
            className={INPUT_CLASS}
            placeholder="e.g. Human, Elf"
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>Class / Occupation</label>
        <input
          type="text"
          value={npc.npc_class ?? ''}
          onChange={(e) => set('npc_class', e.target.value || null)}
          className={INPUT_CLASS}
          placeholder="e.g. Merchant, Wizard (optional)"
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Description</label>
        <textarea
          value={npc.description}
          onChange={(e) => set('description', e.target.value)}
          className={TEXTAREA_CLASS}
          rows={3}
          placeholder="Physical appearance and brief background"
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Personality</label>
        <textarea
          value={npc.personality}
          onChange={(e) => set('personality', e.target.value)}
          className={TEXTAREA_CLASS}
          rows={2}
          placeholder="Personality traits and demeanor"
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Motivation</label>
        <textarea
          value={npc.motivation}
          onChange={(e) => set('motivation', e.target.value)}
          className={TEXTAREA_CLASS}
          rows={2}
          placeholder="What drives this NPC"
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Secrets</label>
        <textarea
          value={npc.secrets}
          onChange={(e) => set('secrets', e.target.value)}
          className={TEXTAREA_CLASS}
          rows={2}
          placeholder="Hidden knowledge or dark past"
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Ability Scores</label>
        <div className="grid grid-cols-6 gap-2 mt-1">
          {ABILITY_KEYS.map((abbr) => (
            <div key={abbr} className="flex flex-col items-center gap-1">
              <span className="text-gray-400 text-xs font-medium">{abbr}</span>
              <input
                type="number"
                min={1}
                max={30}
                value={getStatValue(abbr)}
                onChange={(e) => setStatValue(abbr, e.target.value)}
                className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-1 py-1.5 w-full text-center text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>
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
  characters,
  onClose,
  onSaved,
}: GeneratorResultModalProps) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editedNpc, setEditedNpc] = useState<GeneratedNpc | null>(
    type === 'npc' ? (result as GeneratedNpc) : null,
  );
  const [stagedCombatants, setStagedCombatants] = useState<StagedCombatant[]>(
    type === 'encounter' ? buildInitialCombatants(result as GeneratedEncounter) : [],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSave() {
    if (type !== 'npc' || !editedNpc) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.createNpc(campaignId, {
        name: editedNpc.name,
        race: editedNpc.race,
        npc_class: editedNpc.npc_class ?? undefined,
        description: editedNpc.description,
        personality: editedNpc.personality,
        secrets: editedNpc.secrets,
        motivation: editedNpc.motivation,
        stats: editedNpc.stats ?? undefined,
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

  async function handleBeginCombat() {
    if (type !== 'encounter') return;
    setSaving(true);
    setSaveError(null);
    try {
      const encounter = result as GeneratedEncounter;
      const sessionName = encounter.description.length > 60
        ? encounter.description.slice(0, 57) + '...'
        : encounter.description;
      const combatants = stagedCombatants.map((c) => ({
        name: c.name,
        initiative: c.initiative === '' ? 0 : c.initiative,
        hp_current: c.hp_current === '' ? 1 : c.hp_current,
        hp_max: c.hp_max === '' ? 1 : c.hp_max,
        armor_class: c.armor_class === '' ? 0 : c.armor_class,
        type: c.type,
        player_character_id: c.player_character_id ?? null,
      }));
      await api.createCombatSession(campaignId, {
        name: sessionName,
        combatants,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to start combat session');
    } finally {
      setSaving(false);
    }
  }

  const canBeginCombat =
    stagedCombatants.length > 0 &&
    stagedCombatants.every((c) => c.initiative !== '' && c.name.trim() !== '');

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
            <EncounterCombatView
              encounter={result as GeneratedEncounter}
              characters={characters}
              combatants={stagedCombatants}
              onChange={setStagedCombatants}
            />
          )}
          {type === 'npc' && editedNpc && (
            <NpcEditView npc={editedNpc} onChange={setEditedNpc} />
          )}
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
            {type === 'encounter' && (
              <button
                onClick={handleBeginCombat}
                disabled={saving || !canBeginCombat}
                title={
                  !canBeginCombat
                    ? 'All combatants must have a name and initiative value'
                    : undefined
                }
                className="bg-amber-600 hover:bg-amber-500 text-gray-950 font-semibold px-4 py-1.5 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Starting...' : 'Begin Combat'}
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
