'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { LootAmount, LootTier } from '@/types';

interface LootGeneratorDialogProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  autoContext: {
    partyLevel: number;
    hasPcs: boolean;
    locationName: string | null;
    biome: string | null;
  };
  onCancel: () => void;
  onGenerate: (params: { tier: LootTier; amount: LootAmount; context: string }) => void;
}

type TierKey = 'tierMundane' | 'tierStandard' | 'tierValuable' | 'tierLegendary';
type AmountKey = 'amountFew' | 'amountSome' | 'amountSeveral' | 'amountHoard';

const TIERS: { value: LootTier; key: TierKey }[] = [
  { value: 'mundane', key: 'tierMundane' },
  { value: 'standard', key: 'tierStandard' },
  { value: 'valuable', key: 'tierValuable' },
  { value: 'legendary', key: 'tierLegendary' },
];

const AMOUNTS: { value: LootAmount; key: AmountKey }[] = [
  { value: 'few', key: 'amountFew' },
  { value: 'some', key: 'amountSome' },
  { value: 'several', key: 'amountSeveral' },
  { value: 'hoard', key: 'amountHoard' },
];

export default function LootGeneratorDialog({
  open,
  loading,
  error,
  autoContext,
  onCancel,
  onGenerate,
}: LootGeneratorDialogProps) {
  const t = useTranslations('lootDialog');
  const [tier, setTier] = useState<LootTier>('standard');
  const [amount, setAmount] = useState<LootAmount>('some');
  const [context, setContext] = useState('');
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current && !loading) onCancel();
  }

  function handleGenerate() {
    onGenerate({ tier, amount, context: context.trim() });
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loot-dialog-title"
    >
      <div className="bg-card border border-border rounded-xl w-full max-w-md p-5 space-y-4 shadow-xl">
        <h2 id="loot-dialog-title" className="text-lg font-semibold text-primary">
          {t('title')}
        </h2>

        <div className="bg-muted/50 border border-border rounded px-3 py-2 text-xs space-y-1">
          <div className="font-semibold uppercase tracking-wide text-muted-foreground">
            {t('autoContextLabel')}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('autoPartyLevel')}</span>
            <span className="text-foreground">
              {autoContext.partyLevel}
              {!autoContext.hasPcs && (
                <span className="text-amber-400 ml-1">({t('autoPartyLevelNoPcs')})</span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('autoLocation')}</span>
            <span className="text-foreground">
              {autoContext.locationName ?? '—'}
              {autoContext.biome && (
                <span className="text-muted-foreground"> ({autoContext.biome})</span>
              )}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('tierLabel')}
          </label>
          <div className="grid grid-cols-4 gap-1">
            {TIERS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTier(opt.value)}
                disabled={loading}
                className={`px-2 py-1.5 text-sm rounded border transition ${
                  tier === opt.value
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'border-border text-foreground hover:border-primary/60'
                } disabled:opacity-50`}
              >
                {t(opt.key)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('amountLabel')}
          </label>
          <div className="grid grid-cols-4 gap-1">
            {AMOUNTS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAmount(opt.value)}
                disabled={loading}
                className={`px-2 py-1.5 text-sm rounded border transition ${
                  amount === opt.value
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'border-border text-foreground hover:border-primary/60'
                } disabled:opacity-50`}
              >
                {t(opt.key)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="loot-context"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {t('contextLabel')}
          </label>
          <input
            id="loot-context"
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={t('contextPlaceholder')}
            disabled={loading}
            className="w-full bg-muted border border-border rounded px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors disabled:opacity-50"
          />
        </div>

        {error && (
          <div className="text-sm text-red-300 bg-red-900/30 border border-red-800/60 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded border border-border text-foreground hover:border-primary/60 disabled:opacity-50 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-1.5 text-sm rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? '…' : t('generate')}
          </button>
        </div>
      </div>
    </div>
  );
}
