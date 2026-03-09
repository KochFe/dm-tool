export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  current_location_id: string | null;
  in_game_time: string;
  party_level: number;
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
}
