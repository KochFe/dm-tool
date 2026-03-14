'use client';

import { useState, useEffect, useRef, type ReactElement } from 'react';
import { api } from '@/lib/api';
import type { GeneratedEncounter, GeneratedNpc, GeneratedLoot } from '@/types';

interface SmartPromptsProps {
  campaignId: string;
  currentLocationName: string | null;
  partyLevel: number;
  onResult: (
    type: 'encounter' | 'npc' | 'loot',
    result: GeneratedEncounter | GeneratedNpc | GeneratedLoot
  ) => void;
}

type GeneratorType = 'encounter' | 'npc' | 'loot';

function formatError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.startsWith('[object')) {
      return 'Generation failed. Please try again.';
    }
    return msg;
  }
  return 'An unexpected error occurred.';
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function SwordIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
      <path d="M19 21l2-2" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function GemIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 19 9 12 22 5 9" />
      <line x1="5" y1="9" x2="19" y2="9" />
    </svg>
  );
}

const BUTTONS: {
  type: GeneratorType;
  label: string;
  Icon: () => ReactElement;
}[] = [
  { type: 'encounter', label: 'Generate Encounter', Icon: SwordIcon },
  { type: 'npc', label: 'Generate NPC', Icon: PersonIcon },
  { type: 'loot', label: 'Generate Loot', Icon: GemIcon },
];

export default function SmartPrompts({
  campaignId,
  currentLocationName,
  partyLevel,
  onResult,
}: SmartPromptsProps) {
  const [loading, setLoading] = useState<GeneratorType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending dismiss timer on unmount
  useEffect(() => {
    return () => {
      if (errorTimerRef.current !== null) {
        clearTimeout(errorTimerRef.current);
      }
    };
  }, []);

  function showError(message: string) {
    setError(message);
    if (errorTimerRef.current !== null) {
      clearTimeout(errorTimerRef.current);
    }
    errorTimerRef.current = setTimeout(() => {
      setError(null);
      errorTimerRef.current = null;
    }, 5000);
  }

  async function handleGenerate(type: GeneratorType) {
    if (loading !== null || currentLocationName === null) return;

    setLoading(type);
    setError(null);

    try {
      let result: GeneratedEncounter | GeneratedNpc | GeneratedLoot;

      if (type === 'encounter') {
        result = await api.generateEncounter(campaignId);
      } else if (type === 'npc') {
        result = await api.generateNpc(campaignId);
      } else {
        result = await api.generateLoot(campaignId);
      }

      onResult(type, result);
    } catch (err) {
      showError(formatError(err));
    } finally {
      setLoading(null);
    }
  }

  const disabled = currentLocationName === null;

  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
          AI Generators
        </h2>
        {disabled && (
          <span className="text-xs text-gray-500 italic">Set a location first</span>
        )}
        {!disabled && (
          <span className="text-xs text-gray-500">
            {currentLocationName} &middot; Party Level {partyLevel}
          </span>
        )}
      </div>

      {/* Button row */}
      <div className="flex flex-wrap gap-2">
        {BUTTONS.map(({ type, label, Icon }) => {
          const isActive = loading === type;
          const isDisabled = disabled || loading !== null;

          return (
            <button
              key={type}
              onClick={() => handleGenerate(type)}
              disabled={isDisabled}
              title={disabled ? 'Set a location first to enable AI generators' : label}
              className={`
                flex items-center gap-2
                bg-gray-800 border border-gray-700 rounded-lg px-4 py-2
                text-sm text-gray-200
                transition-colors duration-150
                ${isDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-700 hover:border-gray-600 cursor-pointer'
                }
              `}
            >
              {isActive ? <SpinnerIcon /> : <Icon />}
              <span>{isActive ? 'Generating\u2026' : label}</span>
            </button>
          );
        })}
      </div>

      {/* Error banner (auto-dismisses after 5 s) */}
      {error !== null && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
