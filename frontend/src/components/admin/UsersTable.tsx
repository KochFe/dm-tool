"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminUser, Role } from "@/types";

interface Props {
  users: AdminUser[];
  loading: boolean;
  onChanged: () => void;
}

export function UsersTable({ users, loading, onChanged: _onChanged }: Props) {
  const t = useTranslations("admin");
  // Dialog wiring is added in Task 12. For now: render the table and a
  // disabled "New user" button so the page renders end-to-end.
  const [_editing, _setEditing] = useState<AdminUser | null>(null);

  if (loading) {
    return <div className="text-sm text-neutral-400">Loading…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          className="rounded bg-amber-500 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-amber-400 disabled:opacity-50"
          disabled
          title="Wired in Task 12"
        >
          {t("new_user")}
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-800 text-left text-neutral-400">
          <tr>
            <th className="py-2 pr-4 font-medium">{t("columns.display_name")}</th>
            <th className="py-2 pr-4 font-medium">{t("columns.email")}</th>
            <th className="py-2 pr-4 font-medium">{t("columns.role")}</th>
            <th className="py-2 pr-4 font-medium">{t("columns.status")}</th>
            <th className="py-2 pr-4 font-medium">{t("columns.created")}</th>
            <th className="py-2 pr-4 font-medium" />
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
              <td className="py-2 pr-4 text-right text-neutral-500">
                {/* Row actions added in Task 12 */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
