"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { AdminUser } from "@/types";

interface Props {
  open: boolean;
  user: AdminUser | null;
  onClose: () => void;
  onSaved: () => void;
}

export function PasswordResetDialog({ open, user, onClose, onSaved }: Props) {
  const t = useTranslations("admin");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPw("");
    setConfirm("");
    setError(null);
  }, [open]);

  if (!open || !user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== confirm) {
      setError(t("password_reset.mismatch"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.resetAdminUserPassword(user.id, pw);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-3 rounded-lg border border-neutral-800 bg-neutral-950 p-5"
      >
        <h2 className="text-lg font-semibold">{t("password_reset.title")}</h2>
        <p className="text-sm text-neutral-400">{user.email}</p>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-400">
            {t("password_reset.new_password")}
          </span>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            minLength={8}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-400">
            {t("password_reset.confirm_password")}
          </span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
          />
        </label>

        {error && (
          <div className="rounded border border-red-700 bg-red-950 p-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-900"
          >
            {t("form.cancel")}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-amber-500 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {t("password_reset.submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
