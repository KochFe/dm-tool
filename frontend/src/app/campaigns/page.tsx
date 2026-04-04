"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Campaign } from "@/types";
import ConfirmButton from "@/components/ConfirmButton";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const router = useRouter();

  const load = async () => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(data);
    } catch (e) {
      console.error("Failed to load campaigns", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const campaign = await api.createCampaign({
        name: "Untitled Campaign",
        status: "draft",
      });
      router.push(`/campaigns/${campaign.id}/builder`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(`Failed to create campaign: ${message}`);
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteCampaign(id);
      toast.success("Campaign deleted");
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(`Failed to delete campaign: ${message}`);
    }
  };

  if (loading) {
    return (
      <p className="text-muted-foreground text-sm">Loading campaigns...</p>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold px-5 py-2 rounded-lg transition-colors duration-150"
        >
          {creating ? "Creating..." : "Create New Campaign"}
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm mb-3">No campaigns yet.</p>
          <p className="text-muted-foreground/60 text-sm">
            Click &ldquo;Create New Campaign&rdquo; to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {campaigns.map((c) =>
            c.status === "draft" ? (
              <div
                key={c.id}
                className="bg-card border border-dashed border-primary/50 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-foreground">
                      {c.name}
                    </span>
                    <span className="text-xs font-semibold bg-primary/20 text-primary border border-primary/40 rounded-full px-2 py-0.5">
                      DRAFT
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">Not yet activated</p>
                </div>
                <div className="flex items-center gap-2">
                  {confirmingId !== c.id && (
                    <Link
                      href={`/campaigns/${c.id}/builder`}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors duration-150"
                    >
                      Continue
                    </Link>
                  )}
                  <ConfirmButton
                    onConfirm={() => handleDelete(c.id)}
                    label="Delete"
                    confirmLabel="Are you sure?"
                    className="bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 hover:border-red-400 dark:bg-red-900/40 dark:hover:bg-red-800/60 dark:text-red-400 dark:hover:text-red-300 dark:border-red-800/50 dark:hover:border-red-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150"
                    onConfirmingChange={(c2) => setConfirmingId(c2 ? c.id : null)}
                  />
                </div>
              </div>
            ) : (
              <div
                key={c.id}
                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-border transition-colors duration-150"
              >
                <div>
                  <Link
                    href={`/campaigns/${c.id}`}
                    className="text-lg font-semibold text-foreground hover:text-primary transition-colors duration-150"
                  >
                    {c.name}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Level {c.party_level} &middot; {c.in_game_time}
                  </p>
                </div>
                <ConfirmButton
                  onConfirm={() => handleDelete(c.id)}
                  label="Delete"
                  confirmLabel="Are you sure?"
                  className="bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 hover:border-red-400 dark:bg-red-900/40 dark:hover:bg-red-800/60 dark:text-red-400 dark:hover:text-red-300 dark:border-red-800/50 dark:hover:border-red-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150"
                  onConfirmingChange={(c2) => setConfirmingId(c2 ? c.id : null)}
                />
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
