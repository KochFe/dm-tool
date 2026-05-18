"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Npc, NpcStats } from "@/types";

function statModifier(score: number): string {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center bg-muted/40 border border-border rounded-md py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">{label}</span>
      <span className="font-mono tabular-nums text-sm font-semibold text-foreground leading-tight">{value}</span>
      <span className="font-mono tabular-nums text-[11px] text-muted-foreground leading-tight">{statModifier(value)}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/90 mb-1.5">{label}</div>
      <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">{value}</p>
    </div>
  );
}

export default function NpcSessionCard({ npc }: { npc: Npc }) {
  const tEnt = useTranslations("entitySheet");
  const tExp = useTranslations("explorationView");
  const [open, setOpen] = useState(false);

  const stats: NpcStats | null = npc.stats ?? null;
  const hasAnyDetail =
    !!npc.description || !!npc.personality || !!npc.motivation || !!npc.secrets || !!stats;

  return (
    <div className="bg-card border border-border rounded-xl shadow-elev-1 overflow-hidden">

      <button
        type="button"
        onClick={() => hasAnyDetail && setOpen((v) => !v)}
        aria-expanded={open}
        aria-disabled={!hasAnyDetail}
        className={`w-full text-left p-3 flex items-start gap-3 transition-colors ${
          hasAnyDetail ? "hover:bg-muted/40 cursor-pointer" : "cursor-default"
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground text-base">{npc.name}</span>
            <span className="text-sm text-muted-foreground">
              {npc.race}{npc.npc_class ? ` · ${npc.npc_class}` : ""}
            </span>
            {!npc.is_alive && (
              <Badge variant="destructive" className="text-xs">{tExp("dead")}</Badge>
            )}
          </div>
          {!open && npc.description && (
            <p className="text-sm text-muted-foreground/90 mt-1 line-clamp-2 leading-relaxed">{npc.description}</p>
          )}
        </div>
        {hasAnyDetail && (
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="shrink-0 text-muted-foreground"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && hasAnyDetail && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.18, ease: "linear", delay: open ? 0.04 : 0 },
            }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/60">
              {stats && (
                <div className="grid grid-cols-6 gap-1.5">
                  <StatCell label="STR" value={stats.str} />
                  <StatCell label="DEX" value={stats.dex} />
                  <StatCell label="CON" value={stats.con} />
                  <StatCell label="INT" value={stats.int} />
                  <StatCell label="WIS" value={stats.wis} />
                  <StatCell label="CHA" value={stats.cha} />
                </div>
              )}
              <Field label={tEnt("description")} value={npc.description} />
              <Field label={tEnt("personality")} value={npc.personality} />
              <Field label={tEnt("motivation")} value={npc.motivation} />
              <Field label={tEnt("secrets")} value={npc.secrets} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
