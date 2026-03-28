'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { hpColor } from '@/lib/utils';
import { CardListSkeleton } from '@/components/skeletons/CardSkeleton';
import type {
  CombatSession,
  Combatant,
  PlayerCharacter,
  AddCombatantRequest,
} from '@/types';
import ConfirmButton from '@/components/ConfirmButton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const CONDITIONS = [
  { name: 'Blinded', color: 'bg-gray-600 text-gray-200' },
  { name: 'Charmed', color: 'bg-pink-800 text-pink-200' },
  { name: 'Deafened', color: 'bg-gray-600 text-gray-200' },
  { name: 'Frightened', color: 'bg-purple-800 text-purple-200' },
  { name: 'Grappled', color: 'bg-yellow-800 text-yellow-200' },
  { name: 'Incapacitated', color: 'bg-gray-700 text-gray-300' },
  { name: 'Invisible', color: 'bg-blue-800 text-blue-200' },
  { name: 'Paralyzed', color: 'bg-red-900 text-red-200' },
  { name: 'Petrified', color: 'bg-stone-700 text-stone-200' },
  { name: 'Poisoned', color: 'bg-green-800 text-green-200' },
  { name: 'Prone', color: 'bg-amber-800 text-amber-200' },
  { name: 'Restrained', color: 'bg-orange-800 text-orange-200' },
  { name: 'Stunned', color: 'bg-yellow-700 text-yellow-100' },
  { name: 'Unconscious', color: 'bg-red-900 text-red-100' },
] as const;

interface InitiativeTrackerProps {
  campaignId: string;
  characters: PlayerCharacter[];
  refreshKey?: number;
  onCombatEnd?: () => void;
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

const EMPTY_STAGED: StagedCombatant = {
  name: '',
  initiative: '',
  hp_current: '',
  hp_max: '',
  armor_class: '',
  type: 'monster',
  player_character_id: null,
};

// ---- Inline HP editor ----

interface HpEditorProps {
  combatant: Combatant;
  index: number;
  sessionId: string;
  onUpdate: (updated: CombatSession) => void;
  onError: (msg: string) => void;
}

function HpEditor({ combatant, index, sessionId, onUpdate, onError }: HpEditorProps) {
  const [delta, setDelta] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<'damage' | 'heal' | null>(null);

  const apply = async (sign: 1 | -1) => {
    const amount = typeof delta === 'number' ? delta : 0;
    if (amount <= 0) return;
    const next = Math.max(0, combatant.hp_current + sign * amount);
    setBusy(true);
    try {
      const updated = await api.updateCombatant(sessionId, index, { hp_current: next });
      onUpdate(updated);
      setFlash(sign === -1 ? 'damage' : 'heal');
      setTimeout(() => setFlash(null), 600);
      setDelta('');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update HP');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`font-mono font-semibold transition-colors duration-300 ${
          flash === 'damage' ? 'text-red-400' :
          flash === 'heal' ? 'text-green-400' :
          hpColor(combatant.hp_current, combatant.hp_max)
        }`}
      >
        {combatant.hp_current}
        <span className="text-gray-500 font-normal">/{combatant.hp_max}</span>
      </span>
      <input
        type="number"
        min={0}
        value={delta}
        onChange={(e) => setDelta(e.target.value === '' ? '' : Math.abs(+e.target.value))}
        placeholder="amt"
        className="bg-gray-800 border border-gray-600 text-gray-100 rounded px-1.5 py-0.5 w-16 text-xs text-center focus:border-amber-500 focus:outline-none transition-colors"
        disabled={busy}
      />
      <button
        onClick={() => apply(-1)}
        disabled={busy || delta === '' || delta === 0}
        className="text-xs bg-red-700 text-white px-2 py-0.5 rounded hover:bg-red-600 disabled:opacity-40 transition-colors"
        title="Damage"
      >
        -
      </button>
      <button
        onClick={() => apply(1)}
        disabled={busy || delta === '' || delta === 0}
        className="text-xs bg-green-700 text-white px-2 py-0.5 rounded hover:bg-green-600 disabled:opacity-40 transition-colors"
        title="Heal"
      >
        +
      </button>
    </div>
  );
}

// ---- Combatant row ----

interface CombatantRowProps {
  combatant: Combatant;
  index: number;
  isCurrent: boolean;
  sessionId: string;
  onUpdate: (updated: CombatSession) => void;
  onError: (msg: string) => void;
}

function CombatantRow({ combatant, index, isCurrent, sessionId, onUpdate, onError }: CombatantRowProps) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const updated = await api.removeCombatant(sessionId, index);
      onUpdate(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to remove combatant');
      setRemoving(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
        isCurrent
          ? 'bg-blue-900/30 border-l-4 border-l-blue-500 border-r border-r-blue-500/30 border-t border-t-blue-500/30 border-b border-b-blue-500/30'
          : 'border-gray-700/50 hover:bg-gray-800/40'
      }`}
    >
      {/* Turn arrow */}
      <div className="w-4 shrink-0 text-blue-400 font-bold text-sm">
        {isCurrent ? '▶' : ''}
      </div>

      {/* Initiative */}
      <div className="w-8 text-center shrink-0">
        <span className="text-xs text-gray-400">Init</span>
        <div className="font-mono font-semibold text-sm text-gray-100">{combatant.initiative}</div>
      </div>

      {/* Name + type badge + conditions */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium truncate ${isCurrent ? 'text-blue-200' : 'text-gray-100'}`}>
            {combatant.name}
          </span>
          {combatant.type === 'pc' ? (
            <span className="shrink-0 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">PC</span>
          ) : (
            <span className="shrink-0 text-xs bg-red-700 text-white px-1.5 py-0.5 rounded">Monster</span>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <button className="shrink-0 text-xs text-gray-500 hover:text-amber-400 transition-colors" title="Toggle conditions">
                +Cond
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 bg-gray-900 border-gray-700" align="start">
              <div className="space-y-0.5">
                {CONDITIONS.map((c) => {
                  const active = (combatant.conditions ?? []).includes(c.name);
                  return (
                    <button
                      key={c.name}
                      onClick={async () => {
                        const current = combatant.conditions ?? [];
                        const next = active
                          ? current.filter((x) => x !== c.name)
                          : [...current, c.name];
                        try {
                          const updated = await api.updateCombatant(sessionId, index, { conditions: next });
                          onUpdate(updated);
                        } catch (err) {
                          onError(err instanceof Error ? err.message : 'Failed to update conditions');
                        }
                      }}
                      className={`w-full text-left text-xs px-2 py-1 rounded transition-colors ${
                        active ? `${c.color} font-medium` : 'text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      {active ? '✓ ' : ''}{c.name}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {/* Active condition badges */}
        {(combatant.conditions ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(combatant.conditions ?? []).map((cond) => {
              const info = CONDITIONS.find((c) => c.name === cond);
              return (
                <span
                  key={cond}
                  className={`text-xs px-1.5 py-0.5 rounded-full ${info?.color ?? 'bg-gray-700 text-gray-300'}`}
                >
                  {cond}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* HP editor */}
      <div className="shrink-0">
        <HpEditor
          combatant={combatant}
          index={index}
          sessionId={sessionId}
          onUpdate={onUpdate}
          onError={onError}
        />
      </div>

      {/* AC */}
      <div className="w-12 text-center shrink-0">
        <span className="text-xs text-gray-400">AC</span>
        <div className="font-mono text-sm text-gray-100">{combatant.armor_class}</div>
      </div>

      {/* Remove */}
      <ConfirmButton
        onConfirm={handleRemove}
        label="✕"
        confirmLabel="Remove?"
        disabled={removing}
        className="shrink-0 text-gray-500 hover:text-red-400 disabled:opacity-40 text-sm leading-none px-1 transition-colors"
      />
    </div>
  );
}

// ---- Add-combatant form (used for staging and mid-combat additions) ----

interface AddCombatantFormProps {
  characters: PlayerCharacter[];
  onAdd: (c: StagedCombatant) => void;
  addedPcIds: Set<string>;
}

function AddCombatantForm({ characters, onAdd, addedPcIds }: AddCombatantFormProps) {
  const [form, setForm] = useState<StagedCombatant>(EMPTY_STAGED);

  const quickAddPc = (pc: PlayerCharacter) => {
    setForm({
      name: pc.name,
      initiative: '',
      hp_current: pc.hp_current,
      hp_max: pc.hp_max,
      armor_class: pc.armor_class,
      type: 'pc',
      player_character_id: pc.id,
    });
  };

  const handleAdd = () => {
    if (!form.name.trim()) return;
    if (form.initiative === '') return;
    if (form.hp_max === '' || form.hp_current === '') return;
    if (form.armor_class === '') return;
    onAdd(form);
    setForm(EMPTY_STAGED);
  };

  const availablePcs = characters.filter((pc) => !addedPcIds.has(pc.id));

  const inputClass =
    'bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-2 py-1.5 w-full focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder-gray-500 transition-colors text-sm';

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 space-y-2.5">
      {availablePcs.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Quick-add PC:</p>
          <div className="flex flex-wrap gap-1.5">
            {availablePcs.map((pc) => (
              <button
                key={pc.id}
                onClick={() => quickAddPc(pc)}
                className="text-xs border border-blue-500/50 text-blue-400 px-2 py-0.5 rounded-lg hover:bg-blue-900/40 transition-colors"
              >
                {pc.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={`${inputClass} col-span-2`}
        />
        <label className="text-xs text-gray-400">
          Initiative *
          <input
            type="number"
            value={form.initiative}
            onChange={(e) =>
              setForm({ ...form, initiative: e.target.value === '' ? '' : +e.target.value })
            }
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="text-xs text-gray-400">
          Type
          <select
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as 'pc' | 'monster' })
            }
            className={`${inputClass} mt-1`}
          >
            <option value="monster">Monster</option>
            <option value="pc">PC</option>
          </select>
        </label>
        <label className="text-xs text-gray-400">
          Current HP *
          <input
            type="number"
            min={0}
            value={form.hp_current}
            onChange={(e) =>
              setForm({ ...form, hp_current: e.target.value === '' ? '' : +e.target.value })
            }
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="text-xs text-gray-400">
          Max HP *
          <input
            type="number"
            min={1}
            value={form.hp_max}
            onChange={(e) =>
              setForm({ ...form, hp_max: e.target.value === '' ? '' : +e.target.value })
            }
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="text-xs text-gray-400">
          AC *
          <input
            type="number"
            min={0}
            value={form.armor_class}
            onChange={(e) =>
              setForm({ ...form, armor_class: e.target.value === '' ? '' : +e.target.value })
            }
            className={`${inputClass} mt-1`}
          />
        </label>
      </div>

      <button
        onClick={handleAdd}
        disabled={
          !form.name.trim() ||
          form.initiative === '' ||
          form.hp_current === '' ||
          form.hp_max === '' ||
          form.armor_class === ''
        }
        className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
      >
        Add to List
      </button>
    </div>
  );
}

// ---- Main component ----

export default function InitiativeTracker({ campaignId, characters, refreshKey = 0, onCombatEnd }: InitiativeTrackerProps) {
  const [sessions, setSessions] = useState<CombatSession[]>([]);
  const [activeSession, setActiveSession] = useState<CombatSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [staged, setStaged] = useState<StagedCombatant[]>([]);
  const [showAddMidCombat, setShowAddMidCombat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // ---- Data loading ----

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await api.getCombatSessions(campaignId);
      setSessions(all);
      const active = all.find((s) => s.status === 'active') ?? null;
      setActiveSession(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load combat sessions');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, refreshKey]);

  // ---- Handlers ----

  const handleSessionUpdate = (updated: CombatSession) => {
    setActiveSession(updated);
    setSessions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  };

  const handleCombatError = (msg: string) => {
    setError(msg);
  };

  // Staged combatant management
  const addedPcIds = new Set(
    staged
      .filter((s) => s.player_character_id !== null)
      .map((s) => s.player_character_id as string)
  );

  const handleAddStaged = (c: StagedCombatant) => {
    setStaged((prev) => [...prev, c]);
  };

  const removeStaged = (index: number) => {
    setStaged((prev) => prev.filter((_, i) => i !== index));
  };

  // Begin combat
  const handleBeginCombat = async () => {
    if (staged.length === 0) {
      setError('Add at least one combatant before starting combat.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const combatants = staged.map((s) => ({
        name: s.name,
        initiative: s.initiative as number,
        hp_current: s.hp_current as number,
        hp_max: s.hp_max as number,
        armor_class: s.armor_class as number,
        type: s.type,
        player_character_id: s.player_character_id,
        conditions: [] as string[],
      }));
      const session = await api.createCombatSession(campaignId, {
        name: sessionName.trim() || undefined,
        combatants,
      });
      setActiveSession(session);
      setSessions((prev) => [session, ...prev]);
      setIsCreating(false);
      setSessionName('');
      setStaged([]);
      toast.success('Combat started');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start combat');
    } finally {
      setBusy(false);
    }
  };

  // Mid-combat add
  const handleAddMidCombat = async (c: StagedCombatant) => {
    if (!activeSession) return;
    setBusy(true);
    setError(null);
    try {
      const req: AddCombatantRequest = {
        name: c.name,
        initiative: c.initiative as number,
        hp_current: c.hp_current as number,
        hp_max: c.hp_max as number,
        armor_class: c.armor_class as number,
        type: c.type,
        player_character_id: c.player_character_id,
      };
      const updated = await api.addCombatant(activeSession.id, req);
      handleSessionUpdate(updated);
      setShowAddMidCombat(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add combatant');
    } finally {
      setBusy(false);
    }
  };

  // Next turn
  const handleNextTurn = async () => {
    if (!activeSession) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.advanceTurn(activeSession.id);
      handleSessionUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance turn');
    } finally {
      setBusy(false);
    }
  };

  // Space key shortcut: advance turn
  useEffect(() => {
    if (!activeSession) return;

    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
      if (busy) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleNextTurn();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession, busy]);

  // End combat
  const handleEndCombat = async () => {
    if (!activeSession) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateCombatSession(activeSession.id, { status: 'completed' });
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setActiveSession(null);
      toast.success('Combat ended');
      onCombatEnd?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end combat');
    } finally {
      setBusy(false);
    }
  };

  // Cancel new combat form
  const handleCancelCreate = () => {
    setIsCreating(false);
    setSessionName('');
    setStaged([]);
    setError(null);
  };

  // ---- Render helpers ----

  const completedSessions = sessions.filter((s) => s.status === 'completed');

  // ---- Render: loading ----

  if (loading) {
    return (
      <CardListSkeleton count={2} />
    );
  }

  // ---- Render: active session ----

  if (activeSession) {
    const midCombatAddedPcIds = new Set(
      activeSession.combatants
        .filter((c) => c.player_character_id !== null)
        .map((c) => c.player_character_id as string)
    );

    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-100">
              {activeSession.name ?? 'Combat'}
            </h2>
            <p aria-live="polite" className="text-sm text-gray-400">
              Round {activeSession.round_number} &middot;{' '}
              {activeSession.combatants.length} combatant
              {activeSession.combatants.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAddMidCombat((v) => !v); setError(null); }}
              className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              {showAddMidCombat ? 'Cancel' : '+ Combatant'}
            </button>
            <ConfirmButton
              onConfirm={handleEndCombat}
              label="End Combat"
              confirmLabel="End session?"
              disabled={busy}
              className="text-sm bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="mb-3 text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Mid-combat add form */}
        {showAddMidCombat && (
          <div className="mb-4">
            <AddCombatantForm
              characters={characters}
              onAdd={handleAddMidCombat}
              addedPcIds={midCombatAddedPcIds}
            />
          </div>
        )}

        {/* Combatant list */}
        <div role="list" className="space-y-1.5 mb-4">
          {activeSession.combatants.length === 0 ? (
            <p className="text-gray-400 text-sm">No combatants.</p>
          ) : (
            <AnimatePresence>
              {activeSession.combatants.map((combatant, i) => (
                <motion.div
                  role="listitem"
                  key={`${combatant.name}-${i}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <CombatantRow
                    combatant={combatant}
                    index={i}
                    isCurrent={i === activeSession.current_turn_index}
                    sessionId={activeSession.id}
                    onUpdate={handleSessionUpdate}
                    onError={handleCombatError}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Next turn */}
        <button
          onClick={handleNextTurn}
          disabled={busy || activeSession.combatants.length === 0}
          className="w-full bg-amber-600 hover:bg-amber-500 text-gray-950 font-semibold py-2.5 rounded-lg disabled:opacity-40 transition-colors"
        >
          Next Turn
        </button>

        {/* Current turn label */}
        {activeSession.combatants.length > 0 && (
          <p aria-live="polite" className="text-center text-xs text-gray-400 mt-2">
            Current: {activeSession.combatants[activeSession.current_turn_index]?.name ?? '—'}
            <span className="text-gray-600 ml-2">(Space to advance)</span>
          </p>
        )}
      </div>
    );
  }

  // ---- Render: no active session ----

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-100">Initiative Tracker</h2>
        {!isCreating && (
          <button
            onClick={() => { setIsCreating(true); setError(null); }}
            className="text-sm bg-amber-600 hover:bg-amber-500 text-gray-950 font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            Start Combat
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* New combat form */}
      {isCreating && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 mb-4 space-y-3">
          <h3 className="font-medium text-gray-100">New Combat Session</h3>

          <input
            placeholder="Session name (optional)"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 w-full text-sm placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors"
          />

          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Combatants</h4>
            <AddCombatantForm
              characters={characters}
              onAdd={handleAddStaged}
              addedPcIds={addedPcIds}
            />
          </div>

          {/* Staged list */}
          {staged.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-400">
                Staged ({staged.length}) — sorted by initiative on start:
              </p>
              {staged.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium text-gray-100">{s.name}</span>
                    <span className="text-gray-400 ml-2">
                      Init {s.initiative} &middot; HP {s.hp_current}/{s.hp_max} &middot; AC{' '}
                      {s.armor_class}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    {s.type === 'pc' ? (
                      <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">PC</span>
                    ) : (
                      <span className="text-xs bg-red-700 text-white px-1.5 py-0.5 rounded">Monster</span>
                    )}
                    <button
                      onClick={() => removeStaged(i)}
                      className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                      aria-label={`Remove ${s.name} from staged list`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleBeginCombat}
              disabled={busy || staged.length === 0}
              className="bg-amber-600 hover:bg-amber-500 text-gray-950 font-medium px-4 py-2 rounded-lg disabled:opacity-40 transition-colors"
            >
              {busy ? 'Starting...' : 'Begin Combat'}
            </button>
            <button
              onClick={handleCancelCreate}
              className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* No active combat message */}
      {!isCreating && (
        <p className="text-gray-400 text-sm mb-4">No active combat. Click "Start Combat" to begin.</p>
      )}

      {/* Completed sessions (collapsed) */}
      {completedSessions.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            {showCompleted ? 'Hide' : 'Show'} completed sessions ({completedSessions.length})
          </button>

          {showCompleted && (
            <div className="mt-2 space-y-1.5">
              {completedSessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-gray-800/30 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-400 flex items-center justify-between"
                >
                  <span>
                    {s.name ?? 'Unnamed session'} &middot; Round {s.round_number} &middot;{' '}
                    {s.combatants.length} combatant{s.combatants.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
