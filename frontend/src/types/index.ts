export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  current_location_id: string | null;
  in_game_time: string;
  party_level: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerCharacter {
  id: string;
  campaign_id: string;
  name: string;
  race: string;
  character_class: string;
  level: number;
  hp_current: number;
  hp_max: number;
  armor_class: number;
  passive_perception: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  proficiency_bonus: number;
  speed: number;
  saving_throw_proficiencies: string[];
  skill_proficiencies: string[];
  spell_slots: Record<string, number>;
  ddb_id: number | null;
  inventory: unknown[];
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  biome: string;
  created_at: string;
  updated_at: string;
}

export interface APIResponse<T> {
  data: T | null;
  error: string | null;
  meta: Record<string, unknown> | null;
}

// Dice
export interface DiceRollRequest {
  notation: string;
}

export interface DiceRollResponse {
  notation: string;
  count: number;
  sides: number;
  modifier: number;
  rolls: number[];
  total: number;
}

// Combat Sessions
export interface Combatant {
  name: string;
  initiative: number;
  hp_current: number;
  hp_max: number;
  armor_class: number;
  type: "pc" | "monster";
  player_character_id: string | null;
  conditions: string[];
}

export interface CombatSession {
  id: string;
  campaign_id: string;
  name: string | null;
  combatants: Combatant[];
  current_turn_index: number;
  round_number: number;
  status: "active" | "completed";
  created_at: string;
  updated_at: string;
}

export interface CombatSessionCreate {
  name?: string;
  combatants?: Combatant[];
}

export interface CombatSessionUpdate {
  name?: string;
  status?: "active" | "completed";
}

export interface AddCombatantRequest {
  name: string;
  initiative: number;
  hp_current: number;
  hp_max: number;
  armor_class: number;
  type: "pc" | "monster";
  player_character_id?: string | null;
}

export interface UpdateCombatantRequest {
  name?: string;
  initiative?: number;
  hp_current?: number;
  hp_max?: number;
  armor_class?: number;
  conditions?: string[];
}

// NPC
export type QuestStatus = "not_started" | "in_progress" | "completed" | "failed";

export interface Npc {
  id: string;
  campaign_id: string;
  location_id: string | null;
  name: string;
  race: string;
  npc_class: string | null;
  description: string | null;
  personality: string | null;
  secrets: string | null;
  motivation: string | null;
  stats: Record<string, number> | null;
  is_alive: boolean;
  created_at: string;
  updated_at: string;
}

export interface NpcCreate {
  name: string;
  race: string;
  npc_class?: string;
  description?: string;
  personality?: string;
  secrets?: string;
  motivation?: string;
  stats?: Record<string, number>;
  location_id?: string;
  is_alive?: boolean;
}

export interface NpcUpdate {
  name?: string;
  race?: string;
  npc_class?: string;
  description?: string;
  personality?: string;
  secrets?: string;
  motivation?: string;
  stats?: Record<string, number>;
  location_id?: string | null;
  is_alive?: boolean;
}

// Quest
export interface Quest {
  id: string;
  campaign_id: string;
  location_id: string | null;
  title: string;
  description: string | null;
  status: QuestStatus;
  reward: string | null;
  level: number | null;
  created_at: string;
  updated_at: string;
}

export interface QuestCreate {
  title: string;
  description?: string;
  status?: QuestStatus;
  reward?: string;
  level?: number;
  location_id?: string;
}

export interface QuestUpdate {
  title?: string;
  description?: string;
  status?: QuestStatus;
  reward?: string;
  level?: number;
  location_id?: string | null;
}

// Chat / Lore Oracle
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ChatResponse {
  message: ChatMessage;
}

// Generator response types
export interface GeneratedMonster {
  name: string;
  cr: string;
  hp: number;
  ac: number;
  count: number;
}

export interface GeneratedEncounter {
  description: string;
  monsters: GeneratedMonster[];
  tactical_notes: string;
  difficulty: string;
}

export interface GeneratedNpc {
  name: string;
  race: string;
  npc_class: string | null;
  description: string;
  personality: string;
  secrets: string;
  motivation: string;
  stats: Record<string, number> | null;
}

export interface GeneratedLootItem {
  name: string;
  description: string;
  rarity: string;
  value: string;
}

export interface GeneratedLoot {
  items: GeneratedLootItem[];
  total_value: string;
  context: string;
}

// Generator request types
export interface GenerateEncounterRequest {
  difficulty?: string;
}

export interface GenerateNpcRequest {
  location_id?: string;
  role?: string;
}

export interface GenerateLootRequest {
  context?: string;
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

// DDB Import
export interface DDBImportPreview {
  preview: {
    name: string;
    race: string;
    character_class: string;
    level: number;
    hp_current: number;
    hp_max: number;
    armor_class: number;
    passive_perception: number;
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    proficiency_bonus: number;
    speed: number;
    saving_throw_proficiencies: string[];
    skill_proficiencies: string[];
    spell_slots: Record<string, number>;
    inventory: unknown[];
    ddb_id: number | null;
  };
  ddb_id: number;
  ddb_name: string;
  warnings: string[];
  unmapped_data: Record<string, unknown>;
}
