"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import type { TemplateCombatant } from "@/types";

type Props = {
  rows: TemplateCombatant[];
  onChange: (rows: TemplateCombatant[]) => void;
};

const emptyRow = (): TemplateCombatant => ({
  name: "",
  side: "enemy",
  count: 1,
  hp_max: 1,
  armor_class: 10,
  initiative_bonus: 0,
  notes: null,
});

const parseIntOr = (raw: string, fallback: number): number => {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
};

export default function CombatantsTable({ rows, onChange }: Props) {
  const t = useTranslations("encounters.combatantsTable");

  const updateRow = (idx: number, patch: Partial<TemplateCombatant>) => {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };
  const addRow = () => onChange([...rows, emptyRow()]);

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold">{t("title")}</div>
      {rows.length === 0 && (
        <div className="text-muted-foreground text-sm">{t("emptyRow")}</div>
      )}
      {rows.length > 0 && (
        <div className="grid grid-cols-[2fr_1fr_60px_60px_60px_60px_2fr_40px] gap-2 items-center text-xs text-muted-foreground">
          <div>{t("headerName")}</div>
          <div>{t("headerSide")}</div>
          <div>{t("headerCount")}</div>
          <div>{t("headerHp")}</div>
          <div>{t("headerAc")}</div>
          <div>{t("headerInit")}</div>
          <div>{t("headerNotes")}</div>
          <div></div>
        </div>
      )}
      {rows.map((row, idx) => (
        <div
          key={idx}
          className="grid grid-cols-[2fr_1fr_60px_60px_60px_60px_2fr_40px] gap-2 items-center"
        >
          <input
            type="text"
            value={row.name}
            onChange={(e) => updateRow(idx, { name: e.target.value })}
            className="bg-muted rounded px-2 py-1"
          />
          <select
            value={row.side}
            onChange={(e) =>
              updateRow(idx, { side: e.target.value as "enemy" | "ally" })
            }
            className="bg-muted rounded px-2 py-1"
          >
            <option value="enemy">{t("sideEnemy")}</option>
            <option value="ally">{t("sideAlly")}</option>
          </select>
          <input
            type="number"
            min={1}
            max={99}
            value={row.count}
            onChange={(e) =>
              updateRow(idx, { count: parseIntOr(e.target.value, 1) })
            }
            className="bg-muted rounded px-2 py-1"
          />
          <input
            type="number"
            min={1}
            value={row.hp_max}
            onChange={(e) =>
              updateRow(idx, { hp_max: parseIntOr(e.target.value, 1) })
            }
            className="bg-muted rounded px-2 py-1"
          />
          <input
            type="number"
            min={0}
            value={row.armor_class}
            onChange={(e) =>
              updateRow(idx, { armor_class: parseIntOr(e.target.value, 0) })
            }
            className="bg-muted rounded px-2 py-1"
          />
          <input
            type="number"
            value={row.initiative_bonus}
            onChange={(e) =>
              updateRow(idx, {
                initiative_bonus: parseIntOr(e.target.value, 0),
              })
            }
            className="bg-muted rounded px-2 py-1"
          />
          <input
            type="text"
            value={row.notes ?? ""}
            onChange={(e) =>
              updateRow(idx, { notes: e.target.value || null })
            }
            className="bg-muted rounded px-2 py-1"
          />
          <button
            type="button"
            onClick={() => removeRow(idx)}
            className="text-muted-foreground hover:text-destructive"
            aria-label={t("removeRowLabel")}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm self-start mt-2"
      >
        <Plus size={16} /> {t("addRow")}
      </button>
    </div>
  );
}
