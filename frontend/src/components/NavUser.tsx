"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useTranslations } from "next-intl";

export function NavUser() {
  const { user, loading, logout } = useAuth();
  const t = useTranslations("header");

  if (loading || !user) return null;

  return (
    <div className="flex items-center gap-4">
      {user.role === "admin" && (
        <Link
          href="/admin/users"
          className="text-sm text-amber-400 hover:text-amber-300"
        >
          {t("admin_link")}
        </Link>
      )}
      <span className="text-sm text-muted-foreground">{user.display_name}</span>
      <button
        onClick={logout}
        className="text-sm text-muted-foreground hover:text-foreground/80 transition-colors"
      >
        {t("logout")}
      </button>
    </div>
  );
}
