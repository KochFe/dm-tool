"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCampaign } from "@/contexts/CampaignContext";
import type { PresentPC } from "@/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (presentPcs: PresentPC[]) => Promise<void>;
};

type Row = {
  id: string;
  name: string;
  checked: boolean;
  initiative: number;
};

const rollD20 = () => Math.floor(Math.random() * 20) + 1;

export default function StartEncounterModal({
  open,
  onClose,
  onConfirm,
}: Props) {
  const t = useTranslations("encounters.startModal");
  const { characters } = useCampaign();
  const [rows, setRows] = useState<Row[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed rows whenever the modal opens or the character list changes.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setRows(
      characters.map((c) => ({
        id: c.id,
        name: c.name,
        checked: true,
        initiative: 10,
      }))
    );
    setError(null);
  }, [open, characters]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const setRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const rollAll = () =>
    setRows((prev) => prev.map((r) => ({ ...r, initiative: rollD20() })));

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const present: PresentPC[] = rows
        .filter((r) => r.checked)
        .map((r) => ({ player_character_id: r.id, initiative: r.initiative }));
      await onConfirm(present);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("startError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg p-6 w-[480px] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>

        <button
          type="button"
          onClick={rollAll}
          className="mt-4 text-sm text-primary hover:opacity-80"
        >
          {t("rollAllButton")}
        </button>

        <div className="flex flex-col gap-2 mt-3">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={r.checked}
                onChange={(e) => setRow(r.id, { checked: e.target.checked })}
              />
              <div className="flex-1">{r.name}</div>
              <label className="text-xs text-muted-foreground">
                {t("initLabel")}
              </label>
              <input
                type="number"
                value={r.initiative}
                onChange={(e) =>
                  setRow(r.id, {
                    initiative: parseInt(e.target.value || "0", 10) || 0,
                  })
                }
                className="bg-muted rounded px-2 py-1 w-16"
              />
              <button
                type="button"
                onClick={() => setRow(r.id, { initiative: rollD20() })}
                className="text-xs text-primary hover:opacity-80"
                aria-label="roll initiative"
              >
                🎲
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div className="text-destructive text-sm mt-3">{error}</div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-muted-foreground"
          >
            {t("cancelButton")}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="bg-primary text-primary-foreground rounded px-4 py-2 disabled:opacity-50"
          >
            {t("startButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
