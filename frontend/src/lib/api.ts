import type {
  APIResponse,
  TokenResponse,
  AuthUser,
  AdminUser,
  AdminUserCreatePayload,
  AdminUserUpdatePayload,
} from "@/types";

// --- AI ---

export interface AIAssistRequest {
  steer: string;
  existing_content?: string | null;
  previous_output?: string | null;
  feedback?: string | null;
}

export interface TextResult {
  text: string;
}

export interface PersonalityResult {
  personality: string;
  motivation: string;
}

export interface PhasePrepSection {
  heading:
    | "Hook"
    | "Key Beats"
    | "DM Secrets"
    | "Climax / Exit"
    | "Tone & Atmosphere"
    | "Complications";
  bullets: string[];
}

export interface PhasePrepResult {
  sections: PhasePrepSection[];
}

export interface DraftLocation {
  name: string;
  description: string;
  region?: string | null;
  reuse_id?: string | null;
}

export interface DraftNpc {
  name: string;
  role: string;
  personality: string;
  motivation: string;
  location_index?: number | null;
  reuse_id?: string | null;
}

export interface DraftQuest {
  title: string;
  description: string;
  npc_indices: number[];
  location_indices: number[];
}

export interface DraftPhaseBundle {
  phase_description?: string | null;
  draft_locations: DraftLocation[];
  draft_npcs: DraftNpc[];
  draft_quests: DraftQuest[];
  consistency_notes: string[];
}

export interface ExpandPhaseRequest {
  user_steer: string;
}

export interface ApplyPhaseBundleRequest {
  phase_description?: string | null;
  accepted_locations: DraftLocation[];
  accepted_npcs: DraftNpc[];
  accepted_quests: DraftQuest[];
}

export interface ApplyPhaseBundleResponse {
  phase_id: string;
  created_location_ids: string[];
  linked_location_ids: string[];
  created_npc_ids: string[];
  created_quest_ids: string[];
}

// --- end AI ---

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function getLocaleFromCookie(): "en" | "de" {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/);
  const v = m?.[1];
  return v === "de" ? "de" : "en";
}

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

// Guard against concurrent refresh attempts — all in-flight requests
// wait on the same refresh promise instead of each triggering their own.
let refreshPromise: Promise<void> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    const json = await res.json();
    if (!res.ok || json.error) return false;
    const data = json.data as TokenResponse;
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
  _isRetry = false
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept-Language": getLocaleFromCookie(),
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

  // On 401, attempt a transparent token refresh and retry once
  if (res.status === 401 && !_isRetry) {
    if (!refreshPromise) {
      refreshPromise = tryRefreshToken().then((ok) => {
        refreshPromise = null;
        if (!ok) {
          clearTokens();
          window.location.href = "/login";
          throw new Error("Session expired");
        }
      });
    }
    await refreshPromise;
    return request<T>(path, options, true);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  const json: APIResponse<T> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data as T;
}

async function* parseSseStream(
  response: Response,
  signal: AbortSignal
): AsyncIterable<import("@/types").ChatChunk> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal.aborted) return;
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });

      let separatorIdx;
      while ((separatorIdx = buffer.indexOf("\n\n")) !== -1) {
        const record = buffer.slice(0, separatorIdx);
        buffer = buffer.slice(separatorIdx + 2);
        for (const line of record.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6);
          try {
            yield JSON.parse(json) as import("@/types").ChatChunk;
          } catch {
            // Ignore malformed frames; the server should not emit any.
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export interface StreamGeneralChatOptions {
  provider: string;
  messages: import("@/types").ChatMessage[];
  campaignId?: string;
  campaignDraft?: import("@/types").CampaignDraft;
  signal: AbortSignal;
}

export const api = {
  // Campaigns
  getCampaigns: () => request<import("@/types").Campaign[]>("/api/v1/campaigns"),
  getCampaign: (id: string) => request<import("@/types").Campaign>(`/api/v1/campaigns/${id}`),
  createCampaign: (data: { name: string; description?: string; status?: string }) =>
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
  importFromDDB: (campaignId: string, url: string) =>
    request<import("@/types").DDBImportPreview>(
      `/api/v1/campaigns/${campaignId}/characters/import/ddb`,
      { method: "POST", body: JSON.stringify({ url }) }
    ),

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

  // Encounter Templates (Phase 14)
  listEncounterTemplates: (campaignId: string) =>
    request<import("@/types").EncounterTemplate[]>(
      `/api/v1/campaigns/${campaignId}/encounter-templates`
    ),

  createEncounterTemplate: (
    campaignId: string,
    data: import("@/types").EncounterTemplateCreate
  ) =>
    request<import("@/types").EncounterTemplate>(
      `/api/v1/campaigns/${campaignId}/encounter-templates`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  getEncounterTemplate: (templateId: string) =>
    request<import("@/types").EncounterTemplate>(
      `/api/v1/encounter-templates/${templateId}`
    ),

  updateEncounterTemplate: (
    templateId: string,
    data: import("@/types").EncounterTemplateUpdate
  ) =>
    request<import("@/types").EncounterTemplate>(
      `/api/v1/encounter-templates/${templateId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    ),

  deleteEncounterTemplate: (templateId: string) =>
    request<void>(`/api/v1/encounter-templates/${templateId}`, {
      method: "DELETE",
    }),

  startEncounter: (
    templateId: string,
    data: import("@/types").StartEncounterRequest
  ) =>
    request<import("@/types").CombatSession>(
      `/api/v1/encounter-templates/${templateId}/start`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

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

  // Phases
  getPhases: (campaignId: string) =>
    request<import("@/types").CampaignPhase[]>(`/api/v1/campaigns/${campaignId}/phases`),
  createPhase: (campaignId: string, data: import("@/types").PhaseCreate) =>
    request<import("@/types").CampaignPhase>(`/api/v1/campaigns/${campaignId}/phases`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updatePhase: (phaseId: string, data: import("@/types").PhaseUpdate) =>
    request<import("@/types").CampaignPhase>(`/api/v1/phases/${phaseId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deletePhase: (phaseId: string) =>
    request<void>(`/api/v1/phases/${phaseId}`, { method: "DELETE" }),
  setPhaseQuests: (phaseId: string, ids: string[]) =>
    request<import("@/types").CampaignPhase>(`/api/v1/phases/${phaseId}/quests`, {
      method: "PUT",
      body: JSON.stringify({ ids }),
    }),
  setPhaseLocations: (phaseId: string, ids: string[]) =>
    request<import("@/types").CampaignPhase>(`/api/v1/phases/${phaseId}/locations`, {
      method: "PUT",
      body: JSON.stringify({ ids }),
    }),

  // Ideas
  getIdeas: (campaignId: string) =>
    request<import("@/types").CampaignIdea[]>(`/api/v1/campaigns/${campaignId}/ideas`),
  createIdea: (campaignId: string, data: import("@/types").IdeaCreate) =>
    request<import("@/types").CampaignIdea>(`/api/v1/campaigns/${campaignId}/ideas`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateIdea: (ideaId: string, data: import("@/types").IdeaUpdate) =>
    request<import("@/types").CampaignIdea>(`/api/v1/ideas/${ideaId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteIdea: (ideaId: string) =>
    request<void>(`/api/v1/ideas/${ideaId}`, { method: "DELETE" }),

  // Campaign Activate
  activateCampaign: (campaignId: string) =>
    request<import("@/types").Campaign>(`/api/v1/campaigns/${campaignId}/activate`, {
      method: "POST",
    }),

  // Chat / Lore Oracle
  sendChatMessage: async (campaignId: string, messages: import("@/types").ChatMessage[]): Promise<import("@/types").ChatMessage> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept-Language": getLocaleFromCookie(),
    };
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/v1/campaigns/${campaignId}/chat`, {
      method: 'POST',
      headers,
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

  getProviders: () => request<import("@/types").ProviderInfo[]>("/api/v1/providers"),

  async streamGeneralChat(
    opts: StreamGeneralChatOptions
  ): Promise<AsyncIterable<import("@/types").ChatChunk>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept-Language": getLocaleFromCookie(),
    };
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const body: Record<string, unknown> = {
      provider: opts.provider,
      messages: opts.messages,
    };
    if (opts.campaignDraft) body.campaign_draft = opts.campaignDraft;

    const path = opts.campaignId
      ? `/api/v1/campaigns/${opts.campaignId}/chat/general`
      : "/api/v1/chat/general";

    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: opts.signal,
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.detail || json.error || `Request failed: ${res.status}`);
    }
    return parseSseStream(res, opts.signal);
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

  // --- AI ---
  ai: {
    generateCampaignDescription: (campaignId: string, body: AIAssistRequest) =>
      request<TextResult>(`/api/v1/campaigns/${campaignId}/ai/campaign-description`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    generatePhaseDescription: (campaignId: string, phaseId: string, body: AIAssistRequest) =>
      request<PhasePrepResult>(`/api/v1/campaigns/${campaignId}/phases/${phaseId}/ai/description`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    generateNpcPersonality: (npcId: string, body: AIAssistRequest) =>
      request<PersonalityResult>(`/api/v1/npcs/${npcId}/ai/personality`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    expandPhase: (campaignId: string, phaseId: string, body: ExpandPhaseRequest) =>
      request<DraftPhaseBundle>(`/api/v1/campaigns/${campaignId}/phases/${phaseId}/expand`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    applyPhaseBundle: (campaignId: string, phaseId: string, body: ApplyPhaseBundleRequest) =>
      request<ApplyPhaseBundleResponse>(`/api/v1/campaigns/${campaignId}/phases/${phaseId}/expand/apply`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

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

  async updateMe(patch: { language?: "en" | "de" }): Promise<AuthUser> {
    return request<AuthUser>("/api/v1/auth/me", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  // Admin
  async listAdminUsers(): Promise<AdminUser[]> {
    return request<AdminUser[]>("/api/v1/admin/users");
  },

  async createAdminUser(payload: AdminUserCreatePayload): Promise<AdminUser> {
    return request<AdminUser>("/api/v1/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getAdminUser(id: string): Promise<AdminUser> {
    return request<AdminUser>(`/api/v1/admin/users/${id}`);
  },

  async updateAdminUser(
    id: string,
    patch: AdminUserUpdatePayload,
  ): Promise<AdminUser> {
    return request<AdminUser>(`/api/v1/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async resetAdminUserPassword(
    id: string,
    password: string,
  ): Promise<AdminUser> {
    return request<AdminUser>(`/api/v1/admin/users/${id}/password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },
};
