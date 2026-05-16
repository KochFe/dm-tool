"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useCampaign } from "@/contexts/CampaignContext";
import { api } from "@/lib/api";
import LocationTree from "./LocationTree";

export default function LocationDrawer() {
  const t = useTranslations("locationDrawer");
  const tDetail = useTranslations("builder.locationDetail");
  const {
    campaign,
    locations,
    isLocationDrawerOpen,
    closeLocationDrawer,
    reload,
  } = useCampaign();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);

  // Reset pending state whenever the drawer closes
  useEffect(() => {
    if (!isLocationDrawerOpen) {
      setPendingId(null);
    }
  }, [isLocationDrawerOpen]);

  // Escape-to-close
  useEffect(() => {
    if (!isLocationDrawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeLocationDrawer();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLocationDrawerOpen, closeLocationDrawer]);

  async function handleCommit() {
    if (!pendingId || pendingId === campaign.current_location_id) return;
    setCommitting(true);
    try {
      await api.updateCampaign(campaign.id, { current_location_id: pendingId });
      await reload();
      closeLocationDrawer();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tDetail("setCurrentError"));
    } finally {
      setCommitting(false);
    }
  }

  const canCommit =
    pendingId !== null && pendingId !== campaign.current_location_id && !committing;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity ${
          isLocationDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeLocationDrawer}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-80 bg-card border-l border-border shadow-xl transition-transform duration-200 flex flex-col ${
          isLocationDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label={t("title")}
        aria-hidden={!isLocationDrawerOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
          <button
            onClick={closeLocationDrawer}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t("cancel")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tree (read-only navigator: no add/reparent callbacks passed) */}
        <div className="flex-1 overflow-y-auto p-4">
          {locations.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 text-center py-4">
              {t("emptyTree")}
            </p>
          ) : (
            <LocationTree
              locations={locations}
              selectedId={pendingId}
              currentLocationId={campaign.current_location_id}
              onSelect={(loc) => setPendingId(loc.id)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          {pendingId === null ? (
            <p className="text-xs text-muted-foreground/60 text-center">
              {t("noPendingHint")}
            </p>
          ) : (
            <button
              onClick={handleCommit}
              disabled={!canCommit}
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground font-medium px-4 py-2 rounded-lg transition-colors text-sm"
            >
              {t("setCurrentButton")}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
