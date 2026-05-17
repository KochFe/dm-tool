'use client';

import { useState, useEffect, useRef, type ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import type { GeneratedEncounter, GeneratedNpc, GeneratedLoot, LootAmount, LootTier } from '@/types';
import LootGeneratorDialog from './LootGeneratorDialog';

interface SmartPromptsProps {
  campaignId: string;
  currentLocationName: string | null;
  lootAutoContext: {
    partyLevel: number;
    hasPcs: boolean;
    locationName: string | null;
    biome: string | null;
  };
  onResult: (
    type: 'encounter' | 'npc' | 'loot',
    result: GeneratedEncounter | GeneratedNpc | GeneratedLoot
  ) => void;
}

type GeneratorType = 'encounter' | 'npc' | 'loot';

function formatError(err: unknown, fallbackMsg: string, unexpectedMsg: string): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.startsWith('[object')) {
      return fallbackMsg;
    }
    return msg;
  }
  return unexpectedMsg;
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

const BUTTON_TYPES: {
  type: GeneratorType;
  labelKey: 'labelEncounter' | 'labelNpc' | 'labelLoot';
  Icon: () => ReactElement;
}[] = [
  { type: 'encounter', labelKey: 'labelEncounter', Icon: SwordIcon },
  { type: 'npc', labelKey: 'labelNpc', Icon: PersonIcon },
  { type: 'loot', labelKey: 'labelLoot', Icon: GemIcon },
];

export default function SmartPrompts({
  campaignId,
  currentLocationName,
  lootAutoContext,
  onResult,
}: SmartPromptsProps) {
  const t = useTranslations('smartPrompts');
  const [loading, setLoading] = useState<GeneratorType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [npcRole, setNpcRole] = useState('');
  const [showNpcPrompt, setShowNpcPrompt] = useState(false);
  const [showLootDialog, setShowLootDialog] = useState(false);
  const [lootLoading, setLootLoading] = useState(false);
  const [lootError, setLootError] = useState<string | null>(null);
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

    if (type === 'loot') {
      setLootError(null);
      setShowLootDialog(true);
      return;
    }

    setLoading(type);
    setError(null);

    try {
      let result: GeneratedEncounter | GeneratedNpc;

      if (type === 'encounter') {
        result = await api.generateEncounter(campaignId);
      } else {
        result = await api.generateNpc(campaignId, npcRole.trim() ? { role: npcRole.trim() } : undefined);
      }

      onResult(type, result);
    } catch (err) {
      showError(formatError(err, t('errFallback'), t('errUnexpected')));
    } finally {
      setLoading(null);
    }
  }

  async function handleLootGenerate(params: { tier: LootTier; amount: LootAmount; context: string }) {
    setLootLoading(true);
    setLootError(null);
    try {
      const result = await api.generateLoot(campaignId, {
        tier: params.tier,
        amount: params.amount,
        context: params.context || undefined,
      });
      setShowLootDialog(false);
      onResult('loot', result);
    } catch (err) {
      setLootError(formatError(err, t('errFallback'), t('errUnexpected')));
    } finally {
      setLootLoading(false);
    }
  }

  const disabled = currentLocationName === null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">
          {t('header')}
        </h2>
        {disabled && (
          <span className="text-xs text-muted-foreground italic">{t('noLocationHint')}</span>
        )}
        {!disabled && (
          <span className="text-xs text-muted-foreground">
            {currentLocationName ?? ''}
          </span>
        )}
      </div>

      {/* Button row */}
      <div className="flex flex-wrap gap-2 items-center">
        {BUTTON_TYPES.map(({ type, labelKey, Icon }) => {
          const label = t(labelKey);
          const isActive = loading === type;
          const isDisabled = disabled || loading !== null;

          function handleClick() {
            if (type === 'npc') {
              setNpcRole('');
              setShowNpcPrompt(true);
            } else {
              handleGenerate(type);
            }
          }

          return (
            <div key={type} className="flex items-center gap-2">
              <button
                onClick={handleClick}
                disabled={isDisabled}
                title={disabled ? t('tooltipDisabled') : label}
                className={`
                  flex items-center gap-2
                  bg-muted border border-border rounded-lg px-4 py-2
                  text-sm text-foreground
                  transition-colors duration-150
                  ${isDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-accent hover:border-border cursor-pointer'
                  }
                `}
              >
                {isActive ? <SpinnerIcon /> : <Icon />}
                <span>{isActive ? t('generating') : label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Error banner (auto-dismisses after 5 s) */}
      {error !== null && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
          {error}
        </p>
      )}

      {/* NPC prompt modal */}
      {showNpcPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNpcPrompt(false);
              setNpcRole('');
            }
          }}
        >
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <h3 className="text-base font-semibold text-foreground">{t('modalTitle')}</h3>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="npc-role-input">
                {t('modalRoleLabel')}
              </label>
              <input
                id="npc-role-input"
                type="text"
                value={npcRole}
                onChange={(e) => setNpcRole(e.target.value)}
                placeholder={t('modalRolePlaceholder')}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && loading === null) {
                    setShowNpcPrompt(false);
                    handleGenerate('npc');
                  }
                  if (e.key === 'Escape') {
                    setShowNpcPrompt(false);
                    setNpcRole('');
                  }
                }}
                className="bg-muted border border-border text-foreground rounded-lg px-3 py-2 w-full focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 placeholder:text-muted-foreground transition-colors"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNpcPrompt(false);
                  setNpcRole('');
                }}
                className="px-4 py-2 rounded-lg border border-border text-foreground/80 hover:bg-muted text-sm transition-colors"
              >
                {t('modalCancel')}
              </button>
              <button
                onClick={() => {
                  setShowNpcPrompt(false);
                  handleGenerate('npc');
                }}
                disabled={loading !== null}
                className={`
                  bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm transition-colors
                  flex items-center gap-2
                  ${loading !== null ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {loading === 'npc' ? (
                  <>
                    <SpinnerIcon />
                    <span>{t('generating')}</span>
                  </>
                ) : (
                  t('modalGenerate')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <LootGeneratorDialog
        open={showLootDialog}
        loading={lootLoading}
        error={lootError}
        autoContext={lootAutoContext}
        onCancel={() => {
          if (!lootLoading) {
            setShowLootDialog(false);
            setLootError(null);
          }
        }}
        onGenerate={handleLootGenerate}
      />
    </div>
  );
}
