"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { AdminUser, Role } from "@/types";

interface Props {
  open: boolean;
  mode: "create" | "edit";
  initial?: AdminUser | null;
  onClose: () => void;
  onSaved: () => void;
}

export function UserFormDialog({
  open,
  mode,
  initial,
  onClose,
  onSaved,
}: Props) {
  const t = useTranslations("admin");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("dm");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setEmail(initial.email);
      setDisplayName(initial.display_name);
      setRole(initial.role as Role);
      setPassword("");
    } else {
      setEmail("");
      setDisplayName("");
      setPassword("");
      setRole("dm");
    }
    setError(null);
  }, [open, mode, initial]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "create") {
        await api.createAdminUser({
          email,
          password,
          display_name: displayName,
          role,
        });
      } else if (initial) {
        await api.updateAdminUser(initial.id, {
          display_name: displayName,
          role,
        });
      }
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
        className="w-full max-w-md space-y-3 rounded-lg border border-border bg-background p-5"
      >
        <h2 className="text-lg font-semibold">
          {mode === "create" ? t("form.title_create") : t("form.title_edit")}
        </h2>

        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">{t("form.email")}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={mode === "edit"}
            required
            className="w-full rounded border border-border bg-muted px-2 py-1 disabled:opacity-50"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">
            {t("form.display_name")}
          </span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="w-full rounded border border-border bg-muted px-2 py-1"
          />
        </label>

        {mode === "create" && (
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">
              {t("form.password")}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded border border-border bg-muted px-2 py-1"
            />
          </label>
        )}

        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">{t("form.role")}</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full rounded border border-border bg-muted px-2 py-1"
          >
            <option value="admin">{t("roles.admin")}</option>
            <option value="dm">{t("roles.dm")}</option>
            <option value="player">{t("roles.player")}</option>
          </select>
        </label>

        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            {t("form.cancel")}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-amber-500 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {mode === "create"
              ? t("form.submit_create")
              : t("form.submit_save")}
          </button>
        </div>
      </form>
    </div>
  );
}
