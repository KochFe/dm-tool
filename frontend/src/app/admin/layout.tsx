"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations("admin");

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "admin") {
      router.replace("/campaigns");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-2xl font-semibold text-primary">
          {t("users_title")}
        </h1>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
