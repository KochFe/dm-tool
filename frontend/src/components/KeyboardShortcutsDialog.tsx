"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUT_KEYS = [
  { keys: "Ctrl + K", actionKey: "openCommandPalette", contextKey: "ctxGlobal" },
  { keys: "Ctrl + Shift + O", actionKey: "toggleOracle", contextKey: "ctxSession" },
  { keys: "Space", actionKey: "nextTurn", contextKey: "ctxCombat" },
  { keys: "Escape", actionKey: "closePanel", contextKey: "ctxGlobal" },
] as const;

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const t = useTranslations("shortcuts");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 mt-2">
          {SHORTCUT_KEYS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between py-2 px-1">
              <div>
                <span className="text-sm text-foreground">{t(s.actionKey)}</span>
                <span className="text-xs text-muted-foreground ml-2">{t(s.contextKey)}</span>
              </div>
              <kbd className="text-xs bg-muted border border-border rounded px-2 py-1 font-mono text-foreground/80">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
