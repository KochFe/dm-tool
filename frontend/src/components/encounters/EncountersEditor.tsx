"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCampaign } from "@/contexts/CampaignContext";
import { api } from "@/lib/api";
import type {
  EncounterTemplate,
  EncounterTemplateUpdate,
} from "@/types";
import EncounterList from "./EncounterList";
import EncounterDetail from "./EncounterDetail";

export default function EncountersEditor() {
  const t = useTranslations("encounters");
  const { campaign, locations } = useCampaign();
  const [templates, setTemplates] = useState<EncounterTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listEncounterTemplates(campaign.id);
      setTemplates(list);
    } finally {
      setLoading(false);
    }
  }, [campaign.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const handleCreate = async () => {
    const created = await api.createEncounterTemplate(campaign.id, {
      name: "New encounter",
      combatants: [],
    });
    setTemplates((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
    );
    setSelectedId(created.id);
  };

  const handleUpdate = async (id: string, patch: EncounterTemplateUpdate) => {
    const updated = await api.updateEncounterTemplate(id, patch);
    setTemplates((prev) =>
      prev
        .map((tpl) => (tpl.id === id ? updated : tpl))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const handleDelete = async (id: string) => {
    await api.deleteEncounterTemplate(id);
    setTemplates((prev) => prev.filter((tpl) => tpl.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const selected = templates.find((tpl) => tpl.id === selectedId) ?? null;

  return (
    <div className="flex flex-1 min-h-[600px] gap-4">
      <div className="w-72 border-r border-border pr-4 overflow-y-auto">
        <EncounterList
          templates={templates}
          locations={locations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={handleCreate}
          loading={loading}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <EncounterDetail
            template={selected}
            locations={locations}
            onUpdate={(patch) => handleUpdate(selected.id, patch)}
            onDelete={() => handleDelete(selected.id)}
          />
        ) : (
          <div className="text-muted-foreground p-8">{t("detail.empty")}</div>
        )}
      </div>
    </div>
  );
}
