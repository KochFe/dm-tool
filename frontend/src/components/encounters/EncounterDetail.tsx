"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  EncounterTemplate,
  EncounterTemplateUpdate,
  Location,
  TemplateCombatant,
} from "@/types";
import CombatantsTable from "./CombatantsTable";

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
  const [name, setName] = useState(template.name);
  const [notes, setNotes] = useState(template.notes ?? "");
  const [locationId, setLocationId] = useState<string | null>(
    template.location_id
  );
  const [combatants, setCombatants] = useState<TemplateCombatant[]>(
    template.combatants
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

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
          disabled
          title="Wired in Phase C"
          className="bg-primary/50 text-primary-foreground/50 rounded px-4 py-2 cursor-not-allowed"
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
    </div>
  );
}
