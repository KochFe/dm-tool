"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCampaign } from "@/contexts/CampaignContext";
import { api } from "@/lib/api";
import type {
  EncounterTemplate,
  EncounterTemplateUpdate,
  PresentPC,
  Location,
  TemplateCombatant,
} from "@/types";
import CombatantsTable from "./CombatantsTable";
import StartEncounterModal from "./StartEncounterModal";

type Props = {
  template: EncounterTemplate;
  locations: Location[];
  onUpdate: (patch: EncounterTemplateUpdate) => Promise<void>;
  onDelete: () => Promise<void>;
};

export default function EncounterDetail({
  template,
  locations,
  onUpdate,
  onDelete,
}: Props) {
  const t = useTranslations("encounters.detail");
  const router = useRouter();
  const { campaign } = useCampaign();
  const [name, setName] = useState(template.name);
  const [notes, setNotes] = useState(template.notes ?? "");
  const [locationId, setLocationId] = useState<string | null>(
    template.location_id
  );
  const [combatants, setCombatants] = useState<TemplateCombatant[]>(
    template.combatants
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const canStart = combatants.length > 0;

  const handleConfirmStart = async (presentPcs: PresentPC[]) => {
    await api.startEncounter(template.id, { present_pcs: presentPcs });
    setStartOpen(false);
    router.push(`/campaigns/${campaign.id}/session?mode=combat`);
  };

  const lastIdRef = useRef(template.id);
  useEffect(() => {
    if (lastIdRef.current !== template.id) {
      setName(template.name);
      setNotes(template.notes ?? "");
      setLocationId(template.location_id);
      setCombatants(template.combatants);
      setConfirmDelete(false);
      lastIdRef.current = template.id;
    }
  }, [template]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const patch: EncounterTemplateUpdate = {};
      if (name !== template.name) patch.name = name;
      if (notes !== (template.notes ?? "")) patch.notes = notes || null;
      if (locationId !== template.location_id) patch.location_id = locationId;
      if (
        JSON.stringify(combatants) !== JSON.stringify(template.combatants)
      ) {
        patch.combatants = combatants;
      }
      if (Object.keys(patch).length > 0) {
        void onUpdate(patch);
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, notes, locationId, combatants]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("namePlaceholder")}
        className="bg-transparent border-b border-border text-xl font-semibold pb-1 focus:outline-none focus:border-primary"
      />

      <div>
        <label className="text-xs text-muted-foreground block mb-1">
          {t("locationLabel")}
        </label>
        <select
          value={locationId ?? ""}
          onChange={(e) => setLocationId(e.target.value || null)}
          className="bg-muted rounded px-2 py-1"
        >
          <option value="">{t("noLocationOption")}</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-1">
          {t("notesLabel")}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notesPlaceholder")}
          className="w-full bg-muted rounded px-3 py-2 min-h-[80px]"
        />
      </div>

      <CombatantsTable rows={combatants} onChange={setCombatants} />

      <div className="flex gap-2 pt-4 border-t border-border">
        <button
          type="button"
          disabled={!canStart}
          onClick={() => setStartOpen(true)}
          className="bg-primary text-primary-foreground rounded px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("startButton")}
        </button>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="ml-auto text-destructive hover:opacity-80 text-sm"
          >
            {t("deleteButton")}
          </button>
        ) : (
          <div className="ml-auto flex gap-2 items-center">
            <span className="text-sm text-foreground/80">
              {t("deleteConfirm")}
            </span>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-sm text-muted-foreground"
            >
              {t("cancelButton")}
            </button>
            <button
              type="button"
              onClick={() => void onDelete()}
              className="text-sm text-destructive hover:opacity-80"
            >
              {t("deleteButton")}
            </button>
          </div>
        )}
      </div>

      <StartEncounterModal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        onConfirm={handleConfirmStart}
      />
    </div>
  );
}
