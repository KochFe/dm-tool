"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <h1 className="text-5xl font-bold text-primary mb-4">DM Co-Pilot</h1>
      <p className="text-xl text-foreground/80 mb-2">
        Your AI-powered Dungeon Master assistant
      </p>
      <p className="text-muted-foreground max-w-md mb-8">
        Track campaigns, manage initiative, roll dice, and get AI-generated
        encounters, NPCs, and loot — all in one place.
      </p>

      {loading ? (
        <div className="h-10" />
      ) : user ? (
        <Link
          href="/campaigns"
          prefetch={false}
          className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors"
        >
          Go to Campaigns
        </Link>
      ) : (
        <Link
          href="/login"
          className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors"
        >
          Sign In
        </Link>
      )}
    </div>
    </div>
  );
}
