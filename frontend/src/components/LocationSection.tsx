"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Location } from "@/types";
import ConfirmButton from "@/components/ConfirmButton";

const BIOMES = [
  "Arctic",
  "Coastal",
  "Desert",
  "Dungeon",
  "Forest",
  "Grassland",
  "Mountain",
  "Swamp",
  "Underdark",
  "Urban",
] as const;

const EMPTY_LOC = { name: "", description: "", biome: "urban" };

export default function LocationSection({
  campaignId,
  locations,
  currentLocationId,
  onUpdate,
}: {
  campaignId: string;
  locations: Location[];
  currentLocationId: string | null;
  onUpdate: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_LOC);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.updateLocation(editId, form);
        toast.success("Location updated");
      } else {
        await api.createLocation(campaignId, form);
        toast.success("Location created");
      }
      setForm(EMPTY_LOC);
      setShowForm(false);
      setEditId(null);
      onUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message.startsWith("[object") ? "Validation error — check all fields." : message);
    }
  };

  const startEdit = (loc: Location) => {
    setForm({
      name: loc.name,
      description: loc.description || "",
      biome: loc.biome.toLowerCase(),
    });
    setEditId(loc.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteLocation(id);
      toast.success("Location deleted");
      onUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(`Failed to delete location: ${message}`);
    }
  };

  const handleSetCurrent = async (locationId: string) => {
    try {
      await api.updateCampaign(campaignId, { current_location_id: locationId });
      toast.success("Current location updated");
      onUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(`Failed to set current location: ${message}`);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Locations</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditId(null);
            setForm(EMPTY_LOC);
          }}
          className="text-sm bg-accent hover:bg-muted text-foreground px-3 py-1.5 rounded-lg transition-colors"
        >
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-muted/50 border border-border rounded-xl p-4 mb-4 space-y-3"
        >
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="bg-muted border border-border text-foreground rounded-lg px-3 py-2 w-full focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 placeholder:text-muted-foreground transition-colors"
            required
          />
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="bg-muted border border-border text-foreground rounded-lg px-3 py-2 w-full focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 placeholder:text-muted-foreground transition-colors"
          />
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Biome</label>
            <select
              value={form.biome}
              onChange={(e) => setForm({ ...form, biome: e.target.value })}
              className="bg-muted border border-border text-foreground rounded-lg px-3 py-2 w-full focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors"
            >
              {BIOMES.map((b) => (
                <option key={b} value={b.toLowerCase()}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {editId ? "Update" : "Create"}
          </button>
        </form>
      )}

      {locations.length === 0 ? (
        <p className="text-muted-foreground text-sm">No locations yet.</p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
          {locations.map((loc) => {
            const isCurrent = loc.id === currentLocationId;
            return (
              <motion.div
                key={loc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className={`bg-muted/50 border rounded-xl p-4 flex items-start justify-between gap-3 ${
                  isCurrent
                    ? "border-ring ring-1 ring-ring/20"
                    : "border-border"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {loc.name}
                    {isCurrent && (
                      <span className="ml-2 text-xs text-primary font-normal">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {loc.biome}
                    {loc.description && (
                      <span className="text-muted-foreground"> &mdash; {loc.description}</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {confirmingId !== loc.id && (
                    <>
                      {!isCurrent && (
                        <button
                          onClick={() => handleSetCurrent(loc.id)}
                          className="text-sm bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded-lg transition-colors"
                        >
                          Set Current
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(loc)}
                        className="text-sm bg-accent hover:bg-muted text-foreground px-3 py-1 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                    </>
                  )}
                  <ConfirmButton
                    onConfirm={() => handleDelete(loc.id)}
                    label="Delete"
                    confirmLabel="Are you sure?"
                    className="text-sm bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-700/50 dark:hover:bg-red-700 dark:text-red-200 px-3 py-1 rounded-lg transition-colors"
                    onConfirmingChange={(c) => setConfirmingId(c ? loc.id : null)}
                  />
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
