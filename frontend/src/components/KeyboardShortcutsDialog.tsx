"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS = [
  { keys: "Ctrl + K", action: "Open command palette", context: "Global" },
  { keys: "Ctrl + Shift + O", action: "Toggle Lore Oracle", context: "Session" },
  { keys: "Space", action: "Next turn", context: "Combat (when not typing)" },
  { keys: "Escape", action: "Close panel / modal", context: "Global" },
];

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 mt-2">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between py-2 px-1">
              <div>
                <span className="text-sm text-foreground">{s.action}</span>
                <span className="text-xs text-muted-foreground ml-2">{s.context}</span>
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
