"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { AdminUser } from "@/types";
import { UsersTable } from "@/components/admin/UsersTable";

export default function AdminUsersPage() {
  const t = useTranslations("admin");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await api.listAdminUsers();
      setUsers(fetched);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-400">{t("users_subtitle")}</p>
      {error && (
        <div className="rounded border border-red-700 bg-red-950 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
      <UsersTable users={users} loading={loading} onChanged={reload} />
    </div>
  );
}
