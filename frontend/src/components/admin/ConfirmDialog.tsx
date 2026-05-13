"use client";

import { ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-950 p-5 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-neutral-100">{title}</h2>
        <div className="mb-5 text-sm text-neutral-300">{body}</div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-900"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              destructive
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-amber-500 text-neutral-950 hover:bg-amber-400"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
