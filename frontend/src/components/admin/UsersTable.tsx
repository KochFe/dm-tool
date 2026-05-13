"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { AdminUser, Role } from "@/types";
import { UserFormDialog } from "@/components/admin/UserFormDialog";
import { PasswordResetDialog } from "@/components/admin/PasswordResetDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

interface Props {
  users: AdminUser[];
  loading: boolean;
  onChanged: () => void;
}

export function UsersTable({ users, loading, onChanged }: Props) {
  const t = useTranslations("admin");
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [formInitial, setFormInitial] = useState<AdminUser | null>(null);
  const [pwUser, setPwUser] = useState<AdminUser | null>(null);
  const [deactivating, setDeactivating] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleActive = async (u: AdminUser) => {
    setError(null);
    try {
      await api.updateAdminUser(u.id, { is_active: !u.is_active });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) {
    return <div className="text-sm text-neutral-400">Loading…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setFormInitial(null);
            setFormMode("create");
          }}
          className="rounded bg-amber-500 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-amber-400"
        >
          {t("new_user")}
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-700 bg-red-950 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <table className="w-full text-sm">
        <thead className="border-b border-neutral-800 text-left text-neutral-400">
          <tr>
            <th className="py-2 pr-4 font-medium">{t("columns.display_name")}</th>
            <th className="py-2 pr-4 font-medium">{t("columns.email")}</th>
            <th className="py-2 pr-4 font-medium">{t("columns.role")}</th>
            <th className="py-2 pr-4 font-medium">{t("columns.status")}</th>
            <th className="py-2 pr-4 font-medium">{t("columns.created")}</th>
            <th className="py-2 pr-4 font-medium text-right">&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-neutral-900">
              <td className="py-2 pr-4">{u.display_name}</td>
              <td className="py-2 pr-4 text-neutral-400">{u.email}</td>
              <td className="py-2 pr-4">{t(`roles.${u.role as Role}`)}</td>
              <td className="py-2 pr-4">
                {u.is_active ? t("status_active") : t("status_inactive")}
              </td>
              <td className="py-2 pr-4 text-neutral-500">
                {new Date(u.created_at).toLocaleDateString()}
              </td>
              <td className="py-2 pr-4 text-right">
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setFormInitial(u);
                      setFormMode("edit");
                    }}
                    className="rounded border border-neutral-700 px-2 py-1 hover:bg-neutral-900"
                  >
                    {t("actions.edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPwUser(u)}
                    className="rounded border border-neutral-700 px-2 py-1 hover:bg-neutral-900"
                  >
                    {t("actions.reset_password")}
                  </button>
                  {u.is_active ? (
                    <button
                      type="button"
                      onClick={() => setDeactivating(u)}
                      className="rounded border border-red-800 px-2 py-1 text-red-300 hover:bg-red-950"
                    >
                      {t("actions.deactivate")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleActive(u)}
                      className="rounded border border-neutral-700 px-2 py-1 hover:bg-neutral-900"
                    >
                      {t("actions.activate")}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <UserFormDialog
        open={formMode !== null}
        mode={formMode ?? "create"}
        initial={formInitial}
        onClose={() => setFormMode(null)}
        onSaved={onChanged}
      />

      <PasswordResetDialog
        open={pwUser !== null}
        user={pwUser}
        onClose={() => setPwUser(null)}
        onSaved={onChanged}
      />

      <ConfirmDialog
        open={deactivating !== null}
        title={t("deactivate_confirm.title")}
        body={t("deactivate_confirm.body", {
          name: deactivating?.display_name ?? "",
        })}
        confirmLabel={t("deactivate_confirm.confirm")}
        cancelLabel={t("deactivate_confirm.cancel")}
        destructive
        onCancel={() => setDeactivating(null)}
        onConfirm={async () => {
          if (deactivating) await toggleActive(deactivating);
          setDeactivating(null);
        }}
      />
    </div>
  );
}
