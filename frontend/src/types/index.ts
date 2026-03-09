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
