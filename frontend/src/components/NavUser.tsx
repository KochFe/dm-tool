"use client";

import { useAuth } from "@/components/AuthProvider";

export function NavUser() {
  const { user, loading, logout } = useAuth();

  if (loading || !user) return null;

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">{user.display_name}</span>
      <button
        onClick={logout}
        className="text-sm text-muted-foreground hover:text-foreground/80 transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
