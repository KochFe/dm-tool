"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type {
  Campaign,
  CampaignIdea,
  Npc,
  NpcUpdate,
  PlayerCharacter,
  Location,
} from "@/types";
import CharacterList from "./CharacterList";
import IdeasHelper from "./IdeasHelper";

// ---------------------------------------------------------------------------
// NPC detail form
// ---------------------------------------------------------------------------

interface NpcDetailProps {
  npc: Npc;
  locations: Location[];
  onSave: (id: string, data: NpcUpdate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function NpcDetail({ npc, locations, onSave, onDelete }: NpcDetailProps) {
  const [name, setName] = useState(npc.name);
  const [race, setRace] = useState(npc.race);
  const [npcClass, setNpcClass] = useState(npc.npc_class ?? "");
  const [description, setDescription] = useState(npc.description ?? "");
  const [personality, setPersonality] = useState(npc.personality ?? "");
  const [motivation, setMotivation] = useState(npc.motivation ?? "");
  const [secrets, setSecrets] = useState(npc.secrets ?? "");
  const [locationId, setLocationId] = useState<string>(npc.location_id ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync state when the selected NPC changes
  useEffect(() => {
    setName(npc.name);
    setRace(npc.race);
    setNpcClass(npc.npc_class ?? "");
    setDescription(npc.description ?? "");
    setPersonality(npc.personality ?? "");
    setMotivation(npc.motivation ?? "");
    setSecrets(npc.secrets ?? "");
    setLocationId(npc.location_id ?? "");
    setConfirmDelete(false);
  }, [npc.id]);

  async function handleBlur(field: keyof NpcUpdate, value: string | null) {
    const original = npc[field as keyof Npc];
    const normalized = value === "" ? null : value;
    if (normalized === (original === undefined ? null : original)) return;
    await onSave(npc.id, { [field]: normalized });
  }

  async function handleLocationChange(value: string) {
    setLocationId(value);
    await onSave(npc.id, { location_id: value === "" ? null : value });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        NPC Details
      </p>

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => handleBlur("name", name)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
          placeholder="NPC name"
        />
      </div>

      {/* Race + Class row */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-500">Race</label>
          <input
            type="text"
            value={race}
            onChange={(e) => setRace(e.target.value)}
            onBlur={() => handleBlur("race", race)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="Human"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-500">Class / Role</label>
          <input
            type="text"
            value={npcClass}
            onChange={(e) => setNpcClass(e.target.value)}
            onBlur={() => handleBlur("npc_class", npcClass)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="Merchant, Guard..."
          />
        </div>
      </div>

      {/* Location */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">Location</label>
        <select
          value={locationId}
          onChange={(e) => handleLocationChange(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
        >
          <option value="">No location</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => handleBlur("description", description)}
          rows={3}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
          placeholder="Physical appearance, mannerisms..."
        />
      </div>

      {/* Personality */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">Personality</label>
        <textarea
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          onBlur={() => handleBlur("personality", personality)}
          rows={3}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
          placeholder="Traits, bonds, flaws..."
        />
      </div>

      {/* Motivation */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">Motivation</label>
        <textarea
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          onBlur={() => handleBlur("motivation", motivation)}
          rows={2}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
          placeholder="What does this NPC want?"
        />
      </div>

      {/* Secrets — DM eyes only */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Secrets</label>
          <span className="text-xs bg-gray-800 border border-gray-700 text-gray-500 px-1.5 py-0.5 rounded">
            DM only
          </span>
        </div>
        <textarea
          value={secrets}
          onChange={(e) => setSecrets(e.target.value)}
          onBlur={() => handleBlur("secrets", secrets)}
          rows={2}
          className="bg-gray-850 bg-gray-900 border border-gray-700/60 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none placeholder:text-gray-700"
          placeholder="Hidden agendas, true identity, secret knowledge..."
        />
      </div>

      {/* Delete */}
      <div className="pt-2 border-t border-gray-800">
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Delete this NPC?</span>
            <button
              onClick={() => onDelete(npc.id)}
              className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-red-500/70 hover:text-red-400 transition-colors"
          >
            Delete NPC
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PC detail form
// ---------------------------------------------------------------------------

interface PcDetailProps {
  pc: PlayerCharacter;
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function PcDetail({ pc, onSave, onDelete }: PcDetailProps) {
  const [name, setName] = useState(pc.name);
  const [race, setRace] = useState(pc.race);
  const [characterClass, setCharacterClass] = useState(pc.character_class);
  const [level, setLevel] = useState(String(pc.level));
  const [hpCurrent, setHpCurrent] = useState(String(pc.hp_current));
  const [hpMax, setHpMax] = useState(String(pc.hp_max));
  const [armorClass, setArmorClass] = useState(String(pc.armor_class));
  const [passivePerception, setPassivePerception] = useState(
    String(pc.passive_perception)
  );
  const [strength, setStrength] = useState(String(pc.strength));
  const [dexterity, setDexterity] = useState(String(pc.dexterity));
  const [constitution, setConstitution] = useState(String(pc.constitution));
  const [intelligence, setIntelligence] = useState(String(pc.intelligence));
  const [wisdom, setWisdom] = useState(String(pc.wisdom));
  const [charisma, setCharisma] = useState(String(pc.charisma));
  const [proficiencyBonus, setProficiencyBonus] = useState(
    String(pc.proficiency_bonus)
  );
  const [speed, setSpeed] = useState(String(pc.speed));
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setName(pc.name);
    setRace(pc.race);
    setCharacterClass(pc.character_class);
    setLevel(String(pc.level));
    setHpCurrent(String(pc.hp_current));
    setHpMax(String(pc.hp_max));
    setArmorClass(String(pc.armor_class));
    setPassivePerception(String(pc.passive_perception));
    setStrength(String(pc.strength));
    setDexterity(String(pc.dexterity));
    setConstitution(String(pc.constitution));
    setIntelligence(String(pc.intelligence));
    setWisdom(String(pc.wisdom));
    setCharisma(String(pc.charisma));
    setProficiencyBonus(String(pc.proficiency_bonus));
    setSpeed(String(pc.speed));
    setConfirmDelete(false);
  }, [pc.id]);

  function numericBlur(
    field: string,
    rawValue: string,
    originalValue: number
  ) {
    const parsed = parseInt(rawValue, 10);
    const value = isNaN(parsed) ? originalValue : parsed;
    if (value === originalValue) return;
    onSave(pc.id, { [field]: value });
  }

  function stringBlur(field: string, value: string, original: string) {
    if (value.trim() === original) return;
    onSave(pc.id, { [field]: value.trim() });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        Player Character
      </p>

      {/* Identity row */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-500">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => stringBlur("name", name, pc.name)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="Character name"
          />
        </div>
        <div className="flex flex-col gap-1 w-16">
          <label className="text-xs text-gray-500">Level</label>
          <input
            type="number"
            min={1}
            max={20}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            onBlur={() => numericBlur("level", level, pc.level)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-500">Race</label>
          <input
            type="text"
            value={race}
            onChange={(e) => setRace(e.target.value)}
            onBlur={() => stringBlur("race", race, pc.race)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="Human"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-500">Class</label>
          <input
            type="text"
            value={characterClass}
            onChange={(e) => setCharacterClass(e.target.value)}
            onBlur={() =>
              stringBlur("character_class", characterClass, pc.character_class)
            }
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="Fighter"
          />
        </div>
      </div>

      {/* Combat stats row */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">HP</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={hpCurrent}
              onChange={(e) => setHpCurrent(e.target.value)}
              onBlur={() => numericBlur("hp_current", hpCurrent, pc.hp_current)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors w-16 text-center"
            />
            <span className="text-gray-600 text-sm">/</span>
            <input
              type="number"
              value={hpMax}
              onChange={(e) => setHpMax(e.target.value)}
              onBlur={() => numericBlur("hp_max", hpMax, pc.hp_max)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors w-16 text-center"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">AC</label>
          <input
            type="number"
            value={armorClass}
            onChange={(e) => setArmorClass(e.target.value)}
            onBlur={() => numericBlur("armor_class", armorClass, pc.armor_class)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors w-16 text-center"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Passive Perc.</label>
          <input
            type="number"
            value={passivePerception}
            onChange={(e) => setPassivePerception(e.target.value)}
            onBlur={() =>
              numericBlur(
                "passive_perception",
                passivePerception,
                pc.passive_perception
              )
            }
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors w-16 text-center"
          />
        </div>
      </div>

      {/* Collapsible stats section */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-medium text-gray-500 uppercase tracking-wide select-none list-none flex items-center gap-1.5 hover:text-gray-300 transition-colors">
          <svg
            className="w-3 h-3 transition-transform group-open:rotate-90"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Stats &amp; Combat
        </summary>

        <div className="mt-4 flex flex-col gap-4">
          {/* Ability scores */}
          <div className="grid grid-cols-6 gap-2">
            {(
              [
                ["STR", strength, setStrength, "strength", pc.strength],
                ["DEX", dexterity, setDexterity, "dexterity", pc.dexterity],
                ["CON", constitution, setConstitution, "constitution", pc.constitution],
                ["INT", intelligence, setIntelligence, "intelligence", pc.intelligence],
                ["WIS", wisdom, setWisdom, "wisdom", pc.wisdom],
                ["CHA", charisma, setCharisma, "charisma", pc.charisma],
              ] as [string, string, (v: string) => void, string, number][]
            ).map(([label, val, setter, field, original]) => (
              <div key={field} className="flex flex-col items-center gap-1">
                <label className="text-xs text-gray-500">{label}</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  onBlur={() => numericBlur(field, val, original)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-1 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors w-full text-center"
                />
              </div>
            ))}
          </div>

          {/* Proficiency bonus + Speed */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Prof. Bonus</label>
              <input
                type="number"
                value={proficiencyBonus}
                onChange={(e) => setProficiencyBonus(e.target.value)}
                onBlur={() =>
                  numericBlur(
                    "proficiency_bonus",
                    proficiencyBonus,
                    pc.proficiency_bonus
                  )
                }
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors w-20 text-center"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Speed (ft)</label>
              <input
                type="number"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                onBlur={() => numericBlur("speed", speed, pc.speed)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors w-20 text-center"
              />
            </div>
          </div>
        </div>
      </details>

      {/* Delete */}
      <div className="pt-2 border-t border-gray-800">
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Delete this PC?</span>
            <button
              onClick={() => onDelete(pc.id)}
              className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-red-500/70 hover:text-red-400 transition-colors"
          >
            Delete PC
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DDB Import widget
// ---------------------------------------------------------------------------

interface DDBImportProps {
  campaignId: string;
  onImported: (pc: PlayerCharacter) => void;
}

function DDBImport({ campaignId, onImported }: DDBImportProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const preview = await api.importFromDDB(campaignId, trimmed);
      const created = await api.createCharacter(
        campaignId,
        preview.preview as Record<string, unknown>
      );
      onImported(created);
      setUrl("");
      toast.success(`Imported ${created.name} from D&D Beyond`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to import from D&D Beyond"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
      <p className="text-xs font-medium text-gray-400">Import from D&amp;D Beyond</p>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleImport();
          }}
          placeholder="https://www.dndbeyond.com/characters/..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors placeholder:text-gray-600"
        />
        <button
          onClick={handleImport}
          disabled={loading || !url.trim()}
          className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 text-sm font-medium rounded-lg transition-colors flex-shrink-0"
        >
          {loading ? "Importing..." : "Import"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CharactersTab orchestrator
// ---------------------------------------------------------------------------

interface CharactersTabProps {
  campaign: Campaign;
  ideas: CampaignIdea[];
  onToggleIdea: (id: string, isDone: boolean) => void;
}

export default function CharactersTab({
  campaign,
  ideas,
  onToggleIdea,
}: CharactersTabProps) {
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [pcs, setPcs] = useState<PlayerCharacter[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<"npc" | "pc" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [loadedNpcs, loadedPcs, loadedLocations] = await Promise.all([
        api.getNpcs(campaign.id),
        api.getCharacters(campaign.id),
        api.getLocations(campaign.id),
      ]);
      setNpcs(loadedNpcs);
      setPcs(loadedPcs);
      setLocations(loadedLocations);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load characters"
      );
    } finally {
      setLoading(false);
    }
  }, [campaign.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // -- NPC handlers --

  async function handleAddNpc() {
    try {
      const created = await api.createNpc(campaign.id, {
        name: "New NPC",
        race: "Human",
      });
      setNpcs((prev) => [...prev, created]);
      setSelectedType("npc");
      setSelectedId(created.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create NPC"
      );
    }
  }

  async function handleSaveNpc(id: string, data: NpcUpdate) {
    try {
      const updated = await api.updateNpc(id, data);
      setNpcs((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save NPC"
      );
    }
  }

  async function handleDeleteNpc(id: string) {
    try {
      await api.deleteNpc(id);
      setNpcs((prev) => prev.filter((n) => n.id !== id));
      if (selectedId === id) {
        setSelectedType(null);
        setSelectedId(null);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete NPC"
      );
    }
  }

  // -- PC handlers --

  async function handleAddPc() {
    try {
      const created = await api.createCharacter(campaign.id, {
        name: "New Character",
        race: "Human",
        character_class: "Fighter",
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
        spell_slots: {},
        inventory: [],
      });
      setPcs((prev) => [...prev, created]);
      setSelectedType("pc");
      setSelectedId(created.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create character"
      );
    }
  }

  async function handleSavePc(id: string, data: Record<string, unknown>) {
    try {
      const updated = await api.updateCharacter(id, data);
      setPcs((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save character"
      );
    }
  }

  async function handleDeletePc(id: string) {
    try {
      await api.deleteCharacter(id);
      setPcs((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) {
        setSelectedType(null);
        setSelectedId(null);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete character"
      );
    }
  }

  function handleImportedPc(pc: PlayerCharacter) {
    setPcs((prev) => [...prev, pc]);
    setSelectedType("pc");
    setSelectedId(pc.id);
  }

  // Derive selected objects
  const selectedNpc =
    selectedType === "npc" ? (npcs.find((n) => n.id === selectedId) ?? null) : null;
  const selectedPc =
    selectedType === "pc" ? (pcs.find((p) => p.id === selectedId) ?? null) : null;

  return (
    <div className="flex gap-4 h-full">
      {/* Left panel: character list */}
      <div className="w-[270px] flex-shrink-0 bg-gray-900/60 border border-gray-800 rounded-xl p-3 flex flex-col">
        {loading ? (
          <p className="text-xs text-gray-600 text-center py-4">Loading...</p>
        ) : (
          <CharacterList
            npcs={npcs}
            pcs={pcs}
            locations={locations}
            selectedType={selectedType}
            selectedId={selectedId}
            onSelectNpc={(npc) => {
              setSelectedType("npc");
              setSelectedId(npc.id);
            }}
            onSelectPc={(pc) => {
              setSelectedType("pc");
              setSelectedId(pc.id);
            }}
            onAddNpc={handleAddNpc}
            onAddPc={handleAddPc}
          />
        )}
      </div>

      {/* Center panel: detail editor */}
      <div className="flex-1 min-w-0 bg-gray-900/60 border border-gray-800 rounded-xl p-5 overflow-y-auto">
        {selectedNpc ? (
          <NpcDetail
            npc={selectedNpc}
            locations={locations}
            onSave={handleSaveNpc}
            onDelete={handleDeleteNpc}
          />
        ) : selectedPc ? (
          <>
            <PcDetail
              pc={selectedPc}
              onSave={handleSavePc}
              onDelete={handleDeletePc}
            />
            <div className="mt-6">
              <DDBImport
                campaignId={campaign.id}
                onImported={handleImportedPc}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <svg
              className="w-10 h-10 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <div>
              <p className="text-sm text-gray-600">
                Select a character to edit their details
              </p>
              {!loading && npcs.length === 0 && pcs.length === 0 && (
                <p className="text-xs text-gray-700 mt-1">
                  Add an NPC or PC to get started
                </p>
              )}
            </div>
            <div className="mt-2">
              <DDBImport
                campaignId={campaign.id}
                onImported={handleImportedPc}
              />
            </div>
          </div>
        )}
      </div>

      {/* Right panel: ideas */}
      <div className="w-56 flex-shrink-0">
        <div className="sticky top-0 bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-800 p-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Character Ideas
          </p>
          <IdeasHelper
            campaignId={campaign.id}
            tag="character"
            ideas={ideas}
            onToggleDone={onToggleIdea}
          />
        </div>
      </div>
    </div>
  );
}
