export interface PokemonMoveEntry {
  move: { name: string; url: string };
  version_group_details: {
    level_learned_at: number;
    move_learn_method: { name: string };
    version_group: { name: string };
  }[];
}

export interface MoveDetail {
  name: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: { name: string };
  damage_class: { name: string };
  effect_entries: { short_effect: string; language: { name: string } }[];
}

export interface MoveRow {
  name: string;
  level: number;
  type: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  damageClass: string;
}