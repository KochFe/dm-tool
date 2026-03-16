"use client";

import { useState, useEffect, useRef } from "react";

interface ConfirmButtonProps {
  onConfirm: () => void | Promise<void>;
  label: string;
  confirmLabel?: string;
  className?: string;
  confirmClassName?: string;
  disabled?: boolean;
  timeoutMs?: number;
}

export default function ConfirmButton({
  onConfirm,
  label,
  confirmLabel = "Are you sure?",
  className = "text-sm bg-red-700/50 hover:bg-red-700 text-red-200 px-3 py-1 rounded-lg transition-colors",
  confirmClassName,
  disabled = false,
  timeoutMs = 3000,
}: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function startConfirm() {
    setConfirming(true);
    timeoutRef.current = setTimeout(() => {
      setConfirming(false);
      timeoutRef.current = null;
    }, timeoutMs);
  }

  function cancelConfirm() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setConfirming(false);
  }

  async function handleConfirm() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setConfirming(false);
    await onConfirm();
  }

  if (confirming) {
    return (
      <span
        className={
          confirmClassName ??
          "inline-flex items-center gap-1.5"
        }
      >
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {confirmLabel}
        </span>
        <button
          type="button"
          onClick={handleConfirm}
          className="text-sm bg-red-700/50 hover:bg-red-700 text-red-200 px-3 py-1 rounded-lg transition-colors"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={cancelConfirm}
          className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={startConfirm}
      disabled={disabled}
      className={className}
    >
      {label}
    </button>
  );
}
