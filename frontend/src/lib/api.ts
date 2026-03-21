import type { APIResponse, TokenResponse, AuthUser } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// Token storage
function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
  // Set a cookie flag so Next.js middleware can detect auth state server-side
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `has_token=1; path=/; SameSite=Lax${secure}`;
}

export function clearTokens(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  document.cookie = "has_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...headers, ...options?.headers },
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

  // Dice
  rollDice: (notation: string) =>
    request<import("@/types").DiceRollResponse>("/api/v1/dice/roll", {
      method: "POST",
      body: JSON.stringify({ notation }),
    }),

  // Combat Sessions
  createCombatSession: (campaignId: string, data: import("@/types").CombatSessionCreate) =>
    request<import("@/types").CombatSession>(`/api/v1/campaigns/${campaignId}/combat-sessions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getCombatSessions: (campaignId: string) =>
    request<import("@/types").CombatSession[]>(`/api/v1/campaigns/${campaignId}/combat-sessions`),

  getCombatSession: (id: string) =>
    request<import("@/types").CombatSession>(`/api/v1/combat-sessions/${id}`),

  updateCombatSession: (id: string, data: import("@/types").CombatSessionUpdate) =>
    request<import("@/types").CombatSession>(`/api/v1/combat-sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteCombatSession: (id: string) =>
    request<void>(`/api/v1/combat-sessions/${id}`, { method: "DELETE" }),

  addCombatant: (sessionId: string, data: import("@/types").AddCombatantRequest) =>
    request<import("@/types").CombatSession>(`/api/v1/combat-sessions/${sessionId}/combatants`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCombatant: (sessionId: string, index: number, data: import("@/types").UpdateCombatantRequest) =>
    request<import("@/types").CombatSession>(`/api/v1/combat-sessions/${sessionId}/combatants/${index}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  removeCombatant: (sessionId: string, index: number) =>
    request<import("@/types").CombatSession>(`/api/v1/combat-sessions/${sessionId}/combatants/${index}`, {
      method: "DELETE",
    }),

  advanceTurn: (sessionId: string) =>
    request<import("@/types").CombatSession>(`/api/v1/combat-sessions/${sessionId}/next-turn`, {
      method: "POST",
    }),

  // NPCs
  createNpc: (campaignId: string, data: import("@/types").NpcCreate) =>
    request<import("@/types").Npc>(`/api/v1/campaigns/${campaignId}/npcs`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getNpcs: (campaignId: string, locationId?: string) =>
    request<import("@/types").Npc[]>(
      locationId
        ? `/api/v1/campaigns/${campaignId}/npcs?location_id=${locationId}`
        : `/api/v1/campaigns/${campaignId}/npcs`
    ),
  getNpc: (npcId: string) =>
    request<import("@/types").Npc>(`/api/v1/npcs/${npcId}`),
  updateNpc: (npcId: string, data: import("@/types").NpcUpdate) =>
    request<import("@/types").Npc>(`/api/v1/npcs/${npcId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteNpc: (npcId: string) =>
    request<void>(`/api/v1/npcs/${npcId}`, { method: "DELETE" }),

  // Quests
  createQuest: (campaignId: string, data: import("@/types").QuestCreate) =>
    request<import("@/types").Quest>(`/api/v1/campaigns/${campaignId}/quests`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getQuests: (campaignId: string, locationId?: string) =>
    request<import("@/types").Quest[]>(
      locationId
        ? `/api/v1/campaigns/${campaignId}/quests?location_id=${locationId}`
        : `/api/v1/campaigns/${campaignId}/quests`
    ),
  getQuest: (questId: string) =>
    request<import("@/types").Quest>(`/api/v1/quests/${questId}`),
  updateQuest: (questId: string, data: import("@/types").QuestUpdate) =>
    request<import("@/types").Quest>(`/api/v1/quests/${questId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteQuest: (questId: string) =>
    request<void>(`/api/v1/quests/${questId}`, { method: "DELETE" }),

  // Chat / Lore Oracle
  sendChatMessage: async (campaignId: string, messages: import("@/types").ChatMessage[]): Promise<import("@/types").ChatMessage> => {
    const res = await fetch(`${API_BASE}/api/v1/campaigns/${campaignId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    const json = await res.json();
    if (!res.ok) {
      const detail = json.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: { msg?: string }) => d.msg ?? String(d)).join('; ')
        : (detail ?? 'AI service error');
      throw new Error(msg);
    }
    return json.data.message;
  },

  // Generators
  generateEncounter: (campaignId: string, options?: import("@/types").GenerateEncounterRequest) =>
    request<import("@/types").GeneratedEncounter>(`/api/v1/campaigns/${campaignId}/generate/encounter`, {
      method: "POST",
      body: JSON.stringify(options ?? {}),
    }),

  generateNpc: (campaignId: string, options?: import("@/types").GenerateNpcRequest) =>
    request<import("@/types").GeneratedNpc>(`/api/v1/campaigns/${campaignId}/generate/npc`, {
      method: "POST",
      body: JSON.stringify(options ?? {}),
    }),

  generateLoot: (campaignId: string, options?: import("@/types").GenerateLootRequest) =>
    request<import("@/types").GeneratedLoot>(`/api/v1/campaigns/${campaignId}/generate/loot`, {
      method: "POST",
      body: JSON.stringify(options ?? {}),
    }),

  // Auth
  async login(email: string, password: string): Promise<TokenResponse> {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error || json.detail || "Login failed");
    }
    return json.data;
  },

  async refreshToken(): Promise<TokenResponse> {
    const refresh = getRefreshToken();
    if (!refresh) throw new Error("No refresh token");
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error || json.detail || "Token refresh failed");
    }
    return json.data;
  },

  async getMe(): Promise<AuthUser> {
    return request<AuthUser>("/api/v1/auth/me");
  },
};
