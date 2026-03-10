'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { DiceRollResponse } from '@/types';

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100] as const;
const MAX_HISTORY = 10;

interface RollHistoryEntry {
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
  timestamp: Date;
}

function formatError(err: unknown): string {
  if (err instanceof Error) {
    // FastAPI 422 detail arrays arrive as "[object Object]" if not handled upstream.
    // Catch both cases: plain string message or a stringified object.
    const msg = err.message;
    if (msg.startsWith('[object')) {
      return 'Invalid dice notation. Use format like 2d6+3 or 1d20.';
    }
    return msg;
  }
  return 'An unexpected error occurred.';
}

export default function DiceRoller({ className }: { className?: string }) {
  const [notation, setNotation] = useState('');
  const [lastRoll, setLastRoll] = useState<DiceRollResponse | null>(null);
  const [history, setHistory] = useState<RollHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);

  async function executeRoll(diceNotation: string) {
    const trimmed = diceNotation.trim();
    if (!trimmed) return;

    setRolling(true);
    setError(null);

    try {
      const result = await api.rollDice(trimmed);
      setLastRoll(result);
      setHistory((prev) => {
        const entry: RollHistoryEntry = {
          notation: result.notation,
          rolls: result.rolls,
          modifier: result.modifier,
          total: result.total,
          timestamp: new Date(),
        };
        return [entry, ...prev].slice(0, MAX_HISTORY);
      });
    } catch (err) {
      setError(formatError(err));
    } finally {
      setRolling(false);
    }
  }

  function handleCustomRoll(e: React.FormEvent) {
    e.preventDefault();
    executeRoll(notation);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeRoll(notation);
    }
  }

  return (
    <div className={`bg-gray-900 border border-gray-700/50 rounded-xl p-5 space-y-4 ${className ?? ''}`}>
      <h2 className="text-xl font-semibold text-gray-100">Dice Roller</h2>

      {/* Quick-roll buttons */}
      <div className="flex flex-wrap gap-2">
        {DICE_TYPES.map((sides) => (
          <button
            key={sides}
            onClick={() => executeRoll(`1d${sides}`)}
            disabled={rolling}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              sides === 20
                ? 'bg-amber-600 hover:bg-amber-500 text-gray-950'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            }`}
          >
            d{sides}
          </button>
        ))}
      </div>

      {/* Custom notation input */}
      <form onSubmit={handleCustomRoll} className="flex gap-2">
        <input
          type="text"
          value={notation}
          onChange={(e) => setNotation(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. 2d6+3"
          disabled={rolling}
          className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 flex-1 text-sm placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 disabled:opacity-50 transition-colors"
          aria-label="Custom dice notation"
        />
        <button
          type="submit"
          disabled={rolling || !notation.trim()}
          className="bg-amber-600 hover:bg-amber-500 text-gray-950 font-medium text-sm px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Roll
        </button>
      </form>

      {/* Inline error */}
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Last roll result */}
      {lastRoll && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 space-y-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Last Roll</p>
          <p className="text-sm text-gray-300">
            <span className="font-medium text-gray-100">{lastRoll.notation}</span>
            {' — '}
            <span className="text-gray-400">
              [{lastRoll.rolls.join(', ')}]
              {lastRoll.modifier !== 0 && (
                <span>
                  {lastRoll.modifier > 0 ? ` +${lastRoll.modifier}` : ` ${lastRoll.modifier}`}
                </span>
              )}
            </span>
          </p>
          <p className="text-2xl font-bold text-amber-400">{lastRoll.total}</p>
        </div>
      )}

      {/* Roll history */}
      {history.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide">History</p>
          <ul className="space-y-0.5">
            {history.map((entry, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between text-sm text-gray-400 py-1 border-b border-gray-700/50 last:border-0"
              >
                <span>
                  {entry.notation}
                  {' '}
                  <span className="text-gray-500 text-xs">
                    [{entry.rolls.join(', ')}]
                    {entry.modifier !== 0 && (
                      <span>
                        {entry.modifier > 0 ? ` +${entry.modifier}` : ` ${entry.modifier}`}
                      </span>
                    )}
                  </span>
                </span>
                <span className="font-semibold text-gray-200 ml-2">{entry.total}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
