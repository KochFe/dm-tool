"use client";

import { useState, useEffect, useRef } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { api } from "@/lib/api";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function SessionNotes() {
  const { campaign } = useCampaign();
  const [notes, setNotes] = useState(campaign.notes ?? "");
  const [open, setOpen] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNotes(campaign.notes ?? "");
  }, [campaign.notes]);

  function handleChange(value: string) {
    setNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      api.updateCampaign(campaign.id, { notes: value || null });
    }, 2000);
  }

  function handleBlur() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    api.updateCampaign(campaign.id, { notes: notes || null });
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-gray-100 transition-colors">
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        Session Notes
      </CollapsibleTrigger>
      <CollapsibleContent>
        <textarea
          value={notes}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="Take notes during your session..."
          className="mt-2 w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm resize-none focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors min-h-[120px]"
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
