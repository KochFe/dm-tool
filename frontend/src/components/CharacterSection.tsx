"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { hpColor, hpBarColor } from "@/lib/utils";
import type { PlayerCharacter } from "@/types";
import ConfirmButton from "@/components/ConfirmButton";
import DDBImportModal from "@/components/DDBImportModal";
import CharacterStatDisplay from "@/components/character/CharacterStatDisplay";
import CharacterEditorForm from "@/components/character/CharacterEditorForm";

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
  const t = useTranslations("characterSection");
  const tc = useTranslations("common");
  const [showForm, setShowForm] = useState(false);
  const [editingPc, setEditingPc] = useState<PlayerCharacter | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const startEdit = (pc: PlayerCharacter) => {
    setEditingPc(pc);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPc(null);
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await api.deleteCharacter(id);
      toast.success(t("toastDeleted"));
      onUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errorOccurred");
      toast.error(t("toastDeleteFailed", { name, message }));
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">{t("heading")}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="text-sm bg-indigo-700/60 hover:bg-indigo-600 text-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            {t("importDDB")}
          </button>
          <button
            onClick={() => {
              if (showForm) {
                closeForm();
              } else {
                setEditingPc(null);
                setShowForm(true);
              }
            }}
            className="text-sm bg-accent hover:bg-accent text-foreground/80 px-3 py-1.5 rounded-lg transition-colors"
          >
            {showForm ? tc("cancel") : tc("add")}
          </button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <CharacterEditorForm
          pc={editingPc}
          campaignId={campaignId}
          onSaved={() => {
            closeForm();
            onUpdate();
          }}
          onCancel={closeForm}
          className="bg-muted/50 border border-border/50 rounded-xl p-4 mb-4"
        />
      )}

      {/* Character List */}
      {characters.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {characters.map((pc) => {
              const isExpanded = expandedCardId === pc.id;

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
                          {pc.race} {pc.character_class} ({t("cardLevel", { level: pc.level })})
                        </span>
                      </p>
                      <div className="mt-1">
                        <p className="text-sm text-muted-foreground">
                          <span
                            className={`font-semibold ${hpColor(pc.hp_current, pc.hp_max)}`}
                          >
                            {t("cardHp", { current: pc.hp_current, max: pc.hp_max })}
                          </span>{" "}
                          <span className="text-muted-foreground">&middot;</span>{" "}
                          {t("cardAc", { ac: pc.armor_class })}{" "}
                          <span className="text-muted-foreground">&middot;</span>{" "}
                          <span className="text-muted-foreground">
                            {t("cardSpeed", { speed: pc.speed, profBonus: pc.proficiency_bonus })}
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
                        onClick={() => setExpandedCardId(isExpanded ? null : pc.id)}
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
                        className="text-sm bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-700/50 dark:hover:bg-red-700 dark:text-red-200 px-3 py-1 rounded-lg transition-colors"
                        onConfirmingChange={(c) => setConfirmingId(c ? pc.id : null)}
                      />
                    </div>
                  </div>

                  {/* Collapsible stats panel */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <CharacterStatDisplay pc={pc} />
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
