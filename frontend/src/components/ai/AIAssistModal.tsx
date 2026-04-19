// frontend/src/components/ai/AIAssistModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import type { AIAssistRequest } from "@/lib/api";

export type AIAssistModalProps<T> = {
  open: boolean;
  onClose: () => void;
  title: string;
  existingContent?: string;
  placeholder?: string;
  /** Calls the backend and returns the result envelope's `data`. */
  onGenerate: (req: AIAssistRequest) => Promise<T>;
  /** Invoked when the user clicks Accept — should insert the result into the parent form. */
  onAccept: (result: T) => void;
  /** Render the result into a readable preview (varies by endpoint). */
  renderResult: (result: T) => React.ReactNode;
  /** Extract the primary text for previous_output during regeneration. */
  extractPrev: (result: T) => string;
};

type Mode = "initial" | "generating" | "result" | "regen";

// Shimmer / pulse dots animation for the generating state
function ThinkingIndicator() {
  return (
    <div className="py-10 flex flex-col items-center gap-4">
      {/* Animated sparkle icon */}
      <div className="relative flex items-center justify-center w-12 h-12">
        <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6 text-blue-400 relative z-10"
          aria-hidden="true"
        >
          <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          <path d="M18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
        </svg>
      </div>
      {/* Pulsing dots */}
      <div className="flex items-center gap-1.5" aria-live="polite" aria-label="Generating content">
        <span className="w-2 h-2 rounded-full bg-blue-400/70 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-blue-400/70 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-blue-400/70 animate-bounce" />
      </div>
      <p className="text-sm text-muted-foreground">Generating…</p>
    </div>
  );
}

export function AIAssistModal<T>({
  open,
  onClose,
  title,
  existingContent,
  placeholder,
  onGenerate,
  onAccept,
  renderResult,
  extractPrev,
}: AIAssistModalProps<T>) {
  const [mode, setMode] = useState<Mode>("initial");
  const [steer, setSteer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLTextAreaElement>(null);

  // Esc to close + focus trap
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
      // Simple focus trap: keep Tab within dialog
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
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
    // Lock body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  if (!open) return null;

  async function handleGenerate() {
    setError(null);
    setMode("generating");
    try {
      const req: AIAssistRequest = {
        steer,
        existing_content: existingContent ?? null,
      };
      const out = await onGenerate(req);
      setResult(out);
      setMode("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setMode("initial");
    }
  }

  async function handleRegenerate() {
    if (!result) return;
    setError(null);
    setMode("generating");
    try {
      const req: AIAssistRequest = {
        steer,
        existing_content: existingContent ?? null,
        previous_output: extractPrev(result),
        feedback,
      };
      const out = await onGenerate(req);
      setResult(out);
      setMode("result");
      setFeedback("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regeneration failed");
      setMode("regen");
    }
  }

  function handleAccept() {
    if (result) onAccept(result);
    reset();
    onClose();
  }

  function reset() {
    setMode("initial");
    setSteer("");
    setFeedback("");
    setResult(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const modeLabel: Record<Mode, string> = {
    initial: "Steer generation",
    generating: "Generating…",
    result: "Review result",
    regen: "Refine with feedback",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-modal-title"
        className="w-full max-w-2xl rounded-xl bg-card border border-border shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header — always visible, shows breadcrumb of current step */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 id="ai-modal-title" className="text-base font-semibold text-foreground">
              {title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5" aria-live="polite">
              {modeLabel[mode]}
            </p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close dialog"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Existing content callout — collapsed by default, not spammy */}
          {existingContent && (
            <details className="group rounded-lg border border-border bg-muted/50">
              <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm text-muted-foreground select-none hover:text-foreground transition-colors list-none">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="transition-transform group-open:rotate-90 flex-shrink-0"
                  aria-hidden="true"
                >
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Current content (will be augmented)</span>
              </summary>
              <pre className="px-3 pb-3 whitespace-pre-wrap text-xs text-muted-foreground font-mono leading-relaxed border-t border-border mt-0 pt-2">
                {existingContent}
              </pre>
            </details>
          )}

          {mode === "initial" && (
            <>
              <textarea
                ref={firstFocusableRef}
                autoFocus
                className="w-full rounded-lg border border-border bg-muted text-foreground placeholder:text-muted-foreground px-3 py-2.5 text-sm min-h-[110px] resize-none focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/40 transition-colors"
                placeholder={placeholder ?? "Describe what to generate…"}
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
            </>
          )}

          {mode === "generating" && <ThinkingIndicator />}

          {mode === "result" && result && (
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-foreground">
              {renderResult(result)}
            </div>
          )}

          {mode === "regen" && result && (
            <>
              <details className="group rounded-lg border border-border bg-muted/50">
                <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm text-muted-foreground select-none hover:text-foreground transition-colors list-none">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="transition-transform group-open:rotate-90 flex-shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Previous result</span>
                </summary>
                <div className="px-3 pb-3 text-xs text-muted-foreground border-t border-border pt-2">
                  {renderResult(result)}
                </div>
              </details>
              <textarea
                autoFocus
                className="w-full rounded-lg border border-border bg-muted text-foreground placeholder:text-muted-foreground px-3 py-2.5 text-sm min-h-[90px] resize-none focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/40 transition-colors"
                placeholder="What should change? Be specific for better results."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && feedback.trim().length > 0) {
                    handleRegenerate();
                  }
                }}
              />
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer — fixed action bar */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border flex-shrink-0 bg-muted/30">
          <div className="text-xs text-muted-foreground">
            {(mode === "initial" || mode === "regen") && (
              <span>
                <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
                  {typeof navigator !== "undefined" && navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}
                </kbd>
                {" + "}
                <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">↵</kbd>
                {" to generate"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {mode === "initial" && (
              <>
                <button
                  onClick={handleClose}
                  className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={steer.trim().length === 0}
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                  Generate
                </button>
              </>
            )}
            {mode === "result" && (
              <>
                <button
                  onClick={() => setMode("regen")}
                  className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  Refine…
                </button>
                <button
                  onClick={handleAccept}
                  className="flex items-center gap-1.5 text-sm font-medium bg-green-700 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Accept
                </button>
              </>
            )}
            {mode === "regen" && (
              <>
                <button
                  onClick={() => setMode("result")}
                  className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <button
                  disabled={feedback.trim().length === 0}
                  onClick={handleRegenerate}
                  className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M8 16H3v5" />
                  </svg>
                  Regenerate
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
