"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { DiceRollResponse } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DICE = [4, 6, 8, 10, 12, 20, 100] as const;
const MAX_HISTORY = 20;

interface HistoryEntry {
  notation: string;
  total: number;
  rolls: number[];
  modifier: number;
}

export default function CompactDiceRoller() {
  const [notation, setNotation] = useState("");
  const [lastRoll, setLastRoll] = useState<DiceRollResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rollCount, setRollCount] = useState(0);

  async function roll(diceNotation: string) {
    const trimmed = diceNotation.trim();
    if (!trimmed || rolling) return;
    setRolling(true);
    setError(null);
    try {
      const result = await api.rollDice(trimmed);
      setLastRoll(result);
      setRollCount((c) => c + 1);
      setHistory((prev) =>
        [
          { notation: result.notation, total: result.total, rolls: result.rolls, modifier: result.modifier },
          ...prev,
        ].slice(0, MAX_HISTORY)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Roll failed");
    } finally {
      setRolling(false);
    }
  }

  return (
    <div className="h-12 border-t border-gray-800 bg-gray-900/80 flex items-center px-4 gap-2 shrink-0">
      {DICE.map((d) => (
        <button
          key={d}
          onClick={() => roll(`1d${d}`)}
          disabled={rolling}
          className={`text-xs font-medium px-2 py-1 rounded transition-colors disabled:opacity-50 ${
            d === 20
              ? "bg-amber-600/20 text-amber-400 hover:bg-amber-600/30"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
          }`}
        >
          d{d}
        </button>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          roll(notation);
        }}
        className="flex items-center gap-1 ml-2"
      >
        <input
          type="text"
          value={notation}
          onChange={(e) => setNotation(e.target.value)}
          placeholder="2d6+3"
          disabled={rolling}
          className="bg-gray-800 border border-gray-700 text-gray-100 rounded px-2 py-1 w-20 text-xs placeholder-gray-600 focus:border-amber-500 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={rolling || !notation.trim()}
          className="bg-amber-600 text-gray-950 text-xs font-medium px-2 py-1 rounded disabled:opacity-50 hover:bg-amber-500 transition-colors"
        >
          Roll
        </button>
      </form>

      {lastRoll && (
        <div aria-live="polite" className="flex items-center gap-2 ml-3 text-sm">
          <span className="text-gray-500">{lastRoll.notation}:</span>
          <motion.span
            key={rollCount}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-amber-400 font-bold"
          >
            {lastRoll.total}
          </motion.span>
          <span className="text-gray-600 text-xs">[{lastRoll.rolls.join(",")}]</span>
        </div>
      )}

      {error && <span className="text-xs text-red-400 ml-2">{error}</span>}

      {history.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="ml-auto text-xs text-gray-500 hover:text-gray-300 transition-colors">
              History ({history.length})
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0 bg-gray-900 border-gray-700" align="end" side="top">
            <div className="p-2 max-h-60 overflow-y-auto space-y-0.5">
              {history.map((h, i) => (
                <div key={i} className="flex justify-between text-xs py-1 px-2 rounded hover:bg-gray-800">
                  <span className="text-gray-400">{h.notation}</span>
                  <span className="text-gray-200 font-semibold">{h.total}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
