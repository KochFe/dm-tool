"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCampaign } from "@/contexts/CampaignContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { campaign, reload } = useCampaign();
  const [form, setForm] = useState({
    name: campaign.name,
    description: campaign.description ?? "",
    in_game_time: campaign.in_game_time,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateCampaign(campaign.id, {
        name: form.name,
        description: form.description.trim() || null,
        in_game_time: form.in_game_time,
      });
      await reload();
      toast.success(t("updateSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("updateError"));
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "bg-muted border border-border text-foreground rounded-lg px-3 py-2 w-full focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 transition-colors";

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-foreground mb-6">{t("pageTitle")}</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-muted-foreground mb-1">{t("nameLabel")}</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-1">{t("descriptionLabel")}</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={`${inputCls} resize-none`}
            rows={4}
            placeholder={t("descriptionPlaceholder")}
          />
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-1">{t("inGameTimeLabel")}</label>
          <input
            value={form.in_game_time}
            onChange={(e) => setForm({ ...form, in_game_time: e.target.value })}
            className={inputCls}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          {saving ? t("saving") : t("saveButton")}
        </button>
      </form>
    </div>
  );
}
