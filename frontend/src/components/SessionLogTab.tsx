"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import type { CampaignSessionNote } from "@/types";
import ConfirmButton from "@/components/ConfirmButton";

interface Props {
  campaignId: string;
}

interface LogEntryProps {
  entry: CampaignSessionNote;
  expanded: boolean;
  onToggle: () => void;
  onPatch: (patch: { title?: string | null; body?: string | null }) => Promise<void>;
  onDelete: () => Promise<void>;
}

function LogEntry({ entry, expanded, onToggle, onPatch, onDelete }: LogEntryProps) {
  const t = useTranslations("sessionNotes");
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  async function persistIfChanged(field: "title" | "body", current: string | null) {
    const existing = field === "title" ? entry.title : entry.body;
    const normalizedExisting = existing ?? "";
    const normalizedCurrent = current ?? "";
    if (normalizedExisting === normalizedCurrent) return;
    setSaving("saving");
    try {
      await onPatch({ [field]: current });
      setSaving("saved");
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaving("idle"), 1500);
    } catch {
      setSaving("idle");
    }
  }

  const dateLabel = entry.closed_at
    ? new Date(entry.closed_at).toLocaleString()
    : new Date(entry.created_at).toLocaleString();
  const titleLabel =
    entry.title?.trim() ||
    t("defaultTitle", { date: new Date(entry.created_at).toLocaleDateString() });

  return (
    <li className="py-3">
      <div className="flex items-baseline gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex-1 text-left flex items-baseline gap-2 group"
        >
          <span
            className={`text-xs text-muted-foreground transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
          <span className="font-medium text-foreground group-hover:text-primary transition-colors">
            {titleLabel}
          </span>
          <span className="text-xs text-muted-foreground">{dateLabel}</span>
        </button>
        {saving !== "idle" && (
          <span className="text-xs text-muted-foreground">
            {saving === "saving" ? t("saving") : t("saved")}
          </span>
        )}
        <ConfirmButton
          onConfirm={onDelete}
          label={t("deleteEntry")}
          confirmLabel={t("deleteConfirm")}
          className="text-xs px-2.5 py-1 rounded-md text-red-500 hover:bg-red-500/10 transition-colors"
        />
      </div>
      {expanded && (
        <div className="mt-3 space-y-2 pl-5">
          <input
            ref={titleRef}
            defaultValue={entry.title ?? ""}
            placeholder={t("titlePlaceholder")}
            onBlur={(e) => persistIfChanged("title", e.currentTarget.value || null)}
            className="w-full bg-muted border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors"
          />
          <textarea
            ref={bodyRef}
            defaultValue={entry.body ?? ""}
            placeholder={t("bodyPlaceholder")}
            onBlur={(e) => persistIfChanged("body", e.currentTarget.value)}
            className="w-full bg-muted border border-border text-foreground rounded-lg px-3 py-2 text-sm resize-none focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors min-h-[160px]"
          />
        </div>
      )}
    </li>
  );
}

export default function SessionLogTab({ campaignId }: Props) {
  const t = useTranslations("sessionNotes");
  const [entries, setEntries] = useState<CampaignSessionNote[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .listSessionNotes(campaignId, "closed")
      .then((list) => {
        if (alive) setEntries(list);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      alive = false;
    };
  }, [campaignId]);

  async function handlePatch(
    id: string,
    patch: { title?: string | null; body?: string | null },
  ) {
    const updated = await api.updateSessionNote(id, patch);
    setEntries((prev) =>
      prev ? prev.map((e) => (e.id === id ? updated : e)) : prev,
    );
  }

  async function handleDelete(id: string) {
    await api.deleteSessionNote(id);
    setEntries((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
    if (expanded === id) setExpanded(null);
  }

  if (error) {
    return <div className="text-sm text-red-400">{error}</div>;
  }
  if (entries === null) {
    return <div className="text-sm text-muted-foreground">{t("loading")}</div>;
  }
  if (entries.length === 0) {
    return <div className="text-sm text-muted-foreground">{t("emptyLog")}</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-2">{t("tabTitle")}</h2>
      <ul className="divide-y divide-border">
        {entries.map((entry) => (
          <LogEntry
            key={entry.id}
            entry={entry}
            expanded={expanded === entry.id}
            onToggle={() =>
              setExpanded((cur) => (cur === entry.id ? null : entry.id))
            }
            onPatch={(patch) => handlePatch(entry.id, patch)}
            onDelete={() => handleDelete(entry.id)}
          />
        ))}
      </ul>
    </div>
  );
}
