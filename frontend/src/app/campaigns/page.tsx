"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Campaign } from "@/types";
import ConfirmButton from "@/components/ConfirmButton";
import { Stagger, StaggerItem, HoverLift, FadeIn } from "@/components/motion";

function gradientFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const a = h % 360;
  const b = (a + 47) % 360;
  return `linear-gradient(180deg, oklch(0.62 0.18 ${a}) 0%, oklch(0.45 0.16 ${b}) 100%)`;
}

export default function CampaignsPage() {
  const t = useTranslations("campaigns");
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
      toast.error(t("createError", { message }));
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteCampaign(id);
      toast.success(t("deleteSuccess"));
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(t("deleteError", { message }));
    }
  };

  if (loading) {
    return (
      <p className="text-muted-foreground text-sm">{t("loading")}</p>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <FadeIn>
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-display italic text-primary/80 tracking-[0.28em] text-xs uppercase mb-1">
              Your Codex
            </p>
            <h1 className="font-display text-4xl text-foreground tracking-tight">{t("pageTitle")}</h1>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-medium px-5 py-2.5 rounded-full shadow-glow-amber hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            {creating ? t("creating") : t("newButton")}
          </button>
        </div>
      </FadeIn>

      {campaigns.length === 0 ? (
        <FadeIn delay={0.1}>
          <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card/40">
            <p className="font-display italic text-2xl text-foreground/80 mb-3">{t("emptyTitle")}</p>
            <p className="text-muted-foreground text-sm">
              {t("emptyHint")}
            </p>
          </div>
        </FadeIn>
      ) : (
        <Stagger className="grid gap-4">
          {campaigns.map((c) =>
            c.status === "draft" ? (
              <StaggerItem key={c.id}>
                <HoverLift lift={2}>
                  <div className="relative overflow-hidden bg-card border border-dashed border-primary/50 rounded-2xl shadow-elev-1 hover:shadow-elev-2 transition-shadow duration-300">
                    <div aria-hidden className="absolute inset-y-0 left-0 w-1.5 opacity-60" style={{ background: gradientFor(c.id) }} />
                    <div aria-hidden className="absolute inset-0 bg-grain pointer-events-none" />
                    <div className="relative p-5 pl-7 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-display text-2xl text-foreground tracking-tight">
                            {c.name}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] bg-primary/20 text-primary border border-primary/40 rounded-full px-2 py-0.5">
                            {t("draft")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground italic mt-1">{t("notActivated")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {confirmingId !== c.id && (
                          <Link
                            href={`/campaigns/${c.id}/builder`}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm px-4 py-2 rounded-full transition-all duration-200 hover:shadow-glow-amber"
                          >
                            {t("continueButton")}
                          </Link>
                        )}
                        <ConfirmButton
                          onConfirm={() => handleDelete(c.id)}
                          label={t("deleteButton")}
                          confirmLabel={t("deleteConfirm")}
                          className="bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 hover:border-red-400 dark:bg-red-900/40 dark:hover:bg-red-800/60 dark:text-red-400 dark:hover:text-red-300 dark:border-red-800/50 dark:hover:border-red-700 text-sm font-medium px-3 py-1.5 rounded-full transition-colors duration-150"
                          onConfirmingChange={(c2) => setConfirmingId(c2 ? c.id : null)}
                        />
                      </div>
                    </div>
                  </div>
                </HoverLift>
              </StaggerItem>
            ) : (
              <StaggerItem key={c.id}>
                <HoverLift lift={3}>
                  <div className="relative overflow-hidden bg-card border border-border rounded-2xl shadow-elev-1 hover:shadow-elev-2 hover:border-primary/30 transition-all duration-300">
                    <div aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: gradientFor(c.id) }} />
                    <div aria-hidden className="absolute inset-0 bg-grain pointer-events-none" />
                    <div className="relative p-5 pl-7 flex items-center justify-between">
                      <div>
                        <Link
                          href={`/campaigns/${c.id}`}
                          className="font-display text-2xl text-foreground tracking-tight hover:text-primary transition-colors duration-200"
                        >
                          {c.name}
                        </Link>
                        <p className="text-sm text-muted-foreground italic mt-1 tabular-nums">
                          {c.in_game_time}
                        </p>
                      </div>
                      <ConfirmButton
                        onConfirm={() => handleDelete(c.id)}
                        label={t("deleteButton")}
                        confirmLabel={t("deleteConfirm")}
                        className="bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 hover:border-red-400 dark:bg-red-900/40 dark:hover:bg-red-800/60 dark:text-red-400 dark:hover:text-red-300 dark:border-red-800/50 dark:hover:border-red-700 text-sm font-medium px-3 py-1.5 rounded-full transition-colors duration-150"
                        onConfirmingChange={(c2) => setConfirmingId(c2 ? c.id : null)}
                      />
                    </div>
                  </div>
                </HoverLift>
              </StaggerItem>
            )
          )}
        </Stagger>
      )}
    </div>
  );
}
