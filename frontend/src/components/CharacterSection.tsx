"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { hpColor, hpBarColor } from "@/lib/utils";
import type { PlayerCharacter } from "@/types";
import ConfirmButton from "@/components/ConfirmButton";
import DDBImportModal from "@/components/DDBImportModal";

// ─── Constants ───────────────────────────────────────────────────────────────

const ABILITY_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

const ABILITY_LABELS: Record<(typeof ABILITY_KEYS)[number], string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const SAVING_THROWS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

const SKILLS = [
  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Stealth",
  "Survival",
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function abilityModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

// ─── Form shape ──────────────────────────────────────────────────────────────

interface CharacterFormState {
  name: string;
  race: string;
  character_class: string;
  level: number;
  hp_current: number;
  hp_max: number;
  armor_class: number;
  passive_perception: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  proficiency_bonus: number;
  speed: number;
  saving_throw_proficiencies: string[];
  skill_proficiencies: string[];
  // Spell slots are edited as a list of {level, slots} pairs in the form
  spellSlotPairs: Array<{ level: string; slots: string }>;
}

const EMPTY_CHAR: CharacterFormState = {
  name: "",
  race: "",
  character_class: "",
  level: 1,
  hp_current: 10,
  hp_max: 10,
  armor_class: 10,
  passive_perception: 10,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  proficiency_bonus: 2,
  speed: 30,
  saving_throw_proficiencies: [],
  skill_proficiencies: [],
  spellSlotPairs: [],
};

function pcToForm(pc: PlayerCharacter): CharacterFormState {
  const spellSlotPairs = Object.entries(pc.spell_slots ?? {}).map(
    ([level, slots]) => ({ level, slots: String(slots) })
  );
  return {
    name: pc.name,
    race: pc.race,
    character_class: pc.character_class,
    level: pc.level,
    hp_current: pc.hp_current,
    hp_max: pc.hp_max,
    armor_class: pc.armor_class,
    passive_perception: pc.passive_perception,
    strength: pc.strength,
    dexterity: pc.dexterity,
    constitution: pc.constitution,
    intelligence: pc.intelligence,
    wisdom: pc.wisdom,
    charisma: pc.charisma,
    proficiency_bonus: pc.proficiency_bonus,
    speed: pc.speed,
    saving_throw_proficiencies: pc.saving_throw_proficiencies ?? [],
    skill_proficiencies: pc.skill_proficiencies ?? [],
    spellSlotPairs,
  };
}

function formToPayload(form: CharacterFormState): Record<string, unknown> {
  const spell_slots: Record<string, number> = {};
  for (const pair of form.spellSlotPairs) {
    const level = pair.level.trim();
    const slots = parseInt(pair.slots, 10);
    if (level && !isNaN(slots)) {
      spell_slots[level] = slots;
    }
  }
  return {
    name: form.name,
    race: form.race,
    character_class: form.character_class,
    level: form.level,
    hp_current: form.hp_current,
    hp_max: form.hp_max,
    armor_class: form.armor_class,
    passive_perception: form.passive_perception,
    strength: form.strength,
    dexterity: form.dexterity,
    constitution: form.constitution,
    intelligence: form.intelligence,
    wisdom: form.wisdom,
    charisma: form.charisma,
    proficiency_bonus: form.proficiency_bonus,
    speed: form.speed,
    saving_throw_proficiencies: form.saving_throw_proficiencies,
    skill_proficiencies: form.skill_proficiencies,
    spell_slots,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const INPUT_CLS =
  "bg-muted border border-border text-foreground rounded-lg px-3 py-2 w-full focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 placeholder:text-muted-foreground transition-colors";

const SMALL_INPUT_CLS =
  "bg-muted border border-border text-foreground rounded-lg px-2 py-1.5 w-full mt-1 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors";

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-block bg-accent text-foreground/80 text-xs px-2 py-0.5 rounded">
      {label}
    </span>
  );
}

// Ability scores grid for the card display
function AbilityScoreGrid({ pc }: { pc: PlayerCharacter }) {
  return (
    <div className="grid grid-cols-6 gap-1.5 mt-2">
      {ABILITY_KEYS.map((key) => (
        <div
          key={key}
          className="bg-card/60 border border-border rounded-lg py-1.5 text-center"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {ABILITY_LABELS[key]}
          </p>
          <p className="text-sm font-semibold text-foreground">{pc[key]}</p>
          <p className="text-xs text-primary">{abilityModifier(pc[key])}</p>
        </div>
      ))}
    </div>
  );
}

// Ability scores in the form
function AbilityScoreInputs({
  form,
  setForm,
}: {
  form: CharacterFormState;
  setForm: (f: CharacterFormState) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {ABILITY_KEYS.map((key) => (
        <label key={key} className="text-xs text-muted-foreground text-center">
          {ABILITY_LABELS[key]}
          <input
            type="number"
            min={1}
            max={30}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: +e.target.value })}
            className="bg-muted border border-border text-foreground rounded-lg px-1 py-1.5 w-full mt-1 text-center focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors"
          />
        </label>
      ))}
    </div>
  );
}

// Toggle-checkbox list for saving throws / skills
function ProficiencyCheckboxes({
  label,
  options,
  selected,
  onChange,
  columns,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  columns: number;
}) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
      <div
        className="grid gap-x-4 gap-y-1"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {options.map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-1.5 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="accent-primary cursor-pointer"
            />
            <span className="text-xs text-foreground/80 group-hover:text-foreground transition-colors">
              {opt}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// Dynamic spell slots key-value editor
function SpellSlotsEditor({
  pairs,
  onChange,
}: {
  pairs: Array<{ level: string; slots: string }>;
  onChange: (next: Array<{ level: string; slots: string }>) => void;
}) {
  function updatePair(
    index: number,
    field: "level" | "slots",
    value: string
  ) {
    const next = pairs.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    );
    onChange(next);
  }

  function addPair() {
    onChange([...pairs, { level: "", slots: "" }]);
  }

  function removePair(index: number) {
    onChange(pairs.filter((_, i) => i !== index));
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">Spell Slots</p>
      <div className="space-y-1.5">
        {pairs.map((pair, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              placeholder="Level (e.g. 1)"
              value={pair.level}
              onChange={(e) => updatePair(i, "level", e.target.value)}
              className="bg-muted border border-border text-foreground rounded-lg px-2 py-1 w-28 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors placeholder:text-muted-foreground/60"
            />
            <input
              type="number"
              min={0}
              placeholder="Slots"
              value={pair.slots}
              onChange={(e) => updatePair(i, "slots", e.target.value)}
              className="bg-muted border border-border text-foreground rounded-lg px-2 py-1 w-20 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => removePair(i)}
              className="text-muted-foreground hover:text-red-400 transition-colors text-sm px-1"
              aria-label="Remove spell slot row"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addPair}
          className="text-xs text-primary hover:text-primary/80 transition-colors"
        >
          + Add level
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
  const [form, setForm] = useState<CharacterFormState>(EMPTY_CHAR);
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editId) {
        await api.updateCharacter(editId, formToPayload(form));
        toast.success("Character updated");
      } else {
        await api.createCharacter(campaignId, formToPayload(form));
        toast.success("Character created");
      }
      setForm(EMPTY_CHAR);
      setShowForm(false);
      setShowAdvanced(false);
      setEditId(null);
      onUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      // FastAPI 422 detail arrays render as [object Object] — detect and label cleanly
      setFormError(
        message.startsWith("[object") ? "Validation error — check all fields." : message
      );
    }
  };

  const startEdit = (pc: PlayerCharacter) => {
    setForm(pcToForm(pc));
    setEditId(pc.id);
    setShowForm(true);
    setShowAdvanced(true); // show advanced so existing values are visible
    setFormError(null);
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await api.deleteCharacter(id);
      toast.success("Character deleted");
      onUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(`Failed to delete ${name}: ${message}`);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setShowAdvanced(false);
    setEditId(null);
    setForm(EMPTY_CHAR);
    setFormError(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Characters</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="text-sm bg-indigo-700/60 hover:bg-indigo-600 text-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            Import from D&D Beyond
          </button>
          <button
            onClick={() => {
              if (showForm) {
                cancelForm();
              } else {
                setShowForm(true);
                setEditId(null);
                setForm(EMPTY_CHAR);
                setFormError(null);
              }
            }}
            className="text-sm bg-accent hover:bg-accent text-foreground/80 px-3 py-1.5 rounded-lg transition-colors"
          >
            {showForm ? "Cancel" : "+ Add"}
          </button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-muted/50 border border-border/50 rounded-xl p-4 mb-4 space-y-3"
        >
          {/* Error banner */}
          {formError && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
              {formError}
            </p>
          )}

          {/* ── Basic Fields ── */}
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={INPUT_CLS}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Race"
              value={form.race}
              onChange={(e) => setForm({ ...form, race: e.target.value })}
              className={INPUT_CLS}
              required
            />
            <input
              placeholder="Class"
              value={form.character_class}
              onChange={(e) =>
                setForm({ ...form, character_class: e.target.value })
              }
              className={INPUT_CLS}
              required
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <label className="text-xs text-muted-foreground">
              Level
              <input
                type="number"
                min={1}
                max={20}
                value={form.level}
                onChange={(e) => setForm({ ...form, level: +e.target.value })}
                className={SMALL_INPUT_CLS}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              HP
              <input
                type="number"
                value={form.hp_current}
                onChange={(e) =>
                  setForm({ ...form, hp_current: +e.target.value })
                }
                className={SMALL_INPUT_CLS}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Max HP
              <input
                type="number"
                min={1}
                value={form.hp_max}
                onChange={(e) => setForm({ ...form, hp_max: +e.target.value })}
                className={SMALL_INPUT_CLS}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              AC
              <input
                type="number"
                min={0}
                value={form.armor_class}
                onChange={(e) =>
                  setForm({ ...form, armor_class: +e.target.value })
                }
                className={SMALL_INPUT_CLS}
              />
            </label>
          </div>

          {/* Passive Perception (Known Gap #1 fix) */}
          <div className="grid grid-cols-4 gap-2">
            <label className="text-xs text-muted-foreground">
              Passive Perc.
              <input
                type="number"
                min={1}
                max={30}
                value={form.passive_perception}
                onChange={(e) =>
                  setForm({ ...form, passive_perception: +e.target.value })
                }
                className={SMALL_INPUT_CLS}
              />
            </label>
          </div>

          {/* ── Advanced Stats collapsible ── */}
          <div className="border-t border-border/50 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground/80 transition-colors"
            >
              <span
                className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}
              >
                ▶
              </span>
              Advanced Stats
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-4">
                {/* Ability Scores */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Ability Scores</p>
                  <AbilityScoreInputs form={form} setForm={setForm} />
                </div>

                {/* Proficiency Bonus + Speed */}
                <div className="grid grid-cols-4 gap-2">
                  <label className="text-xs text-muted-foreground">
                    Prof. Bonus
                    <input
                      type="number"
                      min={2}
                      max={6}
                      value={form.proficiency_bonus}
                      onChange={(e) =>
                        setForm({ ...form, proficiency_bonus: +e.target.value })
                      }
                      className={SMALL_INPUT_CLS}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Speed (ft)
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={form.speed}
                      onChange={(e) =>
                        setForm({ ...form, speed: +e.target.value })
                      }
                      className={SMALL_INPUT_CLS}
                    />
                  </label>
                </div>

                {/* Saving Throw Proficiencies */}
                <ProficiencyCheckboxes
                  label="Saving Throw Proficiencies"
                  options={SAVING_THROWS}
                  selected={form.saving_throw_proficiencies}
                  onChange={(next) =>
                    setForm({ ...form, saving_throw_proficiencies: next })
                  }
                  columns={6}
                />

                {/* Skill Proficiencies */}
                <ProficiencyCheckboxes
                  label="Skill Proficiencies"
                  options={SKILLS}
                  selected={form.skill_proficiencies}
                  onChange={(next) =>
                    setForm({ ...form, skill_proficiencies: next })
                  }
                  columns={3}
                />

                {/* Spell Slots */}
                <SpellSlotsEditor
                  pairs={form.spellSlotPairs}
                  onChange={(next) =>
                    setForm({ ...form, spellSlotPairs: next })
                  }
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {editId ? "Update" : "Create"}
          </button>
        </form>
      )}

      {/* Character List */}
      {characters.length === 0 ? (
        <p className="text-muted-foreground text-sm">No characters yet.</p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
          {characters.map((pc) => {
            const isExpanded = expandedCardId === pc.id;
            const hasSpellSlots =
              pc.spell_slots && Object.keys(pc.spell_slots).length > 0;

            return (
              <motion.div
                key={pc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="bg-muted/50 border border-border/50 rounded-xl p-4"
              >
                {/* Card header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      {pc.name}{" "}
                      <span className="text-sm text-muted-foreground">
                        {pc.race} {pc.character_class} (Lv {pc.level})
                      </span>
                    </p>
                    <div className="mt-1">
                      <p className="text-sm text-muted-foreground">
                        <span
                          className={`font-semibold ${hpColor(pc.hp_current, pc.hp_max)}`}
                        >
                          HP {pc.hp_current}/{pc.hp_max}
                        </span>
                        {" "}
                        <span className="text-muted-foreground">&middot;</span>
                        {" "}
                        AC {pc.armor_class}
                        {" "}
                        <span className="text-muted-foreground">&middot;</span>
                        {" "}
                        <span className="text-muted-foreground">
                          Speed {pc.speed}ft &middot; Prof +{pc.proficiency_bonus}
                        </span>
                      </p>
                      {/* HP bar */}
                      <div className="mt-1.5 h-1 w-full bg-accent rounded-full overflow-hidden">
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
                    {/* Toggle stats panel */}
                    <button
                      onClick={() =>
                        setExpandedCardId(isExpanded ? null : pc.id)
                      }
                      className="text-sm bg-accent/60 hover:bg-accent text-muted-foreground hover:text-foreground/80 px-2 py-1 rounded-lg transition-colors"
                      aria-label={isExpanded ? "Hide stats" : "Show stats"}
                    >
                      {isExpanded ? "▲" : "▼"}
                    </button>
                    {confirmingId !== pc.id && (
                      <button
                        onClick={() => startEdit(pc)}
                        className="text-sm bg-accent hover:bg-accent text-foreground/80 px-3 py-1 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    <ConfirmButton
                      onConfirm={() => handleDelete(pc.id, pc.name)}
                      label="Delete"
                      confirmLabel="Are you sure?"
                      className="text-sm bg-red-700/50 hover:bg-red-700 text-red-200 px-3 py-1 rounded-lg transition-colors"
                      onConfirmingChange={(c) => setConfirmingId(c ? pc.id : null)}
                    />
                  </div>
                </div>

                {/* Collapsible stats panel */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                    {/* Ability scores */}
                    <AbilityScoreGrid pc={pc} />

                    {/* Saving throw proficiencies */}
                    {pc.saving_throw_proficiencies &&
                      pc.saving_throw_proficiencies.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Saving Throws
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {pc.saving_throw_proficiencies.map((s) => (
                              <Tag key={s} label={s} />
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Skill proficiencies */}
                    {pc.skill_proficiencies &&
                      pc.skill_proficiencies.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Skills</p>
                          <div className="flex flex-wrap gap-1">
                            {pc.skill_proficiencies.map((s) => (
                              <Tag key={s} label={s} />
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Spell slots */}
                    {hasSpellSlots && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Spell Slots
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(pc.spell_slots).map(
                            ([level, slots]) => (
                              <Tag key={level} label={`Lv${level}: ${slots}`} />
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}

      {showImport && (
        <DDBImportModal
          campaignId={campaignId}
          onImported={onUpdate}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
