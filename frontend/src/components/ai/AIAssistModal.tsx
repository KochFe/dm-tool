// frontend/src/components/ai/AIAssistModal.tsx
"use client";

import { useState } from "react";
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-zinc-900 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={handleClose} aria-label="Close" className="text-zinc-500 hover:text-zinc-800">✕</button>
        </div>

        {existingContent ? (
          <details className="text-sm text-zinc-600 dark:text-zinc-400">
            <summary className="cursor-pointer">Current content (will be augmented)</summary>
            <pre className="mt-2 whitespace-pre-wrap rounded bg-zinc-100 dark:bg-zinc-800 p-2 text-xs">
              {existingContent}
            </pre>
          </details>
        ) : null}

        {mode === "initial" && (
          <>
            <textarea
              autoFocus
              className="w-full rounded border p-2 min-h-[100px]"
              placeholder={placeholder ?? "Describe what to generate…"}
              value={steer}
              onChange={(e) => setSteer(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={handleClose}>Cancel</button>
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

        {mode === "generating" && (
          <div className="py-8 text-center text-sm text-zinc-500">Thinking…</div>
        )}

        {mode === "result" && result && (
          <>
            <div className="rounded border p-3 bg-zinc-50 dark:bg-zinc-800">
              {renderResult(result)}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setMode("regen")}>Regenerate with feedback</button>
              <button
                onClick={handleAccept}
                className="rounded bg-green-600 px-3 py-1.5 text-white"
              >
                Accept
              </button>
            </div>
          </>
        )}

        {mode === "regen" && result && (
          <>
            <details className="text-sm text-zinc-600">
              <summary>Previous output</summary>
              <div className="mt-2 rounded bg-zinc-100 dark:bg-zinc-800 p-2 text-xs">
                {renderResult(result)}
              </div>
            </details>
            <textarea
              autoFocus
              className="w-full rounded border p-2 min-h-[80px]"
              placeholder="What should change?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setMode("result")}>Back</button>
              <button
                disabled={feedback.trim().length === 0}
                onClick={handleRegenerate}
                className="rounded bg-blue-600 px-3 py-1.5 text-white disabled:opacity-50"
              >
                Regenerate
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
