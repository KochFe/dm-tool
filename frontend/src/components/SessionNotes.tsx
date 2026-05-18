"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useCampaign } from "@/contexts/CampaignContext";
import { api } from "@/lib/api";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ConfirmButton from "@/components/ConfirmButton";

export default function SessionNotes() {
  const t = useTranslations("sessionNotes");
  const { campaign } = useCampaign();
  const [entryId, setEntryId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [ending, setEnding] = useState(false);
  const [open, setOpen] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    (async () => {
      try {
        const entry = await api.getOpenSessionNote(campaign.id);
        if (!alive) return;
        setEntryId(entry.id);
        setBody(entry.body ?? "");
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [campaign.id]);

  function handleChange(value: string) {
    setBody(value);
    if (!entryId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const targetId = entryId;
    debounceRef.current = setTimeout(() => {
      api.updateSessionNote(targetId, { body: value });
    }, 2000);
  }

  function handleBlur() {
    if (!entryId) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    api.updateSessionNote(entryId, { body });
  }

  async function handleEndSession() {
    setEnding(true);
    try {
      if (debounceRef.current && entryId) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        await api.updateSessionNote(entryId, { body });
      }
      const fresh = await api.endSession(campaign.id);
      setEntryId(fresh.id);
      setBody(fresh.body ?? "");
    } finally {
      setEnding(false);
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors">
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        {t("heading")}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <textarea
          value={body}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={t("placeholder")}
          disabled={!loaded || !entryId}
          className="mt-2 w-full bg-muted border border-border text-foreground rounded-lg px-3 py-2 text-sm resize-none focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors min-h-[120px] disabled:opacity-60"
        />
        <div className="mt-2 flex justify-end">
          <ConfirmButton
            onConfirm={handleEndSession}
            label={t("endSession")}
            confirmLabel={t("endSessionConfirm")}
            disabled={!loaded || !entryId || ending}
            className="text-xs px-3 py-1.5 rounded-md border border-border text-foreground/80 hover:bg-accent disabled:opacity-50 transition-colors"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
