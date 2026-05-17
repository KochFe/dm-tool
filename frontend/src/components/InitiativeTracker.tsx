'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { hpColor } from '@/lib/utils';
import { CardListSkeleton } from '@/components/skeletons/CardSkeleton';
import type {
  CombatSession,
  Combatant,
  PlayerCharacter,
  AddCombatantRequest,
  EncounterTemplate,
  PresentPC,
} from '@/types';
import ConfirmButton from '@/components/ConfirmButton';
import StartEncounterModal from '@/components/encounters/StartEncounterModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const CONDITIONS = [
  { name: 'Blinded', color: 'bg-muted text-foreground' },
  { name: 'Charmed', color: 'bg-pink-800 text-pink-200' },
  { name: 'Deafened', color: 'bg-muted text-foreground' },
  { name: 'Frightened', color: 'bg-purple-800 text-purple-200' },
  { name: 'Grappled', color: 'bg-yellow-800 text-yellow-200' },
  { name: 'Incapacitated', color: 'bg-accent text-foreground/80' },
  { name: 'Invisible', color: 'bg-blue-800 text-blue-200' },
  { name: 'Paralyzed', color: 'bg-red-900 text-red-200' },
  { name: 'Petrified', color: 'bg-stone-700 text-stone-200' },
  { name: 'Poisoned', color: 'bg-green-800 text-green-200' },
  { name: 'Prone', color: 'bg-primary/25 text-primary' },
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
  const t = useTranslations('initiative');
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
      onError(err instanceof Error ? err.message : t('errUpdateHp'));
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
        <span className="text-muted-foreground font-normal">/{combatant.hp_max}</span>
      </span>
      <input
        type="number"
        min={0}
        value={delta}
        onChange={(e) => setDelta(e.target.value === '' ? '' : Math.abs(+e.target.value))}
        placeholder={t('amount')}
        className="bg-muted border border-border text-foreground rounded px-1.5 py-0.5 w-16 text-xs text-center focus:border-ring focus:outline-none transition-colors"
        disabled={busy}
      />
      <button
        onClick={() => apply(-1)}
        disabled={busy || delta === '' || delta === 0}
        className="text-xs bg-red-700 text-white px-2 py-0.5 rounded hover:bg-red-600 disabled:opacity-40 transition-colors"
        title={t('damage')}
      >
        -
      </button>
      <button
        onClick={() => apply(1)}
        disabled={busy || delta === '' || delta === 0}
        className="text-xs bg-green-700 text-white px-2 py-0.5 rounded hover:bg-green-600 disabled:opacity-40 transition-colors"
        title={t('heal')}
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
  const t = useTranslations('initiative');
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const updated = await api.removeCombatant(sessionId, index);
      onUpdate(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('errRemoveCombatant'));
      setRemoving(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
        isCurrent
          ? 'bg-blue-900/30 border-l-4 border-l-blue-500 border-r border-r-blue-500/30 border-t border-t-blue-500/30 border-b border-b-blue-500/30'
          : 'border-border hover:bg-muted/40'
      }`}
    >
      {/* Turn arrow */}
      <div className="w-4 shrink-0 text-blue-400 font-bold text-sm">
        {isCurrent ? '▶' : ''}
      </div>

      {/* Initiative */}
      <div className="w-8 text-center shrink-0">
        <span className="text-xs text-muted-foreground">{t('labelInit')}</span>
        <div className="font-mono font-semibold text-sm text-foreground">{combatant.initiative}</div>
      </div>

      {/* Name + type badge + conditions */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium truncate ${isCurrent ? 'text-blue-200' : 'text-foreground'}`}>
            {combatant.name}
          </span>
          {combatant.type === 'pc' ? (
            <span className="shrink-0 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">{t('typePc')}</span>
          ) : (
            <span className="shrink-0 text-xs bg-red-700 text-white px-1.5 py-0.5 rounded">{t('typeMonster')}</span>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <button className="shrink-0 text-xs text-muted-foreground hover:text-primary transition-colors" title={t('toggleConditions')}>
                {t('addCondition')}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 bg-card border-border" align="start">
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
                          onError(err instanceof Error ? err.message : t('errUpdateConditions'));
                        }
                      }}
                      className={`w-full text-left text-xs px-2 py-1 rounded transition-colors ${
                        active ? `${c.color} font-medium` : 'text-muted-foreground hover:bg-muted'
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
                  className={`text-xs px-1.5 py-0.5 rounded-full ${info?.color ?? 'bg-accent text-foreground/80'}`}
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
        <span className="text-xs text-muted-foreground">{t('labelAc')}</span>
        <div className="font-mono text-sm text-foreground">{combatant.armor_class}</div>
      </div>

      {/* Remove */}
      <ConfirmButton
        onConfirm={handleRemove}
        label="✕"
        confirmLabel={t('remove')}
        disabled={removing}
        className="shrink-0 text-muted-foreground hover:text-red-400 disabled:opacity-40 text-sm leading-none px-1 transition-colors"
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
  const t = useTranslations('initiative');
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
    'bg-muted border border-border text-foreground rounded-lg px-2 py-1.5 w-full focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 placeholder:text-muted-foreground transition-colors text-sm';

  return (
    <div className="bg-muted/50 border border-border rounded-xl p-3 space-y-2.5">
      {availablePcs.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">{t('quickAddPc')}</p>
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
          placeholder={t('fieldName')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={`${inputClass} col-span-2`}
        />
        <label className="text-xs text-muted-foreground">
          {t('fieldInitiative')}
          <input
            type="number"
            value={form.initiative}
            onChange={(e) =>
              setForm({ ...form, initiative: e.target.value === '' ? '' : +e.target.value })
            }
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          {t('fieldType')}
          <select
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as 'pc' | 'monster' })
            }
            className={`${inputClass} mt-1`}
          >
            <option value="monster">{t('typeMonster')}</option>
            <option value="pc">{t('typePc')}</option>
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          {t('fieldHpCurrent')}
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
        <label className="text-xs text-muted-foreground">
          {t('fieldHpMax')}
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
        <label className="text-xs text-muted-foreground">
          {t('fieldAc')}
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
        className="text-sm bg-accent hover:bg-muted text-foreground px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
      >
        {t('addToList')}
      </button>
    </div>
  );
}

// ---- Main component ----

export default function InitiativeTracker({ campaignId, characters, refreshKey = 0, onCombatEnd }: InitiativeTrackerProps) {
  const t = useTranslations('initiative');
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
  const [templates, setTemplates] = useState<EncounterTemplate[]>([]);
  const [startingTemplateId, setStartingTemplateId] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : t('errLoadSessions'));
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, refreshKey]);

  const loadTemplates = useCallback(async () => {
    try {
      const list = await api.listEncounterTemplates(campaignId);
      setTemplates(list);
    } catch {
      // Non-fatal: prepared-encounters list just won't render.
    }
  }, [campaignId]);

  useEffect(() => {
    if (!activeSession) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadTemplates();
    }
  }, [activeSession, loadTemplates]);

  const handleStartTemplate = async (presentPcs: PresentPC[]) => {
    if (!startingTemplateId) return;
    const session = await api.startEncounter(startingTemplateId, {
      present_pcs: presentPcs,
    });
    setStartingTemplateId(null);
    setActiveSession(session);
    setSessions((prev) => [session, ...prev]);
  };

  // ---- Handlers ----

  const handleSessionUpdate = useCallback((updated: CombatSession) => {
    setActiveSession(updated);
    setSessions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  }, []);

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
      setError(t('errAtLeastOne'));
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
      toast.success(t('toastCombatStarted'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errStartCombat'));
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
      setError(err instanceof Error ? err.message : t('errAddCombatant'));
    } finally {
      setBusy(false);
    }
  };

  // Next turn
  const handleNextTurn = useCallback(async () => {
    if (!activeSession) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.advanceTurn(activeSession.id);
      handleSessionUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errAdvanceTurn'));
    } finally {
      setBusy(false);
    }
  }, [activeSession, handleSessionUpdate]);

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
  }, [activeSession, busy, handleNextTurn]);

  // End combat
  const handleEndCombat = async () => {
    if (!activeSession) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateCombatSession(activeSession.id, { status: 'completed' });
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setActiveSession(null);
      toast.success(t('toastCombatEnded'));
      onCombatEnd?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errEndCombat'));
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
            <h2 className="text-xl font-semibold text-foreground">
              {activeSession.name ?? t('defaultName')}
            </h2>
            <p aria-live="polite" className="text-sm text-muted-foreground">
              {t('roundCombatants', { round: activeSession.round_number, count: activeSession.combatants.length })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAddMidCombat((v) => !v); setError(null); }}
              className="text-sm bg-accent hover:bg-muted text-foreground px-3 py-1.5 rounded-lg transition-colors"
            >
              {showAddMidCombat ? t('cancel') : t('addCombatantButton')}
            </button>
            <ConfirmButton
              onConfirm={handleEndCombat}
              label={t('endCombat')}
              confirmLabel={t('confirmEndSession')}
              disabled={busy}
              className="text-sm bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-700 dark:hover:bg-red-600 dark:text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
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
            <p className="text-muted-foreground text-sm">{t('noCombatants')}</p>
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
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-lg disabled:opacity-40 transition-colors"
        >
          {t('nextTurn')}
        </button>

        {/* Current turn label */}
        {activeSession.combatants.length > 0 && (
          <p aria-live="polite" className="text-center text-xs text-muted-foreground mt-2">
            {t('currentTurn', { name: activeSession.combatants[activeSession.current_turn_index]?.name ?? '—' })}
            <span className="text-muted-foreground/60 ml-2">{t('spaceToAdvance')}</span>
          </p>
        )}
      </div>
    );
  }

  // ---- Render: no active session ----

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">{t('heading')}</h2>
        {!isCreating && (
          <button
            onClick={() => { setIsCreating(true); setError(null); }}
            className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            {t('startCombat')}
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
        <div className="bg-muted/50 border border-border rounded-xl p-4 mb-4 space-y-3">
          <h3 className="font-medium text-foreground">{t('newSession')}</h3>

          <input
            placeholder={t('sessionNamePlaceholder')}
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="bg-muted border border-border text-foreground rounded-lg px-3 py-2 w-full text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors"
          />

          <div>
            <h4 className="text-sm font-medium text-foreground/80 mb-2">{t('combatantsHeading')}</h4>
            <AddCombatantForm
              characters={characters}
              onAdd={handleAddStaged}
              addedPcIds={addedPcIds}
            />
          </div>

          {/* Staged list */}
          {staged.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {t('stagedLabel', { count: staged.length })}
              </p>
              {staged.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-muted-foreground ml-2">
                      {t('stagedRowSummary', { init: s.initiative, hp: s.hp_current, hpMax: s.hp_max, ac: s.armor_class })}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    {s.type === 'pc' ? (
                      <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">{t('typePc')}</span>
                    ) : (
                      <span className="text-xs bg-red-700 text-white px-1.5 py-0.5 rounded">{t('typeMonster')}</span>
                    )}
                    <button
                      onClick={() => removeStaged(i)}
                      className="text-muted-foreground hover:text-red-400 text-xs transition-colors"
                      aria-label={t('removeFromStaged', { name: s.name })}
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
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2 rounded-lg disabled:opacity-40 transition-colors"
            >
              {busy ? t('starting') : t('beginCombat')}
            </button>
            <button
              onClick={handleCancelCreate}
              className="bg-accent hover:bg-muted text-foreground px-4 py-2 rounded-lg transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Prepared encounters */}
      {!isCreating && templates.length > 0 && (
        <div className="mb-4 bg-card border border-border rounded-xl p-4 space-y-2">
          <h3 className="font-medium text-foreground text-sm">{t('preparedEncountersHeading')}</h3>
          <div className="space-y-1.5">
            {templates.map((tpl) => {
              const summary = tpl.combatants
                .map((c) => (c.count > 1 ? `${c.name} ×${c.count}` : c.name))
                .join(', ');
              const startable = tpl.combatants.length > 0;
              return (
                <div
                  key={tpl.id}
                  className="flex items-center justify-between gap-3 bg-muted/30 border border-border rounded-lg px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{tpl.name}</div>
                    {summary && (
                      <div className="text-xs text-muted-foreground truncate">{summary}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!startable}
                    onClick={() => setStartingTemplateId(tpl.id)}
                    className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground px-2.5 py-1 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('startTemplateButton')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No active combat message */}
      {!isCreating && (
        <p className="text-muted-foreground text-sm mb-4">{t('noActiveCombat')}</p>
      )}

      <StartEncounterModal
        open={startingTemplateId !== null}
        onClose={() => setStartingTemplateId(null)}
        onConfirm={handleStartTemplate}
      />

      {/* Completed sessions (collapsed) */}
      {completedSessions.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="text-sm text-muted-foreground hover:text-foreground/80 transition-colors"
          >
            {showCompleted ? t('hideCompleted', { count: completedSessions.length }) : t('showCompleted', { count: completedSessions.length })}
          </button>

          {showCompleted && (
            <div className="mt-2 space-y-1.5">
              {completedSessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground flex items-center justify-between"
                >
                  <span>
                    {t('completedSummary', { name: s.name ?? t('unnamedSession'), round: s.round_number, count: s.combatants.length })}
                  </span>
                  <span className="text-xs text-muted-foreground">
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
