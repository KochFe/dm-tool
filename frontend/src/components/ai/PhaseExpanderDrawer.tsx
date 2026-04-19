"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
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

// ── Generating progress ──────────────────────────────────────────────────────
// The pipeline is multi-step. We simulate sequential progress labels to give
// the user a sense of forward movement during the 6-15s wait.
const GENERATION_STEPS = [
  "Analyzing phase context…",
  "Drafting phase description…",
  "Proposing locations…",
  "Creating NPCs…",
  "Composing quests…",
  "Checking consistency…",
];

function GeneratingView() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, GENERATION_STEPS.length - 1));
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-16 px-6">
      {/* Animated shimmer bar */}
      <div className="w-48 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-purple-500/80"
          style={{
            width: `${((stepIndex + 1) / GENERATION_STEPS.length) * 100}%`,
            transition: "width 0.6s ease",
          }}
        />
      </div>

      {/* Pulsing icon */}
      <div className="relative flex items-center justify-center w-14 h-14">
        <div className="absolute inset-0 rounded-full bg-purple-500/10 animate-ping" />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-7 h-7 text-purple-400 relative z-10"
          aria-hidden="true"
        >
          <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          <path d="M18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
        </svg>
      </div>

      {/* Cycling step label */}
      <div className="text-center" aria-live="polite" aria-atomic="true">
        <p className="text-sm font-medium text-foreground">{GENERATION_STEPS[stepIndex]}</p>
        <p className="text-xs text-muted-foreground mt-1">This may take 10–15 seconds</p>
      </div>

      {/* Step dots */}
      <div className="flex items-center gap-1.5">
        {GENERATION_STEPS.map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
              i <= stepIndex ? "bg-purple-400" : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Styled checkbox ──────────────────────────────────────────────────────────
function StyledCheckbox({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className={`w-5 h-5 flex-shrink-0 rounded flex items-center justify-center border-2 transition-colors ${
        checked
          ? "bg-primary border-primary text-primary-foreground"
          : "bg-transparent border-border hover:border-muted-foreground"
      }`}
    >
      {checked && (
        <svg width="11" height="8" viewBox="0 0 11 8" fill="none" aria-hidden="true">
          <path d="M1 4l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

// ── Section header with accept-all toggle + count ────────────────────────────
function SectionHeader({
  icon,
  label,
  total,
  accepted,
  accentClass,
  onSelectAll,
  onDeselectAll,
}: {
  icon: React.ReactNode;
  label: string;
  total: number;
  accepted: number;
  accentClass: string;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  const allSelected = accepted === total;
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className={`${accentClass} w-5 h-5 flex items-center justify-center`} aria-hidden="true">
          {icon}
        </span>
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {accepted}/{total} selected
        </span>
      </div>
      <button
        type="button"
        onClick={allSelected ? onDeselectAll : onSelectAll}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {allSelected ? "Deselect all" : "Select all"}
      </button>
    </div>
  );
}

// ── Empty state for a section ────────────────────────────────────────────────
function EmptySectionNote({ label }: { label: string }) {
  return (
    <p className="text-xs text-muted-foreground italic px-1 py-2">
      No {label} were proposed for this phase.
    </p>
  );
}

// ── Cross-reference chip ─────────────────────────────────────────────────────
function CrossRefChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      {children}
    </span>
  );
}

// ── Reuse badge ──────────────────────────────────────────────────────────────
function ReuseBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 5v14M5 12l7-7 7 7" />
      </svg>
      Existing
    </span>
  );
}

// ── Review item card ─────────────────────────────────────────────────────────
function ReviewItemCard({
  checked,
  onToggle,
  title,
  subtitle,
  body,
  badges,
  checkboxId,
}: {
  checked: boolean;
  onToggle: (v: boolean) => void;
  title: string;
  subtitle?: string;
  body?: React.ReactNode;
  badges?: React.ReactNode;
  checkboxId?: string;
}) {
  return (
    <div
      className={`rounded-lg border transition-colors ${
        checked
          ? "border-border bg-muted/50"
          : "border-border/50 bg-transparent opacity-60"
      }`}
    >
      <div className="flex items-start gap-3 px-3 py-2.5">
        <StyledCheckbox id={checkboxId} checked={checked} onChange={onToggle} />
        {/* Clicking the content area also toggles */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onToggle(!checked)}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">{title}</span>
            {subtitle && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
            {badges}
          </div>
          {body && <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{body}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLTextAreaElement>(null);

  // Per-item accept toggles
  const [acceptDesc, setAcceptDesc] = useState(true);
  const [acceptLocs, setAcceptLocs] = useState<boolean[]>([]);
  const [acceptNpcs, setAcceptNpcs] = useState<boolean[]>([]);
  const [acceptQuests, setAcceptQuests] = useState<boolean[]>([]);

  // Keyboard: Esc to close, focus trap, body scroll lock
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        reset();
        onClose();
      }
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex="0"]'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      toast.success(`Applied ${acceptedCount} item${acceptedCount !== 1 ? "s" : ""} to phase`);
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

  function handleClose() {
    reset();
    onClose();
  }

  const acceptedCount =
    (acceptDesc && bundle?.phase_description ? 1 : 0) +
    acceptLocs.filter(Boolean).length +
    acceptNpcs.filter(Boolean).length +
    acceptQuests.filter(Boolean).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="expander-drawer-title"
        className="fixed inset-y-0 right-0 z-50 flex flex-col bg-card border-l border-border shadow-2xl
          w-full sm:w-[480px] lg:w-[540px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Purple spark icon */}
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-500/15">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-purple-400"
                aria-hidden="true"
              >
                <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
            </span>
            <div>
              <h2 id="expander-drawer-title" className="text-base font-semibold text-foreground">
                AI Expand Phase
              </h2>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {phase === "steer" && "Describe what to add"}
                {phase === "generating" && "Building your phase…"}
                {phase === "review" && "Review and select items to apply"}
                {phase === "applying" && "Applying your selections…"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close drawer"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* STEER phase */}
          {phase === "steer" && (
            <div className="px-5 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Tell the AI what to add to this phase — locations, NPCs, quests, or a new description. Be specific for better results.
              </p>
              <textarea
                ref={firstFocusRef}
                autoFocus
                className="w-full rounded-lg border border-border bg-muted text-foreground placeholder:text-muted-foreground px-3 py-2.5 text-sm min-h-[140px] resize-none focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/40 transition-colors"
                placeholder="e.g. 'Add a brewery district with 2 rival innkeepers and a quest about a missing shipment.'"
                value={steer}
                onChange={(e) => setSteer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && steer.trim().length > 0) {
                    handleGenerate();
                  }
                }}
              />
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          )}

          {/* GENERATING phase */}
          {phase === "generating" && <GeneratingView />}

          {/* REVIEW phase */}
          {phase === "review" && bundle && (
            <div className="px-5 py-5 space-y-6">
              {/* Phase Description */}
              {bundle.phase_description !== null && (
                <section>
                  <SectionHeader
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    }
                    label="Description"
                    total={1}
                    accepted={acceptDesc ? 1 : 0}
                    accentClass="text-muted-foreground"
                    onSelectAll={() => setAcceptDesc(true)}
                    onDeselectAll={() => setAcceptDesc(false)}
                  />
                  <ReviewItemCard
                    checked={acceptDesc}
                    onToggle={setAcceptDesc}
                    title="Phase description"
                    body={<span className="whitespace-pre-wrap">{bundle.phase_description}</span>}
                    checkboxId="desc-toggle"
                  />
                </section>
              )}

              {/* Locations */}
              <section>
                <SectionHeader
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  }
                  label="Locations"
                  total={bundle.draft_locations.length}
                  accepted={acceptLocs.filter(Boolean).length}
                  accentClass="text-emerald-400"
                  onSelectAll={() => setAcceptLocs(bundle.draft_locations.map(() => true))}
                  onDeselectAll={() => setAcceptLocs(bundle.draft_locations.map(() => false))}
                />
                {bundle.draft_locations.length === 0 ? (
                  <EmptySectionNote label="locations" />
                ) : (
                  <div className="space-y-2">
                    {bundle.draft_locations.map((loc, i) => (
                      <ReviewItemCard
                        key={i}
                        checkboxId={`loc-${i}`}
                        checked={acceptLocs[i] ?? false}
                        onToggle={(v) => {
                          const copy = [...acceptLocs];
                          copy[i] = v;
                          setAcceptLocs(copy);
                        }}
                        title={loc.name}
                        badges={loc.reuse_id ? <ReuseBadge /> : undefined}
                        body={loc.description}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* NPCs */}
              <section>
                <SectionHeader
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  }
                  label="NPCs"
                  total={bundle.draft_npcs.length}
                  accepted={acceptNpcs.filter(Boolean).length}
                  accentClass="text-blue-400"
                  onSelectAll={() => setAcceptNpcs(bundle.draft_npcs.map(() => true))}
                  onDeselectAll={() => setAcceptNpcs(bundle.draft_npcs.map(() => false))}
                />
                {bundle.draft_npcs.length === 0 ? (
                  <EmptySectionNote label="NPCs" />
                ) : (
                  <div className="space-y-2">
                    {bundle.draft_npcs.map((npc, i) => (
                      <ReviewItemCard
                        key={i}
                        checkboxId={`npc-${i}`}
                        checked={acceptNpcs[i] ?? false}
                        onToggle={(v) => {
                          const copy = [...acceptNpcs];
                          copy[i] = v;
                          setAcceptNpcs(copy);
                        }}
                        title={npc.name}
                        subtitle={`— ${npc.role}`}
                        badges={
                          npc.location_index != null ? (
                            <CrossRefChip>at location #{npc.location_index + 1}</CrossRefChip>
                          ) : undefined
                        }
                        body={
                          <span>
                            <span className="font-medium text-foreground/70">Personality:</span>{" "}
                            {npc.personality}
                            <br />
                            <span className="font-medium text-foreground/70">Motivation:</span>{" "}
                            {npc.motivation}
                          </span>
                        }
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Quests */}
              <section>
                <SectionHeader
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                  }
                  label="Quests"
                  total={bundle.draft_quests.length}
                  accepted={acceptQuests.filter(Boolean).length}
                  accentClass="text-amber-400"
                  onSelectAll={() => setAcceptQuests(bundle.draft_quests.map(() => true))}
                  onDeselectAll={() => setAcceptQuests(bundle.draft_quests.map(() => false))}
                />
                {bundle.draft_quests.length === 0 ? (
                  <EmptySectionNote label="quests" />
                ) : (
                  <div className="space-y-2">
                    {bundle.draft_quests.map((q, i) => (
                      <ReviewItemCard
                        key={i}
                        checkboxId={`quest-${i}`}
                        checked={acceptQuests[i] ?? false}
                        onToggle={(v) => {
                          const copy = [...acceptQuests];
                          copy[i] = v;
                          setAcceptQuests(copy);
                        }}
                        title={q.title}
                        body={q.description}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Consistency notes — advisory callout */}
              {bundle.consistency_notes.length > 0 && (
                <section
                  role="note"
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 flex-shrink-0" aria-hidden="true">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span className="text-sm font-semibold text-amber-400">Consistency notes</span>
                  </div>
                  <ul className="space-y-1">
                    {bundle.consistency_notes.map((n, i) => (
                      <li key={i} className="text-xs text-amber-300/80 leading-relaxed flex gap-2">
                        <span className="text-amber-400/60 flex-shrink-0 mt-0.5">•</span>
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          )}

          {/* APPLYING phase */}
          {phase === "applying" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16">
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Saving to campaign…</p>
            </div>
          )}
        </div>

        {/* Footer action bar */}
        <div className="flex-shrink-0 border-t border-border px-5 py-4">
          {phase === "steer" && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Esc</kbd>
                {" to cancel"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClose}
                  className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={steer.trim().length === 0}
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 text-sm font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                  Expand Phase
                </button>
              </div>
            </div>
          )}

          {phase === "review" && (
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{acceptedCount}</span>
                {" "}item{acceptedCount !== 1 ? "s" : ""} selected
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClose}
                  className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  Discard
                </button>
                <button
                  disabled={acceptedCount === 0}
                  onClick={handleApply}
                  className="flex items-center gap-1.5 text-sm font-medium bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Apply {acceptedCount > 0 ? `${acceptedCount} item${acceptedCount !== 1 ? "s" : ""}` : ""}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
