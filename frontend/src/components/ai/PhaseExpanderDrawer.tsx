"use client";

import { useState } from "react";
import { api, type ApplyPhaseBundleRequest, type DraftPhaseBundle } from "@/lib/api";

type Phase = "steer" | "generating" | "review" | "applying";

type Props = {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  phaseId: string;
  /** Called after successful apply so the parent can refresh. */
  onApplied: () => void;
};

export function PhaseExpanderDrawer({
  open,
  onClose,
  campaignId,
  phaseId,
  onApplied,
}: Props) {
  const [phase, setPhase] = useState<Phase>("steer");
  const [steer, setSteer] = useState("");
  const [bundle, setBundle] = useState<DraftPhaseBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Per-item accept toggles
  const [acceptDesc, setAcceptDesc] = useState(true);
  const [acceptLocs, setAcceptLocs] = useState<boolean[]>([]);
  const [acceptNpcs, setAcceptNpcs] = useState<boolean[]>([]);
  const [acceptQuests, setAcceptQuests] = useState<boolean[]>([]);

  if (!open) return null;

  async function handleGenerate() {
    setError(null);
    setPhase("generating");
    try {
      const res = await api.ai.expandPhase(campaignId, phaseId, { user_steer: steer });
      setBundle(res);
      setAcceptDesc(res.phase_description !== null);
      setAcceptLocs(res.draft_locations.map(() => true));
      setAcceptNpcs(res.draft_npcs.map(() => true));
      setAcceptQuests(res.draft_quests.map(() => true));
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Expansion failed");
      setPhase("steer");
    }
  }

  async function handleApply() {
    if (!bundle) return;
    setPhase("applying");
    const payload: ApplyPhaseBundleRequest = {
      phase_description: acceptDesc ? bundle.phase_description : null,
      accepted_locations: bundle.draft_locations.filter((_, i) => acceptLocs[i]),
      accepted_npcs: bundle.draft_npcs.filter((_, i) => acceptNpcs[i]),
      accepted_quests: bundle.draft_quests.filter((_, i) => acceptQuests[i]),
    };
    try {
      await api.ai.applyPhaseBundle(campaignId, phaseId, payload);
      onApplied();
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apply failed");
      setPhase("review");
    }
  }

  function reset() {
    setPhase("steer");
    setSteer("");
    setBundle(null);
    setError(null);
  }

  const acceptedCount =
    (acceptDesc && bundle?.phase_description ? 1 : 0) +
    acceptLocs.filter(Boolean).length +
    acceptNpcs.filter(Boolean).length +
    acceptQuests.filter(Boolean).length;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[540px] bg-white dark:bg-zinc-900 shadow-xl p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">AI Expand Phase</h2>
        <button onClick={() => { reset(); onClose(); }} aria-label="Close">✕</button>
      </div>

      {phase === "steer" && (
        <>
          <label className="block text-sm font-medium mb-2">
            What should be added to this phase?
          </label>
          <textarea
            autoFocus
            className="w-full rounded border p-2 min-h-[140px]"
            placeholder="e.g. 'Add a brewery location with 2 staff, and a quest about a missing cask.'"
            value={steer}
            onChange={(e) => setSteer(e.target.value)}
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => { reset(); onClose(); }}>Cancel</button>
            <button
              disabled={steer.trim().length === 0}
              onClick={handleGenerate}
              className="rounded bg-blue-600 px-3 py-1.5 text-white disabled:opacity-50"
            >
              Generate
            </button>
          </div>
        </>
      )}

      {phase === "generating" && (
        <div className="py-12 text-center text-sm text-zinc-500">
          Expanding phase… this takes a few seconds.
        </div>
      )}

      {phase === "review" && bundle && (
        <>
          {bundle.phase_description !== null && (
            <section className="mb-4">
              <label className="flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={acceptDesc}
                  onChange={(e) => setAcceptDesc(e.target.checked)}
                />
                New description
              </label>
              <p className="mt-2 whitespace-pre-wrap rounded bg-zinc-50 dark:bg-zinc-800 p-2 text-sm">
                {bundle.phase_description}
              </p>
            </section>
          )}

          {bundle.draft_locations.length > 0 && (
            <section className="mb-4">
              <h3 className="font-medium mb-2">
                Locations ({bundle.draft_locations.length})
              </h3>
              {bundle.draft_locations.map((loc, i) => (
                <div key={i} className="mb-2 rounded border p-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={acceptLocs[i] ?? false}
                      onChange={(e) => {
                        const copy = [...acceptLocs];
                        copy[i] = e.target.checked;
                        setAcceptLocs(copy);
                      }}
                    />
                    <span className="font-medium">{loc.name}</span>
                    {loc.reuse_id && (
                      <span className="text-xs text-amber-600">(reuses existing)</span>
                    )}
                  </label>
                  <p className="text-sm text-zinc-600 mt-1">{loc.description}</p>
                </div>
              ))}
            </section>
          )}

          {bundle.draft_npcs.length > 0 && (
            <section className="mb-4">
              <h3 className="font-medium mb-2">NPCs ({bundle.draft_npcs.length})</h3>
              {bundle.draft_npcs.map((npc, i) => (
                <div key={i} className="mb-2 rounded border p-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={acceptNpcs[i] ?? false}
                      onChange={(e) => {
                        const copy = [...acceptNpcs];
                        copy[i] = e.target.checked;
                        setAcceptNpcs(copy);
                      }}
                    />
                    <span className="font-medium">{npc.name}</span>
                    <span className="text-xs text-zinc-500">— {npc.role}</span>
                    {npc.location_index != null && (
                      <span className="text-xs text-blue-600">
                        (at location #{npc.location_index + 1})
                      </span>
                    )}
                  </label>
                  <p className="text-sm text-zinc-600 mt-1">
                    <strong>Personality:</strong> {npc.personality}<br />
                    <strong>Motivation:</strong> {npc.motivation}
                  </p>
                </div>
              ))}
            </section>
          )}

          {bundle.draft_quests.length > 0 && (
            <section className="mb-4">
              <h3 className="font-medium mb-2">Quests ({bundle.draft_quests.length})</h3>
              {bundle.draft_quests.map((q, i) => (
                <div key={i} className="mb-2 rounded border p-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={acceptQuests[i] ?? false}
                      onChange={(e) => {
                        const copy = [...acceptQuests];
                        copy[i] = e.target.checked;
                        setAcceptQuests(copy);
                      }}
                    />
                    <span className="font-medium">{q.title}</span>
                  </label>
                  <p className="text-sm text-zinc-600 mt-1">{q.description}</p>
                </div>
              ))}
            </section>
          )}

          {bundle.consistency_notes.length > 0 && (
            <section className="mb-4 rounded bg-amber-50 dark:bg-amber-900/20 p-2">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Consistency notes
              </h3>
              <ul className="mt-1 text-xs list-disc list-inside">
                {bundle.consistency_notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </section>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => { reset(); onClose(); }}>Cancel</button>
            <button
              disabled={acceptedCount === 0}
              onClick={handleApply}
              className="rounded bg-green-600 px-3 py-1.5 text-white disabled:opacity-50"
            >
              Apply {acceptedCount} item{acceptedCount !== 1 ? "s" : ""}
            </button>
          </div>
        </>
      )}

      {phase === "applying" && (
        <div className="py-12 text-center text-sm text-zinc-500">Applying…</div>
      )}
    </div>
  );
}
