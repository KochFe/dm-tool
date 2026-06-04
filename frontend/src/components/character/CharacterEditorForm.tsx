"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import type { PlayerCharacter } from "@/types";
import { Textarea } from "@/components/ui/textarea";
import { ABILITY_KEYS, ABILITY_LABELS } from "@/components/character/CharacterStatDisplay";

// ─── Constants ───────────────────────────────────────────────────────────────

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

const INPUT_CLS =
  "bg-muted border border-border text-foreground rounded-lg px-3 py-2 w-full focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 placeholder:text-muted-foreground transition-colors";

const SMALL_INPUT_CLS =
  "bg-muted border border-border text-foreground rounded-lg px-2 py-1.5 w-full mt-1 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors";

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
  notes: string;
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
  notes: "",
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
    notes: pc.notes ?? "",
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
    notes: form.notes,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
  const t = useTranslations("characterSection");

  function updatePair(index: number, field: "level" | "slots", value: string) {
    const next = pairs.map((p, i) => (i === index ? { ...p, [field]: value } : p));
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
      <p className="text-xs text-muted-foreground mb-1.5">{t("spellSlots")}</p>
      <div className="space-y-1.5">
        {pairs.map((pair, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              placeholder={t("spellLevelPlaceholder")}
              value={pair.level}
              onChange={(e) => updatePair(i, "level", e.target.value)}
              className="bg-muted border border-border text-foreground rounded-lg px-2 py-1 w-28 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors placeholder:text-muted-foreground/60"
            />
            <input
              type="number"
              min={0}
              placeholder={t("slotsPlaceholder")}
              value={pair.slots}
              onChange={(e) => updatePair(i, "slots", e.target.value)}
              className="bg-muted border border-border text-foreground rounded-lg px-2 py-1 w-20 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => removePair(i)}
              className="text-muted-foreground hover:text-red-400 transition-colors text-sm px-1"
              aria-label={t("removeSpellSlotRow")}
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
          {t("addLevel")}
        </button>
      </div>
    </div>
  );
}

// ─── Main editor form ─────────────────────────────────────────────────────────

interface CharacterEditorFormProps {
  /** The PC to edit, or null to create a new one. */
  pc: PlayerCharacter | null;
  campaignId: string;
  /** Called after a successful create/update so the parent can reload + close. */
  onSaved: () => void;
  /** Optional cancel affordance (campaign-view inline form). */
  onCancel?: () => void;
  /** Optional delete affordance (wizard master-detail center). */
  onDelete?: (pc: PlayerCharacter) => void;
  /** Extra classes for the <form> wrapper (e.g. campaign-view card background). */
  className?: string;
}

/** Player-character create/edit form. Reused inline in the campaign view's
 *  CharacterSection and in the wizard's master-detail center panel. */
export default function CharacterEditorForm({
  pc,
  campaignId,
  onSaved,
  onCancel,
  onDelete,
  className,
}: CharacterEditorFormProps) {
  const t = useTranslations("characterSection");
  const tc = useTranslations("common");
  const [seededId, setSeededId] = useState<string | null>(pc?.id ?? null);
  const [form, setForm] = useState<CharacterFormState>(
    pc ? pcToForm(pc) : EMPTY_CHAR
  );
  const [showAdvanced, setShowAdvanced] = useState(pc != null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Render-phase resync when the selected PC changes (avoids set-state-in-effect).
  if ((pc?.id ?? null) !== seededId) {
    setSeededId(pc?.id ?? null);
    setForm(pc ? pcToForm(pc) : EMPTY_CHAR);
    setShowAdvanced(pc != null);
    setFormError(null);
    setConfirmDelete(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (pc) {
        await api.updateCharacter(pc.id, formToPayload(form));
        toast.success(t("toastUpdated"));
      } else {
        await api.createCharacter(campaignId, formToPayload(form));
        toast.success(t("toastCreated"));
      }
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      // FastAPI 422 detail arrays render as [object Object] — detect and label cleanly
      setFormError(
        message.startsWith("[object") ? tc("validationError") : message
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${className ?? ""}`}>
      {/* Error banner */}
      {formError && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
          {formError}
        </p>
      )}

      {/* ── Basic Fields ── */}
      <input
        placeholder={t("namePlaceholder")}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className={INPUT_CLS}
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder={t("racePlaceholder")}
          value={form.race}
          onChange={(e) => setForm({ ...form, race: e.target.value })}
          className={INPUT_CLS}
          required
        />
        <input
          placeholder={t("classPlaceholder")}
          value={form.character_class}
          onChange={(e) => setForm({ ...form, character_class: e.target.value })}
          className={INPUT_CLS}
          required
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <label className="text-xs text-muted-foreground">
          {t("labelLevel")}
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
          {t("labelHp")}
          <input
            type="number"
            value={form.hp_current}
            onChange={(e) => setForm({ ...form, hp_current: +e.target.value })}
            className={SMALL_INPUT_CLS}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          {t("labelMaxHp")}
          <input
            type="number"
            min={1}
            value={form.hp_max}
            onChange={(e) => setForm({ ...form, hp_max: +e.target.value })}
            className={SMALL_INPUT_CLS}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          {t("labelAc")}
          <input
            type="number"
            min={0}
            value={form.armor_class}
            onChange={(e) => setForm({ ...form, armor_class: +e.target.value })}
            className={SMALL_INPUT_CLS}
          />
        </label>
      </div>

      {/* Passive Perception */}
      <div className="grid grid-cols-4 gap-2">
        <label className="text-xs text-muted-foreground">
          {t("labelPassivePerc")}
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
          <span className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}>
            ▶
          </span>
          {t("advancedStats")}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-4">
            {/* Ability Scores */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                {t("abilityScores")}
              </p>
              <AbilityScoreInputs form={form} setForm={setForm} />
            </div>

            {/* Proficiency Bonus + Speed */}
            <div className="grid grid-cols-4 gap-2">
              <label className="text-xs text-muted-foreground">
                {t("labelProfBonus")}
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
                {t("labelSpeed")}
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={form.speed}
                  onChange={(e) => setForm({ ...form, speed: +e.target.value })}
                  className={SMALL_INPUT_CLS}
                />
              </label>
            </div>

            {/* Saving Throw Proficiencies */}
            <ProficiencyCheckboxes
              label={t("savingThrowProficiencies")}
              options={SAVING_THROWS}
              selected={form.saving_throw_proficiencies}
              onChange={(next) =>
                setForm({ ...form, saving_throw_proficiencies: next })
              }
              columns={6}
            />

            {/* Skill Proficiencies */}
            <ProficiencyCheckboxes
              label={t("skillProficiencies")}
              options={SKILLS}
              selected={form.skill_proficiencies}
              onChange={(next) => setForm({ ...form, skill_proficiencies: next })}
              columns={3}
            />

            {/* Spell Slots */}
            <SpellSlotsEditor
              pairs={form.spellSlotPairs}
              onChange={(next) => setForm({ ...form, spellSlotPairs: next })}
            />
          </div>
        )}
      </div>

      {/* Notes — DM's private notes */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">{t("notes")}</p>
        <Textarea
          variant="muted"
          minRows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder={t("notesPlaceholder")}
          className="text-sm"
        />
      </div>

      {/* Save / Cancel */}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {pc ? tc("update") : tc("create")}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground/80 transition-colors px-2 py-2"
          >
            {tc("cancel")}
          </button>
        )}
      </div>

      {/* Delete (master-detail only) */}
      {onDelete && pc && (
        <div className="pt-2 border-t border-border">
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {t("deletePcConfirm")}
              </span>
              <button
                type="button"
                onClick={() => onDelete(pc)}
                className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
              >
                {tc("confirm")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-sm text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                {tc("cancel")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-500/70 hover:text-red-400 transition-colors"
            >
              {t("deletePc")}
            </button>
          )}
        </div>
      )}
    </form>
  );
}
