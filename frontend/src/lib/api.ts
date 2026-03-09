import type { APIResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  const json: APIResponse<T> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data as T;
}

export const api = {
  // Campaigns
  getCampaigns: () => request<import("@/types").Campaign[]>("/api/v1/campaigns"),
  getCampaign: (id: string) => request<import("@/types").Campaign>(`/api/v1/campaigns/${id}`),
  createCampaign: (data: { name: string; description?: string }) =>
    request<import("@/types").Campaign>("/api/v1/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCampaign: (id: string, data: Record<string, unknown>) =>
    request<import("@/types").Campaign>(`/api/v1/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteCampaign: (id: string) =>
    request<void>(`/api/v1/campaigns/${id}`, { method: "DELETE" }),

  // Characters
  getCharacters: (campaignId: string) =>
    request<import("@/types").PlayerCharacter[]>(`/api/v1/campaigns/${campaignId}/characters`),
  getCharacter: (id: string) =>
    request<import("@/types").PlayerCharacter>(`/api/v1/characters/${id}`),
  createCharacter: (campaignId: string, data: Record<string, unknown>) =>
    request<import("@/types").PlayerCharacter>(`/api/v1/campaigns/${campaignId}/characters`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCharacter: (id: string, data: Record<string, unknown>) =>
    request<import("@/types").PlayerCharacter>(`/api/v1/characters/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteCharacter: (id: string) =>
    request<void>(`/api/v1/characters/${id}`, { method: "DELETE" }),

  // Locations
  getLocations: (campaignId: string) =>
    request<import("@/types").Location[]>(`/api/v1/campaigns/${campaignId}/locations`),
  getLocation: (id: string) =>
    request<import("@/types").Location>(`/api/v1/locations/${id}`),
  createLocation: (campaignId: string, data: Record<string, unknown>) =>
    request<import("@/types").Location>(`/api/v1/campaigns/${campaignId}/locations`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateLocation: (id: string, data: Record<string, unknown>) =>
    request<import("@/types").Location>(`/api/v1/locations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteLocation: (id: string) =>
    request<void>(`/api/v1/locations/${id}`, { method: "DELETE" }),
};
