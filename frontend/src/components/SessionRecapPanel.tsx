"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import type { ProviderInfo, RecapRequest } from "@/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Props {
  campaignId: string;
}

type StreamState =
  | { kind: "idle" }
  | { kind: "streaming"; text: string }
  | { kind: "done"; text: string }
  | { kind: "error"; message: string };

const ARC_OPTIONS = [3, 5, 10] as const;

export default function SessionRecapPanel({ campaignId }: Props) {
  const t = useTranslations("sessionNotes");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [provider, setProvider] = useState<string>("");
  const [arcN, setArcN] = useState<3 | 5 | 10>(3);
  const [state, setState] = useState<StreamState>({ kind: "idle" });
  const [open, setOpen] = useState(true);
  const lastRequestRef = useRef<RecapRequest | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getProviders()
      .then((list) => {
        if (cancelled) return;
        const usable = list.filter((p) => !p.supports_tools);
        setProviders(usable);
        if (usable.length > 0) setProvider(usable[0].id);
      })
      .catch(() => {
        // Silent — button stays disabled until a provider is available.
      });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, []);

  const run = async (req: RecapRequest) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    lastRequestRef.current = req;
    setState({ kind: "streaming", text: "" });
    let acc = "";
    try {
      const stream = await api.streamSessionRecap(campaignId, req, controller.signal);
      for await (const frame of stream) {
        if (frame.type === "content") {
          acc += frame.delta;
          setState({ kind: "streaming", text: acc });
        } else if (frame.type === "done") {
          setState({ kind: "done", text: acc });
          return;
        } else if (frame.type === "error") {
          setState({ kind: "error", message: frame.message });
          return;
        }
        // reasoning frames intentionally ignored
      }
      // Stream ended without an explicit done — treat what we have as final.
      setState({ kind: "done", text: acc });
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : t("recapError");
      setState({ kind: "error", message });
    }
  };

  const busy = state.kind === "streaming";
  const canRun = !!provider && !busy;

  const handleRecapPrevious = () => {
    if (!provider) return;
    run({ provider, last_n: 1 });
  };

  const handleRecapArc = () => {
    if (!provider) return;
    run({ provider, last_n: arcN });
  };

  const handleRegenerate = () => {
    if (!provider || !lastRequestRef.current) return;
    run({ ...lastRequestRef.current, provider });
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-border bg-card/40 p-3"
    >
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors">
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        {t("recapHeading")}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRecapPrevious}
            disabled={!canRun}
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {t("recapPrevious")}
          </button>
          <button
            type="button"
            onClick={handleRecapArc}
            disabled={!canRun}
            className="text-xs px-3 py-1.5 rounded-md border border-border text-foreground/80 hover:bg-accent disabled:opacity-50 transition-colors"
          >
            {t("recapArc")}
          </button>
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            {ARC_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setArcN(n)}
                disabled={busy}
                className={`text-xs px-2.5 py-1.5 transition-colors ${
                  arcN === n
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {providers.length > 1 && (
            <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{t("providerLabel")}</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                disabled={busy}
                className="bg-muted border border-border text-foreground rounded-md px-2 py-1 text-xs"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(state.kind === "done" || state.kind === "error") && lastRequestRef.current && (
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={!canRun}
              className="text-xs px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
            >
              {t("regenerate")}
            </button>
          )}
        </div>

        {state.kind === "streaming" && (
          <div className="mt-3 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {state.text || (
              <span className="text-muted-foreground italic">
                {t("recapStreaming")}
              </span>
            )}
          </div>
        )}
        {state.kind === "done" && (
          <div className="mt-3 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {state.text}
          </div>
        )}
        {state.kind === "error" && (
          <div className="mt-3 text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-md px-3 py-2">
            {/no closed session notes/i.test(state.message)
              ? t("recapEmpty")
              : state.message || t("recapError")}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
