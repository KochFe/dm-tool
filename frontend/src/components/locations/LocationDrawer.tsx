"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MapPin, X } from "lucide-react";
import { useCampaign } from "@/contexts/CampaignContext";
import { api } from "@/lib/api";
import type { Location } from "@/types";
import LocationTree from "./LocationTree";

function breadcrumbFor(location: Location, all: Location[]): string {
  const byId = new Map(all.map((l) => [l.id, l]));
  const parts: string[] = [location.name];
  let current = location;
  for (let i = 0; i < 20; i++) {
    if (!current.parent_id) break;
    const parent = byId.get(current.parent_id);
    if (!parent) break;
    parts.push(parent.name);
    current = parent;
  }
  return parts.join(" ← ");
}

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);

  // Reset selection whenever the drawer closes
  useEffect(() => {
    if (!isLocationDrawerOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(null);
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

  async function handleActivate(location: Location) {
    if (committing) return;
    if (location.id === campaign.current_location_id) {
      closeLocationDrawer();
      return;
    }
    setCommitting(true);
    try {
      await api.updateCampaign(campaign.id, {
        current_location_id: location.id,
      });
      await reload();
      closeLocationDrawer();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : tDetail("setCurrentError"),
      );
    } finally {
      setCommitting(false);
    }
  }

  const selected = locations.find((l) => l.id === selectedId) ?? null;
  const isSelectedCurrent =
    selected !== null && selected.id === campaign.current_location_id;

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
        <div
          className={`flex-1 overflow-y-auto p-4 min-h-0 ${
            committing ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          {locations.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 text-center py-4">
              {t("emptyTree")}
            </p>
          ) : (
            <LocationTree
              locations={locations}
              selectedId={selectedId}
              currentLocationId={campaign.current_location_id}
              onSelect={(loc) => setSelectedId(loc.id)}
              onActivate={(loc) => void handleActivate(loc)}
            />
          )}
        </div>

        {/* Info panel for the selected location */}
        {selected && (
          <div className="border-t border-border p-4 bg-muted/30 max-h-[40%] overflow-y-auto flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">
                {selected.name}
              </h3>
              <span className="text-[11px] font-semibold bg-muted text-foreground/90 px-2 py-0.5 rounded uppercase tracking-[0.14em]">
                {selected.biome}
              </span>
              {isSelectedCurrent && (
                <span className="flex items-center gap-1 text-[11px] text-primary font-semibold">
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  {tDetail("currentLocationBadge")}
                </span>
              )}
            </div>
            {selected.parent_id && locations.length > 1 && (
              <p className="text-xs text-muted-foreground/85">
                {breadcrumbFor(selected, locations)}
              </p>
            )}
            {selected.description ? (
              <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                {selected.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/70 italic">
                {t("noDescription")}
              </p>
            )}
          </div>
        )}

        {/* Footer hint */}
        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground/60 text-center">
            {committing
              ? t("committing")
              : selected
                ? isSelectedCurrent
                  ? t("hintAlreadyCurrent")
                  : t("hintDoubleClickToSet")
                : t("hintClickToInspect")}
          </p>
        </div>
      </aside>
    </>
  );
}
