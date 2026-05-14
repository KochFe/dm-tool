"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { CampaignDraft, ProviderInfo } from "@/types";
import GeneralChat from "@/components/chat/GeneralChat";

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  campaignDraft: CampaignDraft;
}

export default function AssistantDrawer({
  isOpen,
  onClose,
  campaignDraft,
}: AssistantDrawerProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProviders = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await api.getProviders();
      // The wizard chat is tool-less; filter to the providers we can use here.
      const eligible = list.filter((p) => !p.supports_tools);
      setProviders(eligible);
      setSelectedProvider((current) => {
        if (current && eligible.some((p) => p.id === current)) return current;
        if (eligible.length === 0) return "";
        // Prefer the reasoning provider when available.
        const reasoner = eligible.find((p) => p.supports_reasoning);
        return (reasoner ?? eligible[0]).id;
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load providers");
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadProviders();
  }, [isOpen, loadProviders]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-50 w-[420px] bg-card border-l border-border flex flex-col transform transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Brainstorming assistant"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground leading-tight">Assistant</p>
            <p className="text-xs text-muted-foreground leading-tight">
              Brainstorm ideas — no DB access
            </p>
          </div>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="bg-muted border border-border text-foreground text-xs rounded-lg px-2 py-1.5"
            disabled={providers.length === 0}
            aria-label="Assistant provider"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}
              </option>
            ))}
          </select>
          <button
            onClick={onClose}
            aria-label="Close assistant"
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg"
          >
            ✕
          </button>
        </div>

        {loadError ? (
          <div className="px-4 py-3 text-xs text-red-400">{loadError}</div>
        ) : providers.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground text-center">
            No assistants configured. Set DEEPSEEK_API_KEY or GROQ_API_KEY on the server.
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            {selectedProvider && (
              <GeneralChat
                key={selectedProvider}
                provider={selectedProvider}
                campaignDraft={campaignDraft}
              />
            )}
          </div>
        )}
      </aside>
    </>
  );
}
