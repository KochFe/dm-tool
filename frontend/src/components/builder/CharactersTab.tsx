"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, type PersonalityResult } from "@/lib/api";
import type {
  Campaign,
  CampaignIdea,
  IdeaReorderItem,
  Npc,
  NpcStats,
  NpcUpdate,
  PlayerCharacter,
  Location,
} from "@/types";
import { Textarea } from "@/components/ui/textarea";
import CharacterList from "./CharacterList";
import IdeasHelper from "./IdeasHelper";
import { AIAssistModal } from "@/components/ai/AIAssistModal";
import CharacterEditorForm from "@/components/character/CharacterEditorForm";
import DDBImportModal from "@/components/DDBImportModal";

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
  const t = useTranslations("builder.characters");
  const tc = useTranslations("common");
  const [name, setName] = useState(npc.name);
  const [race, setRace] = useState(npc.race);
  const [npcClass, setNpcClass] = useState(npc.npc_class ?? "");
  const [description, setDescription] = useState(npc.description ?? "");
  const [personality, setPersonality] = useState(npc.personality ?? "");
  const [motivation, setMotivation] = useState(npc.motivation ?? "");
  const [secrets, setSecrets] = useState(npc.secrets ?? "");
  const [locationId, setLocationId] = useState<string>(npc.location_id ?? "");
  const [isAlive, setIsAlive] = useState(npc.is_alive);
  const [statsEnabled, setStatsEnabled] = useState(npc.stats != null);
  const [statsStr, setStatsStr] = useState(npc.stats?.str != null ? String(npc.stats.str) : "10");
  const [statsDex, setStatsDex] = useState(npc.stats?.dex != null ? String(npc.stats.dex) : "10");
  const [statsCon, setStatsCon] = useState(npc.stats?.con != null ? String(npc.stats.con) : "10");
  const [statsInt, setStatsInt] = useState(npc.stats?.int != null ? String(npc.stats.int) : "10");
  const [statsWis, setStatsWis] = useState(npc.stats?.wis != null ? String(npc.stats.wis) : "10");
  const [statsCha, setStatsCha] = useState(npc.stats?.cha != null ? String(npc.stats.cha) : "10");
  const [aiOpen, setAiOpen] = useState(false);
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
    setIsAlive(npc.is_alive);
    setStatsEnabled(npc.stats != null);
    setStatsStr(npc.stats?.str != null ? String(npc.stats.str) : "10");
    setStatsDex(npc.stats?.dex != null ? String(npc.stats.dex) : "10");
    setStatsCon(npc.stats?.con != null ? String(npc.stats.con) : "10");
    setStatsInt(npc.stats?.int != null ? String(npc.stats.int) : "10");
    setStatsWis(npc.stats?.wis != null ? String(npc.stats.wis) : "10");
    setStatsCha(npc.stats?.cha != null ? String(npc.stats.cha) : "10");
    setAiOpen(false);
    setConfirmDelete(false);
  }, [npc.id]);

  function parseStat(raw: string): number | null {
    const trimmed = raw.trim();
    const n = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(n) || n < 1 || n > 30 || String(n) !== trimmed) {
      return null;
    }
    return n;
  }

  function handleStatsToggle(enable: boolean) {
    setStatsEnabled(enable);
    if (enable) {
      setStatsStr("10");
      setStatsDex("10");
      setStatsCon("10");
      setStatsInt("10");
      setStatsWis("10");
      setStatsCha("10");
    }
  }

  const norm = (v: string) => (v.trim() === "" ? null : v);

  async function handleSave() {
    let stats: NpcStats | null = null;
    if (statsEnabled) {
      const parsed = {
        str: parseStat(statsStr),
        dex: parseStat(statsDex),
        con: parseStat(statsCon),
        int: parseStat(statsInt),
        wis: parseStat(statsWis),
        cha: parseStat(statsCha),
      };
      if (Object.values(parsed).some((v) => v === null)) {
        toast.error(t("statsOutOfRange"));
        return;
      }
      stats = parsed as NpcStats;
    }
    await onSave(npc.id, {
      name,
      race,
      npc_class: norm(npcClass),
      description: norm(description),
      personality: norm(personality),
      motivation: norm(motivation),
      secrets: norm(secrets),
      location_id: locationId === "" ? null : locationId,
      is_alive: isAlive,
      stats,
    });
    toast.success(t("npcSaved"));
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t("npcDetails")}
      </p>

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">{t("name")}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-ring transition-colors"
          placeholder={t("namePlaceholder")}
        />
      </div>

      {/* Race + Class row */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-muted-foreground">{t("race")}</label>
          <input
            type="text"
            value={race}
            onChange={(e) => setRace(e.target.value)}
            className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-ring transition-colors"
            placeholder={t("racePlaceholder")}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-muted-foreground">{t("classRole")}</label>
          <input
            type="text"
            value={npcClass}
            onChange={(e) => setNpcClass(e.target.value)}
            className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-ring transition-colors"
            placeholder={t("classRolePlaceholder")}
          />
        </div>
      </div>

      {/* Location */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">{t("locationLabel")}</label>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-ring transition-colors"
        >
          <option value="">{t("noLocation")}</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">{t("description")}</label>
        <Textarea
          variant="muted"
          minRows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          className="text-sm"
        />
      </div>

      {/* Personality */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground">{t("personality")}</label>
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            aria-label={t("aiPersonalityAriaLabel")}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 px-2 py-0.5 rounded-md transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            {t("aiPersonalityButton")}
          </button>
        </div>
        <Textarea
          variant="muted"
          minRows={3}
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          placeholder={t("personalityPlaceholder")}
          className="text-sm"
        />
      </div>

      {/* Motivation */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">{t("motivation")}</label>
        <Textarea
          variant="muted"
          minRows={2}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          placeholder={t("motivationPlaceholder")}
          className="text-sm"
        />
      </div>

      {/* Secrets — DM eyes only */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">{t("secrets")}</label>
          <span className="text-xs bg-muted border border-border text-muted-foreground px-1.5 py-0.5 rounded">
            {t("dmOnly")}
          </span>
        </div>
        <Textarea
          variant="muted"
          minRows={2}
          value={secrets}
          onChange={(e) => setSecrets(e.target.value)}
          placeholder={t("secretsPlaceholder")}
          className="bg-card border-border/60 text-foreground/80 text-sm placeholder:text-muted-foreground/40"
        />
      </div>

      {/* Alive toggle */}
      <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
        <input
          type="checkbox"
          checked={isAlive}
          onChange={(e) => setIsAlive(e.target.checked)}
          className="w-4 h-4 rounded accent-primary"
        />
        {t("isAliveLabel")}
      </label>

      {/* Combat stats */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground">{t("combatStatsLabel")}</label>
          {statsEnabled ? (
            <button
              type="button"
              onClick={() => handleStatsToggle(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              × {t("statsRemoveButton")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleStatsToggle(true)}
              className="text-xs text-primary hover:underline"
            >
              + {t("statsAddButton")}
            </button>
          )}
        </div>
        {statsEnabled && (
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["str", statsStr, setStatsStr],
                ["dex", statsDex, setStatsDex],
                ["con", statsCon, setStatsCon],
                ["int", statsInt, setStatsInt],
                ["wis", statsWis, setStatsWis],
                ["cha", statsCha, setStatsCha],
              ] as const
            ).map(([key, value, setter]) => (
              <label key={key} className="flex items-center gap-2">
                <span className="text-xs font-mono w-8">{t(key)}</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  step={1}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="bg-muted border border-border rounded-lg px-2 py-1 text-foreground text-sm w-16 text-center focus:outline-none focus:border-ring transition-colors"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2 rounded-lg transition-colors self-start"
      >
        {tc("update")}
      </button>

      {/* Delete */}
      <div className="pt-2 border-t border-border">
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{t("deleteNpcConfirm")}</span>
            <button
              onClick={() => onDelete(npc.id)}
              className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              {t("confirm")}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-sm text-muted-foreground hover:text-foreground/80 transition-colors"
            >
              {t("cancel")}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-red-500/70 hover:text-red-400 transition-colors"
          >
            {t("deleteNpc")}
          </button>
        )}
      </div>

      {/* AI personality modal */}
      <AIAssistModal<PersonalityResult>
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        title={t("aiPersonalityModalTitle")}
        existingContent={
          [
            personality.trim() && `Personality: ${personality.trim()}`,
            motivation.trim() && `Motivation: ${motivation.trim()}`,
          ]
            .filter(Boolean)
            .join("\n\n") || undefined
        }
        placeholder={t("aiPersonalityModalPlaceholder")}
        onGenerate={(req) => api.ai.generateNpcPersonality(npc.id, req)}
        onAccept={(result) => {
          setPersonality(result.personality);
          setMotivation(result.motivation);
          setAiOpen(false);
        }}
        renderResult={(r) => (
          <div className="space-y-2 text-sm">
            <p><strong>Personality:</strong> {r.personality}</p>
            <p><strong>Motivation:</strong> {r.motivation}</p>
          </div>
        )}
        extractPrev={(r) => `${r.personality}\n\n${r.motivation}`}
      />
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
  reloadIdeas: () => Promise<void>;
  onReorderIdeas: (items: IdeaReorderItem[]) => Promise<void>;
  onDeleteIdea: (id: string) => void;
}

export default function CharactersTab({
  campaign,
  ideas,
  onToggleIdea,
  reloadIdeas,
  onReorderIdeas,
  onDeleteIdea,
}: CharactersTabProps) {
  const t = useTranslations("builder.characters");
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [pcs, setPcs] = useState<PlayerCharacter[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<"npc" | "pc" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

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
        err instanceof Error ? err.message : t("loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [campaign.id, t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // -- NPC handlers --

  async function handleAddNpc() {
    try {
      const created = await api.createNpc(campaign.id, {
        name: t("newNpc"),
        race: "Human",
      });
      setNpcs((prev) => [...prev, created]);
      setSelectedType("npc");
      setSelectedId(created.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("createNpcError")
      );
    }
  }

  async function handleSaveNpc(id: string, data: NpcUpdate) {
    try {
      const updated = await api.updateNpc(id, data);
      setNpcs((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("saveNpcError")
      );
    }
  }

  async function handleDeleteNpc(id: string) {
    try {
      await api.deleteNpc(id);
      setNpcs((prev) => prev.filter((n) => n.id !== id));
      if (selectedType === "npc" && selectedId === id) {
        setSelectedType(null);
        setSelectedId(null);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("deleteNpcError")
      );
    }
  }

  // -- PC handlers --

  async function handleAddPc() {
    try {
      const created = await api.createCharacter(campaign.id, {
        name: t("newCharacter"),
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
        err instanceof Error ? err.message : t("createPcError")
      );
    }
  }

  async function handleDeletePc(id: string) {
    try {
      await api.deleteCharacter(id);
      setPcs((prev) => prev.filter((p) => p.id !== id));
      if (selectedType === "pc" && selectedId === id) {
        setSelectedType(null);
        setSelectedId(null);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("deletePcError")
      );
    }
  }

  // Derive selected entities
  const selectedNpc =
    selectedType === "npc" ? (npcs.find((n) => n.id === selectedId) ?? null) : null;
  const selectedPc =
    selectedType === "pc" ? (pcs.find((p) => p.id === selectedId) ?? null) : null;

  return (
    <div className="flex gap-4 h-full">
      {/* Left panel: unified NPC + PC list */}
      <div className="w-[270px] flex-shrink-0 bg-card/60 border border-border rounded-xl p-3 flex flex-col">
        {loading ? (
          <p className="text-xs text-muted-foreground/60 text-center py-4">{t("loading")}</p>
        ) : (
          <>
            <div className="flex-1 min-h-0">
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
            </div>
            <button
              onClick={() => setShowImport(true)}
              className="mt-2 w-full text-xs text-indigo-200 bg-indigo-700/40 hover:bg-indigo-700/60 px-2 py-1.5 rounded-lg transition-colors"
            >
              {t("ddbImport")}
            </button>
          </>
        )}
      </div>

      {/* Center panel: detail editor */}
      <div className="flex-1 min-w-0 bg-card/60 border border-border rounded-xl p-5 overflow-y-auto">
        {selectedNpc ? (
          <NpcDetail
            npc={selectedNpc}
            locations={locations}
            onSave={handleSaveNpc}
            onDelete={handleDeleteNpc}
          />
        ) : selectedPc ? (
          <CharacterEditorForm
            pc={selectedPc}
            campaignId={campaign.id}
            onSaved={loadAll}
            onDelete={(pc) => handleDeletePc(pc.id)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <svg
              className="w-10 h-10 text-muted-foreground/40"
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
              <p className="text-sm text-muted-foreground/60">
                {t("selectToEdit")}
              </p>
              {!loading && npcs.length === 0 && pcs.length === 0 && (
                <p className="text-xs text-muted-foreground/40 mt-1">
                  {t("addToStart")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right panel: ideas */}
      <div className="w-56 flex-shrink-0">
        <div className="sticky top-0 bg-card/80 backdrop-blur-sm rounded-xl border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            {t("characterIdeas")}
          </p>
          <IdeasHelper
            campaignId={campaign.id}
            tag="character"
            ideas={ideas}
            onToggleDone={onToggleIdea}
            onIdeaCreated={reloadIdeas}
            onReorder={onReorderIdeas}
            onDelete={onDeleteIdea}
          />
        </div>
      </div>

      {showImport && (
        <DDBImportModal
          campaignId={campaign.id}
          onImported={loadAll}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
